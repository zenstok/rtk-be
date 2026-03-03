import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { CacheModule, CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { startTestDb, stopTestDb, TestDbConfig } from '../utils/test-db.setup';
import { cleanDatabase } from '../utils/db-cleanup';
import { User } from '../../src/modules/user/entities/user.entity';
import { AuthRefreshToken } from '../../src/modules/auth/entities/auth-refresh-token.entity';
import { AuthService } from '../../src/modules/auth/auth.service';
import { AuthRefreshTokenService } from '../../src/modules/auth/auth-refresh-token.service';
import { UserRepository } from '../../src/modules/user/repositories/user.repository';
import { ConfigModule } from '@nestjs/config';
import { MailService } from '../../src/modules/mail/mail.service';
import { Role } from '../../src/modules/auth/constants/role.enum';

const JWT_SECRET_DEV = 'rtk-dev-jwt-secret-do-not-use-in-production';
const JWT_REFRESH_SECRET_DEV =
  'rtk-dev-jwt-refresh-secret-do-not-use-in-production';

// Mock MailService to avoid actual email/queue operations in tests
const mockMailService = {
  sendResetPasswordConfirmationQueued: jest.fn().mockResolvedValue(undefined),
  confirmEmailToken: jest.fn(),
};

describe('AuthService (integration)', () => {
  let dbConfig: TestDbConfig;
  let app: INestApplication;
  let module: TestingModule;
  let dataSource: DataSource;
  let authService: AuthService;
  let jwtService: JwtService;
  let cacheManager: Cache;

  beforeAll(async () => {
    dbConfig = await startTestDb();

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          entities: [User, AuthRefreshToken],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([User, AuthRefreshToken]),
        ConfigModule.forRoot(),
        PassportModule,
        JwtModule.register({
          secret: JWT_SECRET_DEV,
          signOptions: { expiresIn: '30m' },
        }),
        CacheModule.register(),
      ],
      providers: [
        AuthService,
        AuthRefreshTokenService,
        UserRepository,
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    dataSource = module.get(DataSource);
    authService = module.get(AuthService);
    jwtService = module.get(JwtService);
    cacheManager = module.get(CACHE_MANAGER);
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await stopTestDb();
  });

  afterEach(async () => {
    await cleanDatabase(dataSource);
    // Clear lockout cache entries between tests
    for (const email of [
      'test@example.com',
      'other@example.com',
      'phantom@example.com',
      'nonexistent@example.com',
    ]) {
      await cacheManager.del(`auth:lockout:${email}`);
    }
    jest.clearAllMocks();
  });

  async function createTestUser(overrides: Partial<User> = {}): Promise<User> {
    const repo = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('Password1!', 12);
    return repo.save(
      repo.create({
        email: 'test@example.com',
        password: hashedPassword,
        role: Role.User,
        firstName: 'Test',
        lastName: 'User',
        ...overrides,
      }),
    );
  }

  describe('validateUser', () => {
    it('should return user for valid credentials', async () => {
      await createTestUser();

      const result = await authService.validateUser(
        'test@example.com',
        'Password1!',
      );

      expect(result).toBeDefined();
      expect(result!.email).toBe('test@example.com');
    });

    it('should return null for wrong password', async () => {
      await createTestUser();

      const result = await authService.validateUser(
        'test@example.com',
        'WrongPassword1!',
      );

      expect(result).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      const result = await authService.validateUser(
        'nonexistent@example.com',
        'Password1!',
      );

      expect(result).toBeNull();
    });

    it('should take similar time for existing and non-existent users (timing attack prevention)', async () => {
      await createTestUser();

      // Warm up bcrypt
      await authService.validateUser('test@example.com', 'Password1!');

      const runs = 5;
      let existingTotal = 0;
      let nonExistentTotal = 0;

      for (let i = 0; i < runs; i++) {
        const start1 = Date.now();
        await authService.validateUser('test@example.com', 'WrongPass1!');
        existingTotal += Date.now() - start1;

        const start2 = Date.now();
        await authService.validateUser(
          'nonexistent@example.com',
          'WrongPass1!',
        );
        nonExistentTotal += Date.now() - start2;
      }

      const avgExisting = existingTotal / runs;
      const avgNonExistent = nonExistentTotal / runs;

      // Both should take comparable time (within 200ms threshold for bcrypt cost 12).
      // The key point is that non-existent user does NOT return instantly —
      // bcrypt.compare still runs against the dummy hash.
      expect(Math.abs(avgExisting - avgNonExistent)).toBeLessThan(200);
    });
  });

  describe('account lockout', () => {
    it('should lock account after 5 failed attempts', async () => {
      await createTestUser();

      // 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await authService.validateUser('test@example.com', 'WrongPass1!');
      }

      // 6th attempt should throw even with correct password
      await expect(
        authService.validateUser('test@example.com', 'Password1!'),
      ).rejects.toThrow('Account is temporarily locked');
    });

    it('should reset failed attempts on successful login', async () => {
      await createTestUser();

      // 4 failed attempts (just below threshold)
      for (let i = 0; i < 4; i++) {
        await authService.validateUser('test@example.com', 'WrongPass1!');
      }

      // Successful login resets the counter
      const user = await authService.validateUser(
        'test@example.com',
        'Password1!',
      );
      expect(user).toBeDefined();

      // 4 more failed attempts should not lock (counter was reset)
      for (let i = 0; i < 4; i++) {
        await authService.validateUser('test@example.com', 'WrongPass1!');
      }

      // Still not locked — 5th attempt after reset
      const result = await authService.validateUser(
        'test@example.com',
        'Password1!',
      );
      expect(result).toBeDefined();
    });

    it('should not lock out different email addresses', async () => {
      await createTestUser();
      await createTestUser({
        email: 'other@example.com',
        firstName: 'Other',
      });

      // Lock out test@example.com
      for (let i = 0; i < 5; i++) {
        await authService.validateUser('test@example.com', 'WrongPass1!');
      }

      // other@example.com should still work
      const result = await authService.validateUser(
        'other@example.com',
        'Password1!',
      );
      expect(result).toBeDefined();
      expect(result!.email).toBe('other@example.com');
    });

    it('should track failed attempts even for non-existent users', async () => {
      // 5 failed attempts for a non-existent user
      for (let i = 0; i < 5; i++) {
        await authService.validateUser('phantom@example.com', 'WrongPass1!');
      }

      // 6th attempt should throw lockout
      await expect(
        authService.validateUser('phantom@example.com', 'WrongPass1!'),
      ).rejects.toThrow('Account is temporarily locked');
    });
  });

  describe('login', () => {
    it('should return accessToken and refreshToken', async () => {
      const user = await createTestUser();

      const result = await authService.login(user);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      // Verify access token payload
      const accessPayload = jwtService.verify(result.accessToken, {
        secret: JWT_SECRET_DEV,
      });
      expect(accessPayload.sub).toBe(user.id);

      // Verify refresh token payload
      const refreshPayload = jwtService.verify(result.refreshToken, {
        secret: JWT_REFRESH_SECRET_DEV,
      });
      expect(refreshPayload.sub).toBe(user.id);
    });
  });

  describe('refreshTokens', () => {
    it('should return new token pair and blacklist the old refresh token', async () => {
      const user = await createTestUser();
      const firstPair = await authService.login(user);

      const refreshPayload = jwtService.verify(firstPair.refreshToken, {
        secret: JWT_REFRESH_SECRET_DEV,
      });
      const refreshTokenExpiresAt = new Date(refreshPayload.exp * 1000);

      const newPair = await authService.refreshTokens(
        user,
        firstPair.refreshToken,
        refreshTokenExpiresAt,
      );

      expect(newPair.accessToken).toBeDefined();
      expect(newPair.refreshToken).toBeDefined();

      // Verify new tokens are valid JWTs
      const newAccessPayload = jwtService.verify(newPair.accessToken, {
        secret: JWT_SECRET_DEV,
      });
      expect(newAccessPayload.sub).toBe(user.id);

      // Old refresh token should be blacklisted now
      const blacklistedRepo = dataSource.getRepository(AuthRefreshToken);
      const blacklisted = await blacklistedRepo.find({
        where: { userId: user.id },
      });
      expect(blacklisted.length).toBe(1);
    });

    it('should reject a blacklisted (reused) refresh token', async () => {
      const user = await createTestUser();
      const firstPair = await authService.login(user);

      const refreshPayload = jwtService.verify(firstPair.refreshToken, {
        secret: JWT_REFRESH_SECRET_DEV,
      });
      const refreshTokenExpiresAt = new Date(refreshPayload.exp * 1000);

      // First refresh — should succeed and blacklist the token
      await authService.refreshTokens(
        user,
        firstPair.refreshToken,
        refreshTokenExpiresAt,
      );

      // Second refresh with same token — should fail (token replay attack)
      await expect(
        authService.refreshTokens(
          user,
          firstPair.refreshToken,
          refreshTokenExpiresAt,
        ),
      ).rejects.toThrow('Invalid refresh token.');
    });
  });

  describe('sendResetPasswordConfirmation', () => {
    it('should return generic message for existing user', async () => {
      await createTestUser();

      const result = await authService.sendResetPasswordConfirmation({
        email: 'test@example.com',
      });

      expect(result).toContain('If your email address is found');
      expect(
        mockMailService.sendResetPasswordConfirmationQueued,
      ).toHaveBeenCalled();
    });

    it('should return same generic message for non-existent user (prevents enumeration)', async () => {
      const result = await authService.sendResetPasswordConfirmation({
        email: 'nonexistent@example.com',
      });

      expect(result).toContain('If your email address is found');
      expect(
        mockMailService.sendResetPasswordConfirmationQueued,
      ).not.toHaveBeenCalled();
    });

    it('should swallow mail errors to prevent user enumeration', async () => {
      await createTestUser();
      mockMailService.sendResetPasswordConfirmationQueued.mockRejectedValueOnce(
        new Error('SMTP error'),
      );

      const result = await authService.sendResetPasswordConfirmation({
        email: 'test@example.com',
      });

      expect(result).toContain('If your email address is found');
    });
  });

  describe('resetPassword', () => {
    it('should reject invalid token', async () => {
      mockMailService.confirmEmailToken.mockReturnValue({ isValid: false });

      await expect(
        authService.resetPassword({
          token: 'invalid-token',
          password: 'NewPassword1!',
        }),
      ).rejects.toThrow('Token is invalid.');
    });

    it('should reject token not matching cache', async () => {
      mockMailService.confirmEmailToken.mockReturnValue({
        isValid: true,
        email: 'test@example.com',
      });

      // No token in cache (or mismatched)
      await expect(
        authService.resetPassword({
          token: 'valid-but-not-cached',
          password: 'NewPassword1!',
        }),
      ).rejects.toThrow('Token is invalid.');
    });
  });
});

describe('AuthRefreshTokenService (integration)', () => {
  let dbConfig: TestDbConfig;
  let app: INestApplication;
  let module: TestingModule;
  let dataSource: DataSource;
  let authRefreshTokenService: AuthRefreshTokenService;
  let jwtService: JwtService;

  beforeAll(async () => {
    dbConfig = await startTestDb();

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          entities: [User, AuthRefreshToken],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([User, AuthRefreshToken]),
        ConfigModule.forRoot(),
        JwtModule.register({
          secret: JWT_SECRET_DEV,
          signOptions: { expiresIn: '30m' },
        }),
      ],
      providers: [AuthRefreshTokenService],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    dataSource = module.get(DataSource);
    authRefreshTokenService = module.get(AuthRefreshTokenService);
    jwtService = module.get(JwtService);
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await stopTestDb();
  });

  afterEach(async () => {
    await cleanDatabase(dataSource);
  });

  async function createTestUser(): Promise<User> {
    const repo = dataSource.getRepository(User);
    return repo.save(
      repo.create({
        email: 'refresh@example.com',
        password: await bcrypt.hash('Password1!', 12),
        role: Role.User,
        firstName: 'Refresh',
        lastName: 'Test',
      }),
    );
  }

  describe('generateTokenPair', () => {
    it('should generate valid access and refresh tokens', async () => {
      const user = await createTestUser();

      const pair = await authRefreshTokenService.generateTokenPair(user);

      expect(pair.accessToken).toBeDefined();
      expect(pair.refreshToken).toBeDefined();

      // Access token uses main secret
      const accessPayload = jwtService.verify(pair.accessToken, {
        secret: JWT_SECRET_DEV,
      });
      expect(accessPayload.sub).toBe(user.id);

      // Refresh token uses refresh secret
      const refreshPayload = jwtService.verify(pair.refreshToken, {
        secret: JWT_REFRESH_SECRET_DEV,
      });
      expect(refreshPayload.sub).toBe(user.id);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a new refresh token without blacklisting when no current token', async () => {
      const user = await createTestUser();

      const token = await authRefreshTokenService.generateRefreshToken(user.id);

      expect(token).toBeDefined();
      const payload = jwtService.verify(token, {
        secret: JWT_REFRESH_SECRET_DEV,
      });
      expect(payload.sub).toBe(user.id);

      // No blacklisted tokens
      const repo = dataSource.getRepository(AuthRefreshToken);
      const count = await repo.count();
      expect(count).toBe(0);
    });

    it('should blacklist old refresh token when rotating', async () => {
      const user = await createTestUser();
      const oldToken = await authRefreshTokenService.generateRefreshToken(
        user.id,
      );
      const oldPayload = jwtService.verify(oldToken, {
        secret: JWT_REFRESH_SECRET_DEV,
      });
      const oldExpiresAt = new Date(oldPayload.exp * 1000);

      const newToken = await authRefreshTokenService.generateRefreshToken(
        user.id,
        oldToken,
        oldExpiresAt,
      );

      expect(newToken).toBeDefined();

      // Verify new token is a valid JWT for the same user
      const newPayload = jwtService.verify(newToken, {
        secret: JWT_REFRESH_SECRET_DEV,
      });
      expect(newPayload.sub).toBe(user.id);

      // Old token should be in blacklist
      const repo = dataSource.getRepository(AuthRefreshToken);
      const count = await repo.count({ where: { userId: user.id } });
      expect(count).toBe(1);
    });

    it('should throw UnauthorizedException for blacklisted token', async () => {
      const user = await createTestUser();
      const oldToken = await authRefreshTokenService.generateRefreshToken(
        user.id,
      );
      const oldPayload = jwtService.verify(oldToken, {
        secret: JWT_REFRESH_SECRET_DEV,
      });
      const oldExpiresAt = new Date(oldPayload.exp * 1000);

      // First rotation — blacklists oldToken
      await authRefreshTokenService.generateRefreshToken(
        user.id,
        oldToken,
        oldExpiresAt,
      );

      // Second attempt with same oldToken — should fail
      await expect(
        authRefreshTokenService.generateRefreshToken(
          user.id,
          oldToken,
          oldExpiresAt,
        ),
      ).rejects.toThrow('Invalid refresh token.');
    });
  });

  describe('clearExpiredRefreshTokens', () => {
    it('should delete expired blacklisted tokens', async () => {
      const user = await createTestUser();
      const repo = dataSource.getRepository(AuthRefreshToken);

      // Insert an already-expired token
      await repo.insert({
        hashedRefreshToken: 'expired-hash',
        expiresAt: new Date('2020-01-01'),
        userId: user.id,
      });

      // Insert a still-valid token
      await repo.insert({
        hashedRefreshToken: 'valid-hash',
        expiresAt: new Date('2099-01-01'),
        userId: user.id,
      });

      expect(await repo.count()).toBe(2);

      await authRefreshTokenService.clearExpiredRefreshTokens();

      const remaining = await repo.find();
      expect(remaining.length).toBe(1);
      expect(remaining[0].hashedRefreshToken).toBe('valid-hash');
    });
  });
});

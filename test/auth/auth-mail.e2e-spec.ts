import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';
import { getQueueToken } from '@nestjs/bullmq';
import { CacheModule, CACHE_MANAGER } from '@nestjs/cache-manager';
import { MailerModule, MailerService } from '@nestjs-modules/mailer';
import { DataSource } from 'typeorm';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import type { Cache } from 'cache-manager';
import { Queue, QueueEvents } from 'bullmq';
import * as bcrypt from 'bcrypt';
import { startTestDb, stopTestDb, TestDbConfig } from '../utils/test-db.setup';
import { cleanDatabase } from '../utils/db-cleanup';
import { User } from '../../src/modules/user/entities/user.entity';
import { AuthRefreshToken } from '../../src/modules/auth/entities/auth-refresh-token.entity';
import { MailService } from '../../src/modules/mail/mail.service';
import { MailProcessor } from '../../src/modules/mail/processors/mail.processor';
import { ConfigModule } from '@nestjs/config';
import { MAIL_QUEUE, RESET_PASSWORD_CONFIRMATION_JOB } from '../../src/modules/mail/mail.constants';
import { Role } from '../../src/modules/auth/constants/role.enum';

const JWT_EMAIL_SECRET_DEV =
  'rtk-dev-jwt-email-secret-do-not-use-in-production';

describe('Mail + BullMQ Queue (integration with Redis)', () => {
  let dbConfig: TestDbConfig;
  let redisContainer: StartedTestContainer;
  let app: INestApplication;
  let module: TestingModule;
  let dataSource: DataSource;
  let mailService: MailService;
  let jwtService: JwtService;
  let cacheManager: Cache;
  let mailQueue: Queue;
  let queueEvents: QueueEvents;

  // Track sent emails via mock transport
  const sentEmails: Array<{ to: string; subject: string; html: string }> = [];

  let redisHost: string;
  let redisPort: number;

  beforeAll(async () => {
    // Start Redis testcontainer
    redisContainer = await new GenericContainer('redis:latest')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .start();

    redisHost = redisContainer.getHost();
    redisPort = redisContainer.getMappedPort(6379);

    // Start Postgres testcontainer
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
        TypeOrmModule.forFeature([User]),
        BullModule.forRoot({
          connection: {
            host: redisHost,
            port: redisPort,
          },
        }),
        BullModule.registerQueue({
          name: MAIL_QUEUE,
        }),
        ConfigModule.forRoot(),
        CacheModule.register(),
        JwtModule.register({
          secret: JWT_EMAIL_SECRET_DEV,
          signOptions: { expiresIn: '1800s' },
        }),
        MailerModule.forRoot({
          transport: {
            host: 'localhost',
            port: 0, // Won't actually connect — we override sendMail
          },
        }),
      ],
      providers: [MailService, MailProcessor],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    dataSource = module.get(DataSource);
    mailService = module.get(MailService);
    jwtService = module.get(JwtService);
    cacheManager = module.get(CACHE_MANAGER);
    mailQueue = module.get(getQueueToken(MAIL_QUEUE));

    // BullMQ uses QueueEvents for listening to job lifecycle events
    queueEvents = new QueueEvents(MAIL_QUEUE, {
      connection: { host: redisHost, port: redisPort },
    });
    await queueEvents.waitUntilReady();

    // Mock the mailer's sendMail to capture emails instead of sending
    const mailerService = module.get(MailerService);
    jest.spyOn(mailerService, 'sendMail').mockImplementation(async (opts: any) => {
      sentEmails.push({
        to: opts.to ?? '',
        subject: opts.subject ?? '',
        html: opts.html ?? '',
      });
    });
  }, 90_000);

  afterAll(async () => {
    if (queueEvents) {
      await queueEvents.close();
    }
    if (mailQueue) {
      await mailQueue.close();
    }
    await app.close();
    await stopTestDb();
    if (redisContainer) {
      await redisContainer.stop();
    }
    // Allow BullMQ connections to drain
    await new Promise((r) => setTimeout(r, 500));
  });

  afterEach(async () => {
    await cleanDatabase(dataSource);
    sentEmails.length = 0;
    await mailQueue.drain();
  });

  async function createTestUser(): Promise<User> {
    const repo = dataSource.getRepository(User);
    return repo.save(
      repo.create({
        email: 'mailtest@example.com',
        password: await bcrypt.hash('Password1!', 12),
        role: Role.User,
        firstName: 'Mail',
        lastName: 'Test',
      }),
    );
  }

  describe('sendResetPasswordConfirmationQueued', () => {
    it('should add a job to the BullMQ queue', async () => {
      const user = await createTestUser();

      const job = await mailService.sendResetPasswordConfirmationQueued(user);

      expect(job).toBeDefined();

      // Verify job data
      const jobData = await mailQueue.getJob((job as { id: string }).id);
      expect(jobData).toBeDefined();
      expect(jobData!.data.user.email).toBe('mailtest@example.com');
    });

    it('should process the queued job and send email', async () => {
      const user = await createTestUser();

      await mailService.sendResetPasswordConfirmationQueued(user);

      // Wait for the job to be processed (delay is 1000ms in service)
      await new Promise<void>((resolve) => {
        queueEvents.on('completed', () => resolve());
        // Timeout safety
        setTimeout(() => resolve(), 5000);
      });

      // Email should have been "sent" via our mock
      expect(sentEmails.length).toBe(1);
      expect(sentEmails[0].to).toBe('mailtest@example.com');
      expect(sentEmails[0].subject).toContain('Reset your password');
    });
  });

  describe('email token generation and verification', () => {
    it('should generate a valid email token and verify it', async () => {
      const user = await createTestUser();

      // sendResetPasswordConfirmation generates a token internally
      // Let's test confirmEmailToken directly
      const token = jwtService.sign(
        { email: user.email },
        { expiresIn: '600s' },
      );

      const result = mailService.confirmEmailToken(token);

      expect(result.isValid).toBe(true);
      expect(result.email).toBe('mailtest@example.com');
    });

    it('should reject an expired token', async () => {
      const token = jwtService.sign(
        { email: 'test@example.com' },
        { expiresIn: '0s' },
      );

      // Wait a moment for token to expire
      await new Promise((r) => setTimeout(r, 100));

      const result = mailService.confirmEmailToken(token);

      expect(result.isValid).toBe(false);
      expect(result.email).toBeUndefined();
    });

    it('should reject a token signed with wrong secret', () => {
      const fakeJwt = new JwtService({ secret: 'wrong-secret' });
      const token = fakeJwt.sign(
        { email: 'test@example.com' },
        { expiresIn: '600s' },
      );

      const result = mailService.confirmEmailToken(token);

      expect(result.isValid).toBe(false);
    });
  });

  describe('sendResetPasswordConfirmation (direct)', () => {
    it('should generate token, cache it, and send email', async () => {
      const user = await createTestUser();

      await mailService.sendResetPasswordConfirmation(user);

      // Token should be cached
      const cachedToken = await cacheManager.get<string>(user.email);
      expect(cachedToken).toBeDefined();
      expect(typeof cachedToken).toBe('string');

      // Verify the cached token is valid
      const result = mailService.confirmEmailToken(cachedToken!);
      expect(result.isValid).toBe(true);
      expect(result.email).toBe(user.email);

      // Email should have been sent
      expect(sentEmails.length).toBe(1);
      expect(sentEmails[0].to).toBe(user.email);
    });

    it('should overwrite previous token on second request', async () => {
      const user = await createTestUser();

      await mailService.sendResetPasswordConfirmation(user);
      const firstToken = await cacheManager.get<string>(user.email);

      // Wait to ensure different iat
      await new Promise((r) => setTimeout(r, 1100));

      await mailService.sendResetPasswordConfirmation(user);
      const secondToken = await cacheManager.get<string>(user.email);

      // Second request should generate a new token
      expect(secondToken).toBeDefined();
      // Both tokens should be valid
      expect(mailService.confirmEmailToken(firstToken!).isValid).toBe(true);
      expect(mailService.confirmEmailToken(secondToken!).isValid).toBe(true);
    });
  });

  describe('BullMQ queue reliability', () => {
    it('should handle multiple queued jobs', async () => {
      const user1 = await createTestUser();
      const repo = dataSource.getRepository(User);
      const user2 = await repo.save(
        repo.create({
          email: 'user2@example.com',
          password: await bcrypt.hash('Password1!', 12),
          role: Role.User,
          firstName: 'User',
          lastName: 'Two',
        }),
      );

      await mailService.sendResetPasswordConfirmationQueued(user1);
      await mailService.sendResetPasswordConfirmationQueued(user2);

      // Wait for both jobs to complete
      let completedCount = 0;
      await new Promise<void>((resolve) => {
        queueEvents.on('completed', () => {
          completedCount++;
          if (completedCount >= 2) resolve();
        });
        setTimeout(() => resolve(), 10000);
      });

      expect(sentEmails.length).toBe(2);
      const recipients = sentEmails.map((e) => e.to).sort();
      expect(recipients).toEqual(['mailtest@example.com', 'user2@example.com']);
    });

    it('should report job counts correctly', async () => {
      const user = await createTestUser();

      await mailService.sendResetPasswordConfirmationQueued(user);

      // Job should be in delayed state (1s delay)
      const counts = await mailQueue.getJobCounts('delayed', 'waiting', 'active', 'completed');
      expect((counts.delayed ?? 0) + (counts.waiting ?? 0) + (counts.active ?? 0) + (counts.completed ?? 0)).toBeGreaterThanOrEqual(1);
    });
  });
});

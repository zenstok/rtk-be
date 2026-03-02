import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../user/repositories/user.repository';
import { AuthRefreshTokenService } from './auth-refresh-token.service';
import { MailService } from '../mail/mail.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ConfirmResetPasswordDto } from './dto/confirm-reset-password.dto';
import { User } from '../user/entities/user.entity';

export const BCRYPT_SALT_ROUNDS = 12;

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class AuthService {
  // Pre-computed dummy hash (bcrypt cost 12) to prevent timing attacks on non-existent users.
  // Generated via: bcrypt.hashSync('dummy-password-placeholder-never-matches', 12)
  private static readonly DUMMY_HASH =
    '$2b$12$CBU3uYcrdlH4hOp5LdkglOMtgFcs7i3lsFHH1uVp5T4MqexdwbB9i';

  constructor(
    private readonly userRepository: UserRepository,
    private readonly authRefreshTokenService: AuthRefreshTokenService,
    private readonly mailService: MailService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private lockoutKey(email: string): string {
    return `auth:lockout:${email}`;
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    // Check account lockout
    const failedAttempts =
      (await this.cacheManager.get<number>(this.lockoutKey(email))) ?? 0;
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      throw new UnauthorizedException(
        'Account is temporarily locked due to too many failed login attempts. Please try again later.',
      );
    }

    const user = await this.userRepository.findOneBy({ email });
    // Always run bcrypt.compare to prevent timing-based user enumeration
    const isMatch = await bcrypt.compare(
      password,
      user?.password || AuthService.DUMMY_HASH,
    );

    if (!user || !isMatch) {
      // Increment failed attempts
      await this.cacheManager.set(
        this.lockoutKey(email),
        failedAttempts + 1,
        LOCKOUT_DURATION_MS,
      );
      return null;
    }

    // Reset failed attempts on successful login
    await this.cacheManager.del(this.lockoutKey(email));
    return user;
  }

  async login(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authRefreshTokenService.generateTokenPair(user);
  }

  async refreshTokens(
    user: User,
    currentRefreshToken: string,
    refreshTokenExpiresAt: Date,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authRefreshTokenService.generateTokenPair(
      user,
      currentRefreshToken,
      refreshTokenExpiresAt,
    );
  }

  async sendResetPasswordConfirmation(dto: ResetPasswordDto): Promise<string> {
    const message =
      "If your email address is found in our system, a reset confirmation email has been sent to it.";
    const user = await this.userRepository.findOneBy({ email: dto.email });
    if (!user) {
      return message;
    }
    try {
      await this.mailService.sendResetPasswordConfirmationQueued(user);
    } catch {
      // Swallow errors to prevent user enumeration
    }
    return message;
  }

  async resetPassword(dto: ConfirmResetPasswordDto): Promise<string> {
    const data = this.mailService.confirmEmailToken(dto.token);
    if (!data.isValid || !data.email) {
      throw new UnprocessableEntityException('Token is invalid.');
    }

    const cachedToken = await this.cacheManager.get<string>(data.email);
    if (cachedToken !== dto.token) {
      throw new UnprocessableEntityException('Token is invalid.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    await this.userRepository.update(
      { email: data.email },
      { password: hashedPassword },
    );
    await this.cacheManager.del(data.email);

    return 'Password reset successfully';
  }
}

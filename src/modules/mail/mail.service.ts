import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { MailerService } from '@nestjs-modules/mailer';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { User } from '../user/entities/user.entity';
import { MAIL_QUEUE, RESET_PASSWORD_CONFIRMATION_JOB } from './mail.constants';

interface EmailTokenPayload {
  email: string;
}

interface ConfirmEmailTokenResponse {
  isValid: boolean;
  email?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  private getResetPasswordLink(token: string): string {
    const baseUrl = this.configService.get(
      'FRONTEND_EMAIL_PASSWORD_RESET_URL',
      'http://localhost:3001/reset-password',
    );
    return `${baseUrl}?token=${token}`;
  }

  private generateEmailToken(user: User, options?: JwtSignOptions): string {
    const payload: EmailTokenPayload = { email: user.email };
    return this.jwtService.sign(payload, options);
  }

  confirmEmailToken(token: string): ConfirmEmailTokenResponse {
    try {
      const data = this.jwtService.verify(token) as EmailTokenPayload;
      return { isValid: true, email: data.email };
    } catch {
      this.logger.debug('Email token verification failed.');
      return { isValid: false };
    }
  }

  async sendResetPasswordConfirmation(user: User): Promise<void> {
    const token = this.generateEmailToken(user, { expiresIn: '600s' });
    await this.cacheManager.set(user.email, token, 600 * 1000);

    const url = this.getResetPasswordLink(token);

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'RomTek Electronics - Reset your password',
      template: './reset-password',
      context: {
        name: user.email,
        url,
      },
    });
  }

  sendResetPasswordConfirmationQueued(user: User): Promise<unknown> {
    return this.mailQueue.add(
      RESET_PASSWORD_CONFIRMATION_JOB,
      { user },
      {
        delay: 1000,
        attempts: 3,
        removeOnComplete: true,
        removeOnFail: { age: 86400 },
      },
    );
  }
}

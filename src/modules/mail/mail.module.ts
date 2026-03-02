import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { join } from 'path';
import { MailService } from './mail.service';
import { MailProcessor } from './processors/mail.processor';
import { MAIL_QUEUE } from './mail.constants';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get('MAIL_HOST', 'localhost'),
          port: config.get<number>('MAIL_PORT', 1025),
          secure: config.get('MAIL_ENCRYPTED') === 'true',
          auth:
            config.get('MAIL_USER') && config.get('MAIL_PASSWORD')
              ? {
                  user: config.get('MAIL_USER'),
                  pass: config.get('MAIL_PASSWORD'),
                }
              : undefined,
        },
        defaults: {
          from: `"RomTek Electronics" <${config.get('MAIL_FROM', 'noreply@romtek.ro')}>`,
        },
        template: {
          dir: join(__dirname, './templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
    BullModule.registerQueue({
      name: MAIL_QUEUE,
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get(
          'JWT_EMAIL_SECRET',
          'rtk-dev-jwt-email-secret-do-not-use-in-production',
        ),
        signOptions: { expiresIn: '1800s' },
      }),
    }),
  ],
  providers: [MailService, MailProcessor],
  exports: [MailService],
})
export class MailModule {}

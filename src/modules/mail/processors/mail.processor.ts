import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { MailService } from '../mail.service';
import { User } from '../../user/entities/user.entity';
import { MAIL_QUEUE, RESET_PASSWORD_CONFIRMATION_JOB } from '../mail.constants';

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<{ user: User }>): Promise<void> {
    switch (job.name) {
      case RESET_PASSWORD_CONFIRMATION_JOB:
        this.logger.debug('Start reset password confirmation email sending...');
        await this.mailService.sendResetPasswordConfirmation(job.data.user);
        this.logger.debug('Reset password confirmation email sent.');
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} (${job.name}) failed: ${error.message}`,
      error.stack,
    );
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.error(
      `An error has occurred in ${MAIL_QUEUE} worker: ${error.message}`,
      error.stack,
    );
  }
}

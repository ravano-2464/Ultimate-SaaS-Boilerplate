import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EMAIL_JOB, EMAIL_QUEUE } from './email.constants';

@Injectable()
export class EmailService {
  constructor(@InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue) {}

  async queueWelcomeEmail(payload: {
    to: string;
    name: string;
    tenantName: string;
  }): Promise<void> {
    await this.emailQueue.add(EMAIL_JOB.WELCOME, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    });
  }

  async queueTenantInviteEmail(payload: {
    to: string;
    tenantName: string;
    role: string;
    invitedBy: string;
  }): Promise<void> {
    await this.emailQueue.add(EMAIL_JOB.INVITE_MEMBER, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    });
  }
}

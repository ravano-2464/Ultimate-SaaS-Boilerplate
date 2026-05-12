import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import nodemailer from 'nodemailer';
import { EMAIL_JOB, EMAIL_QUEUE } from './email.constants';

type WelcomeEmailPayload = {
  to: string;
  name: string;
  tenantName: string;
};

type InviteEmailPayload = {
  to: string;
  tenantName: string;
  role: string;
  invitedBy: string;
};

@Injectable()
@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async process(
    job: Job<WelcomeEmailPayload | InviteEmailPayload>,
  ): Promise<void> {
    const transport = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'localhost'),
      port: Number(this.configService.get<string>('SMTP_PORT', '1025')),
      secure: false,
      auth:
        this.configService.get<string>('SMTP_USER') &&
        this.configService.get<string>('SMTP_PASS')
          ? {
              user: this.configService.getOrThrow<string>('SMTP_USER'),
              pass: this.configService.getOrThrow<string>('SMTP_PASS'),
            }
          : undefined,
    });

    const from = this.configService.get<string>(
      'MAIL_FROM',
      'noreply@ultimate-saas.local',
    );

    if (job.name === EMAIL_JOB.WELCOME) {
      const payload = job.data as WelcomeEmailPayload;
      await transport.sendMail({
        from,
        to: payload.to,
        subject: `Welcome to ${payload.tenantName}`,
        text: `Hi ${payload.name},\n\nYour workspace "${payload.tenantName}" is ready.\n\n- Ultimate SaaS`,
      });
      this.logger.log(`Sent welcome email to ${payload.to}`);
      return;
    }

    if (job.name === EMAIL_JOB.INVITE_MEMBER) {
      const payload = job.data as InviteEmailPayload;
      await transport.sendMail({
        from,
        to: payload.to,
        subject: `You've been invited to ${payload.tenantName}`,
        text: `${payload.invitedBy} invited you as ${payload.role} in ${payload.tenantName}.`,
      });
      this.logger.log(`Sent invitation email to ${payload.to}`);
    }
  }
}

import type { EmailMessage, EmailSender } from '@project/application/ports/email-sender';
import nodemailer from 'nodemailer';

import type { InstanceConfig } from '../config/instance-config';

export interface SmtpEmailSenderOptions {
  host: string;
  port: number;
  user: string | undefined;
  password: string | undefined;
  secure: boolean;
  from: string;
}

/**
 * SMTP `EmailSender` via nodemailer (D33). Uses the instance SMTP settings;
 * company-level SMTP override arrives with company configuration (ADR-0014).
 */
export class SmtpEmailSender implements EmailSender {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(options: SmtpEmailSenderOptions) {
    this.from = options.from;
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      ...(options.user !== undefined && options.user !== ''
        ? { auth: { user: options.user, pass: options.password ?? '' } }
        : {}),
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  }
}

/** Build the SMTP sender from the instance configuration. */
export function createSmtpEmailSender(config: InstanceConfig): EmailSender {
  return new SmtpEmailSender({
    host: config.SMTP_HOST ?? '',
    port: config.SMTP_PORT,
    secure: config.SMTP_TLS,
    from: config.SMTP_FROM,
    user: config.SMTP_USER,
    password: config.SMTP_PASSWORD,
  });
}

import type { EmailMessage, EmailSender } from '@project/application/ports/email-sender';

/**
 * A no-op `EmailSender` for instances with no SMTP configured. Email sending
 * never blocks or fails the flow it belongs to (REQ-SEC-013 reset, etc.); an
 * instance without SMTP simply does not deliver. Swap in the real adapter once
 * SMTP is configured.
 */
export class NoopEmailSender implements EmailSender {
  async send(_message: EmailMessage): Promise<void> {
    // Intentionally does nothing.
  }
}

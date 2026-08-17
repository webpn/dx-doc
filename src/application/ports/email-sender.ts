/**
 * Email delivery port (REQ-SEC-013 reset, REQ-VER-009 publication, SMTP D33).
 * Sending is fire-and-forget from the caller's perspective: the port resolves
 * once the message is handed to the transport. Delivery failures must not
 * fail an otherwise-successful request.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

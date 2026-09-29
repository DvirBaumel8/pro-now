/**
 * Outgoing email, vendor-neutral (CLAUDE.md §6). Mailpit speaks SMTP locally;
 * production uses Resend's HTTPS API on Render Free.
 */
export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailProvider {
  send(email: OutgoingEmail): Promise<void>;
}

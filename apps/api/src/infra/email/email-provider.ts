/**
 * Outgoing email, vendor-neutral (CLAUDE.md §6). SMTP is the only adapter:
 * Mailpit speaks it locally and Resend speaks it in production
 * (docs/21 §0), so going live is SMTP_URL, not code.
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

import nodemailer from "nodemailer";
import type { EmailProvider, OutgoingEmail } from "./email-provider.js";

export function createSmtpEmailProvider(smtpUrl: string, from: string): EmailProvider {
  const transport = nodemailer.createTransport(smtpUrl);
  return {
    async send(email: OutgoingEmail) {
      await transport.sendMail({ from, ...email });
    },
  };
}

/**
 * For a local run with no SMTP_URL: refuses loudly instead of pretending
 * the email went out. loadEnv already refuses staging/production without it.
 */
export const unconfiguredEmailProvider: EmailProvider = {
  async send() {
    throw new Error("Email is not configured: set SMTP_URL (locally: docker compose up, SMTP_URL=smtp://localhost:1025).");
  },
};

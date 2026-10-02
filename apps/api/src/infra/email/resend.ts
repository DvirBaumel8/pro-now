import type { EmailProvider, OutgoingEmail } from "./email-provider.js";

const RESEND_EMAILS_URL = "https://api.resend.com/emails";

export function createResendEmailProvider(
  apiKey: string,
  from: string,
  fetchImpl: typeof fetch = fetch
): EmailProvider {
  return {
    async send(email: OutgoingEmail) {
      const response = await fetchImpl(RESEND_EMAILS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [email.to],
          subject: email.subject,
          text: email.text,
          html: email.html,
        }),
      });

      if (response.ok) return;

      const details = (await response.text()).trim().slice(0, 500);
      const safeDetails = details.replaceAll(apiKey, "[REDACTED]");
      throw new Error(`Resend email request failed (${response.status})${safeDetails ? `: ${safeDetails}` : ""}`);
    },
  };
}

import type { AlertNotifier } from "./alert-notifier.js";

/** Telegram's own limit for one message. */
const MAX_MESSAGE_LENGTH = 4096;
const SEND_TIMEOUT_MS = 5000;

export function createTelegramAlertNotifier(
  botToken: string,
  chatId: string,
  fetchImpl: typeof fetch = fetch
): AlertNotifier {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  return {
    name: "telegram",
    async send(html: string) {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: html.length > MAX_MESSAGE_LENGTH ? html.slice(0, MAX_MESSAGE_LENGTH - 1) + "…" : html,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
      if (response.ok) return;

      // The token is part of the URL, and an error message that quoted it
      // would put the bot's credential into the very logs it reports on.
      const details = (await response.text()).trim().slice(0, 300).replaceAll(botToken, "[REDACTED]");
      throw new Error(`Telegram sendMessage failed (${response.status})${details ? `: ${details}` : ""}`);
    },
  };
}

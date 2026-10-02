/**
 * Where an alert goes, vendor-neutral (CLAUDE.md §6). The one adapter
 * today is a Telegram bot (docs/16-DEPLOYMENT.md §Observability); the
 * text is Telegram's HTML subset, which any other chat vendor can be
 * adapted from.
 */
export interface AlertNotifier {
  readonly name: string;
  /** Sends one message. Rejects on failure; the caller decides what that means. */
  send(html: string): Promise<void>;
}

/** No destination configured: the error is still logged and, with a DSN, in Sentry. */
export const noopAlertNotifier: AlertNotifier = {
  name: "none",
  async send() {},
};

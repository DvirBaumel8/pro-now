import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { createErrorReporter } from "../observability/error-reporter.js";
import { createMonitor, type Monitor } from "../observability/monitor.js";
import { noopAlertNotifier } from "../infra/alerts/alert-notifier.js";
import { createTelegramAlertNotifier } from "../infra/alerts/telegram.js";

/**
 * Error reporting and alerting (docs/23-OBSERVABILITY.md). Registered
 * first, so everything after it — including a plugin that fails to boot —
 * can report through `app.monitor`.
 */
declare module "fastify" {
  interface FastifyInstance {
    monitor: Monitor;
  }
}

export default fp(async (app: FastifyInstance) => {
  const c = app.config;
  const reporter = createErrorReporter(c);
  const notifier =
    c.ALERT_TELEGRAM_BOT_TOKEN && c.ALERT_TELEGRAM_CHAT_ID
      ? createTelegramAlertNotifier(c.ALERT_TELEGRAM_BOT_TOKEN, c.ALERT_TELEGRAM_CHAT_ID)
      : noopAlertNotifier;

  const monitor = createMonitor({
    reporter,
    notifier,
    environment: c.NODE_ENV,
    release: c.RENDER_GIT_COMMIT,
    sentryOrgUrl: c.SENTRY_ORG_URL,
    throttleWindowMs: c.ALERT_THROTTLE_MINUTES * 60_000,
    maxPerHour: c.ALERT_MAX_PER_HOUR,
    log: app.log,
  });
  app.decorate("monitor", monitor);

  app.addHook("onClose", async () => {
    monitor.dispose();
    await monitor.flush(2000);
  });

  app.log.info({ errorStore: reporter.name, alerts: notifier.name }, "Error reporting configured");
});

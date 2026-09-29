import * as Sentry from "@sentry/node";
import { scrubText } from "@pro-now/types";
import type { Env } from "@pro-now/config";

/**
 * Where the full detail of an error is kept for later investigation,
 * vendor-neutral (CLAUDE.md §6). Sentry today (docs/23-OBSERVABILITY.md);
 * without a DSN nothing is kept beyond the log line.
 */
export interface ErrorContext {
  requestId?: string;
  method?: string;
  route?: string;
  userId?: string;
  source: string;
}

export interface ErrorReporter {
  readonly name: string;
  /** Returns the stored event's id, so an alert can link to it. */
  capture(error: unknown, context: ErrorContext): string | undefined;
  /** Waits for queued reports to be sent, e.g. before the process exits. */
  flush(timeoutMs: number): Promise<void>;
}

export const noopErrorReporter: ErrorReporter = {
  name: "none",
  capture: () => undefined,
  flush: async () => {},
};

type ScrubbableEvent = {
  message?: string;
  exception?: { values?: Array<{ value?: string }> };
  breadcrumbs?: Array<{ message?: string; data?: Record<string, unknown> }>;
  request?: { url?: string; query_string?: unknown; cookies?: unknown; data?: unknown; headers?: Record<string, string> };
  user?: { id?: string | number };
};

/**
 * The last line of defence before an event leaves the process: the same
 * scrub the alerts get, plus the parts of a request that are personal by
 * construction (cookies, body, auth headers). The user is reduced to an id.
 */
export function scrubSentryEvent<E extends ScrubbableEvent>(event: E): E {
  if (event.message) event.message = scrubText(event.message);
  for (const v of event.exception?.values ?? []) if (v.value) v.value = scrubText(v.value);
  for (const b of event.breadcrumbs ?? []) {
    if (b.message) b.message = scrubText(b.message);
    if (typeof b.data?.url === "string") b.data.url = scrubText(b.data.url);
  }
  if (event.request) {
    if (event.request.url) event.request.url = scrubText(event.request.url);
    delete event.request.query_string;
    delete event.request.cookies;
    delete event.request.data;
    const headers = event.request.headers;
    if (headers) {
      for (const key of Object.keys(headers)) {
        if (/^(cookie|authorization|x-api-key|set-cookie)$/i.test(key)) delete headers[key];
      }
    }
  }
  if (event.user) event.user = event.user.id === undefined ? {} : { id: event.user.id };
  return event;
}

let initialised = false;

export function createErrorReporter(config: Env): ErrorReporter {
  if (!config.SENTRY_DSN) return noopErrorReporter;

  if (!initialised) {
    Sentry.init({
      dsn: config.SENTRY_DSN,
      environment: config.NODE_ENV,
      release: config.RENDER_GIT_COMMIT,
      // Nothing personal by default: no cookies, bodies, query strings,
      // database values or local variables (which would hold whatever the
      // failing function was holding — an address, a phone number).
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: { request: { allow: ["user-agent", "content-type", "accept-language"] }, response: false },
        httpBodies: [],
        urlQueryParams: false,
        databaseQueryData: false,
        stackFrameVariables: false,
      },
      // Errors only. Performance tracing would spend the free quota on
      // requests that worked.
      tracesSampleRate: 0,
      beforeSend: (event) => scrubSentryEvent(event),
      beforeBreadcrumb: (crumb) => {
        if (crumb.message) crumb.message = scrubText(crumb.message);
        if (typeof crumb.data?.url === "string") crumb.data.url = scrubText(crumb.data.url);
        return crumb;
      },
    });
    initialised = true;
  }

  return {
    name: "sentry",
    capture(error, context) {
      return Sentry.withScope((scope) => {
        scope.setTag("source", context.source);
        if (context.requestId) scope.setTag("requestId", context.requestId);
        if (context.route) scope.setTag("route", `${context.method ?? ""} ${context.route}`.trim());
        if (context.userId) scope.setUser({ id: context.userId });
        return Sentry.captureException(error);
      });
    },
    async flush(timeoutMs) {
      await Sentry.flush(timeoutMs);
    },
  };
}

import * as Sentry from "@sentry/react";
import { ApiError } from "@pro-now/api-client";
import { errorFingerprint, scrubText } from "@pro-now/types";
import type { ClientErrorReport } from "@pro-now/validation";

/**
 * Crash reporting for the web app (docs/16-DEPLOYMENT.md §Observability).
 *
 * Every crash goes two ways:
 * - to Sentry, when this build has a DSN, which keeps the stack, the
 *   breadcrumbs (screens, API calls) and the browser for later;
 * - to our own server (`POST /api/v1/client-errors`), which sends the
 *   alert to the phone — with the Sentry event id when there is one, so
 *   the alert links to the details.
 *
 * The second path works without Sentry, before sign-in, and when a
 * content blocker stops the browser from reaching Sentry.
 */

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const RELEASE = (import.meta.env.VITE_RELEASE as string | undefined) || undefined;

/** Not ours to fix: extensions, a benign browser warning, and a network that is simply gone. */
export function isNoise(e: { message: string; stack?: string }, online: boolean): boolean {
  if (/ResizeObserver loop/i.test(e.message)) return true;
  if (/^Script error\.?$/i.test(e.message.trim())) return true;
  if (/(chrome|moz|safari(-web)?)-extension:\/\//.test(e.stack ?? "")) return true;
  if (!online && /Failed to fetch|Load failed|NetworkError/i.test(e.message)) return true;
  return false;
}

export type ReportKind = ClientErrorReport["kind"];

function toParts(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) return { name: error.name, message: error.message || "(no message)", stack: error.stack };
  return { name: "NonError", message: typeof error === "string" ? error : String(JSON.stringify(error) ?? error) };
}

/** The same crash from one tab is announced once a minute at most. */
const recentlySent = new Map<string, number>();
const RESEND_AFTER_MS = 60_000;

export function reportError(error: unknown, kind: ReportKind): string | undefined {
  try {
    const parts = toParts(error);
    if (isNoise(parts, navigator.onLine)) return undefined;

    const eventId = DSN ? Sentry.captureException(error, { tags: { kind } }) : undefined;

    const fp = errorFingerprint({ source: "web", ...parts });
    const last = recentlySent.get(fp);
    if (last !== undefined && Date.now() - last < RESEND_AFTER_MS) return eventId;
    recentlySent.set(fp, Date.now());

    const body: ClientErrorReport = {
      kind,
      name: parts.name.slice(0, 120),
      message: scrubText(parts.message).slice(0, 1000),
      stack: parts.stack ? scrubText(parts.stack).slice(0, 8000) : undefined,
      path: window.location.pathname.slice(0, 300),
      eventId: eventId && /^[0-9a-f]{32}$/.test(eventId) ? eventId : undefined,
      requestId: error instanceof ApiError ? error.requestId : undefined,
      release: RELEASE?.slice(0, 80),
    };
    // keepalive: the report still leaves if the crash is followed by a reload.
    void fetch("/api/v1/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify(body),
    }).catch(() => {});
    return eventId;
  } catch {
    // Reporting must never be the second crash.
    return undefined;
  }
}

/** A failed API call, kept as a breadcrumb so a later crash shows what led to it. */
export function recordApiFailure(error: unknown) {
  if (!DSN || !(error instanceof ApiError)) return;
  Sentry.addBreadcrumb({
    category: "api",
    level: error.status >= 500 ? "error" : "warning",
    message: `${error.status} ${error.code}${error.requestId ? ` req=${error.requestId}` : ""}`,
  });
}

export function setReportingUser(userId: string | null) {
  if (DSN) Sentry.setUser(userId ? { id: userId } : null);
}

export function initErrorReporting() {
  if (DSN) {
    Sentry.init({
      dsn: DSN,
      release: RELEASE,
      environment: import.meta.env.MODE,
      // Errors only; no performance tracing and no session replay.
      tracesSampleRate: 0,
      dataCollection: { userInfo: false, cookies: false, urlQueryParams: false, httpBodies: [], stackFrameVariables: false },
      // The window listeners below report through `reportError`, so that
      // every crash also reaches our server; Sentry's own would count it twice.
      integrations: (defaults) => defaults.filter((i) => i.name !== "GlobalHandlers"),
      beforeSend(event) {
        if (event.message) event.message = scrubText(event.message);
        for (const v of event.exception?.values ?? []) if (v.value) v.value = scrubText(v.value);
        if (event.request?.url) event.request.url = scrubText(event.request.url);
        return event;
      },
      beforeBreadcrumb(crumb) {
        if (crumb.message) crumb.message = scrubText(crumb.message);
        if (typeof crumb.data?.url === "string") crumb.data.url = scrubText(crumb.data.url);
        if (typeof crumb.data?.to === "string") crumb.data.to = crumb.data.to.split("?")[0];
        if (typeof crumb.data?.from === "string") crumb.data.from = crumb.data.from.split("?")[0];
        return crumb;
      },
    });
  }

  window.addEventListener("error", (e) => reportError(e.error ?? e.message, "error"));
  window.addEventListener("unhandledrejection", (e) => reportError(e.reason, "unhandledrejection"));
}

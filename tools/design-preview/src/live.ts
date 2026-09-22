/**
 * THE PREVIEW, READING THE REAL SERVER.
 *
 * ---------------------------------------------------------------------
 * WHY A GALLERY GETS A LIVE MODE
 * ---------------------------------------------------------------------
 * This tool exists to answer "does this screen look right" without a
 * simulator, and it has always answered it against fixtures — a leak at a
 * fixed address, a plumber with a fixed name, an ETA of eight minutes
 * forever. That is the correct default and it stays the default: the
 * automated checks (`verify:screens`, `verify:a11y`, `verify:game`) must
 * be able to run with no server and no database, and they must see the
 * same pixels every time.
 *
 * But "does this screen look right" has a second half that fixtures
 * cannot reach: does it look right when the name is nine characters
 * instead of four, when the ETA is a number nobody chose, when the search
 * takes eleven seconds instead of five because a real engine is ranking
 * real candidates. Every screen in this product is a claim about
 * something the server said, and a fixture is the claim without the
 * saying.
 *
 * So: `?live=1` points the same components at the same API the mobile
 * apps use. Nothing else changes — not a component, not a layout.
 *
 * ---------------------------------------------------------------------
 * WHAT IT IS NOT
 * ---------------------------------------------------------------------
 * It is not a third client. `/CLAUDE.md §8` calls this tool a
 * developer-only gallery and not a shipping target, and that is still
 * true: there is no build of this that goes to a store, and the sign-in
 * below works only because a local server hands back the OTP it just
 * generated. Against any server that does not, live mode simply cannot
 * start, and says so.
 *
 * The honesty banner is the point of contact. In fixture mode it says
 * there is no server. In live mode it must not — which is precisely why
 * this file exists rather than a flag that quietly swaps the numbers.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { JobMatchView } from "@pro-now/types";

/**
 * Where the API is. Same host as the page, port 4000 — which is what
 * makes this work unchanged from a laptop and from a phone on the same
 * Wi-Fi, where the host is the laptop's LAN address rather than
 * `localhost`. Overridable for the case where it is somewhere else.
 */
export function apiBase(): string {
  const override = new URLSearchParams(window.location.search).get("api");
  if (override) return override.replace(/\/$/, "");
  return `${window.location.protocol}//${window.location.hostname}:4000`;
}

export function isLiveRequested(): boolean {
  const q = new URLSearchParams(window.location.search);
  return q.get("live") === "1" || q.get("live") === "true";
}

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

async function call<T>(
  path: string,
  init: { method?: string; token?: string | null; body?: unknown; idem?: string } = {}
): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  if (init.idem) headers["idempotency-key"] = init.idem;

  const res = await fetch(apiBase() + path, {
    method: init.method ?? "GET",
    headers,
    body: init.method && init.method !== "GET" ? JSON.stringify(init.body ?? {}) : undefined,
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* a non-JSON body is itself the error */
  }

  if (!res.ok) {
    const body = json as { code?: string; message?: string } | null;
    throw new ApiError(res.status, body?.code ?? "UNKNOWN", body?.message ?? text.slice(0, 200));
  }
  return json as T;
}

/**
 * The demonstration customer. One phone number, so repeated runs land on
 * the same person and their saved address rather than filling the
 * database with strangers.
 */
const PREVIEW_PHONE = "+972500000900";

async function signIn(): Promise<string> {
  const requested = await call<{ ok: boolean; sandboxHint?: string }>(
    "/v1/auth/otp/request",
    { method: "POST", body: { phone: PREVIEW_PHONE } }
  );
  if (!requested.sandboxHint) {
    // A server that does not hand back the code is not a local sandbox,
    // and this preview has no business signing in to it.
    throw new ApiError(400, "NOT_A_SANDBOX", "This server does not return a sandbox OTP");
  }
  const verified = await call<{ token: string }>("/v1/auth/otp/verify", {
    method: "POST",
    body: { phone: PREVIEW_PHONE, code: requested.sandboxHint },
  });
  return verified.token;
}

interface CatalogService {
  id: string;
  code: string;
  nameHe: string;
}

function servicesFrom(catalog: unknown): CatalogService[] {
  // The catalogue is nested department -> category -> service, and the
  // preview only needs the leaves. Walked rather than typed against,
  // because the shape belongs to the API contract and not to this tool.
  const out: CatalogService[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    if (typeof obj.code === "string" && typeof obj.id === "string" && "priceModel" in obj) {
      out.push({ id: obj.id, code: obj.code, nameHe: String(obj.nameHe ?? obj.code) });
    }
    Object.values(obj).forEach(walk);
  };
  walk(catalog);
  return out;
}

export type LivePhase =
  | "CONNECTING"
  | "IDLE"
  | "SEARCHING"
  | "MATCHED"
  | "EN_ROUTE"
  | "ARRIVED"
  | "WORKING"
  | "DONE"
  | "NOBODY"
  | "ERROR";

export interface LiveJob {
  phase: LivePhase;
  /** The real match, in the same shape the fixtures use. Null until assigned. */
  match: JobMatchView | null;
  jobStatus: string | null;
  jobId: string | null;
  error: string | null;
  /** Start a real request for this service code. */
  request: (serviceCode: string) => void;
  services: CatalogService[];
}

/** Job statuses mapped onto what the screens need to know. */
function phaseFor(status: string): LivePhase {
  switch (status) {
    case "DRAFT":
    case "SEARCHING":
    case "OFFERING":
      return "SEARCHING";
    case "PRO_ASSIGNED":
      return "MATCHED";
    case "PRO_EN_ROUTE":
      return "EN_ROUTE";
    case "PRO_ARRIVED":
    case "DIAGNOSIS":
    case "WAITING_QUOTE_APPROVAL":
      return "ARRIVED";
    case "IN_PROGRESS":
      return "WORKING";
    case "CANCELLED":
      return "NOBODY";
    default:
      return "DONE";
  }
}

const POLL_MS = 2000;

/**
 * One live job, polled. Polling rather than the job WebSocket for the
 * same reason `useJobWatch` gives on the customer app: the socket is
 * specified and the poll is what exists, and a preview is the wrong place
 * to be the first user of a transport.
 */
export function useLiveJob(enabled: boolean): LiveJob {
  const [phase, setPhase] = useState<LivePhase>(enabled ? "CONNECTING" : "IDLE");
  const [match, setMatch] = useState<JobMatchView | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<CatalogService[]>([]);

  const token = useRef<string | null>(null);
  const addressId = useRef<string | null>(null);
  const askedForMatch = useRef(false);

  // Connect once: sign in, read the catalogue, make sure there is an address.
  useEffect(() => {
    if (!enabled) return;
    let alive = true;

    (async () => {
      try {
        token.current = await signIn();
        const catalog = await call<unknown>("/v1/catalog");
        if (!alive) return;
        setServices(servicesFrom(catalog));

        const existing = await call<{ addresses?: Array<{ id: string }> }>("/v1/me/addresses", {
          token: token.current,
        }).catch(() => ({ addresses: [] }));
        const first = existing.addresses?.[0];
        if (first) {
          addressId.current = first.id;
        } else {
          const created = await call<{ address: { id: string } }>("/v1/me/addresses", {
            method: "POST",
            token: token.current,
            body: {
              formatted: "פלורנטין 12, תל אביב",
              lat: 32.056,
              lng: 34.77,
              label: "בית",
            },
          });
          addressId.current = created.address.id;
        }
        if (!alive) return;
        setPhase("IDLE");
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : String(err));
        setPhase("ERROR");
      }
    })();

    return () => {
      alive = false;
    };
  }, [enabled]);

  const request = useCallback(
    (serviceCode: string) => {
      const service = services.find((s) => s.code === serviceCode) ?? services[0];
      if (!token.current || !addressId.current || !service) return;
      askedForMatch.current = false;
      setMatch(null);
      setPhase("SEARCHING");

      void (async () => {
        try {
          const created = await call<{ job: { id: string; status: string } }>("/v1/jobs", {
            method: "POST",
            token: token.current,
            idem: `preview-${Date.now()}`,
            body: {
              serviceId: service.id,
              addressId: addressId.current,
              description: "בקשה מתצוגת העיצוב",
              structuredAnswers: {},
            },
          });
          setJobId(created.job.id);
          setJobStatus(created.job.status);
          setPhase(phaseFor(created.job.status));
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
          setPhase("ERROR");
        }
      })();
    },
    [services]
  );

  // Poll the job while one is live.
  useEffect(() => {
    if (!enabled || !jobId) return;
    let alive = true;

    const tick = async () => {
      try {
        const { job } = await call<{ job: { status: string; assignedProfessionalId: string | null } }>(
          `/v1/jobs/${jobId}`,
          { token: token.current }
        );
        if (!alive) return;
        setJobStatus(job.status);
        setPhase(phaseFor(job.status));

        // Same guard the customer app uses: ask who is coming only once
        // somebody is, and keep refreshing the ETA after that.
        if (job.assignedProfessionalId) {
          try {
            const m = await call<JobMatchView>(`/v1/jobs/${jobId}/match`, { token: token.current });
            if (alive) {
              setMatch(m);
              askedForMatch.current = true;
            }
          } catch {
            /* Assigned but unreadable — keep the last real answer. */
          }
        }
      } catch {
        /* A blip is not news. The next tick will say. */
      }
    };

    void tick();
    const timer = setInterval(() => void tick(), POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [enabled, jobId]);

  return { phase, match, jobStatus, jobId, error, request, services };
}

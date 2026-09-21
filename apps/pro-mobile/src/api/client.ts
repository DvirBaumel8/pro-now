import Constants from "expo-constants";
import type {
  OfferCardView,
  ProJobDetailView,
  ProServiceEligibilityView,
  ProfessionalVerificationView,
  ProPresenceState,
  QuoteView,
} from "@pro-now/types";

const BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? "http://localhost:4000";

let sessionToken: string | null = null;
export function setSessionToken(token: string | null) {
  sessionToken = token;
}


/**
 * AN ERROR THAT SAYS WHETHER THE SERVER ANSWERED.
 *
 * Every failure used to arrive as a bare `Error`, so a caller could not
 * tell "the server refused this" from "the request never got there" — and
 * on the professional's accept those are opposite facts. A refusal means
 * somebody else took the job. A transport failure means we do not know
 * whether it was taken, and quietly returning them to the shift screen
 * leaves them waiting for offers while a customer waits for them.
 *
 * `code` is the server's own error code when there was a response, and
 * null when there was not.
 */
export class ApiError extends Error {
  readonly code: string | null;
  readonly status: number | null;
  constructor(message: string, code: string | null, status: number | null) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
  /** True when nothing came back — the outcome is genuinely unknown. */
  get unreachable(): boolean {
    return this.status === null;
  }
}

/**
 * The API's error envelope is `{ code, message }` (/docs/06-API-SPEC.md),
 * but a failed request can also return a proxy's HTML or nothing at all —
 * so the body is narrowed rather than trusted.
 */
function serverMessage(body: unknown): string | undefined {
  if (typeof body === "object" && body !== null && "message" in body) {
    const { message } = body as { message: unknown };
    if (typeof message === "string") return message;
  }
  return undefined;
}

function serverCode(body: unknown): string | null {
  if (typeof body === "object" && body !== null && "code" in body) {
    const { code } = body as { code: unknown };
    if (typeof code === "string") return code;
  }
  return null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
  /*
   * The transport failure is caught SEPARATELY from the refusal, because
   * they are different facts and the caller needs to tell them apart.
   */
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : `Could not reach ${path}`,
      null,
      null
    );
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      serverMessage(body) ?? `Request to ${path} failed with ${res.status}`,
      serverCode(body),
      res.status
    );
  }
  return body as T;
}

/** See /docs/06-API-SPEC.md — professional-facing endpoints this app's signature screens need. */
export const api = {
  startShift: (input: { enabledServiceIds: string[]; lat: number; lng: number }) =>
    request<{ sessionId: string; presenceState: ProPresenceState }>("/v1/pro/shifts", { method: "POST", body: JSON.stringify(input) }),
  endShift: (sessionId: string) => request<{ ok: boolean }>(`/v1/pro/shifts/${sessionId}/end`, { method: "POST" }),
  pingLocation: (input: { lat: number; lng: number; capturedAt: string }) =>
    request<{ ok: boolean }>("/v1/pro/location", { method: "POST", body: JSON.stringify(input) }),
  /** The live offer, or null when there is none (204). */
  getCurrentOffer: () => request<OfferCardView | null>("/v1/pro/offers/current"),
  acceptOffer: (offerId: string) => request<{ ok: boolean; jobId: string }>(`/v1/offers/${offerId}/accept`, { method: "POST" }),
  skipOffer: (offerId: string) => request<{ ok: boolean }>(`/v1/offers/${offerId}/skip`, { method: "POST" }),
  arrive: (jobId: string) => request<{ ok: boolean }>(`/v1/jobs/${jobId}/arrive`, { method: "POST" }),
  startService: (jobId: string) => request<{ ok: boolean }>(`/v1/jobs/${jobId}/start`, { method: "POST" }),
  sendQuote: (jobId: string, lineItems: Array<{ description: string; quantity: number; unitPriceMinorUnits: number }>) =>
    request<{ quote: QuoteView }>(`/v1/jobs/${jobId}/quotes`, { method: "POST", body: JSON.stringify({ lineItems }) }),
  complete: (jobId: string) => request<{ ok: boolean }>(`/v1/jobs/${jobId}/complete`, { method: "POST" }),
  getEarnings: () =>
    request<{
      netMinorUnits: number;
      /** Null when no charge rows exist. Never a percentage of net. */
      grossMinorUnits: number | null;
      currency: string;
      jobCount: number;
    }>("/v1/pro/earnings"),
  getVerification: () => request<{ professional: ProfessionalVerificationView }>("/v1/pro/verification"),
  /*
   * Which services this professional may go online for, decided by the
   * server. The app used to list two hard-coded ids with switches beside
   * them, for every professional in the marketplace.
   */
  getServices: () => request<{ services: ProServiceEligibilityView[] }>("/v1/pro/services"),
  /*
   * The assigned job, with the full address — released only because it IS
   * assigned (/docs/12-PRIVACY.md). Before this existed the job screens
   * showed the same Tel Aviv street to every professional on every job.
   */
  getProJob: (jobId: string) => request<ProJobDetailView>(`/v1/pro/jobs/${jobId}`),
  depart: (jobId: string) => request<{ ok: boolean }>(`/v1/jobs/${jobId}/en-route`, { method: "POST" }),
};

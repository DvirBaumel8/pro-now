import Constants from "expo-constants";
import type {
  OfferCardView,
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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new Error(serverMessage(body) ?? `Request to ${path} failed with ${res.status}`);
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
  getEarnings: () => request<{ netMinorUnits: number; currency: string; jobCount: number }>("/v1/pro/earnings"),
  getVerification: () => request<{ professional: ProfessionalVerificationView }>("/v1/pro/verification"),
};

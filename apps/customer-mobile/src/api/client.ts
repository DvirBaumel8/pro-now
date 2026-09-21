import Constants from "expo-constants";
import type {
  AddressView,
  CatalogResponse,
  DispatchResultView,
  JobMatchView,
  JobView,
  ReviewView,
} from "@pro-now/types";

/**
 * Thin typed fetch wrapper — see /docs/06-API-SPEC.md. A fuller generated
 * client lives in packages/api-client once the OpenAPI contract is
 * authored (Epic 6+); this hand-written version covers the endpoints this
 * app's signature screens need today.
 */
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
  if (!res.ok) {
    throw new Error(serverMessage(body) ?? `Request to ${path} failed with ${res.status}`);
  }
  return body as T;
}

export const api = {
  requestOtp: (phone: string) => request<{ ok: boolean; sandboxHint?: string }>("/v1/auth/otp/request", { method: "POST", body: JSON.stringify({ phone }) }),
  verifyOtp: (phone: string, code: string) => request<{ token: string; userId: string }>("/v1/auth/otp/verify", { method: "POST", body: JSON.stringify({ phone, code }) }),
  getCatalog: () => request<CatalogResponse>("/v1/catalog"),
  /*
   * The customer's saved places. Until these existed, `POST /v1/jobs`
   * could not succeed for anybody who was not in the seed data — it
   * requires an `addressId` and nothing in the API could make one.
   */
  getAddresses: () => request<{ addresses: AddressView[] }>("/v1/me/addresses"),
  createAddress: (input: { formatted: string; lat: number; lng: number; label?: string }) =>
    request<{ address: AddressView }>("/v1/me/addresses", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  createJob: (input: { serviceId: string; addressId: string; description?: string }, idempotencyKey: string) =>
    request<{ job: JobView; dispatch: DispatchResultView }>("/v1/jobs", { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify(input) }),
  getJob: (id: string) => request<{ job: JobView }>(`/v1/jobs/${id}`),
  /*
   * Stopping the request. The searching screen offered "ביטול הבקשה" and
   * then only navigated away — the job stayed SEARCHING on the server and
   * a professional could still be dispatched to somebody who believed
   * they had cancelled.
   */
  cancelJob: (id: string) => request<{ ok: boolean }>(`/v1/jobs/${id}/cancel`, { method: "POST" }),
  /** Everything the match card renders — see /docs/06-API-SPEC.md. */
  getMatch: (jobId: string) => request<JobMatchView>(`/v1/jobs/${jobId}/match`),
  approveQuote: (quoteId: string, quoteVersionHash: string, idempotencyKey: string) =>
    request<{ ok: boolean }>(`/v1/quotes/${quoteId}/approve`, { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify({ quoteVersionHash }) }),
  submitReview: (jobId: string, input: { overallRating: number; text?: string }) =>
    request<{ review: ReviewView }>(`/v1/jobs/${jobId}/reviews`, { method: "POST", body: JSON.stringify(input) }),
};

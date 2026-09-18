import Constants from "expo-constants";

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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.message ?? `Request to ${path} failed with ${res.status}`);
  }
  return body as T;
}

export const api = {
  requestOtp: (phone: string) => request<{ ok: boolean; sandboxHint?: string }>("/v1/auth/otp/request", { method: "POST", body: JSON.stringify({ phone }) }),
  verifyOtp: (phone: string, code: string) => request<{ token: string; userId: string }>("/v1/auth/otp/verify", { method: "POST", body: JSON.stringify({ phone, code }) }),
  getCatalog: () => request<{ departments: any[] }>("/v1/catalog"),
  createJob: (input: { serviceId: string; addressId: string; description?: string }, idempotencyKey: string) =>
    request<{ job: any; dispatch: any }>("/v1/jobs", { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify(input) }),
  getJob: (id: string) => request<{ job: any }>(`/v1/jobs/${id}`),
  approveQuote: (quoteId: string, quoteVersionHash: string, idempotencyKey: string) =>
    request<{ ok: boolean }>(`/v1/quotes/${quoteId}/approve`, { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify({ quoteVersionHash }) }),
  submitReview: (jobId: string, input: { overallRating: number; text?: string }) =>
    request<{ review: any }>(`/v1/jobs/${jobId}/reviews`, { method: "POST", body: JSON.stringify(input) }),
};

/**
 * The typed REST client for PRO NOW's own API (docs/06, docs/21 W2 decision B).
 *
 * Request bodies are typed by the same zod-inferred types the server parses
 * with (`@pro-now/validation`), and responses by the shared view types, so
 * client and server share one contract at compile time. No OpenAPI codegen
 * yet: that arrives if the native apps or a third party need a published
 * document.
 *
 * Authentication is the session cookie Better Auth sets (httpOnly, never
 * readable here): every call goes with `credentials: "include"` and no
 * token. Same origin in development and in production.
 */
import type { CustomerOnboardingInput, MeResponse } from "@pro-now/validation";

export interface ProNowApiClientConfig {
  /** "" for same origin (the web app); the API's origin otherwise. */
  baseUrl?: string;
  fetch?: typeof fetch;
}

/** A refused call, with the server's machine-readable code. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function createApiClient(config: ProNowApiClientConfig = {}) {
  const base = `${config.baseUrl ?? ""}/api/v1`;
  const doFetch = config.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await doFetch(`${base}${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const p = (payload ?? {}) as { code?: unknown; message?: unknown };
      throw new ApiError(
        res.status,
        typeof p.code === "string" ? p.code : "HTTP_" + res.status,
        typeof p.message === "string" ? p.message : `${method} ${path} failed with ${res.status}`
      );
    }
    return payload as T;
  }

  return {
    me: () => request<MeResponse>("GET", "/me"),
    saveOnboarding: (input: CustomerOnboardingInput) => request<{ ok: true }>("PATCH", "/me/customer", input),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

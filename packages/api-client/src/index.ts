/**
 * Shared, typed REST client scaffold for mobile/admin — see
 * /docs/06-API-SPEC.md. `apps/customer-mobile/src/api/client.ts` and
 * `apps/pro-mobile/src/api/client.ts` currently hand-roll their own thin
 * fetch wrappers for the endpoints their signature screens need; once the
 * OpenAPI contract is authored (Epic 6+, see /docs/18-ROADMAP.md) this
 * package becomes the single generated/typed client both apps and the
 * admin dashboard import, so request/response shapes can never drift
 * between them.
 */
export interface ProNowApiClientConfig {
  baseUrl: string;
  getToken?: () => string | null;
}

export function createApiClient(config: ProNowApiClientConfig) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    };
    const token = config.getToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${config.baseUrl}${path}`, { ...init, headers });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.message ?? `Request to ${path} failed with ${res.status}`);
    }
    return body as T;
  }

  return { request };
}

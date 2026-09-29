import { QueryClient, useQuery } from "@tanstack/react-query";
import { ApiError, createApiClient } from "@pro-now/api-client";

/** Same origin: the dev server proxies /api; in production Fastify serves both. */
export const api = createApiClient();

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A refused call (401/403/404) will not change by asking again.
      retry: (failures, error) => !(error instanceof ApiError && error.status < 500) && failures < 2,
      refetchOnWindowFocus: true,
    },
  },
});

export const meKey = ["me"] as const;
export const useMe = () => useQuery({ queryKey: meKey, queryFn: api.me });

import { useEffect } from "react";
import { MutationCache, QueryCache, QueryClient, useQuery } from "@tanstack/react-query";
import { ApiError, createApiClient } from "@pro-now/api-client";
import { recordApiFailure, setReportingUser } from "./observability";

/** Same origin: the dev server proxies /api; in production Fastify serves both. */
export const api = createApiClient();

export const queryClient = new QueryClient({
  // Failed calls become breadcrumbs, so a later crash report shows what led to it.
  queryCache: new QueryCache({ onError: recordApiFailure }),
  mutationCache: new MutationCache({ onError: recordApiFailure }),
  defaultOptions: {
    queries: {
      // A refused call (401/403/404) will not change by asking again.
      retry: (failures, error) => !(error instanceof ApiError && error.status < 500) && failures < 2,
      refetchOnWindowFocus: true,
    },
  },
});

export const meKey = ["me"] as const;
export function useMe() {
  const me = useQuery({ queryKey: meKey, queryFn: api.me });
  const userId = me.data?.user.id ?? null;
  // Error reports name the person by id only (docs/23-OBSERVABILITY.md).
  useEffect(() => setReportingUser(userId), [userId]);
  return me;
}

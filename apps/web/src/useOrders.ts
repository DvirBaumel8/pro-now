import { useEffect, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import type { DockOrder } from "@pro-now/ui";

import { api } from "./api";
import { dockOrdersFrom, liveOrders } from "./orders";

const DRIVING = new Set(["PRO_ASSIGNED", "PRO_EN_ROUTE"]);

/**
 * Every order under way, as the dock's chips (orders.ts), from the same reads
 * and cache keys the home and the job screen use: the job list, and the
 * match of each order on the way for its ETA.
 */
export function useOrders(focusedId: string | null = null): DockOrder[] {
  const myJobs = useQuery({ queryKey: ["my-jobs"], queryFn: api.listMyJobs, refetchInterval: 30_000 });
  const live = liveOrders(myJobs.data?.jobs ?? []);
  const driving = live.filter((j) => DRIVING.has(j.status));
  const matches = useQueries({
    queries: driving.map((j) => ({
      queryKey: ["job", j.id, "match"] as const,
      queryFn: () => api.getJobMatch(j.id),
      refetchInterval: 30_000,
    })),
  });
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (driving.length === 0) return;
    const t = setInterval(() => setNowMs(Date.now()), 5_000);
    return () => clearInterval(t);
  }, [driving.length]);
  const byJob = Object.fromEntries(driving.map((j, i) => [j.id, matches[i]?.data ?? null]));
  return dockOrdersFrom(live, byJob, focusedId, nowMs);
}

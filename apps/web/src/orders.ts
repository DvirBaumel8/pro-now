import type { JobMatchView, JobState, MyJobSummary } from "@pro-now/types";
import { pilotServiceIdForDatabaseCode } from "@pro-now/types";
import { catalogServicePages, type DockOrder, type MarkName } from "@pro-now/ui";

import { capsuleTrip } from "./activeCapsule";

/**
 * SEVERAL ORDERS AT ONCE (the demo's "ההזמנות שלך עכשיו", OrdersDock).
 *
 * Every order still under way keeps its place: a chip each, numbered by when
 * it was made, with what is happening in words, minutes and the drive's
 * progress only while the server's ETA is counting, and a quiet halo when
 * something waits on the customer. Built from the server's own job list and
 * match reads; nothing here is decided by the screen.
 */

/** Under way: from the search to confirming the end. Reviews and endings are history. */
export const LIVE_ORDER: ReadonlySet<JobState> = new Set<JobState>([
  "SEARCHING",
  "OFFERING",
  "PRO_ASSIGNED",
  "PRO_EN_ROUTE",
  "PRO_ARRIVED",
  "DIAGNOSIS",
  "WAITING_QUOTE_APPROVAL",
  "IN_PROGRESS",
  "COMPLETION_PENDING",
]);

/** Three minutes or less: "מתקרב", as the server's PRO_NEARBY. */
const NEAR_MINUTES = 3;

export interface OrderStage {
  statusHe: string;
  onSite: boolean;
  attention: boolean;
  driving: boolean;
}

/** The demo's words for each stage (its `readOrder`), from the server's state. */
export function orderStage(status: JobState, etaMinutes: number | null): OrderStage {
  switch (status) {
    case "SEARCHING":
    case "OFFERING":
      return { statusHe: "מחפשים", onSite: false, attention: false, driving: false };
    case "PRO_ASSIGNED":
    case "PRO_EN_ROUTE":
      return { statusHe: etaMinutes !== null && etaMinutes <= NEAR_MINUTES ? "מתקרב" : "בדרך", onSite: false, attention: false, driving: true };
    case "PRO_ARRIVED":
      // At the door: the code to ask for is waiting on the customer.
      return { statusHe: "ליד הדלת", onSite: true, attention: true, driving: false };
    case "DIAGNOSIS":
      return { statusHe: "בבדיקה", onSite: true, attention: false, driving: false };
    case "WAITING_QUOTE_APPROVAL":
      return { statusHe: "הצעה לאישור", onSite: true, attention: true, driving: false };
    case "IN_PROGRESS":
      return { statusHe: "בעבודה", onSite: true, attention: false, driving: false };
    case "COMPLETION_PENDING":
      return { statusHe: "לאישור סיום", onSite: true, attention: true, driving: false };
    default:
      return { statusHe: "", onSite: false, attention: false, driving: false };
  }
}

/** The live orders, oldest first. */
export function liveOrders(jobs: readonly MyJobSummary[]): MyJobSummary[] {
  return jobs.filter((j) => LIVE_ORDER.has(j.status)).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

function markFor(serviceCode: string): MarkName {
  const pilotId = pilotServiceIdForDatabaseCode(serviceCode);
  return ((pilotId && catalogServicePages[pilotId]?.mark) || "wrench") as MarkName;
}

/**
 * The dock's chips. `matches` holds the match read of each order on the way
 * (its ETA); `focusedId` is the order on screen, if any.
 */
export function dockOrdersFrom(
  jobs: readonly MyJobSummary[],
  matches: Readonly<Record<string, Pick<JobMatchView, "eta" | "etaSecondsAtAssignment"> | null | undefined>>,
  focusedId: string | null,
  nowMs: number,
): DockOrder[] {
  return liveOrders(jobs).map((job, i) => {
    const trip = capsuleTrip(job.status, matches[job.id] ?? null, nowMs);
    const stage = orderStage(job.status, trip.etaMinutes);
    return {
      id: job.id,
      seq: i + 1,
      serviceNameHe: job.serviceNameHe,
      proNameHe: job.professional?.displayName ?? null,
      mark: markFor(job.serviceCode),
      statusHe: stage.statusHe,
      etaMinutes: stage.driving ? trip.etaMinutes : null,
      progress: stage.driving ? trip.progress : null,
      onSite: stage.onSite,
      attention: stage.attention,
      focused: job.id === focusedId,
    };
  });
}

/** The dock, the switcher and the street's strip show only with two orders or more (the demo's `multiOrder`). */
export function severalOrders(orders: readonly DockOrder[]): boolean {
  return orders.length >= 2;
}

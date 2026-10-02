import { readAvailability, type AreaAvailabilityView, type ServiceSupply } from "@pro-now/demo-types";

/**
 * Which source of truth the home screen's supply numbers come from.
 *
 * This exists because of a bug that survived code review and was caught only
 * by looking at the rendered gallery: when a live snapshot expired, the
 * header correctly went quiet while the service tiles carried on displaying
 * the counts from the older, dumber prop. The freshness rule was enforced in
 * one place and silently undone one line later.
 *
 * The rule is therefore stated once, here, and tested:
 *
 *   A caller that supplies a snapshot has opted into the snapshot's
 *   lifetime. When it expires, every number on the screen becomes unknown
 *   together. There is no partial credit and no fallback, because a number
 *   that was never fresh cannot repair one that has gone stale.
 *
 * The legacy props remain supported for callers with no snapshot at all.
 */

export interface HomeSupply {
  /** Total across the area, or null when unknown. */
  total: number | null;
  /** Full supply state for one service. Always defined; UNKNOWN by default. */
  supplyFor(serviceId: string): ServiceSupply;
  /** True when a snapshot was supplied — i.e. the legacy props are ignored. */
  live: boolean;
  /** True when a snapshot was supplied but is not currently trustworthy. */
  expired: boolean;
}

export function resolveHomeSupply(args: {
  availability?: AreaAvailabilityView | null;
  nowMs?: number;
  legacyTotal?: number | null;
  legacyCounts?: Record<string, number | null | undefined>;
}): HomeSupply {
  const { availability, nowMs, legacyTotal, legacyCounts } = args;

  // `null` is an explicit "I have no snapshot right now" and still counts as
  // opting in — otherwise a caller whose fetch failed would silently fall
  // back to stale props, which is the bug this file is named after.
  const live = availability !== undefined;

  if (!live) {
    return {
      live: false,
      expired: false,
      total: legacyTotal ?? null,
      supplyFor: (id) => {
        const v = legacyCounts?.[id];
        if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
          return { state: "UNKNOWN", count: null, nearestRouteEtaMinutes: null, reasonCode: null };
        }
        return {
          state: v === 0 ? "UNAVAILABLE" : "AVAILABLE",
          count: v,
          nearestRouteEtaMinutes: null,
          reasonCode: v === 0 ? "NO_ELIGIBLE_SUPPLY" : null,
        };
      },
    };
  }

  const reading = readAvailability(availability, nowMs);
  return {
    live: true,
    expired: availability !== null && !reading.fresh,
    total: reading.total,
    supplyFor: (id) => reading.supplyFor(id),
  };
}

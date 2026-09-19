/**
 * Reading live availability safely.
 *
 * Every screen that shows "N מקצוענים זמינים עכשיו" is one cache away from
 * lying. The number is true for a few seconds and then it is just a number
 * that used to be true, which is worse than no number at all: the customer
 * acts on it, dispatch finds nobody, and the promise the product is built on
 * ("online means online") is broken by a stale variable.
 *
 * So no component is allowed to read `AreaAvailabilityView.services` itself.
 * They call `readAvailability()`, which applies the server's own freshness
 * window and returns `null` the moment the snapshot is too old. Keeping that
 * rule in one pure function makes it a unit test rather than a habit that
 * each new screen has to remember.
 */

import type { AreaAvailabilityView, ServiceAvailabilityView } from "./api";

export interface AvailabilityReading {
  areaLabel: string;
  /** Total eligible professionals online across every service in the area. */
  totalAvailableNow: number;
  byServiceId: Record<string, ServiceAvailabilityView>;
  ageSeconds: number;
}

/**
 * Returns the reading, or `null` when there is nothing trustworthy to show.
 *
 * `null` is returned for every one of: no snapshot at all, an unparseable or
 * future-dated `computedAt`, a non-positive freshness window, and a snapshot
 * older than that window. They collapse to one outcome on purpose — the UI
 * has exactly one absence state to implement, so there is no path where a
 * half-valid snapshot leaks a number onto the screen.
 */
export function readAvailability(
  snapshot: AreaAvailabilityView | null | undefined,
  nowMs: number = Date.now()
): AvailabilityReading | null {
  if (!snapshot) return null;

  const computedAtMs = Date.parse(snapshot.computedAt);
  if (Number.isNaN(computedAtMs)) return null;

  const window = snapshot.staleAfterSeconds;
  if (!Number.isFinite(window) || window <= 0) return null;

  const ageSeconds = (nowMs - computedAtMs) / 1000;
  // A snapshot from the future means the clocks disagree, and a client clock
  // is not evidence about supply. Refuse rather than guess which is right.
  if (ageSeconds < 0) return null;
  if (ageSeconds > window) return null;

  const byServiceId: Record<string, ServiceAvailabilityView> = {};
  let total = 0;
  for (const s of snapshot.services) {
    // A negative or non-integer count is a server bug. Dropping the entry is
    // the safe reading: an absent count renders as absence, whereas a
    // corrupted one would render as confident supply.
    if (!Number.isInteger(s.availableNow) || s.availableNow < 0) continue;
    byServiceId[s.serviceId] = s;
    total += s.availableNow;
  }

  return { areaLabel: snapshot.areaLabel, totalAvailableNow: total, byServiceId, ageSeconds };
}

/**
 * The count for one service, or `null` when it is unknown or untrustworthy.
 * This is what a service tile binds to, so "no data" and "zero online" stay
 * distinguishable: zero is a fact the UI states, null is a silence it admits.
 */
export function availableNowFor(
  reading: AvailabilityReading | null,
  serviceId: string
): number | null {
  if (!reading) return null;
  const entry = reading.byServiceId[serviceId];
  return entry ? entry.availableNow : null;
}

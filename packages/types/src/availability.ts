/**
 * Reading live availability safely.
 *
 * Every screen that shows "N מקצוענים זמינים עכשיו" is one cache away from
 * lying. The number is true for a few seconds and then it is just a number
 * that used to be true, which is worse than no number at all: the customer
 * acts on it, dispatch finds nobody, and the promise the product is built on
 * — online means online — is broken by a stale variable rather than by a lie
 * anyone chose to tell.
 *
 * The design rule that follows, and that this whole file exists to enforce:
 *
 *   **UNKNOWN is not UNAVAILABLE.** "We don't know" and "there is nobody"
 *   are different facts, they lead the customer to different actions, and a
 *   UI that renders them identically is wrong in one of the two cases every
 *   single time. Collapsing them is the easiest mistake here and the most
 *   expensive, because it is invisible: both render as a quiet screen.
 *
 * So `readAvailability()` never returns a bare number and never returns
 * null. It returns a state per service, and the only way to get a count out
 * of it is to have a state that justifies one.
 */

import type { AreaAvailabilityView, SupplyReasonCode, SupplyState } from "./api";

export interface ServiceSupply {
  state: SupplyState;
  /**
   * The count, and only when the state supports one. `null` whenever the
   * state is UNKNOWN — there is no code path that produces a number for a
   * service the server has not vouched for.
   */
  count: number | null;
  /**
   * Nearest professional's travel time, in minutes, from a real route
   * computation. Never a straight-line estimate dressed as an ETA.
   */
  nearestRouteEtaMinutes: number | null;
  /** Why, when the state is not AVAILABLE. May be shown or merely logged. */
  reasonCode: SupplyReasonCode | null;
}

export interface AvailabilityReading {
  /** Coarse area, or null when there is no trustworthy snapshot. */
  areaLabel: string | null;
  /** True only while the snapshot is inside the server's freshness window. */
  fresh: boolean;
  /** Total across services with a known count, or null when nothing is known. */
  total: number | null;
  /** Age in seconds, or null when there is no parseable snapshot. */
  ageSeconds: number | null;
  /** Supply for one service. Always defined; UNKNOWN when anything is off. */
  supplyFor(serviceId: string): ServiceSupply;
}

const UNKNOWN = (reasonCode: SupplyReasonCode | null = null): ServiceSupply => ({
  state: "UNKNOWN",
  count: null,
  nearestRouteEtaMinutes: null,
  reasonCode,
});

function unknownReading(reason: SupplyReasonCode | null, ageSeconds: number | null): AvailabilityReading {
  return {
    areaLabel: null,
    fresh: false,
    total: null,
    ageSeconds,
    supplyFor: () => UNKNOWN(reason),
  };
}

/**
 * Turn a snapshot into something safe to render.
 *
 * Unlike a nullable getter, this ALWAYS returns a reading. That is the
 * point: there is no "if (reading)" for a caller to forget, and no shape in
 * which a stale or malformed snapshot can hand back a number. Every failure
 * — no snapshot, unparseable timestamp, future timestamp, non-positive
 * window, expired — produces a reading whose every service is UNKNOWN.
 *
 * A future-dated snapshot is refused rather than accepted, because when the
 * clocks disagree a client clock is not evidence about supply.
 */
export function readAvailability(
  snapshot: AreaAvailabilityView | null | undefined,
  nowMs: number = Date.now()
): AvailabilityReading {
  if (!snapshot) return unknownReading(null, null);

  const computedAtMs = Date.parse(snapshot.computedAt);
  if (Number.isNaN(computedAtMs)) return unknownReading("DATA_STALE", null);

  const window = snapshot.staleAfterSeconds;
  if (!Number.isFinite(window) || window <= 0) return unknownReading("DATA_STALE", null);

  const ageSeconds = (nowMs - computedAtMs) / 1000;
  if (ageSeconds < 0) return unknownReading("DATA_STALE", ageSeconds);
  if (ageSeconds > window) return unknownReading("DATA_STALE", ageSeconds);

  const byId = new Map<string, ServiceSupply>();
  let total: number | null = null;

  for (const s of snapshot.services) {
    const supply = normaliseService(s);
    byId.set(s.serviceId, supply);
    if (supply.count !== null) total = (total ?? 0) + supply.count;
  }

  return {
    areaLabel: snapshot.areaLabel,
    fresh: true,
    total,
    ageSeconds,
    // A service the snapshot does not mention is UNKNOWN, not zero. The
    // server answering about six services says nothing about a seventh.
    supplyFor: (id) => byId.get(id) ?? UNKNOWN("NOT_COMPUTED"),
  };
}

/**
 * One service entry, defended against a server that contradicts itself.
 *
 * A count that disagrees with its state is a server bug, and the safe
 * reading of a bug is UNKNOWN: an absent count renders as absence, whereas a
 * corrupted one renders as confident supply.
 */
function normaliseService(s: AreaAvailabilityView["services"][number]): ServiceSupply {
  const count = s.availableProviderCount;
  const hasCount = typeof count === "number" && Number.isInteger(count) && count >= 0;

  const eta = s.nearestRouteEtaMinutes;
  const nearestRouteEtaMinutes =
    typeof eta === "number" && Number.isFinite(eta) && eta > 0 ? Math.round(eta) : null;

  switch (s.state) {
    case "AVAILABLE":
    case "LIMITED":
      // Claiming supply without saying how much is not a claim we can render.
      if (!hasCount || count === 0) return UNKNOWN("NOT_COMPUTED");
      return { state: s.state, count, nearestRouteEtaMinutes, reasonCode: s.reasonCode ?? null };

    case "UNAVAILABLE":
      // Zero is a real answer and must survive as one. A non-zero count
      // alongside UNAVAILABLE is a contradiction, so it is not believed.
      return {
        state: "UNAVAILABLE",
        count: hasCount && count === 0 ? 0 : null,
        nearestRouteEtaMinutes: null,
        reasonCode: s.reasonCode ?? "NO_ELIGIBLE_SUPPLY",
      };

    case "UNKNOWN":
    default:
      return UNKNOWN(s.reasonCode ?? null);
  }
}

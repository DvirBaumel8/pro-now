import type { ProPresenceState } from "@pro-now/types";

/**
 * Professional shift/presence state machine — see
 * /docs/07-JOB-STATE-MACHINE.md §Professional presence/shift state machine.
 * By construction, WORKING (SERVICING/COMPLETING) can only reach AVAILABLE
 * through COMPLETING — there is no edge that skips it.
 */
export class InvalidPresenceTransitionError extends Error {
  /** A refused transition is a conflict, not a crash — see InvalidJobTransitionError. */
  readonly statusCode = 409;
  readonly code = "INVALID_PRESENCE_TRANSITION";

  constructor(public readonly from: ProPresenceState, public readonly to: ProPresenceState) {
    super(`Invalid professional presence transition: ${from} -> ${to}`);
  }
}

const TRANSITIONS: Record<ProPresenceState, ProPresenceState[]> = {
  OFFLINE: ["STARTING_SHIFT"],
  STARTING_SHIFT: ["AVAILABLE", "OFFLINE"],
  AVAILABLE: ["OFFER_RECEIVED", "ENDING_SHIFT"],
  OFFER_RECEIVED: ["RESERVED", "AVAILABLE"], // AVAILABLE = skip/expire
  RESERVED: ["ASSIGNED", "AVAILABLE"], // AVAILABLE = lost the race / reservation failed
  ASSIGNED: ["EN_ROUTE"],
  EN_ROUTE: ["ARRIVED"],
  ARRIVED: ["SERVICING"],
  SERVICING: ["COMPLETING"],
  COMPLETING: ["AVAILABLE", "ENDING_SHIFT"],
  ENDING_SHIFT: ["OFFLINE"],
};

/**
 * A CANCELLATION IS NOT A STEP ALONG THE MACHINE.
 *
 * The job machine lets a job be cancelled from PRO_ASSIGNED,
 * PRO_EN_ROUTE, PRO_ARRIVED, WAITING_QUOTE_APPROVAL and IN_PROGRESS. The
 * presence machine above has no edge out of any of those except forward —
 * so a job cancelled after assignment left its professional stranded
 * mid-machine and invisible to dispatch for the rest of their shift,
 * punished for a cancellation that was not theirs.
 *
 * The first fix attempted was to walk them forward through the remaining
 * steps. That is worse than the bug: it writes ARRIVED for somebody who
 * never arrived, and SERVICING for work never done, into the record a
 * support agent reads back.
 *
 * So cancellation is its own edge, named as such. `TRANSITIONS` stays
 * strict — there is no ordinary way to un-arrive — and this is the one
 * documented exception. /docs/07-JOB-STATE-MACHINE.md records it.
 */
export function presenceAfterCancellation(
  from: ProPresenceState
): ProPresenceState | null {
  if (from === "AVAILABLE") return null; // nothing to release
  return COMMITTED_STATES.includes(from) ? "AVAILABLE" : null;
}

// States considered "committed to an active job" — ending a shift from
// here is blocked except via an explicit support path.
export const COMMITTED_STATES: ProPresenceState[] = [
  "OFFER_RECEIVED",
  "RESERVED",
  "ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "SERVICING",
  "COMPLETING",
];

export function isPresenceTransitionAllowed(from: ProPresenceState, to: ProPresenceState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertPresenceTransition(from: ProPresenceState, to: ProPresenceState): void {
  if (!isPresenceTransitionAllowed(from, to)) {
    throw new InvalidPresenceTransitionError(from, to);
  }
}

export function canEndShift(current: ProPresenceState, isSupportOverride = false): boolean {
  if (isSupportOverride) return true;
  return !COMMITTED_STATES.includes(current) || current === "COMPLETING";
}

import type { ProPresenceState } from "@pro-now/types";

/**
 * Professional shift/presence state machine — see
 * /docs/07-JOB-STATE-MACHINE.md §Professional presence/shift state machine.
 * By construction, WORKING (SERVICING/COMPLETING) can only reach AVAILABLE
 * through COMPLETING — there is no edge that skips it.
 */
export class InvalidPresenceTransitionError extends Error {
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

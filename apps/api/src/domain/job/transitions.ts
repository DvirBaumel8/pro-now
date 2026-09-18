import type { JobState, JobActor } from "@pro-now/types";

/**
 * The ONLY source of truth for which job-state transitions are legal.
 * See /docs/07-JOB-STATE-MACHINE.md. The server validates every mutation
 * through `assertTransition` before writing to the DB — there is no other
 * path to change `Job.status`.
 */

export class InvalidJobTransitionError extends Error {
  constructor(public readonly from: JobState, public readonly to: JobState) {
    super(`Invalid job transition: ${from} -> ${to}`);
  }
}

// Adjacency list of legal (from -> [to...]) transitions, independent of actor.
const TRANSITIONS: Record<JobState, JobState[]> = {
  DRAFT: ["SEARCHING", "CANCELLED"],
  SEARCHING: ["OFFERING", "CANCELLED"],
  OFFERING: ["PRO_ASSIGNED", "CANCELLED"],
  PRO_ASSIGNED: ["PRO_EN_ROUTE", "CANCELLED"],
  PRO_EN_ROUTE: ["PRO_ARRIVED", "CANCELLED"],
  PRO_ARRIVED: ["DIAGNOSIS", "IN_PROGRESS", "CANCELLED"],
  DIAGNOSIS: ["WAITING_QUOTE_APPROVAL", "CANCELLED"],
  WAITING_QUOTE_APPROVAL: ["IN_PROGRESS", "CANCELLED", "DISPUTED"],
  IN_PROGRESS: ["COMPLETION_PENDING", "CANCELLED", "DISPUTED"],
  COMPLETION_PENDING: ["COMPLETED"],
  COMPLETED: ["PAYMENT_PENDING"],
  PAYMENT_PENDING: ["PAYMENT_CAPTURED", "CANCELLED", "DISPUTED"],
  PAYMENT_CAPTURED: ["REVIEW_PENDING"],
  REVIEW_PENDING: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
  DISPUTED: ["CLOSED", "CANCELLED"],
};

// Cancellation/dispute transitions additionally require the acting role to
// be allowed for that specific source state — see
// /docs/05-DATABASE.md §Job transitions. Anything not listed here for a
// CANCELLED/DISPUTED target defaults to OPS/SYSTEM-only.
const CANCELLATION_ACTORS: Partial<Record<JobState, JobActor[]>> = {
  DRAFT: ["CUSTOMER", "SYSTEM"],
  SEARCHING: ["CUSTOMER", "SYSTEM", "OPS"],
  OFFERING: ["CUSTOMER", "SYSTEM", "OPS"],
  PRO_ASSIGNED: ["CUSTOMER", "PROFESSIONAL", "OPS"],
  PRO_EN_ROUTE: ["CUSTOMER", "PROFESSIONAL", "OPS"],
  PRO_ARRIVED: ["CUSTOMER", "PROFESSIONAL", "OPS"],
  WAITING_QUOTE_APPROVAL: ["CUSTOMER", "OPS"],
  IN_PROGRESS: ["OPS"], // mid-service cancellation is an Ops-mediated exception
  PAYMENT_PENDING: ["OPS", "SYSTEM"],
};

export function isTransitionAllowed(from: JobState, to: JobState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: JobState, to: JobState, actor: JobActor): void {
  if (!isTransitionAllowed(from, to)) {
    throw new InvalidJobTransitionError(from, to);
  }
  if (to === "CANCELLED" || to === "DISPUTED") {
    const allowedActors = CANCELLATION_ACTORS[from] ?? ["OPS", "SYSTEM"];
    if (!allowedActors.includes(actor)) {
      throw new Error(
        `Actor ${actor} is not permitted to move job from ${from} to ${to}. Allowed: ${allowedActors.join(", ")}`
      );
    }
  }
}

/** Whether a service with no diagnosis step (FIXED/HOURLY/DISTANCE_TIME) may skip straight to IN_PROGRESS after arrival. */
export function nextAfterArrival(requiresDiagnosis: boolean): JobState {
  return requiresDiagnosis ? "DIAGNOSIS" : "IN_PROGRESS";
}

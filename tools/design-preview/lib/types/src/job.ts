/**
 * Job & professional state machines — see /docs/07-JOB-STATE-MACHINE.md.
 * These are the ONLY valid states. The server is authoritative; a client
 * must never be able to set an arbitrary value here.
 */
export const JOB_STATES = [
  "DRAFT",
  "SEARCHING",
  "OFFERING",
  "PRO_ASSIGNED",
  "PRO_EN_ROUTE",
  "PRO_ARRIVED",
  "DIAGNOSIS",
  "WAITING_QUOTE_APPROVAL",
  "IN_PROGRESS",
  "COMPLETION_PENDING",
  "COMPLETED",
  "PAYMENT_PENDING",
  "PAYMENT_CAPTURED",
  "REVIEW_PENDING",
  "CLOSED",
  "CANCELLED",
  "DISPUTED",
] as const;
export type JobState = (typeof JOB_STATES)[number];

export const PRO_PRESENCE_STATES = [
  "OFFLINE",
  "STARTING_SHIFT",
  "AVAILABLE",
  "OFFER_RECEIVED",
  "RESERVED",
  "ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "SERVICING",
  "COMPLETING",
  "ENDING_SHIFT",
] as const;
export type ProPresenceState = (typeof PRO_PRESENCE_STATES)[number];

export const PRICE_MODELS = ["FIXED", "HOURLY", "VISIT_QUOTE", "DISTANCE_TIME"] as const;
export type PriceModel = (typeof PRICE_MODELS)[number];

export const BOOKING_MODES = ["NOW", "BOOK", "REQUEST", "HYBRID"] as const;
export type BookingMode = (typeof BOOKING_MODES)[number];

export type JobActor = "CUSTOMER" | "PROFESSIONAL" | "SYSTEM" | "OPS";

export interface JobEvent {
  id: string;
  jobId: string;
  type: string;
  actor: JobActor;
  actorId: string | null;
  metadata: Record<string, unknown>;
  requestId: string | null;
  createdAt: string;
}

import { z } from "zod";

/**
 * Shared request/response validation — enforced at every API boundary
 * server-side (never trust the client), and reused by packages/api-client
 * so mobile/admin get the same shape at compile time.
 * See /docs/06-API-SPEC.md.
 */

export const otpRequestSchema = z.object({
  phone: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, "phone must be E.164, e.g. +972501234567"),
});

export const otpVerifySchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  code: z.string().length(6),
});

export const createJobSchema = z.object({
  serviceId: z.string().min(1),
  addressId: z.string().min(1),
  description: z.string().max(2000).optional(),
  mediaRefs: z.array(z.string()).max(10).default([]),
  structuredAnswers: z.record(z.string(), z.unknown()).default({}),
});
export type CreateJobInput = z.infer<typeof createJobSchema>;

export const locationPingSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyMeters: z.number().nonnegative().optional(),
  headingDegrees: z.number().min(0).max(360).optional(),
  speedMetersPerSecond: z.number().nonnegative().optional(),
  capturedAt: z.string().datetime(),
});
export type LocationPingInput = z.infer<typeof locationPingSchema>;

export const startShiftSchema = z.object({
  enabledServiceIds: z.array(z.string()).min(1, "at least one service required to go online"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type StartShiftInput = z.infer<typeof startShiftSchema>;

export const offerResponseSchema = z.object({
  offerId: z.string().min(1),
});

export const quoteLineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPriceMinorUnits: z.number().int().nonnegative(),
  kind: z.enum(["LABOR", "MATERIALS", "OTHER"]).default("OTHER"),
});

export const createQuoteSchema = z.object({
  lineItems: z.array(quoteLineItemSchema).min(1),
  notes: z.string().max(1000).optional(),
});
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;

export const approveQuoteSchema = z.object({
  quoteId: z.string().min(1),
  quoteVersionHash: z.string().min(1),
});

export const reviewSchema = z.object({
  overallRating: z.number().int().min(1).max(5),
  professionalism: z.number().int().min(1).max(5).optional(),
  punctuality: z.number().int().min(1).max(5).optional(),
  quality: z.number().int().min(1).max(5).optional(),
  text: z.string().max(2000).optional(),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export const idempotencyKeyHeaderSchema = z.string().min(8).max(200);

// ---------------------------------------------------------------------
// Live availability
// ---------------------------------------------------------------------

/**
 * Response shape for GET /v1/areas/:areaCode/availability.
 *
 * This one is validated on the CLIENT side too, which is unusual here and
 * deliberate. Everywhere else the rule is "never trust the client"; for
 * availability the matching rule is "never trust a payload just because it
 * came from the server". A malformed count — a float, a negative, a string
 * that happens to parse — would sail into `readAvailability()` and come out
 * the other side as a confident number on a customer's screen.
 *
 * `strict()` matters as much as the field types: an unexpected extra field
 * means the client and server disagree about what this endpoint is, and
 * guessing at that point is how a rename silently becomes a wrong number.
 */
export const serviceAvailabilitySchema = z
  .object({
    serviceId: z.string().min(1),
    // Integer and non-negative: there is no such thing as 1.5 or -2 people.
    availableNow: z.number().int().nonnegative(),
    // Null is a normal, expected value — no route has been computed yet.
    nearestEtaSeconds: z.number().int().nonnegative().nullable(),
  })
  .strict();

export const areaAvailabilitySchema = z
  .object({
    areaLabel: z.string().min(1),
    computedAt: z.string().datetime(),
    // A zero or negative window would mean "trust this forever", which is the
    // opposite of what the field is for.
    staleAfterSeconds: z.number().int().positive(),
    services: z.array(serviceAvailabilitySchema),
  })
  .strict();

export type AreaAvailabilityPayload = z.infer<typeof areaAvailabilitySchema>;

/**
 * Parse a payload into something safe to read, or `null`.
 *
 * Returning null rather than throwing is the point: a failed availability
 * fetch must degrade to "we don't know right now", which every screen
 * already renders. Throwing would tempt a caller into a catch block that
 * falls back to the last good value — which is exactly the stale-number bug
 * this whole path exists to prevent.
 */
export function parseAreaAvailability(input: unknown): AreaAvailabilityPayload | null {
  const result = areaAvailabilitySchema.safeParse(input);
  return result.success ? result.data : null;
}

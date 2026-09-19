import { describe, it, expect } from "vitest";
import {
  otpRequestSchema,
  otpVerifySchema,
  createJobSchema,
  locationPingSchema,
  startShiftSchema,
  createQuoteSchema,
  reviewSchema,
} from "@pro-now/validation";

/**
 * These schemas are the server-side boundary — "never trust the client"
 * (/docs/06-API-SPEC.md). A schema that accepts junk is a security hole,
 * so the rejections are the point of this file.
 */

describe("phone (E.164)", () => {
  it("accepts an Israeli mobile in E.164", () => {
    expect(otpRequestSchema.safeParse({ phone: "+972501234567" }).success).toBe(true);
  });

  it.each(["0501234567", "972501234567", "+0501234567", "+97250123456789012", "", "+972-50-123-4567"])(
    "rejects %s",
    (phone) => {
      expect(otpRequestSchema.safeParse({ phone }).success).toBe(false);
    }
  );

  it("requires a 6-character OTP code", () => {
    expect(otpVerifySchema.safeParse({ phone: "+972501234567", code: "123456" }).success).toBe(true);
    expect(otpVerifySchema.safeParse({ phone: "+972501234567", code: "12345" }).success).toBe(false);
  });
});

describe("createJob", () => {
  it("accepts a minimal valid request and defaults the optional collections", () => {
    const parsed = createJobSchema.parse({ serviceId: "svc_1", addressId: "adr_1" });
    expect(parsed.mediaRefs).toEqual([]);
    expect(parsed.structuredAnswers).toEqual({});
  });

  it("rejects an empty serviceId", () => {
    expect(createJobSchema.safeParse({ serviceId: "", addressId: "adr_1" }).success).toBe(false);
  });

  it("caps the description and the media list", () => {
    expect(
      createJobSchema.safeParse({ serviceId: "s", addressId: "a", description: "x".repeat(2001) }).success
    ).toBe(false);
    expect(
      createJobSchema.safeParse({ serviceId: "s", addressId: "a", mediaRefs: Array(11).fill("m") }).success
    ).toBe(false);
  });
});

describe("location ping", () => {
  it("accepts a valid coordinate with an ISO timestamp", () => {
    expect(
      locationPingSchema.safeParse({ lat: 32.0853, lng: 34.7818, capturedAt: "2026-09-19T12:00:00.000Z" }).success
    ).toBe(true);
  });

  it.each([
    { lat: 91, lng: 0 },
    { lat: -91, lng: 0 },
    { lat: 0, lng: 181 },
    { lat: 0, lng: -181 },
  ])("rejects an out-of-range coordinate %o", (coord) => {
    expect(locationPingSchema.safeParse({ ...coord, capturedAt: "2026-09-19T12:00:00.000Z" }).success).toBe(false);
  });

  it("rejects a non-ISO capturedAt", () => {
    expect(locationPingSchema.safeParse({ lat: 32, lng: 34, capturedAt: "19/09/2026" }).success).toBe(false);
  });

  it("rejects a negative accuracy", () => {
    expect(
      locationPingSchema.safeParse({
        lat: 32,
        lng: 34,
        accuracyMeters: -1,
        capturedAt: "2026-09-19T12:00:00.000Z",
      }).success
    ).toBe(false);
  });
});

describe("start shift", () => {
  it("requires at least one enabled service to go ONLINE", () => {
    expect(startShiftSchema.safeParse({ enabledServiceIds: [], lat: 32, lng: 34 }).success).toBe(false);
    expect(startShiftSchema.safeParse({ enabledServiceIds: ["svc_1"], lat: 32, lng: 34 }).success).toBe(true);
  });
});

describe("quote creation", () => {
  it("requires at least one line item", () => {
    expect(createQuoteSchema.safeParse({ lineItems: [] }).success).toBe(false);
  });

  it("rejects a non-integer unit price (money is integer minor units)", () => {
    expect(
      createQuoteSchema.safeParse({
        lineItems: [{ description: "x", quantity: 1, unitPriceMinorUnits: 10.5 }],
      }).success
    ).toBe(false);
  });

  it("rejects a negative unit price and a zero quantity", () => {
    expect(
      createQuoteSchema.safeParse({ lineItems: [{ description: "x", quantity: 1, unitPriceMinorUnits: -1 }] }).success
    ).toBe(false);
    expect(
      createQuoteSchema.safeParse({ lineItems: [{ description: "x", quantity: 0, unitPriceMinorUnits: 1 }] }).success
    ).toBe(false);
  });

  it("defaults line kind to OTHER", () => {
    const parsed = createQuoteSchema.parse({
      lineItems: [{ description: "x", quantity: 1, unitPriceMinorUnits: 100 }],
    });
    expect(parsed.lineItems[0]!.kind).toBe("OTHER");
  });

  it("rejects an unknown line kind", () => {
    expect(
      createQuoteSchema.safeParse({
        lineItems: [{ description: "x", quantity: 1, unitPriceMinorUnits: 100, kind: "TIP" }],
      }).success
    ).toBe(false);
  });
});

describe("review", () => {
  it("accepts a 1–5 integer rating", () => {
    expect(reviewSchema.safeParse({ overallRating: 5 }).success).toBe(true);
    expect(reviewSchema.safeParse({ overallRating: 1 }).success).toBe(true);
  });

  it.each([0, 6, 3.5, -1])("rejects an out-of-range or fractional rating: %s", (overallRating) => {
    expect(reviewSchema.safeParse({ overallRating }).success).toBe(false);
  });
});

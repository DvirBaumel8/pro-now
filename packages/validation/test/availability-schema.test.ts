import { describe, expect, it } from "vitest";

import { parseAreaAvailability } from "../src";

/**
 * The schema's job is to stop a malformed payload BEFORE it becomes a number
 * on a customer's screen. Each rejection below is a specific way a real
 * server bug would otherwise have looked like confident supply.
 */

const valid = {
  areaLabel: "רמת אביב, תל אביב",
  computedAt: "2026-09-19T12:00:00.000Z",
  staleAfterSeconds: 60,
  services: [{ serviceId: "svc-leak", availableNow: 4, nearestEtaSeconds: 480 }],
};

describe("parseAreaAvailability", () => {
  it("accepts a well-formed payload", () => {
    expect(parseAreaAvailability(valid)).not.toBeNull();
  });

  it("accepts a null ETA, which is the normal 'no route computed yet' case", () => {
    const out = parseAreaAvailability({
      ...valid,
      services: [{ serviceId: "s", availableNow: 0, nearestEtaSeconds: null }],
    });
    expect(out?.services[0].nearestEtaSeconds).toBeNull();
  });

  it.each([
    ["a fractional count", { availableNow: 1.5 }],
    ["a negative count", { availableNow: -1 }],
    ["a stringified count", { availableNow: "4" }],
    ["a negative ETA", { nearestEtaSeconds: -60 }],
    ["an empty service id", { serviceId: "" }],
  ])("rejects %s", (_label, patch) => {
    const payload = { ...valid, services: [{ ...valid.services[0], ...patch }] };
    expect(parseAreaAvailability(payload)).toBeNull();
  });

  it("rejects a freshness window of zero, which would mean 'trust forever'", () => {
    expect(parseAreaAvailability({ ...valid, staleAfterSeconds: 0 })).toBeNull();
    expect(parseAreaAvailability({ ...valid, staleAfterSeconds: -5 })).toBeNull();
  });

  it("rejects a non-ISO timestamp", () => {
    expect(parseAreaAvailability({ ...valid, computedAt: "19/09/2026" })).toBeNull();
  });

  it("rejects an unknown extra field rather than guessing what changed", () => {
    // A rename on the server is exactly how a wrong number gets rendered
    // confidently; strict() turns that into a visible absence instead.
    expect(parseAreaAvailability({ ...valid, availableNowTotal: 9 })).toBeNull();
  });

  it("returns null, never throws, for junk input", () => {
    for (const junk of [null, undefined, 0, "", [], "not json"]) {
      expect(parseAreaAvailability(junk)).toBeNull();
    }
  });
});

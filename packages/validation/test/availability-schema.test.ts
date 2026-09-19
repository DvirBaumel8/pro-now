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
  services: [
    { serviceId: "leak", state: "AVAILABLE", availableProviderCount: 4, nearestRouteEtaMinutes: 8 },
  ],
};

function withService(patch: Record<string, unknown>) {
  return { ...valid, services: [{ ...valid.services[0], ...patch }] };
}

describe("parseAreaAvailability", () => {
  it("accepts a well-formed payload", () => {
    expect(parseAreaAvailability(valid)).not.toBeNull();
  });

  it("accepts UNKNOWN with no count — the normal 'server did not say' case", () => {
    const out = parseAreaAvailability({
      ...valid,
      services: [{ serviceId: "s", state: "UNKNOWN", reasonCode: "NOT_COMPUTED" }],
    });
    expect(out?.services[0]?.availableProviderCount).toBeUndefined();
  });

  it("accepts UNAVAILABLE with an explicit zero, which is a real answer", () => {
    expect(
      parseAreaAvailability({
        ...valid,
        services: [{ serviceId: "s", state: "UNAVAILABLE", availableProviderCount: 0 }],
      })
    ).not.toBeNull();
  });

  it.each([
    ["a fractional count", { availableProviderCount: 1.5 }],
    ["a negative count", { availableProviderCount: -1 }],
    ["a stringified count", { availableProviderCount: "4" }],
    ["a negative ETA", { nearestRouteEtaMinutes: -60 }],
    ["a zero ETA, which is a bug not a fast professional", { nearestRouteEtaMinutes: 0 }],
    ["an empty service id", { serviceId: "" }],
    ["an unrecognised state", { state: "MAYBE" }],
    ["an unrecognised reason code", { reasonCode: "BECAUSE" }],
  ])("rejects %s", (_label, patch) => {
    expect(parseAreaAvailability(withService(patch))).toBeNull();
  });

  it("rejects UNKNOWN carrying a count — unknown is not zero", () => {
    expect(
      parseAreaAvailability(withService({ state: "UNKNOWN", availableProviderCount: 0, nearestRouteEtaMinutes: undefined }))
    ).toBeNull();
  });

  it("rejects UNAVAILABLE that also reports available providers", () => {
    expect(
      parseAreaAvailability(withService({ state: "UNAVAILABLE", availableProviderCount: 3, nearestRouteEtaMinutes: undefined }))
    ).toBeNull();
  });

  it("rejects an ETA where there is no supply — an ETA to nobody", () => {
    expect(
      parseAreaAvailability(withService({ state: "UNAVAILABLE", availableProviderCount: 0, nearestRouteEtaMinutes: 9 }))
    ).toBeNull();
  });

  it("rejects a freshness window of zero, which would mean 'trust forever'", () => {
    expect(parseAreaAvailability({ ...valid, staleAfterSeconds: 0 })).toBeNull();
    expect(parseAreaAvailability({ ...valid, staleAfterSeconds: -5 })).toBeNull();
  });

  it("rejects a non-ISO timestamp", () => {
    expect(parseAreaAvailability({ ...valid, computedAt: "19/09/2026" })).toBeNull();
  });

  it("rejects an unknown extra field rather than guessing what changed", () => {
    // A rename on the server is how a wrong number gets rendered confidently;
    // strict() turns that into a visible absence instead.
    expect(parseAreaAvailability({ ...valid, availableNowTotal: 9 })).toBeNull();
  });

  it("returns null, never throws, for junk input", () => {
    for (const junk of [null, undefined, 0, "", [], "not json"]) {
      expect(parseAreaAvailability(junk)).toBeNull();
    }
  });
});

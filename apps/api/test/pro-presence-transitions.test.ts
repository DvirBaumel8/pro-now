import { describe, it, expect } from "vitest";
import {
  isPresenceTransitionAllowed,
  assertPresenceTransition,
  canEndShift,
  InvalidPresenceTransitionError,
} from "../src/domain/job/pro-presence-transitions.js";

describe("professional presence state machine — /docs/07-JOB-STATE-MACHINE.md", () => {
  it("walks the full happy path from OFFLINE to AVAILABLE-again", () => {
    const path: Array<[any, any]> = [
      ["OFFLINE", "STARTING_SHIFT"],
      ["STARTING_SHIFT", "AVAILABLE"],
      ["AVAILABLE", "OFFER_RECEIVED"],
      ["OFFER_RECEIVED", "RESERVED"],
      ["RESERVED", "ASSIGNED"],
      ["ASSIGNED", "EN_ROUTE"],
      ["EN_ROUTE", "ARRIVED"],
      ["ARRIVED", "SERVICING"],
      ["SERVICING", "COMPLETING"],
      ["COMPLETING", "AVAILABLE"],
    ];
    for (const [from, to] of path) {
      expect(isPresenceTransitionAllowed(from, to)).toBe(true);
    }
  });

  it("never allows SERVICING to jump straight to AVAILABLE (must pass through COMPLETING)", () => {
    expect(isPresenceTransitionAllowed("SERVICING", "AVAILABLE")).toBe(false);
    expect(() => assertPresenceTransition("SERVICING", "AVAILABLE")).toThrow(InvalidPresenceTransitionError);
  });

  it("blocks ending a shift while committed to an active job", () => {
    expect(canEndShift("ASSIGNED")).toBe(false);
    expect(canEndShift("EN_ROUTE")).toBe(false);
    expect(canEndShift("SERVICING")).toBe(false);
  });

  it("allows ending a shift while AVAILABLE or after COMPLETING", () => {
    expect(canEndShift("AVAILABLE")).toBe(true);
    expect(canEndShift("COMPLETING")).toBe(true);
  });

  it("allows a support override to end a shift even mid-job", () => {
    expect(canEndShift("SERVICING", true)).toBe(true);
  });

  it("allows losing the atomic-accept race to return to AVAILABLE", () => {
    expect(isPresenceTransitionAllowed("RESERVED", "AVAILABLE")).toBe(true);
    expect(isPresenceTransitionAllowed("OFFER_RECEIVED", "AVAILABLE")).toBe(true);
  });
});

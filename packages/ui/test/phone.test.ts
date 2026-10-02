import { describe, expect, it } from "vitest";

import { isPlausibleILPhone } from "../src/phone";

/**
 * The check exists so the sign-in button can be honest: enabled only when
 * the number could actually receive an SMS. A button that lights up for
 * anything and then fails is how people conclude the app is broken rather
 * than that they mistyped.
 *
 * It is deliberately a plausibility check, not a validity claim. Only the
 * SMS provider knows whether a number exists.
 */
describe("isPlausibleILPhone", () => {
  it("accepts the local mobile format people actually type", () => {
    for (const ok of ["0501234567", "050-123-4567", "054 999 8888", "052 1234567"]) {
      expect(isPlausibleILPhone(ok)).toBe(true);
    }
  });

  it("accepts the international form", () => {
    expect(isPlausibleILPhone("+972501234567")).toBe(true);
    expect(isPlausibleILPhone("972-50-123-4567")).toBe(true);
  });

  it("rejects a number that is too short or too long", () => {
    expect(isPlausibleILPhone("05012345")).toBe(false);
    expect(isPlausibleILPhone("05012345678")).toBe(false);
    expect(isPlausibleILPhone("+9725012345")).toBe(false);
  });

  it("rejects a landline or a non-mobile prefix", () => {
    expect(isPlausibleILPhone("031234567")).toBe(false);
    expect(isPlausibleILPhone("0721234567")).toBe(false);
  });

  it("rejects empty and non-numeric input without throwing", () => {
    for (const bad of ["", "   ", "abcdefghij", "---"]) {
      expect(isPlausibleILPhone(bad)).toBe(false);
    }
  });
});

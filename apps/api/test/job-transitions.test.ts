import { describe, it, expect } from "vitest";
import { assertTransition, isTransitionAllowed, InvalidJobTransitionError } from "../src/domain/job/transitions";

describe("job state machine — /docs/07-JOB-STATE-MACHINE.md", () => {
  it("allows the full happy-path visit+quote flow", () => {
    const path: Array<[any, any]> = [
      ["DRAFT", "SEARCHING"],
      ["SEARCHING", "OFFERING"],
      ["OFFERING", "PRO_ASSIGNED"],
      ["PRO_ASSIGNED", "PRO_EN_ROUTE"],
      ["PRO_EN_ROUTE", "PRO_ARRIVED"],
      ["PRO_ARRIVED", "DIAGNOSIS"],
      ["DIAGNOSIS", "WAITING_QUOTE_APPROVAL"],
      ["WAITING_QUOTE_APPROVAL", "IN_PROGRESS"],
      ["IN_PROGRESS", "COMPLETION_PENDING"],
      ["COMPLETION_PENDING", "COMPLETED"],
      ["COMPLETED", "PAYMENT_PENDING"],
      ["PAYMENT_PENDING", "PAYMENT_CAPTURED"],
      ["PAYMENT_CAPTURED", "REVIEW_PENDING"],
      ["REVIEW_PENDING", "CLOSED"],
    ];
    for (const [from, to] of path) {
      expect(isTransitionAllowed(from, to)).toBe(true);
    }
  });

  it("allows the fixed/hourly/courier shortcut that skips DIAGNOSIS", () => {
    expect(isTransitionAllowed("PRO_ARRIVED", "IN_PROGRESS")).toBe(true);
  });

  it("rejects WORKING -> AVAILABLE style skips (no COMPLETED/CANCELLED in between)", () => {
    expect(isTransitionAllowed("IN_PROGRESS", "PAYMENT_PENDING")).toBe(false);
    expect(() => assertTransition("IN_PROGRESS", "PAYMENT_PENDING", "SYSTEM")).toThrow(InvalidJobTransitionError);
  });

  it("rejects a customer cancelling mid-service directly (must go through Ops)", () => {
    expect(() => assertTransition("IN_PROGRESS", "CANCELLED", "CUSTOMER")).toThrow();
    expect(() => assertTransition("IN_PROGRESS", "CANCELLED", "OPS")).not.toThrow();
  });

  it("allows a customer to cancel before assignment", () => {
    expect(() => assertTransition("SEARCHING", "CANCELLED", "CUSTOMER")).not.toThrow();
  });

  it("never allows a transition out of a terminal state", () => {
    expect(isTransitionAllowed("CLOSED", "IN_PROGRESS")).toBe(false);
    expect(isTransitionAllowed("CANCELLED", "SEARCHING")).toBe(false);
  });
});

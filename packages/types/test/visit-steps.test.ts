import { describe, expect, it } from "vitest";

import { visitStepIndex, visitStepsHe } from "../src/job-scene";
import type { JobState } from "../src/job-state";

describe("the shape of a visit", () => {
  it("says nothing before the professional has arrived", () => {
    /*
     * The journey owns the screen until the knock — a countdown, a map,
     * "בדרך אליך". A visit tracker beside that would answer a question
     * nobody is asking yet.
     */
    for (const s of ["DRAFT", "SEARCHING", "OFFERED", "ASSIGNED", "EN_ROUTE"] as JobState[]) {
      expect(visitStepsHe(s), s).toBeNull();
    }
  });

  it("marks exactly one step as the current one", () => {
    for (const s of ["PRO_ARRIVED", "DIAGNOSIS", "WAITING_QUOTE_APPROVAL", "IN_PROGRESS", "COMPLETION_PENDING"] as JobState[]) {
      const steps = visitStepsHe(s)!;
      expect(steps.filter((x) => x.state === "NOW"), s).toHaveLength(1);
    }
  });

  it("moves the mark forward at every state, and never backwards", () => {
    // The whole point: something on screen changes each time something
    // real happens, and only then.
    const order: JobState[] = ["DIAGNOSIS", "WAITING_QUOTE_APPROVAL", "IN_PROGRESS", "COMPLETION_PENDING"];
    const seen = order.map((s) => visitStepIndex(s)!);
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
    expect(new Set(seen).size).toBe(order.length);
  });

  it("leaves nothing current once the money has moved", () => {
    /*
     * A tracker still pointing at "סיום ותשלום" after payment tells
     * somebody the visit is unfinished when it is not.
     */
    for (const s of ["COMPLETED", "PAYMENT_CAPTURED", "CLOSED"] as JobState[]) {
      const steps = visitStepsHe(s)!;
      expect(steps.every((x) => x.state === "DONE"), s).toBe(true);
    }
  });

  it("puts arrival and diagnosis in the same step", () => {
    // "He has arrived and is starting to look" and "he is looking" are
    // one thing to the person watching, and splitting them would make the
    // tracker jump for something that did not change for them.
    expect(visitStepIndex("PRO_ARRIVED")).toBe(visitStepIndex("DIAGNOSIS"));
  });

  it("promises no times anywhere", () => {
    // No minutes, no percentage, no bar. How long a diagnosis takes is
    // not knowable from a state.
    const steps = visitStepsHe("DIAGNOSIS")!;
    for (const s of steps) {
      expect(s.labelHe).not.toMatch(/\d/);
    }
  });
});

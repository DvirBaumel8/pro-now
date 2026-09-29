import { describe, expect, it } from "vitest";

import { visitStepIndex, visitStepsHe } from "../src/job-scene";
import type { JobState } from "../src/job-state";

describe("the shape of a visit", () => {
  it("says nothing until somebody has accepted", () => {
    /*
     * There is no job to show the shape of yet. A tracker during the
     * search would draw four steps of a thing that may never happen, on
     * the one screen that must not imply supply it does not have.
     */
    for (const s of ["DRAFT", "SEARCHING", "OFFERED"] as JobState[]) {
      expect(visitStepsHe(s), s).toBeNull();
    }
  });

  it("starts the moment somebody is on their way", () => {
    // Amit: "תעבוד על... הזמן שהטכנאי בדרך ועד שהוא מגיע." The countdown
    // says how long; it does not say what this is the first of.
    for (const s of ["PRO_ASSIGNED", "PRO_EN_ROUTE"] as JobState[]) {
      const steps = visitStepsHe(s)!;
      expect(steps[0]!.state, s).toBe("NOW");
      expect(steps[0]!.labelHe).toBe("בדרך");
    }
  });

  it("keeps assigned and en route as one step", () => {
    // The difference is whether a van has pulled out, which the person
    // waiting cannot see — a mark that moved for it would be reporting
    // something that did not change for them.
    expect(visitStepIndex("PRO_ASSIGNED")).toBe(visitStepIndex("PRO_EN_ROUTE"));
  });

  it("marks exactly one step as the current one", () => {
    for (const s of ["PRO_ASSIGNED", "PRO_EN_ROUTE", "PRO_ARRIVED", "DIAGNOSIS", "WAITING_QUOTE_APPROVAL", "IN_PROGRESS", "COMPLETION_PENDING"] as JobState[]) {
      const steps = visitStepsHe(s)!;
      expect(steps.filter((x) => x.state === "NOW"), s).toHaveLength(1);
    }
  });

  it("moves the mark forward at every state, and never backwards", () => {
    // The whole point: something on screen changes each time something
    // real happens, and only then.
    // No "quote" step since 2026-09-29: a quote the server still supports waits on the diagnosis step.
    const order: JobState[] = ["PRO_EN_ROUTE", "DIAGNOSIS", "IN_PROGRESS", "COMPLETION_PENDING"];
    const seen = order.map((s) => visitStepIndex(s)!);
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
    expect(new Set(seen).size).toBe(order.length);
    expect(visitStepIndex("WAITING_QUOTE_APPROVAL")).toBe(visitStepIndex("DIAGNOSIS"));
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

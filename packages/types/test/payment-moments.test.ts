import { describe, expect, it } from "vitest";

import {
  PAYMENT_FLOW,
  paymentFlowViolations,
  paymentMomentFor,
  paymentPromiseHe,
  VISIT_ORDER,
} from "../src";

/**
 * WHEN THE MONEY MOVES.
 *
 * Amit's decision, in his words: *"ברגע שלחץ אישור הכסף כאילו עובר אבל
 * מגיע רק בסיום ביצוע העבודה — שלא יקרה מצב שהלקוח פתאום מתחרט אחרי
 * ביצוע העבודה ואז אין מה לעשות."*
 *
 * Two protections, and the tests are about not losing either of them.
 */
describe("payment moments", () => {
  it("holds its own invariants against the order of a visit", () => {
    expect(paymentFlowViolations(VISIT_ORDER)).toEqual([]);
  });

  it("holds the money before the work and takes it after", () => {
    const at = (m: string) => VISIT_ORDER.indexOf(PAYMENT_FLOW.find((p) => p.moment === m)!.at);
    expect(at("HOLD")).toBeLessThan(VISIT_ORDER.indexOf("IN_PROGRESS"));
    expect(at("CAPTURE")).toBeGreaterThan(VISIT_ORDER.indexOf("IN_PROGRESS"));
  });

  it("charges the visit fee on arrival, whatever happens to the quote", () => {
    const m = paymentMomentFor("PRO_ARRIVED");
    expect(m?.moment).toBe("VISIT_FEE");
    expect(m?.customerHe).toContain("גם אם");
  });

  it("says the same rule to both sides at every moment", () => {
    for (const spec of PAYMENT_FLOW) {
      expect(paymentPromiseHe(spec.at, "customer")).toBe(spec.customerHe);
      expect(paymentPromiseHe(spec.at, "pro")).toBe(spec.proHe);
    }
  });

  it("says nothing where money is not the subject", () => {
    for (const s of ["PRO_ASSIGNED", "PRO_EN_ROUTE", "DIAGNOSIS", "IN_PROGRESS"] as const) {
      expect(paymentPromiseHe(s, "customer")).toBeNull();
    }
  });

  /*
   * The check that keeps the decision from quietly becoming a claim. No
   * provider has been chosen, so none of this may say a card was
   * charged — see /CLAUDE.md §4 and every screen that says "לתשלום"
   * rather than "חויב".
   */
  it("never says money has already moved", () => {
    expect(
      paymentFlowViolations(VISIT_ORDER).filter((v) => v.includes("already moved"))
    ).toEqual([]);
    for (const spec of PAYMENT_FLOW) {
      expect(`${spec.customerHe} ${spec.proHe}`).not.toMatch(/חויב|נגבה/);
    }
  });

  /*
   * Proven against a deliberately wrong order, because an invariant that
   * has only ever been handed the right answer is not evidence.
   */
  it("catches an order that takes the money before the approval", () => {
    const wrong = ["PRO_ARRIVED", "COMPLETION_PENDING", "WAITING_QUOTE_APPROVAL"] as const;
    expect(paymentFlowViolations(wrong)).toContain(
      "the money is taken before the customer has approved a price"
    );
  });
});

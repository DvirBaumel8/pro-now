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

/**
 * THE PRICE IS APPROVED ONCE.
 *
 * Amit: *"צריך פעם אחת אישור הצעת מחיר."*
 */
describe("one price approval", () => {
  it("tells the customer at the end that the price is already settled", () => {
    const capture = PAYMENT_FLOW.find((p) => p.moment === "CAPTURE")!;
    expect(capture.customerHe).toContain("כבר אושר");
    expect(capture.proHe).toContain("כבר אושר");
  });

  /*
   * Amit, completing it: *"פעם שנייה אישור תשלום בסיום העבודה."* Two
   * approvals on purpose, and the second has to name itself — a
   * sentence that avoids the words to avoid confusion has understated
   * what is being agreed to.
   */
  it("names the second one a payment approval", () => {
    expect(PAYMENT_FLOW.find((p) => p.moment === "CAPTURE")!.customerHe).toContain("אישור תשלום");
  });

  it("catches a completion step that does not name itself", () => {
    const coy = PAYMENT_FLOW.map((p) =>
      p.moment === "CAPTURE" ? { ...p, customerHe: "המחיר כבר אושר. העבודה הושלמה?" } : p
    );
    expect(paymentFlowViolations(VISIT_ORDER, coy)).toContain(
      "the completion step does not say it is a payment approval"
    );
  });

  it("asks about the price at exactly one moment", () => {
    const asks = PAYMENT_FLOW.filter((p) => /לאשר את המחיר|אישור המחיר/.test(p.customerHe));
    expect(asks.length).toBeLessThanOrEqual(1);
  });

  it("catches a completion step that forgets to say it", () => {
    const blunted = PAYMENT_FLOW.map((p) =>
      p.moment === "CAPTURE" ? { ...p, customerHe: "אישור הסיום מעביר את התשלום." } : p
    );
    expect(paymentFlowViolations(VISIT_ORDER, blunted)).toContain(
      "the completion step does not say the price was already approved"
    );
  });

  it("catches a sentence that claims a card was charged", () => {
    const claiming = PAYMENT_FLOW.map((p) =>
      p.moment === "CAPTURE" ? { ...p, customerHe: `${p.customerHe} הכרטיס חויב.` } : p
    );
    expect(paymentFlowViolations(VISIT_ORDER, claiming)).toContain(
      "CAPTURE says money has already moved"
    );
  });
});

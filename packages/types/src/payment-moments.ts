import type { JobState } from "./job";

/**
 * ---------------------------------------------------------------------
 * WHEN THE MONEY MOVES, AND WHY IT MOVES THEN
 * ---------------------------------------------------------------------
 * Amit, deciding it:
 *
 *   *"האישור הראשון זה אישור תשלום אבחון והגעה לבית הלקוח. ברגע שסיים
 *   את האבחון אז מגיע שלב ההצעת מחיר לפני העבודה. הלקוח מחליט אם לאשר
 *   לפי כל הפרטים וההצעת מחיר. ברגע שלחץ אישור הכסף כאילו עובר אבל מגיע
 *   רק בסיום ביצוע העבודה — שלא יקרה מצב שהלקוח פתאום מתחרט אחרי ביצוע
 *   העבודה ואז אין מה לעשות."*
 *
 * That is a business decision and it is his to make. It was open until
 * now — the screens said what they could without it, which is why they
 * have been careful to say "לתשלום" and never "חויב". This is the
 * decision written down where the code can read it.
 *
 * ---------------------------------------------------------------------
 * THREE MOMENTS, AND WHAT EACH ONE PROTECTS
 * ---------------------------------------------------------------------
 * ARRIVAL — the visit fee. The professional has driven to a stranger's
 * home and looked at the problem; that has a price whether or not any
 * work follows, and the customer agreed to it when they asked. Nothing
 * about this moment depends on the quote.
 *
 * APPROVAL — the quote is authorised, not charged. The customer has all
 * the details and decides; pressing approve puts a HOLD on the amount.
 * This is what protects the professional: the money is committed before
 * they start, so nobody spends three hours in a kitchen and then finds
 * out there was never anything behind the promise.
 *
 * COMPLETION — the hold is captured, and only once the CUSTOMER has
 * agreed the work is finished. This is what protects the customer: the
 * money does not actually leave until they say the job was done.
 *
 * The two together are the whole point. Either one alone gives one side
 * a way to leave the other with nothing.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS IS NOT
 * ---------------------------------------------------------------------
 * It is not a vendor. `PaymentProvider` already has `authorize` and
 * `capture` (see /docs/09-PAYMENTS.md) and no processor is named
 * anywhere in this file — the decision made here is WHEN each one is
 * called, which is a product rule rather than an integration.
 *
 * And it is not a claim that any of it has happened. Until a provider is
 * chosen, a screen may say what the rule IS and must not say that a card
 * was charged (/CLAUDE.md §3, §4). The sentences below are written in
 * that tense on purpose: they describe the agreement, not a transaction.
 */
export type PaymentMoment = "VISIT_FEE" | "HOLD" | "CAPTURE";

export interface PaymentMomentSpec {
  moment: PaymentMoment;
  /** The job state at which it happens. */
  at: JobState;
  /** What the customer is told, at the moment they are asked to act. */
  customerHe: string;
  /** What the professional is told, so both sides read the same rule. */
  proHe: string;
}

export const PAYMENT_FLOW: readonly PaymentMomentSpec[] = [
  {
    moment: "VISIT_FEE",
    at: "PRO_ARRIVED",
    customerHe: "דמי הביקור והאבחון משולמים על ההגעה, גם אם לא תאשרו את העבודה.",
    proHe: "דמי הביקור והאבחון שלך מובטחים על ההגעה, גם אם הלקוח לא יאשר את העבודה.",
  },
  {
    moment: "HOLD",
    at: "WAITING_QUOTE_APPROVAL",
    customerHe:
      "אישור תופס את הסכום באמצעי התשלום שלכם. הכסף עדיין לא יוצא — הוא יוצא רק כשתאשרו שהעבודה הושלמה.",
    proHe: "אישור הלקוח תופס את הסכום, כך שהוא מובטח לפני שאתה מתחיל לעבוד.",
  },
  {
    moment: "CAPTURE",
    at: "COMPLETION_PENDING",
    /*
     * "צריך פעם אחת אישור הצעת מחיר" — Amit, and he is right to worry.
     *
     * Two taps about money in one visit invite the reading that the
     * price is being approved twice, which is the thing a customer
     * resents most and the thing a professional fears most. They are
     * different questions: the first is "is this the right price", asked
     * once, before any work; this one is "was the work done", and it is
     * the only question left.
     *
     * So the sentence says so before it says anything else. A screen
     * that merely avoids the word "price" leaves the reader to work out
     * which of the two they are being asked, and they will assume the
     * expensive one.
     */
    customerHe:
      "המחיר כבר אושר פעם אחת. כאן מאשרים רק שהעבודה הושלמה — וזה מה שמעביר את התשלום.",
    proHe: "התשלום משתחרר כשהלקוח מאשר שהעבודה הושלמה. המחיר כבר אושר ולא נפתח שוב.",
  },
];

/** What happens to the money at this state, if anything. */
export function paymentMomentFor(status: JobState): PaymentMomentSpec | null {
  return PAYMENT_FLOW.find((m) => m.at === status) ?? null;
}

/** The sentence for one side, or null where money is not the subject. */
export function paymentPromiseHe(status: JobState, side: "customer" | "pro"): string | null {
  const m = paymentMomentFor(status);
  if (!m) return null;
  return side === "customer" ? m.customerHe : m.proHe;
}

/**
 * The invariants, as a test rather than as a comment.
 *
 * The ordering is the decision. A capture before an approval, or a hold
 * before anybody has looked at the fault, would be the same product with
 * one of its two protections removed — and it would be removed silently,
 * because nothing else in the codebase knows what order these belong in.
 */
export function paymentFlowViolations(
  order: readonly JobState[],
  /*
   * The flow is a parameter so the checks can be handed a deliberately
   * wrong one. An invariant that has only ever seen the right answer is
   * not evidence of anything — the same reason `verify:rowlock` runs
   * against a real conflict and the sweep plants its own off-screen
   * card.
   */
  flow: readonly PaymentMomentSpec[] = PAYMENT_FLOW
): string[] {
  const out: string[] = [];
  const at = (m: PaymentMoment) => {
    const spec = flow.find((p) => p.moment === m);
    return spec ? order.indexOf(spec.at) : -1;
  };

  for (const m of ["VISIT_FEE", "HOLD", "CAPTURE"] as const) {
    if (at(m) < 0) out.push(`${m} happens at a state that is not part of a visit`);
  }
  if (!(at("VISIT_FEE") < at("HOLD"))) {
    out.push("the amount is held before the professional has even arrived");
  }
  if (!(at("HOLD") < at("CAPTURE"))) {
    out.push("the money is taken before the customer has approved a price");
  }

  /*
   * THE PRICE IS APPROVED ONCE.
   *
   * Amit: *"צריך פעם אחת אישור הצעת מחיר."* The capture moment has to
   * say that the price is already settled, or two money taps in one
   * visit read as being asked twice — and a reader who is unsure which
   * question they are answering assumes the expensive one.
   */
  const capture = flow.find((p) => p.moment === "CAPTURE");
  if (capture && !capture.customerHe.includes("כבר אושר")) {
    out.push("the completion step does not say the price was already approved");
  }

  // Both sides must be told, at every moment. A rule one side cannot see
  // is a rule the other side will be accused of inventing.
  for (const spec of flow) {
    if (!spec.customerHe.trim()) out.push(`${spec.moment} says nothing to the customer`);
    if (!spec.proHe.trim()) out.push(`${spec.moment} says nothing to the professional`);
    /*
     * And none of them may claim a charge has happened. No payment
     * provider has been chosen (/CLAUDE.md §4), so these sentences
     * describe the agreement and never a transaction.
     */
    /*
     * NO `\b` HERE, AND THAT MATTERS.
     *
     * The first version of this was /\bחויב|נגבה\b/ and could never
     * fire: in JavaScript `\w` is ASCII-only, so a Hebrew letter is not
     * a word character and there is no word boundary in front of one.
     * The check passed on a sentence that said "הכרטיס חויב" outright.
     *
     * Caught by handing it a deliberately wrong flow — which is the only
     * reason it was caught at all, and the argument for every control in
     * this project.
     */
    if (/חויב|נגבה|שולם בפועל/.test(spec.customerHe + spec.proHe)) {
      out.push(`${spec.moment} says money has already moved`);
    }
  }

  return out;
}

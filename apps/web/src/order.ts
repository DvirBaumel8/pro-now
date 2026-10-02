import { previewPriceLists } from "@pro-now/ui";
import { formatMoney, money, pilotServiceById, pricingKindOf, visitTermsHe } from "@pro-now/types";

/**
 * The request form's price and order, as in the demo (tools/design-preview
 * `describe`), under D1: no money moves in the app, so nothing here says a
 * card is charged.
 *
 * The price lists are the demo's EXAMPLE lists (`previewPriceLists`) — no
 * professional has a list of their own yet (docs/18 §Open Decisions). Every
 * figure is therefore labelled "לדוגמה", and the professional sees what was
 * picked with that label.
 */

const ils = (minor: number) => formatMoney(money(minor, "ILS"));

/*
 * The list as written, not `priceListFor`: that rounds to tens for a
 * professional's own base price, which nobody has yet, and turned the
 * service page's "החל מ־285 ₪" into a 290 ₪ line one screen later.
 */
const listFor = (serviceId: string) => previewPriceLists[serviceId] ?? [];

export interface OrderRow {
  id: string;
  nameHe: string;
  amountHe: string;
}

/** The example list for a service, ready for the picker. Empty when it has none. */
export function priceRows(serviceId: string): OrderRow[] {
  return listFor(serviceId).map((r) => ({ id: r.id, nameHe: r.nameHe, amountHe: ils(r.amountMinorUnits) }));
}

/** What was picked: names and the example total. Null when nothing is. */
export function orderSummary(serviceId: string, pickedIds: readonly string[]): { namesHe: string; totalHe: string } | null {
  const chosen = listFor(serviceId).filter((r) => pickedIds.includes(r.id));
  if (chosen.length === 0) return null;
  return {
    namesHe: chosen.map((r) => r.nameHe).join(" + "),
    totalHe: ils(chosen.reduce((sum, r) => sum + r.amountMinorUnits, 0)),
  };
}

/** The line above the send button. */
export function livePriceHe(serviceId: string, pickedIds: readonly string[]): string | null {
  const def = pilotServiceById[serviceId];
  switch (def ? pricingKindOf(def) : null) {
    case "QUOTE_FIRST":
      return "המקצוען יסתכל על התמונות והפרטים וישלח מחיר · הוא יוצא רק אחרי שתאשרו";
    case "VISIT":
      return `את ${visitTermsHe({ id: serviceId }).feeHe} של המקצוען תראו לפני שתאשרו · משלמים ישירות למקצוען`;
    case "LIST": {
      const o = orderSummary(serviceId, pickedIds);
      return o ? `${o.namesHe} · ${o.totalHe} לפי המחירון לדוגמה` : "בחרו מה להזמין מהמחירון";
    }
    case "HOURLY":
      return "לפי שעה · המחיר לשעה של המקצוען מוצג לפני שתאשרו";
    case "DISTANCE":
      return "לפי מרחק · המחיר מוצג לפני שתאשרו";
    default:
      return null;
  }
}

/** The note under the send button. */
export function detailsNoteHe(serviceId: string): string {
  const def = pilotServiceById[serviceId];
  switch (def ? pricingKindOf(def) : null) {
    case "QUOTE_FIRST":
      return "לפי התיאור והתמונות המקצוען קובע את המחיר — ככל שתפרטו, המחיר מדויק יותר.";
    case "VISIT":
      return "התיאור, ההקלטה והתמונות עוזרים למקצוען להגיע מוכן. את דמי הביקור שלו תראו לפני שתאשרו.";
    case "LIST":
      return "כל מקצוען קובע את המחירון שלו — ותראו את המחיר שלו לפני שתאשרו.";
    default:
      return "התיאור, ההקלטה והתמונות עוזרים למקצוען להגיע מוכן.";
  }
}

/**
 * The description the professional reads: the customer's words, then what
 * they ordered and where to, each on its own line. The professional's
 * screen shows the description and nothing structured yet, so the order
 * travels here as well as in `structuredAnswers`.
 */
export function composeDescription(
  serviceId: string,
  textHe: string,
  pickedIds: readonly string[],
  destinationHe: string | null
): string | undefined {
  const o = orderSummary(serviceId, pickedIds);
  const lines = [
    textHe.trim(),
    o ? `הוזמן: ${o.namesHe} (${o.totalHe} לפי המחירון לדוגמה)` : "",
    destinationHe?.trim() ? `יעד: ${destinationHe.trim()}` : "",
  ].filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : undefined;
}

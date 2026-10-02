/**
 * PRO NOW's vocabulary.
 *
 * Products that feel like one thing use the same word for the same idea on
 * every screen. Products that feel assembled call it "בקשה" here, "הזמנה"
 * there and "קריאה" in the push notification — and the user quietly stops
 * believing there is one system behind it.
 *
 * So the words live here, once, and screens import them. Three rules
 * governed the choices:
 *
 * 1. **Say what is true.** A professional is "פנוי" (free) only when the
 *    server says they are dispatchable. "זמין" was rejected as a synonym
 *    precisely because it is vaguer and therefore easier to over-claim.
 * 2. **Ours, not the category's.** "הזמנה" belongs to food delivery and
 *    carries the expectation of a basket and a checkout. What happens here
 *    is a **קריאה** — you call, a person comes. The whole product is in
 *    that word, and it is the one people already use when a pipe bursts.
 * 3. **Warm, not corporate.** Second person, present tense, no "לקוח יקר".
 */

export const lex = {
  // ---- The act ----
  /** The job itself. Not "הזמנה" — nothing is being ordered from a menu. */
  call: "קריאה",
  callNow: "קריאה עכשיו",
  sendCall: "שליחת קריאה",
  /** The home screen's question. */
  homeQuestion: "מה צריך עכשיו?",

  // ---- Supply ----
  /** A professional the server will actually dispatch, right now. */
  free: "פנוי עכשיו",
  freeNearYou: "פנויים עכשיו לידך",
  /** Thin supply — true, and not dressed up. */
  fewFree: "מעט פנויים",
  /** Checked, and there is nobody. Different from "we don't know". */
  noneFree: "אין פנויים כרגע",
  /** We did not get an answer. Never rendered as "none". */
  unknownSupply: "בודקים מי פנוי",

  // ---- The professional ----
  pro: "מקצוען",
  pros: "מקצוענים",
  /** The professional's working session. */
  shift: "משמרת",
  goOnline: "יוצא למשמרת",
  goOffline: "סיום משמרת",
  onShift: "במשמרת",
  offShift: "מחוץ למשמרת",
  /** What the professional earns. Plain, and theirs. */
  payout: "התמורה שלך",

  // ---- Trust ----
  verified: "מאומת",
  whatWeChecked: "מה בדקנו",
  /** Deliberately modest: we checked documents, we did not vouch for a soul. */
  trustNote: "כל מקצוען עובר אימות זהות ובדיקת תעודות לפי סוג העבודה.",

  // ---- The journey ----
  scanning: "סורקים את האזור",
  matched: "מצאנו לך מקצוען",
  onTheWay: "בדרך אליך",
  arrived: "הגיע",
  working: "בעבודה",
  done: "הושלם",

  // ---- Money ----
  visitFee: "דמי ביקור",
  fixedPrice: "מחיר קבוע",
  hourly: "תעריף שעתי",
  quotePending: "הצעת מחיר תישלח לאישורך",
  /** Said before any commitment, on every screen that asks for one. */
  noChargeYet: "לא מחויב עד שתאשר",

  // ---- The customer's own space ----
  myCard: "הכרטיס שלי",
  myCalls: "הקריאות שלי",
  myPlaces: "הכתובות שלי",
} as const;

export type Lexicon = typeof lex;

/**
 * Hebrew has a distinct singular, so "1 מקצוענים" is simply wrong. Counting
 * copy therefore never interpolates a bare number into a plural noun.
 */
export function prosFree(count: number): string {
  if (count === 1) return `מקצוען אחד ${lex.free}`;
  return `${count} מקצוענים ${lex.free}`;
}

export function prosFreeNearYou(count: number): string {
  if (count === 1) return `מקצוען אחד פנוי עכשיו לידך`;
  return `${count} מקצוענים פנויים עכשיו לידך`;
}

/**
 * The tile form: the same fact, in the width a tile actually has.
 *
 * `prosFree` ellipsised on a two-column grid, and an ellipsis on a supply
 * count is the worst possible truncation — the number survives and the noun
 * that gives it meaning disappears. The word "מקצוענים" is carried by the
 * section heading above the grid, so it is the part that can go.
 *
 * Singular is still a separate string, because "1 פנויים" is exactly the
 * error this file exists to prevent.
 */
export function prosFreeShort(count: number, etaMinutes?: number | null): string {
  const head = count === 1 ? "פנוי אחד" : `${count} פנויים`;
  return typeof etaMinutes === "number" ? `${head} · ${etaMinutes} דק׳` : head;
}

/** "הקרוב ביותר כ-8 דקות" — only ever from a real route computation. */
export function nearestLine(minutes: number): string {
  return minutes === 1 ? "הקרוב ביותר כדקה" : `הקרוב ביותר כ-${minutes} דקות`;
}

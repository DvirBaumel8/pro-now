/**
 * THE PROFESSIONAL'S PRICE LIST.
 *
 * Amit, 2026-09-29: there are two kinds of work, and each is priced one
 * way only.
 *
 *   - Work whose price nobody knows until somebody looks (a leak, an
 *     electrical fault, a car that will not start) has a visit-and-
 *     diagnosis fee set by the professional, then a quote, and payment at
 *     the end. Those services are VISIT_QUOTE and have no list here.
 *   - Work whose price is known by its kind (a haircut, a dog walk, a
 *     cleaning visit) has a PRICE LIST: each professional sets a price
 *     for each kind of job. The customer is asked nothing about it — no
 *     problem questions before calling (*"כל הבחירות הספציפיות לפעמים לא
 *     רלוונטיות ומיותרות"*) — sees the chosen professional's list on the
 *     match card, and the professional marks which line he is doing when
 *     he starts.
 *
 * These are the preview's EXAMPLE lists (the professional sets his own,
 * /docs/18-ROADMAP.md). A professional who set his own base price scales
 * the whole list by it (`priceListFor`).
 */
export interface ListedPrice {
  id: string;
  nameHe: string;
  amountMinorUnits: number;
}

const ils = (n: number) => n * 100;
const list = (...rows: Array<[string, number]>): ListedPrice[] =>
  rows.map(([nameHe, n], i) => ({ id: `p${i + 1}`, nameHe, amountMinorUnits: ils(n) }));

export const previewPriceLists: Readonly<Record<string, ListedPrice[]>> = {
  "svc-haircut": list(["תספורת גבר", 90], ["תספורת אישה", 160], ["תספורת ילד/ה", 70], ["עיצוב זקן", 40], ["פן", 60]),
  "svc-nails": list(["מניקור", 120], ["פדיקור", 150], ["מניקור + פדיקור", 240], ["לק ג׳ל", 150], ["בנייה", 250]),
  "svc-makeup": list(["איפור יום", 300], ["איפור ערב", 450], ["איפור כלה", 900], ["איפור + שיער", 650]),
  "svc-massage": list(["עיסוי 45 דק׳", 240], ["עיסוי שעה", 300], ["עיסוי שעה וחצי", 430], ["רקמות עמוק · שעה", 360]),
  "svc-trainer": list(["אימון אישי · שעה", 220], ["אימון בפארק", 200], ["אימון זוגי", 300]),
  "svc-tutor": list(["שיעור · שעה", 150], ["שיעור הכנה לבגרות", 180], ["שיעור אונליין", 130]),
  "svc-dog-walk": list(["טיול 20 דק׳", 45], ["טיול 40 דק׳", 70], ["טיול שעה", 95]),
  "svc-pet-groom": list(["רחצה", 150], ["רחצה וגזירה", 280], ["קיצור ציפורניים", 60], ["כלב גדול · תוספת", 80]),
  "svc-pet-sit": list(["השגחה · שעתיים", 120], ["חצי יום", 280], ["יום שלם", 450], ["כולל לילה", 650]),
  "svc-clean": list(["ביקור ניקיון · 3 שעות", 285], ["ביקור ניקיון · 5 שעות", 450], ["ניקיון אחרי אירוע", 380]),
  "svc-furniture": list(["הרכבת ארון", 350], ["הרכבת מיטה", 250], ["שולחן או כיסאות", 180], ["שולחן עבודה", 200]),
  "svc-tv": list(["תליית מסך עד 50״", 250], ["תליית מסך 50–65״", 300], ["תליית מסך מעל 65״", 400], ["הסתרת כבלים", 150]),
  "svc-curtains": list(["התקנת וילון", 200], ["החלפת וילון", 180], ["תיקון מסילה", 150]),
  "svc-lock": list(["פתיחת דלת", 250], ["פתיחת פלדלת / רב־בריח", 400]),
  "svc-cylinder": list(["החלפת צילינדר", 390], ["צילינדר לפלדלת", 640], ["צילינדר לדלת פנימית", 250]),
  "svc-car-lockout": list(["פתיחת רכב", 250], ["פתיחת רכב · מפתח שבור במנעול", 350]),
  "svc-flat-tyre": list(["החלפה לגלגל חלופי", 180], ["תיקון תקר במקום", 150], ["החלפה בכביש מהיר", 260]),
  "svc-doctor": list(["ביקור רופא בבית", 450], ["ביקור רופא ילדים", 450]),
};

/** The list for a service, scaled so its first line is the professional's own base price when he set one. */
export function priceListFor(serviceId: string, ownBase: number | null = null): ListedPrice[] {
  const rows = previewPriceLists[serviceId];
  if (!rows || rows.length === 0) return [];
  const first = rows[0]!.amountMinorUnits;
  const k = ownBase && first > 0 ? ownBase / first : 1;
  return rows.map((r) => ({ ...r, amountMinorUnits: Math.round((r.amountMinorUnits * k) / 1000) * 1000 }));
}

/** The cheapest line — "החל מ־₪X" before anyone is chosen. */
export function lowestListed(serviceId: string): number | null {
  const rows = previewPriceLists[serviceId];
  if (!rows || rows.length === 0) return null;
  return Math.min(...rows.map((r) => r.amountMinorUnits));
}

/** "תספורת גבר ₪90 · תספורת אישה ₪160 · …", the first few lines. */
export function priceListLineHe(rows: ListedPrice[], max = 3): string {
  const shown = rows.slice(0, max).map((r) => `${r.nameHe} ₪${Math.round(r.amountMinorUnits / 100).toLocaleString("en-US")}`);
  return rows.length > max ? `${shown.join(" · ")} · ועוד` : shown.join(" · ");
}

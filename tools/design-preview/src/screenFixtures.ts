import type { AreaAvailabilityView, QuoteView } from "@pro-now/types";
import type {
  HomeRecentItem,
  HomeServiceItem,
  ProProfileReviewItem,
  ProProfileServiceItem,
  ProServiceToggle,
  ReceiptLine,
  ServiceDetailBodyProps,
} from "@pro-now/ui";

/**
 * PREVIEW FIXTURES for the full-screen compositions.
 *
 * Same rule as `fixtures.ts`: obvious placeholders, never plausible-looking
 * people or invented supply presented as real. Where a count would be
 * fabricated, it is `null` — which is also the case the design has to
 * handle, so showing it here is the point rather than a limitation.
 *
 * The photo subjects describe what a licensed photograph will show. No
 * stock imagery is substituted (/docs/03-DESIGN-SYSTEM.md §Content rules).
 */

export const homeServices: HomeServiceItem[] = [
  {
    id: "svc-leak",
    nameHe: "תיקון נזילה",
    mark: "plumbing",
    photoSubject: "מטבח · ברז וכיור",
    availableNowCount: 4,
    priceHint: "דמי ביקור ₪179",
  },
  {
    id: "svc-electric",
    nameHe: "תקלת חשמל",
    mark: "electrical",
    photoSubject: "לוח חשמל ביתי",
    availableNowCount: 2,
    priceHint: "תעריף שעתי",
  },
  {
    id: "svc-ac",
    nameHe: "מיזוג אוויר",
    mark: "climate",
    photoSubject: "מזגן עילי בסלון",
    // Unknown on purpose: the server has not reported supply for this one.
    availableNowCount: null,
    priceHint: "מחיר קבוע",
  },
  {
    id: "svc-lock",
    nameHe: "פריצת דלת",
    mark: "locksmith",
    photoSubject: "מנעול ודלת כניסה",
    availableNowCount: 1,
    priceHint: "דמי ביקור",
  },
  {
    id: "svc-moving",
    nameHe: "הובלה קטנה",
    mark: "moving",
    photoSubject: "ארגזים במסדרון",
    availableNowCount: null,
    priceHint: "לפי מרחק",
  },
  {
    id: "svc-paint",
    nameHe: "צביעה",
    mark: "painting",
    photoSubject: "קיר סלון בצביעה",
    availableNowCount: null,
    priceHint: "לפי הצעת מחיר",
  },
];

export const homeRecent: HomeRecentItem[] = [
  { id: "r1", nameHe: "תיקון נזילה בברז", mark: "plumbing", metaHe: "לפני שבועיים · הושלם" },
  { id: "r2", nameHe: "התקנת מזגן", mark: "climate", metaHe: "מאי · הושלם" },
];

export const proServices: ProServiceToggle[] = [
  { id: "p1", nameHe: "תיקון נזילה", mark: "plumbing", enabled: true },
  { id: "p2", nameHe: "פתיחת סתימות", mark: "plumbing", enabled: true },
  {
    id: "p3",
    nameHe: "עבודות חשמל",
    mark: "electrical",
    enabled: true,
    // The exact case credential-eligibility.ts was written to catch.
    blockedReasonHe: "רישיון חשמלאי פג תוקף — חדש אותו כדי לקבל עבודות",
  },
  { id: "p4", nameHe: "מיזוג אוויר", mark: "climate", enabled: false },
];

// ---------------------------------------------------------------------
// Page fixtures — service detail, professional profile, quote, receipt
// ---------------------------------------------------------------------

/** C04 — VISIT_QUOTE, the most common and most misunderstood model. */
export const serviceDetailLeak: Omit<ServiceDetailBodyProps, "width" | "height"> = {
  nameHe: "תיקון נזילה",
  mark: "plumbing",
  photoSubject: "מטבח · ברז נוטף וארון מתחת לכיור",
  descriptionHe: "נזילה מברז, מסיפון או מצנרת גלויה — אבחון ותיקון באותו ביקור כשניתן.",
  includedHe: [
    "הגעה עד הבית ואבחון מקור הנזילה",
    "תיקון מיידי כשהוא אפשרי בכלים ובחלקים שבידי בעל המקצוע",
    "בדיקת אטימות לאחר התיקון",
  ],
  notIncludedHe: [
    "חלקים מיוחדים שיש להזמין — יתומחרו בהצעת מחיר נפרדת",
    "פתיחת קירות או ריצוף",
  ],
  price: { priceModel: "VISIT_QUOTE", currency: "ILS", visitFeeMinorUnits: 17900 },
  availableNowCount: 4,
  requiredCredentialsHe: ["אימות זהות", "אימות עסק פעיל", "ביטוח צד ג׳ בתוקף"],
};

/** The same page with HOURLY pricing and zero live supply. */
export const serviceDetailElectric: Omit<ServiceDetailBodyProps, "width" | "height"> = {
  nameHe: "תקלת חשמל",
  mark: "electrical",
  photoSubject: "לוח חשמל ביתי פתוח",
  descriptionHe: "הפסקת חשמל מקומית, ממסר פחת שקופץ, שקע או מעגל שאינו עובד.",
  includedHe: ["איתור התקלה בלוח ובמעגלים", "תיקון תקלות נפוצות במקום"],
  notIncludedHe: ["החלפת לוח חשמל שלם", "עבודות תשתית בקירות"],
  price: {
    priceModel: "HOURLY",
    currency: "ILS",
    hourlyRateMinorUnits: 28000,
    minimumBillableMinutes: 60,
  },
  availableNowCount: 0,
  requiredCredentialsHe: ["אימות זהות", "רישיון חשמלאי בתוקף", "ביטוח צד ג׳ בתוקף"],
};

export const profileServices: ProProfileServiceItem[] = [
  { id: "s1", nameHe: "תיקון נזילה", mark: "plumbing", priceHintHe: "דמי ביקור ₪179" },
  { id: "s2", nameHe: "פתיחת סתימות", mark: "plumbing", priceHintHe: "דמי ביקור ₪179" },
  { id: "s3", nameHe: "החלפת ברז או סיפון", mark: "handyman", priceHintHe: null },
];

export const profileReviews: ProProfileReviewItem[] = [
  {
    id: "rev1",
    rating: 5,
    textHe: "הגיע תוך רבע שעה, הסביר מה הבעיה לפני שנגע במשהו, וסגר אחריו הכול.",
    whenHe: "לפני שבועיים",
    reviewerLabelHe: "ד׳ (תצוגה)",
    serviceNameHe: "תיקון נזילה",
  },
  {
    id: "rev2",
    rating: 4,
    textHe: null,
    whenHe: "לפני חודש",
    reviewerLabelHe: "מ׳ (תצוגה)",
    serviceNameHe: "פתיחת סתימות",
  },
];

export const profileWorkPhotos = [
  "סיפון שהוחלף מתחת לכיור",
  "חיבור מכונת כביסה",
  "ברז מטבח חדש מותקן",
  "צנרת גלויה לאחר איטום",
];

/** C11 — a VISIT_QUOTE job that produced a real itemised quote. */
export const quoteFixture: QuoteView = {
  id: "quote_preview_1",
  jobId: "job_preview_1",
  version: 2,
  versionHash: "9f3c1ab47e26d8550c1f",
  status: "SENT",
  totalMinorUnits: 62400,
  notes: "הסיפון סדוק ואינו ניתן לאיטום. המחיר כולל החלפה מלאה ובדיקת אטימות לאחר ההתקנה.",
  createdAt: "2026-09-19T12:14:00.000Z",
  lineItems: [
    {
      id: "qi1",
      quoteId: "quote_preview_1",
      description: "דמי ביקור ואבחון (מקוזז מהעבודה)",
      quantity: 1,
      unitPriceMinorUnits: 17900,
      kind: "LABOR",
    },
    {
      id: "qi2",
      quoteId: "quote_preview_1",
      description: "החלפת סיפון כולל אטמים",
      quantity: 1,
      unitPriceMinorUnits: 32500,
      kind: "LABOR",
    },
    {
      id: "qi3",
      quoteId: "quote_preview_1",
      description: "סיפון PVC 40 מ״מ",
      quantity: 2,
      unitPriceMinorUnits: 6000,
      kind: "MATERIALS",
    },
  ],
};

export const receiptLines: ReceiptLine[] = [
  { id: "l1", labelHe: "החלפת סיפון כולל אטמים", amountMinorUnits: 32500 },
  { id: "l2", labelHe: "סיפון PVC 40 מ״מ · 2", amountMinorUnits: 12000 },
  { id: "l3", labelHe: "דמי ביקור ואבחון", amountMinorUnits: 17900 },
  { id: "l4", labelHe: "קיזוז דמי ביקור", amountMinorUnits: 17900, negative: true },
];


// ---------------------------------------------------------------------
// Live availability snapshots
// ---------------------------------------------------------------------

/**
 * The gallery shows the SAME snapshot read at three different moments, so a
 * reviewer can see the freshness rule work rather than take it on trust:
 * fresh, at the edge of the window, and past it. Past it, every count on the
 * screen disappears at once — which is the behaviour that makes "זמין עכשיו"
 * mean something.
 */
export const AVAILABILITY_AT = "2026-09-19T12:00:00.000Z";
export const AVAILABILITY_AT_MS = Date.parse(AVAILABILITY_AT);

export const availabilitySnapshot: AreaAvailabilityView = {
  areaLabel: "רמת אביב, תל אביב",
  computedAt: AVAILABILITY_AT,
  staleAfterSeconds: 60,
  services: [
    { serviceId: "svc-leak", availableNow: 4, nearestEtaSeconds: 480 },
    { serviceId: "svc-electric", availableNow: 2, nearestEtaSeconds: 900 },
    { serviceId: "svc-lock", availableNow: 1, nearestEtaSeconds: 1200 },
    // Reported by the server as genuinely zero — different from absent.
    { serviceId: "svc-ac", availableNow: 0, nearestEtaSeconds: null },
    // svc-moving and svc-paint are absent from the snapshot entirely: the
    // server has no reading for them, and the tiles must show nothing.
  ],
};

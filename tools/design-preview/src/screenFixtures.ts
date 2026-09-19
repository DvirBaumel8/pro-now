import type { AreaAvailabilityView, QuoteView } from "@pro-now/types";
import type {
  CallListItem,
  ChatMessage,
  EarningDay,
  EarningJob,
  HomeRecentItem,
  HomeServiceItem,
  JobMediaItem,
  ProProfileReviewItem,
  ProProfileServiceItem,
  CustomerCallHistoryItem,
  CustomerOpenCall,
  ProServiceToggle,
  ReceiptLine,
  SavedAddress,
  ServiceMatchRule,
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
  symptomsHe: [
    "ברז מטפטף",
    "מים מתחת לכיור",
    "כתם רטוב בקיר",
    "סתימה שלא נפתחת",
    "לחץ מים נמוך",
    "לא יודע מאיפה",
  ],
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
  symptomsHe: [
    "הפחת קופץ שוב ושוב",
    "חדר שלם בלי חשמל",
    "שקע מסוים לא עובד",
    "ריח שרוף",
    "אור מהבהב",
    "לא יודע מאיפה",
  ],
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
    { serviceId: "svc-leak", state: "AVAILABLE", availableProviderCount: 4, nearestRouteEtaMinutes: 8 },
    { serviceId: "svc-electric", state: "AVAILABLE", availableProviderCount: 2, nearestRouteEtaMinutes: 15 },
    // Thin supply, said plainly rather than dressed up as plenty.
    { serviceId: "svc-lock", state: "LIMITED", availableProviderCount: 1, nearestRouteEtaMinutes: 22 },
    // Checked, and there is genuinely nobody — different from unknown.
    { serviceId: "svc-ac", state: "UNAVAILABLE", availableProviderCount: 0, reasonCode: "NO_ELIGIBLE_SUPPLY" },
    { serviceId: "svc-moving", state: "UNKNOWN", reasonCode: "NOT_COMPUTED" },
    // svc-paint is absent from the snapshot entirely, which must also read
    // as unknown rather than as zero.
  ],
};

// ---------------------------------------------------------------------
// The cast
// ---------------------------------------------------------------------

/**
 * A wider set of people than the two placeholders the gallery started with.
 *
 * The names are obvious display placeholders, and the faces are illustrated
 * rather than photographic — so a screenshot of this gallery still cannot be
 * mistaken for real marketplace supply (/CLAUDE.md §3), while the screens
 * stop looking deserted.
 *
 * The seeds are ids, not names, because the illustration must stay stable
 * for a person even if their display name changes.
 */
export const cast = [
  { id: "pro_1", nameHe: "דוגמה א׳ (תצוגה)", trade: "אינסטלציה" },
  { id: "pro_2", nameHe: "דוגמה ב׳ (תצוגה)", trade: "חשמל" },
  { id: "pro_3", nameHe: "דוגמה ג׳ (תצוגה)", trade: "מיזוג" },
  { id: "pro_4", nameHe: "דוגמה ד׳ (תצוגה)", trade: "מנעולנות" },
  { id: "pro_5", nameHe: "דוגמה ה׳ (תצוגה)", trade: "הובלות" },
  { id: "pro_6", nameHe: "דוגמה ו׳ (תצוגה)", trade: "צביעה" },
  { id: "pro_7", nameHe: "דוגמה ז׳ (תצוגה)", trade: "אינסטלציה" },
  { id: "pro_8", nameHe: "דוגמה ח׳ (תצוגה)", trade: "חשמל" },
];

export const castSeeds = cast.map((c) => c.id);

export const customerHistory: CustomerCallHistoryItem[] = [
  {
    id: "call_1",
    serviceNameHe: "תיקון נזילה בברז",
    mark: "plumbing",
    metaHe: "לפני שבועיים · הושלם",
    proSeed: "pro_1",
    proNameHe: cast[0]!.nameHe,
    totalMinorUnits: 44500,
    myRating: 5,
  },
  {
    id: "call_2",
    serviceNameHe: "התקנת מזגן",
    mark: "climate",
    metaHe: "מאי · הושלם",
    proSeed: "pro_3",
    proNameHe: cast[2]!.nameHe,
    totalMinorUnits: 92000,
    myRating: null,
  },
  {
    id: "call_3",
    serviceNameHe: "פתיחת סתימה במטבח",
    mark: "plumbing",
    metaHe: "מרץ · הושלם",
    proSeed: "pro_7",
    proNameHe: cast[6]!.nameHe,
    totalMinorUnits: 27900,
    myRating: 4,
  },
];

export const customerOpenCall: CustomerOpenCall[] = [
  {
    id: "call_live",
    serviceNameHe: "תקלת חשמל בסלון",
    mark: "electrical",
    stateHe: "בדרך אליך",
    etaMinutes: 14,
    proSeed: "pro_2",
    proNameHe: cast[1]!.nameHe,
  },
];

// ---------------------------------------------------------------------
// Routing a sentence to a service
// ---------------------------------------------------------------------

/**
 * The words people actually type, not category names. A customer writes
 * "מטפטף לי הברז", never "אינסטלציה".
 */
export const matchRules: ServiceMatchRule[] = [
  {
    serviceId: "svc-leak",
    keywords: ["נזילה", "נוזל", "דולף", "מטפטף", "ברז", "מים", "סיפון", "צינור", "כיור", "סתימה", "ביוב"],
  },
  {
    serviceId: "svc-electric",
    keywords: ["חשמל", "פחת", "שקע", "נורה", "אור", "קצר", "לוח חשמל", "הפסקת חשמל", "מפסק"],
  },
  { serviceId: "svc-ac", keywords: ["מזגן", "מיזוג", "לא מקרר", "לא מחמם", "מטפטף מהמזגן"] },
  { serviceId: "svc-lock", keywords: ["מנעול", "מפתח", "ננעלתי", "נעול", "דלת", "צילינדר"] },
  { serviceId: "svc-moving", keywords: ["הובלה", "מעבר דירה", "ארגזים", "להעביר", "משאית"] },
  { serviceId: "svc-paint", keywords: ["צביעה", "לצבוע", "צבע", "קיר", "טיח"] },
];

export const savedAddresses: SavedAddress[] = [
  { id: "addr_home", labelHe: "בית", formattedHe: "רמת אביב, תל אביב · קומה 3, דירה 9" },
  { id: "addr_work", labelHe: "עבודה", formattedHe: "הרצליה פיתוח · בניין B, קומה 2" },
  {
    id: "addr_grandpa",
    labelHe: "אצל סבא",
    formattedHe: "רמת גן · קומה 1, דירה 4",
    forSomeoneElseNameHe: "סבא יוסף (תצוגה)",
  },
];

// ---------------------------------------------------------------------
// The job, from the professional's side
// ---------------------------------------------------------------------

/**
 * What the customer actually sent: the symptoms they tapped, a sentence in
 * their own words, a voice note and two photos. The media have no real
 * files here — `uri: null` — and the screen says so rather than miming
 * playback.
 */
export const jobMedia: JobMediaItem[] = [
  { id: "m1", kind: "VOICE", subjectHe: "הקלטה מהלקוח", seconds: 14, uri: null },
  { id: "m2", kind: "PHOTO", subjectHe: "ארון מתחת לכיור · מים", uri: null },
  { id: "m3", kind: "PHOTO", subjectHe: "הברז מקרוב", uri: null },
  { id: "m4", kind: "PHOTO", subjectHe: "כתם על הקיר", uri: null },
];

export const jobSymptoms = ["מים מתחת לכיור", "ברז מטפטף", "כתם רטוב בקיר"];

export const jobDescription =
  "מאתמול בערב יש מים בארון מתחת לכיור במטבח. ניגבתי וזה חזר. הברז גם מטפטף קצת. יש שם ארון עץ אז אני מעדיף שמישהו יגיע היום.";

// ---------------------------------------------------------------------
// Conversation, calls list, earnings
// ---------------------------------------------------------------------

export const chatSeed: ChatMessage[] = [
  { id: "c0", from: "system", textHe: "השיחה נפתחה כשהעבודה שויכה. המספרים מוסתרים משני הצדדים.", atHe: "" },
  { id: "c1", from: "pro", textHe: "שלום, יצאתי אליך. אני בערך 10 דקות משם.", atHe: "14:06" },
  { id: "c2", from: "customer", textHe: "מעולה. השער הכחול, קומה 3.", atHe: "14:07", seen: true },
  { id: "c3", from: "pro", textHe: "קיבלתי. יש חניה בסביבה?", atHe: "14:08" },
];

export const customerQuickReplies = ["אני בבית", "אני יורד/ת", "אפשר לדחות בחצי שעה?", "תודה!"];
export const proQuickReplies = ["יצאתי אליך", "מתעכב ב-10 דקות", "הגעתי, אני בכניסה", "סיימתי"];

export const callsList: CallListItem[] = [
  {
    id: "call_live",
    serviceNameHe: "תקלת חשמל בסלון",
    mark: "electrical",
    stateHe: "בדרך אליך",
    whenHe: "עכשיו",
    live: true,
    proNameHe: cast[1]!.nameHe,
    proSeed: "pro_2",
    etaMinutes: 14,
    totalMinorUnits: null,
    myRating: null,
  },
  {
    id: "call_2",
    serviceNameHe: "התקנת מזגן",
    mark: "climate",
    stateHe: "הושלם",
    whenHe: "מאי",
    live: false,
    proNameHe: cast[2]!.nameHe,
    proSeed: "pro_3",
    etaMinutes: null,
    totalMinorUnits: 92000,
    myRating: null,
  },
  {
    id: "call_1",
    serviceNameHe: "תיקון נזילה בברז",
    mark: "plumbing",
    stateHe: "הושלם",
    whenHe: "לפני שבועיים",
    live: false,
    proNameHe: cast[0]!.nameHe,
    proSeed: "pro_1",
    etaMinutes: null,
    totalMinorUnits: 44500,
    myRating: 5,
  },
  {
    id: "call_3",
    serviceNameHe: "פתיחת סתימה במטבח",
    mark: "plumbing",
    stateHe: "הושלם",
    whenHe: "מרץ",
    live: false,
    proNameHe: cast[6]!.nameHe,
    proSeed: "pro_7",
    etaMinutes: null,
    totalMinorUnits: 27900,
    myRating: 4,
  },
];

export const earningDays: EarningDay[] = [
  { labelHe: "א׳", netMinorUnits: 21400, jobs: 2 },
  { labelHe: "ב׳", netMinorUnits: 0, jobs: 0 },
  { labelHe: "ג׳", netMinorUnits: 38900, jobs: 3 },
  { labelHe: "ד׳", netMinorUnits: 17600, jobs: 1 },
  { labelHe: "ה׳", netMinorUnits: 44100, jobs: 4 },
  { labelHe: "ו׳", netMinorUnits: 12800, jobs: 1 },
  { labelHe: "ש׳", netMinorUnits: 48200, jobs: 3, isToday: true },
];

/**
 * The deductions are named individually and deliberately NOT summed into a
 * single "fees" line. The commission percentage is a business decision that
 * has not been made, so these are illustrative amounts, not a rate the code
 * assumes.
 */
export const earningJobs: EarningJob[] = [
  {
    id: "e1",
    serviceNameHe: "תיקון נזילה בברז",
    mark: "plumbing",
    whenHe: "היום, 14:20",
    grossMinorUnits: 44500,
    deductions: [
      { labelHe: "עמלת פלטפורמה", minorUnits: 6675 },
      { labelHe: "עמלת סליקה", minorUnits: 890 },
    ],
    netMinorUnits: 36935,
  },
  {
    id: "e2",
    serviceNameHe: "פתיחת סתימה",
    mark: "plumbing",
    whenHe: "היום, 11:05",
    grossMinorUnits: 27900,
    deductions: [
      { labelHe: "עמלת פלטפורמה", minorUnits: 4185 },
      { labelHe: "עמלת סליקה", minorUnits: 558 },
    ],
    netMinorUnits: 23157,
  },
];

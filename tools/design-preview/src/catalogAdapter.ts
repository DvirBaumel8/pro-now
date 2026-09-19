import {
  allServices,
  browseOnly,
  pilotCatalog,
  pilotMarket,
  pilotServiceById,
  resolveMarket,
  type CatalogServiceDef,
  type CredentialKind,
  type PriceQuoteView,
} from "@pro-now/types";
import type {
  HomeServiceItem,
  MarkName,
  ProServiceEligibility,
  ProServiceToggle,
  ServiceDetailBodyProps,
  ServiceMatchRule,
} from "@pro-now/ui";

/**
 * One catalogue, read by every screen.
 *
 * Before this file existed the home grid, the service page, the sentence
 * matcher and the professional's eligibility list each carried their own
 * hand-written copy of "the services". They had already drifted: the matcher
 * could route "סתימה" to a service the home grid did not show, and the
 * professional's toggles named trades the customer could not request. None
 * of that is a bug anyone reports — it is just an app that quietly
 * contradicts itself.
 *
 * So the prototype now derives all four from `pilotCatalog`. Adding a
 * service is one entry in one file; forgetting to add it to a screen is no
 * longer possible.
 *
 * WHAT STAYS OUT OF THE CATALOGUE, ON PURPOSE:
 *
 * Prices. The catalogue says HOW a service is priced (`pricingModel`) and
 * never how much, because a number written beside a service definition gets
 * read as a promise, and the only system allowed to make that promise is the
 * pricing engine on the server. The preview numbers below are therefore
 * kept here, in the fixtures layer, where they are visibly demo data.
 */

// ---------------------------------------------------------------------
// Preview-only pricing
// ---------------------------------------------------------------------

/**
 * Demo amounts. NOT a price list — no commercial decision has been made
 * (/CLAUDE.md §4), and these exist so the pricing copy has something to
 * render. A service missing from this table renders as "—" and the copy
 * says the price has not been set, which is the real state until it is.
 */
const previewPrices: Record<string, PriceQuoteView> = {
  "svc-blockage": { priceModel: "VISIT_QUOTE", currency: "ILS", visitFeeMinorUnits: 17900 },
  "svc-leak": { priceModel: "VISIT_QUOTE", currency: "ILS", visitFeeMinorUnits: 17900 },
  "svc-tap": { priceModel: "FIXED", currency: "ILS", fixedTotalMinorUnits: 32000 },
  "svc-electric": { priceModel: "VISIT_QUOTE", currency: "ILS", visitFeeMinorUnits: 19900 },
  "svc-socket": { priceModel: "FIXED", currency: "ILS", fixedTotalMinorUnits: 24000 },
  "svc-lock": { priceModel: "VISIT_QUOTE", currency: "ILS", visitFeeMinorUnits: 21900 },
  "svc-cylinder": { priceModel: "FIXED", currency: "ILS", fixedTotalMinorUnits: 39000 },
  "svc-ac": { priceModel: "VISIT_QUOTE", currency: "ILS", visitFeeMinorUnits: 19900 },
  "svc-fridge": { priceModel: "VISIT_QUOTE", currency: "ILS", visitFeeMinorUnits: 18900 },
  "svc-washer": { priceModel: "VISIT_QUOTE", currency: "ILS", visitFeeMinorUnits: 18900 },
  "svc-clean": {
    priceModel: "HOURLY",
    currency: "ILS",
    hourlyRateMinorUnits: 9500,
    minimumBillableMinutes: 120,
  },
  "svc-pest": { priceModel: "FIXED", currency: "ILS", fixedTotalMinorUnits: 45000 },
  // The person-services. Fixed prices, because "how much is a haircut" is a
  // question with an answer — and a VISIT_QUOTE on a haircut would be the
  // clearest possible sign we pasted the plumbing model onto a person.
  "svc-haircut": { priceModel: "FIXED", currency: "ILS", fixedTotalMinorUnits: 12000 },
  "svc-nails": { priceModel: "FIXED", currency: "ILS", fixedTotalMinorUnits: 18000 },
  "svc-massage": { priceModel: "FIXED", currency: "ILS", fixedTotalMinorUnits: 32000 },
  "svc-trainer": { priceModel: "FIXED", currency: "ILS", fixedTotalMinorUnits: 22000 },
  "svc-tutor": {
    priceModel: "HOURLY",
    currency: "ILS",
    hourlyRateMinorUnits: 15000,
    minimumBillableMinutes: 60,
  },
  "svc-handyman": {
    priceModel: "HOURLY",
    currency: "ILS",
    hourlyRateMinorUnits: 16000,
    minimumBillableMinutes: 60,
  },
  "svc-hands": {
    priceModel: "HOURLY",
    currency: "ILS",
    hourlyRateMinorUnits: 11000,
    minimumBillableMinutes: 60,
  },
  "svc-courier": {
    priceModel: "DISTANCE_TIME",
    currency: "ILS",
    baseMinorUnits: 2900,
    perKmMinorUnits: 450,
    minimumFareMinorUnits: 3900,
  },
  "svc-moving": {
    priceModel: "DISTANCE_TIME",
    currency: "ILS",
    baseMinorUnits: 24900,
    perKmMinorUnits: 900,
    minimumFareMinorUnits: 29900,
  },
};

function priceFor(s: CatalogServiceDef): PriceQuoteView {
  return previewPrices[s.id] ?? { priceModel: s.pricingModel, currency: "ILS" };
}

/** The one-line hint under a tile. Says the model, never invents a figure. */
function priceHint(s: CatalogServiceDef): string {
  const p = previewPrices[s.id];
  switch (s.pricingModel) {
    case "FIXED":
      return p?.fixedTotalMinorUnits ? `מחיר קבוע ₪${p.fixedTotalMinorUnits / 100}` : "מחיר קבוע";
    case "VISIT_QUOTE":
      return p?.visitFeeMinorUnits ? `דמי ביקור ₪${p.visitFeeMinorUnits / 100}` : "דמי ביקור";
    case "HOURLY":
      return p?.hourlyRateMinorUnits ? `₪${p.hourlyRateMinorUnits / 100} לשעה` : "תעריף שעתי";
    case "DISTANCE_TIME":
      return "לפי מרחק";
    default:
      return "";
  }
}

// ---------------------------------------------------------------------
// Credentials, in words a customer can judge
// ---------------------------------------------------------------------

/**
 * The service page lists what was verified. It has to be readable by someone
 * who has never heard the word "credential", because the whole promise of
 * this product is that the person at the door was checked — and a promise
 * nobody can parse is not a promise.
 */
const credentialHe: Record<CredentialKind, string> = {
  IDENTITY: "זהות מאומתת",
  IDENTITY_ENHANCED: "זהות מאומתת באימות מוגבר",
  BUSINESS: "עוסק מורשה פעיל",
  LIABILITY_INSURANCE: "ביטוח צד ג׳ בתוקף",
  ELECTRICIAN_LICENSE: "רישיון חשמלאי בתוקף",
  GAS_LICENSE: "רישיון גז בתוקף",
  PEST_CONTROL_LICENSE: "היתר הדברה בתוקף",
  DRIVING_LICENSE: "רישיון נהיגה בתוקף",
  VEHICLE_INSURANCE: "ביטוח רכב בתוקף",
  PROPERTY_LINK_POLICY: "נוהל אימות זיקה לנכס",
  PROFESSIONAL_CERTIFICATE: "תעודה מקצועית בתחום",
  BACKGROUND_CHECK: "בדיקת רקע",
};

export function credentialsHe(s: CatalogServiceDef): string[] {
  return s.requiredCredentials.map((c) => credentialHe[c]);
}

// ---------------------------------------------------------------------
// What each screen needs
// ---------------------------------------------------------------------

/**
 * THE HOME GRID SHOWS THE MARKET, NOT THE CATALOGUE.
 *
 * `dispatchableNow(pilotCatalog)` is "everything the product can do"; this
 * is "everything we can actually answer here, today". They are different
 * numbers and the customer must only ever see the second one. Fourteen
 * tiles where six find somebody does not read as a big catalogue — it reads
 * as a broken app.
 */
const marketSet = resolveMarket(pilotCatalog, pilotMarket);
const live = marketSet.live;
/**
 * Below the fold: the scheduled trades, and the dispatchable services that
 * simply are not open in this market yet. Both are browse-only here, but for
 * different reasons, and the UI keeps the two apart so it never tells
 * someone that a locksmith is "not urgent" when the truth is "not here yet".
 */
const browse = [...marketSet.notInThisMarket, ...browseOnly(pilotCatalog)];

/**
 * The home grid: everything dispatchable now, then the scheduled trades.
 *
 * `availableNowCount: null` everywhere on purpose. The live snapshot is the
 * only thing allowed to put a number on this screen, and a fallback count
 * baked into a fixture is exactly how the stale-number bug came back the
 * first time (see `home-supply.ts`).
 */
const departmentOf: Record<string, string> = Object.fromEntries(
  pilotCatalog.flatMap((d) => d.categories.flatMap((c) => c.services.map((s) => [s.id, d.nameHe])))
);

const notInMarketIds = new Set(marketSet.notInThisMarket.map((s) => s.id));

/**
 * A mark per department, chosen for the department.
 *
 * Deriving it from the first service in the tree put a spanner on
 * "אנשים שמגיעים אליך", because that department lists the handyman first —
 * a wrench standing in for a personal trainer and a massage therapist.
 */
const departmentMarks: Record<string, MarkName> = {
  HOME_URGENT: "plumbing",
  PEOPLE: "fitness",
  HOME_CARE: "cleaning",
  LOGISTICS: "moving",
  IMPROVEMENT: "painting",
};

const departmentMarkOf: Record<string, MarkName> = Object.fromEntries(
  pilotCatalog.flatMap((d) =>
    d.categories.flatMap((c) =>
      c.services.map((s) => [s.id, departmentMarks[d.code] ?? (s.mark as MarkName)])
    )
  )
);

export const catalogHomeServices: HomeServiceItem[] = [...live, ...browse].map((s) => ({
  id: s.id,
  nameHe: s.nameHe,
  mark: s.mark as MarkName,
  photoSubject: s.photoSubjectHe,
  descriptionHe: s.descriptionHe,
  departmentHe: departmentOf[s.id] ?? null,
  departmentMark: departmentMarkOf[s.id] ?? null,
  /*
   * The two "not now" reasons, kept apart all the way to the row that
   * renders them. Collapsing them here would be invisible and would make
   * the app tell a customer that a locksmith is "planned work" when the
   * truth is that we have not signed one up in their city.
   */
  comingSoon: s.activationStatus === "PILOT" && s.fulfillmentProfile !== "SCHEDULED_ONLY",
  scheduledOnly: s.fulfillmentProfile === "SCHEDULED_ONLY",
  notInMarket: notInMarketIds.has(s.id),
  availableNowCount: null,
  priceHint: priceHint(s),
}));

/** Only the NOW services, for the compact "what can I get right now" grid. */
export const catalogNowServices: HomeServiceItem[] = catalogHomeServices.filter((s) =>
  live.some((l) => l.id === s.id)
);

/**
 * "מה כלול / מה לא כלול" is generated from the pricing model rather than
 * written per service, because the dispute this section prevents is always
 * the same dispute and it is always about the pricing model.
 */
function included(s: CatalogServiceDef): string[] {
  const base = ["הגעה עד הכתובת שנתת", "אבחון התקלה במקום", "עבודה של בעל מקצוע מאומת לשירות הזה"];
  switch (s.pricingModel) {
    case "VISIT_QUOTE":
      return [...base, "הצעת מחיר לתיקון — לפני שמתחילים"];
    case "FIXED":
      return [...base, "המחיר סוכם מראש ולא משתנה בסוף"];
    case "HOURLY":
      return [...base, "חיוב לפי זמן עבודה בפועל"];
    case "DISTANCE_TIME":
      return ["איסוף מהכתובת שנתת", "מסירה בכתובת היעד", "מחיר לפי מרחק בפועל"];
    default:
      return base;
  }
}

function notIncluded(s: CatalogServiceDef): string[] {
  switch (s.pricingModel) {
    case "VISIT_QUOTE":
      return ["חלקי חילוף — יופיעו בהצעת המחיר", "עבודה שדורשת אישור ועד או רישוי נוסף"];
    case "FIXED":
      return ["חלקים מיוחדים שלא סופקו מראש", "עבודה נוספת מעבר למה שהוגדר"];
    case "HOURLY":
      return ["חומרי ניקוי מיוחדים", "פינוי פסולת בנפח גדול"];
    case "DISTANCE_TIME":
      return ["אריזה ופירוק", "העלאה בקומות ללא מעלית — תוספת מראש"];
    default:
      return [];
  }
}

export type ServicePage = Omit<ServiceDetailBodyProps, "width" | "height">;

/** Every service gets a real page. None is a fallback to the plumbing one. */
export const catalogServicePages: Record<string, ServicePage> = Object.fromEntries(
  allServices(pilotCatalog).map((s) => [
    s.id,
    {
      nameHe: s.nameHe,
      mark: s.mark as MarkName,
      photoSubject: s.photoSubjectHe,
      descriptionHe: s.descriptionHe,
      symptomsHe: s.symptomsHe,
      includedHe: included(s),
      notIncludedHe: notIncluded(s),
      price: priceFor(s),
      availableNowCount: null,
      requiredCredentialsHe: credentialsHe(s),
      comingSoon: s.activationStatus === "PILOT" && s.fulfillmentProfile !== "SCHEDULED_ONLY",
    } satisfies ServicePage,
  ])
);

/**
 * The sentence matcher's rules, taken straight from the catalogue.
 *
 * This is the drift that mattered most. A keyword list maintained apart from
 * the catalogue guarantees that sooner or later someone types a real problem
 * and the app routes them to a service that is no longer offered — or to
 * nothing at all, while the service sits right there on the home screen.
 */
export const catalogMatchRules: ServiceMatchRule[] = allServices(pilotCatalog)
  .filter((s) => s.activationStatus !== "INACTIVE")
  .map((s) => ({ serviceId: s.id, keywords: s.keywordsHe }));

/**
 * The professional's side, derived from the same tree: which services a
 * given set of verified credentials actually unlocks, and why the others are
 * closed. The reason is generated from the missing credential, so it can
 * never say "renew your licence" about a service that never needed one.
 */
/**
 * THE DEMO PROFESSIONAL IS ONE TRADE, NOT ALL OF THEM.
 *
 * This list used to be "every live service", which put פתיחת סתימות and
 * עבודות חשמל on the same person — and Amit spotted it immediately, because
 * no plumber in Israel is also a licensed electrician. It was not a fixture
 * detail. It quietly taught the whole screen the wrong idea: that a
 * professional is a generalist who ticks boxes, rather than a tradesperson
 * with one trade and a licence to prove it.
 *
 * A professional APPLIES for the services in their trade. Verification then
 * decides which of those they may actually be dispatched for. Two different
 * things, and both have to be visible, which is why this is a list of
 * applied services rather than a list of everything.
 */
export const DEMO_PRO_TRADE_HE = "אינסטלציה";

export const DEMO_PRO_SERVICE_IDS = [
  "svc-leak",
  "svc-blockage",
  "svc-tap",
  // Water heaters are plumbing work here, not electrical work. It is the
  // one adjacent service a plumber genuinely does — and it is SCHEDULED_ONLY,
  // so it shows how a service can be armed without being a NOW service.
  "svc-solar",
] as const;

function appliedServices(ids: readonly string[]): CatalogServiceDef[] {
  return ids.map((id) => pilotServiceById[id]).filter((s): s is CatalogServiceDef => Boolean(s));
}

export function togglesFor(
  verified: CredentialKind[],
  ids: readonly string[] = DEMO_PRO_SERVICE_IDS
): ProServiceToggle[] {
  const have = new Set(verified);
  return appliedServices(ids).map((s) => {
    const missing = s.requiredCredentials.filter((c) => !have.has(c));
    return {
      id: s.id,
      nameHe: s.nameHe,
      mark: s.mark as MarkName,
      enabled: missing.length === 0,
      blockedReasonHe:
        missing.length === 0
          ? undefined
          : `כדי לקבל קריאות בשירות הזה חסר: ${missing.map((c) => credentialHe[c]).join(" · ")}`,
    };
  });
}

export function eligibilityFor(
  verified: CredentialKind[],
  ids: readonly string[] = DEMO_PRO_SERVICE_IDS
): ProServiceEligibility[] {
  const have = new Set(verified);
  return appliedServices(ids).map((s) => {
    const missing = s.requiredCredentials.filter((c) => !have.has(c));
    return {
      id: s.id,
      nameHe: s.nameHe,
      mark: s.mark as MarkName,
      live: missing.length === 0,
      blockedByHe:
        missing.length === 0 ? null : `חסר: ${missing.map((c) => credentialHe[c]).join(" · ")}`,
    };
  });
}

/**
 * What a customer photograph would be of, per service — null where a
 * photograph does not apply. Undefined for an unknown id, which the capture
 * surface reads as "we do not know yet" rather than as "no".
 */
export const photoPromptFor = (serviceId: string): string | null | undefined =>
  pilotServiceById[serviceId]?.customerPhotoPromptHe;

/** True when the customer confirms the person rather than being assigned one. */
export const isPersonFit = (serviceId: string): boolean =>
  pilotServiceById[serviceId]?.matchingMode === "PERSON_FIT";

/**
 * Preview data for the personal-match screen.
 *
 * DELIBERATELY OBVIOUS PLACEHOLDERS. The portraits are illustrated, the
 * names say "תצוגה", the portfolio images have no files and render as
 * captioned placeholders — so a screenshot of this screen can never be
 * mistaken for a real professional offering real work (/CLAUDE.md §3). The
 * SHAPE is the point: what a customer needs to see before letting someone
 * into their home, and in what order.
 */
export const personFitCandidates = [
  {
    seed: "pro_barber_1",
    displayNameHe: "דוגמה ט׳ (תצוגה)",
    headlineHe: "ספרית עד הבית · תספורות ועיצוב",
    specialtiesHe: ["תספורת גבר", "עיצוב זקן", "פייד"],
    ratingAverage: 4.8,
    ratingCount: 63,
    completedJobs: 91,
    portfolio: [
      { id: "w1", uri: null, captionHe: "פייד קצר · אחרי" },
      { id: "w2", uri: null, captionHe: "תספורת ועיצוב זקן" },
      { id: "w3", uri: null, captionHe: "תספורת ילד" },
    ],
  },
  {
    seed: "pro_barber_2",
    displayNameHe: "דוגמה י׳ (תצוגה)",
    headlineHe: "ספרית עד הבית · נשים וילדים",
    specialtiesHe: ["תספורת אישה", "פן", "תספורת ילדים"],
    // No average yet, and the screen says "חדש ב-PRO NOW" rather than
    // inventing one. A single review is not a reputation.
    ratingAverage: null,
    ratingCount: 0,
    completedJobs: 4,
    portfolio: [
      { id: "w1", uri: null, captionHe: "תספורת שכבות" },
      { id: "w2", uri: null, captionHe: "פן לאירוע" },
    ],
  },
  {
    seed: "pro_barber_3",
    displayNameHe: "דוגמה י״א (תצוגה)",
    headlineHe: "ספר עד הבית · גברים וילדים",
    specialtiesHe: ["תספורת גבר", "מכונה", "עד הבית בערב"],
    ratingAverage: 4.6,
    ratingCount: 21,
    completedJobs: 27,
    portfolio: [{ id: "w1", uri: null, captionHe: "תספורת מכונה" }],
  },
];

/**
 * WHY THIS MATCH — assembled from facts, never from a score.
 *
 * Each reason has to be something the server could stand behind: a declared
 * specialty that matches what the customer actually asked for, presence
 * right now, the real distance. Nothing here is a judgement about the
 * person, and nothing is a percentage. The screen explains the match
 * instead of asserting one — which is also the only version of "AI" this
 * product can honestly show today.
 *
 * A reason with no supporting fact is simply not produced, so a thin match
 * shows one line rather than three invented ones.
 */
type Reason = {
  id: string;
  textHe: string;
  detailHe?: string | null;
  kind: "SKILL" | "LIVE" | "DISTANCE" | "HISTORY";
};

/**
 * Why this person, as a claim plus the fact underneath it.
 *
 * These were four short phrases joined by dots, and the design review read
 * them as telemetry rather than as an introduction: "פתאום אנחנו מספרים
 * סיפור במקום להציג telemetry". A claim on one line and its evidence on
 * the next is the same information and a different act — the first is a
 * dashboard, the second is someone telling you why they picked this person.
 *
 * Every field is derived from something the server knows. No score, no
 * percentage, nothing about "the algorithm" — a match confidence number
 * would be exactly the fabricated capability /CLAUDE.md §3 forbids, and it
 * is the single most tempting thing to put on this screen.
 *
 * Three, at most. The screen renders `slice(0, 3)` and a fourth reason
 * simply never appears, so the ordering here is the priority: what they
 * asked for, then whether it can happen now, then how far, then history.
 */
export function matchReasons(args: {
  specialtiesHe: string[];
  /** What the customer chose or typed, lower-cased by the caller. */
  askedForHe: string[];
  onlineNow: boolean;
  etaMinutes: number | null;
  completedJobs: number;
  ratingAverage?: number | null;
  ratingCount?: number;
  serviceNameHe?: string | null;
}): Reason[] {
  const out: Reason[] = [];

  // A specialty counts only when the customer actually mentioned it.
  const hit = args.specialtiesHe.find((sp) =>
    args.askedForHe.some((a) => a.includes(sp) || sp.includes(a))
  );
  if (hit) {
    out.push({
      id: "skill",
      textHe: "מתמחה בדיוק במה שביקשתם",
      detailHe: args.serviceNameHe ? `${hit} · ${args.serviceNameHe}` : hit,
      kind: "SKILL",
    });
  }

  if (args.onlineNow) {
    out.push({
      id: "live",
      textHe: "פנויה עכשיו וקרובה אליכם",
      detailHe:
        typeof args.etaMinutes === "number"
          ? `הגעה משוערת בעוד ${args.etaMinutes} דקות`
          : "במשמרת ברגע זה",
      kind: "LIVE",
    });
  } else if (typeof args.etaMinutes === "number") {
    out.push({
      id: "distance",
      textHe: "קרובה אליכם",
      detailHe: `הגעה משוערת בעוד ${args.etaMinutes} דקות`,
      kind: "DISTANCE",
    });
  }

  /*
   * History is a reason only when there is enough of it to mean something.
   * Twenty-five is where a completion count stops being an anecdote — and
   * the rating rides along only if it has a count behind it, because "5.0"
   * from two customers is a weaker claim than "4.9" from a hundred and the
   * screen must not let it look stronger.
   */
  if (args.completedJobs >= 25) {
    const rated =
      typeof args.ratingAverage === "number" && (args.ratingCount ?? 0) >= 10
        ? `★${args.ratingAverage.toFixed(1)} מ-${args.ratingCount} לקוחות שקיבלו ממנה שירות`
        : null;
    out.push({
      id: "history",
      textHe: `כבר עשתה ${args.completedJobs} עבודות ב-PRO NOW`,
      detailHe: rated,
      kind: "HISTORY",
    });
  }

  return out;
}

export { pilotServiceById };

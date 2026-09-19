import {
  allServices,
  browseOnly,
  dispatchableNow,
  pilotCatalog,
  pilotServiceById,
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
};

export function credentialsHe(s: CatalogServiceDef): string[] {
  return s.requiredCredentials.map((c) => credentialHe[c]);
}

// ---------------------------------------------------------------------
// What each screen needs
// ---------------------------------------------------------------------

const live = dispatchableNow(pilotCatalog);
const browse = browseOnly(pilotCatalog);

/**
 * The home grid: everything dispatchable now, then the scheduled trades.
 *
 * `availableNowCount: null` everywhere on purpose. The live snapshot is the
 * only thing allowed to put a number on this screen, and a fallback count
 * baked into a fixture is exactly how the stale-number bug came back the
 * first time (see `home-supply.ts`).
 */
export const catalogHomeServices: HomeServiceItem[] = [...live, ...browse].map((s) => ({
  id: s.id,
  nameHe: s.nameHe,
  mark: s.mark as MarkName,
  photoSubject: s.photoSubjectHe,
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

export { pilotServiceById };

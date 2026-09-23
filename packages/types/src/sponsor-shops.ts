import type { JobState } from "./job";

/**
 * SHOPS IN THE WORLD THAT ARE NOT OURS.
 *
 * ---------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------
 * Amit: *"תחשוב שבעתיד אני רוצה שכל ספונסר שמשקיע בי יקבל בית עסק, עם
 * עיצוב שלו לפי סוג העסק, ואז לקוח בזמן ההמתנה למקצוען יכול להיכנס
 * לחנויות ואז ייפתח האתר של המותג שיוכלו להזמין ממנו. ככה אגייס שיווק
 * וכסף."*
 *
 * The waiting minutes are the only minutes in this product where the
 * customer has nothing to do, and the neighbourhood already fills them.
 * A brand renting a building in that neighbourhood is a real business,
 * and it is a good one — but it is also the first thing in this app that
 * is paid to be seen, and that changes what the world is allowed to do.
 *
 * ---------------------------------------------------------------------
 * THE FOUR RULES, AND WHY EACH ONE IS HERE AND NOT IN A COMMENT
 * ---------------------------------------------------------------------
 * **1. It is never mistaken for a professional.** Every other building
 * in this world stands for somebody who is verified, dispatchable and
 * accountable — *"real supply only"* (/CLAUDE.md §3). A shop the brand
 * paid for is none of those things. So a sponsor shop carries the word
 * `בחסות` wherever it appears, and this module deliberately gives it
 * NO rating, NO distance, NO ETA and NO "available now": a field that
 * does not exist cannot be filled in by a later screen in a hurry.
 *
 * **2. It cannot be dispatched.** You cannot order a professional from
 * it. It has no department, and `districtFor` will never return it.
 *
 * **3. Leaving is announced.** The whole point is the brand's own site,
 * and that site is outside PRO NOW. The customer is told so before the
 * handoff, in the same spirit as `maps-handoff` — we hand over a link
 * and claim nothing about what is on the other side.
 *
 * **4. It never competes with the job.** The sponsor row exists while
 * you are WAITING and disappears the moment the professional is at your
 * door. Somebody watching a stranger work in their kitchen, or about to
 * approve a price, is not being sold perfume. This is the rule most
 * likely to be quietly relaxed later for revenue, which is exactly why
 * it is a function with a test and not a paragraph.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS MODULE DOES NOT DECIDE
 * ---------------------------------------------------------------------
 * What a sponsorship costs, who is accepted, and whether a given brand
 * belongs in front of this audience are business decisions and stay with
 * Amit (/CLAUDE.md §4). `minimumAge` below is the one place that touches
 * it, and it does not judge: a brand states the age its own site sells
 * to, and the world repeats that statement before handing anybody over.
 */

export interface SponsorShop {
  /** Stable id, also the asset prefix: `sponsor_<id>_venue|hero`. */
  id: string;
  /**
   * The brand's own name, spelled the brand's way. Latin script stays
   * Latin — a wordmark is a wordmark, the same rule the PRO NOW sign
   * follows in `world-districts`.
   */
  brandName: string;
  /** What kind of shop this is, in Hebrew, for the sign and the card. */
  categoryHe: string;
  /** One line, the brand's own words, short enough for a shop sign. */
  taglineHe: string;
  /** Where the handoff goes. Absolute https, because it leaves us. */
  siteUrl: string;
  /** The building, from the street. */
  venueAssetId: string;
  /** The same shop from inside, if the brand supplied one. */
  interiorAssetId?: string;
  /**
   * The age the BRAND says its own site sells to, when it says one.
   * Repeated before the handoff; never inferred, never guessed.
   */
  minimumAge?: number;
}

/** The word that marks a paid building, everywhere one is drawn. */
export const SPONSOR_BADGE_HE = "בחסות";

/**
 * The states in which a paid shop may be seen at all: the customer is
 * waiting and has nothing else to do. Note what is absent — from
 * `PRO_ARRIVED` onwards somebody is in your home and money is in play.
 */
export const SPONSOR_VISIBLE_STATES: readonly JobState[] = [
  "SEARCHING",
  "OFFERING",
  "PRO_ASSIGNED",
  "PRO_EN_ROUTE",
];

export function sponsorsMayShow(status: JobState): boolean {
  return SPONSOR_VISIBLE_STATES.includes(status);
}

/** Hebrew for why the row has gone, when it goes. */
export function sponsorsHiddenHe(status: JobState): string | null {
  if (sponsorsMayShow(status)) return null;
  return "המקצוען אצלך — החנויות בחסות חוזרות בפעם הבאה שתמתין";
}

/** The button. Names the brand, and says it is a link out. */
export function sponsorCtaHe(shop: SponsorShop): string {
  return `לאתר של ${shop.brandName} ›`;
}

/**
 * What is said BEFORE the handoff. Two facts and no promises: whose
 * site it is, and that it is not this one. An age, if the brand stated
 * one, joins it — it is the brand's statement, repeated.
 */
export function sponsorLeaveHe(shop: SponsorShop): string {
  const base = `האתר של ${shop.brandName} ייפתח מחוץ לאפליקציה. ההזמנה, התשלום והמשלוח הם שלהם.`;
  return shop.minimumAge ? `${base} המותג מוכר מגיל ${shop.minimumAge}.` : base;
}

/** The sign over the door: the brand, and the fact that it is paid for. */
export function sponsorSignHe(shop: SponsorShop): string {
  return `${shop.brandName} · ${SPONSOR_BADGE_HE}`;
}

/**
 * Every asset a sponsor row needs, so the art check can ask for them
 * the same way it asks for a district's.
 */
export function requiredSponsorAssets(shops: readonly SponsorShop[]): string[] {
  const ids = new Set<string>();
  for (const s of shops) {
    ids.add(s.venueAssetId);
    if (s.interiorAssetId) ids.add(s.interiorAssetId);
  }
  return [...ids].sort();
}

/**
 * The rules above, as a check. `districtVenueAssetIds` is passed in
 * rather than imported so that a sponsor can never be compared against a
 * stale copy of the district table — and so the test can hand it a
 * collision on purpose.
 */
export function sponsorShopViolations(
  shops: readonly SponsorShop[],
  districtVenueAssetIds: readonly string[] = []
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const ours = new Set(districtVenueAssetIds);

  for (const s of shops) {
    if (seen.has(s.id)) out.push(`two sponsor shops share the id "${s.id}"`);
    seen.add(s.id);

    if (!s.siteUrl.startsWith("https://")) {
      out.push(`${s.id}: a sponsor's site must be absolute https — it leaves the app`);
    }
    if (!s.brandName.trim()) out.push(`${s.id}: a sponsor shop with no brand name is an unlabelled advert`);
    if (!s.categoryHe.trim()) out.push(`${s.id}: nothing says what kind of shop ${s.id} is`);

    /*
     * The collision that matters. A paid building wearing a trade's
     * plate would be a brand impersonating a verified professional —
     * the one confusion this whole module exists to prevent.
     */
    if (ours.has(s.venueAssetId)) {
      out.push(`${s.id}: wears ${s.venueAssetId}, which is a PRO NOW trade's building`);
    }
    if (s.interiorAssetId && ours.has(s.interiorAssetId)) {
      out.push(`${s.id}: borrows ${s.interiorAssetId}, which is a PRO NOW trade's interior`);
    }
    if (s.minimumAge !== undefined && (s.minimumAge < 1 || s.minimumAge > 120)) {
      out.push(`${s.id}: ${s.minimumAge} is not an age`);
    }
  }

  /*
   * And the rule about WHEN. Kept here, beside the others, so that a
   * change to `SPONSOR_VISIBLE_STATES` that let advertising run through
   * a diagnosis fails this check rather than shipping.
   */
  const forbidden: JobState[] = [
    "PRO_ARRIVED",
    "DIAGNOSIS",
    "WAITING_QUOTE_APPROVAL",
    "IN_PROGRESS",
    "COMPLETION_PENDING",
    "PAYMENT_PENDING",
    "PAYMENT_CAPTURED",
    "DISPUTED",
  ];
  for (const state of forbidden) {
    if (sponsorsMayShow(state)) {
      out.push(`advertising is shown at ${state} — the job is not free to interrupt there`);
    }
  }

  return out;
}

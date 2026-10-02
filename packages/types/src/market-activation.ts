import type { CatalogDepartmentDef, CatalogServiceDef } from "./catalog";
import { allServices, dispatchableNow } from "./catalog";

/**
 * Which services are switched on IN A PARTICULAR CITY.
 *
 * WHY THIS IS NOT `activationStatus`. That field answers "does the product
 * offer this service at all" — a decision about the catalogue. This answers
 * "did we sign up enough professionals HERE to promise it" — a decision
 * about one market on one date. Collapsing them forces a code change to
 * launch a second city, and worse, it makes the catalogue a place where
 * supply facts get written down. The catalogue should not know that we found
 * twenty movers in Petah Tikva and two cleaners.
 *
 * THE RULE THIS ENCODES: liquidity decides activation, not taste. If the
 * launch city has twenty movers and two cleaners, moving goes live and
 * cleaning does not — regardless of which one looks better in a demo. A
 * service switched on without supply behind it does not fail quietly; it
 * teaches every customer who taps it that the app is empty.
 *
 * A market therefore names the services it activates. Everything else in the
 * catalogue is simply not offered there, and no code change is needed to
 * change that — which is the whole point.
 */

export interface MarketDef {
  /** Stable code, e.g. "IL_PT". */
  code: string;
  nameHe: string;
  /**
   * Service ids activated in this market. An id that is not in the
   * catalogue, or whose service is not dispatchable, is ignored rather than
   * trusted — a market file must never be able to switch on a service the
   * catalogue says is INACTIVE or SCHEDULED_ONLY.
   */
  activatedServiceIds: string[];
  /**
   * Launch date, for the record. Purely informational: nothing branches on
   * it, because a date is not a supply fact.
   */
  liveSinceHe?: string;
}

export interface MarketServiceSet {
  market: MarketDef;
  /** Dispatchable here, now. */
  live: CatalogServiceDef[];
  /**
   * In the catalogue and dispatchable in principle, but not activated in
   * this market. Kept separate from SCHEDULED_ONLY so the UI can say "not
   * here yet" rather than "not urgent", which are different promises.
   */
  notInThisMarket: CatalogServiceDef[];
  /** Ids the market named that the catalogue refuses. Surfaced, not hidden. */
  rejectedIds: string[];
}

export function resolveMarket(
  departments: CatalogDepartmentDef[],
  market: MarketDef
): MarketServiceSet {
  const dispatchable = new Map(dispatchableNow(departments).map((s) => [s.id, s]));
  const known = new Set(allServices(departments).map((s) => s.id));

  const live: CatalogServiceDef[] = [];
  const rejectedIds: string[] = [];
  const seen = new Set<string>();

  for (const id of market.activatedServiceIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const s = dispatchable.get(id);
    if (s) live.push(s);
    // A typo and a deliberately-disallowed service look the same from here,
    // and both are worth reporting: a market file that silently drops a
    // service is a market file nobody notices is wrong.
    else rejectedIds.push(id);
    if (!known.has(id)) continue;
  }

  const liveIds = new Set(live.map((s) => s.id));
  const notInThisMarket = [...dispatchable.values()].filter((s) => !liveIds.has(s.id));

  return { market, live, notInThisMarket, rejectedIds };
}

/**
 * The pilot market.
 *
 * Eight services, chosen for ENGINE COVERAGE rather than for being the eight
 * best: two urgent plumbing cases, one licensed trade, one enhanced-trust
 * case, two appliance cases, one hourly service and one distance-priced
 * service. Between them they exercise every pricing model and every trust
 * profile the platform has — so the pilot tests the machine, not a taste in
 * services. The rest of the catalogue stays built and stays off until there
 * are professionals here to answer it.
 */
export const pilotMarket: MarketDef = {
  code: "IL_PILOT",
  nameHe: "אזור הפיילוט",
  activatedServiceIds: [
    "svc-blockage",
    "svc-leak",
    "svc-electric",
    "svc-lock",
    // Rides on locksmith supply that svc-lock already requires, and is the
    // only FIXED-price service among the eight — so it costs no extra
    // recruiting and closes the last gap in pricing-model coverage.
    "svc-cylinder",
    "svc-ac",
    "svc-fridge",
    "svc-clean",
    "svc-courier",
    /*
     * Two services that need no van, and are therefore the cheapest supply
     * a new city can have — plus the one that catches everything the
     * taxonomy will never name. Amit's framing, and it is right: the
     * marketplace is defined by professionals who can already move, not by
     * a list of trades.
     */
    "svc-handyman",
    "svc-hands",
  ],
};

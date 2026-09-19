/**
 * The service catalogue: a shape, and the fields a service must declare
 * before it can be offered.
 *
 * THE COUNTER-INTUITIVE RULE THIS FILE ENCODES: a bigger catalogue makes the
 * marketplace worse. Forty services with two professionals each feels dead —
 * every tap finds nobody, and the customer concludes the app is empty rather
 * than that this particular trade is quiet. Ten to fifteen services where
 * someone is genuinely reachable feels alive. The catalogue is therefore
 * sized for liquidity, not for coverage, and `activationStatus` exists so
 * the other services can be modelled now and switched on when there is
 * supply to switch on.
 *
 * WHY `fulfillmentProfile` IS NOT A BOOLEAN. "Is this NOW?" hides the
 * distinction that matters. A burst pipe is URGENT_NOW — someone wants
 * anyone competent within the hour. A dishwasher that has stopped is
 * SAME_DAY_NOW — today is fine, this minute is not required. Assembling a
 * wardrobe is SCHEDULED_ONLY: nobody stands by a flat-pack hoping a stranger
 * arrives in nine minutes, and no carpenter sits online waiting for that
 * call.
 *
 * Putting SCHEDULED_ONLY work through a NOW flow does not merely
 * underperform — it poisons the impression of everything else. The customer
 * taps, dispatch finds nobody because nobody is online for that, and the
 * whole marketplace reads as broken. One mis-tagged service is enough.
 */

/** How urgent this work actually is, from the customer's point of view. */
export type FulfillmentProfile =
  /** Someone wants anyone competent within the hour. The hero case. */
  | "URGENT_NOW"
  /** Today is fine; this minute is not required. */
  | "SAME_DAY_NOW"
  /** Planned work. Catalogued, never promised now. */
  | "SCHEDULED_ONLY";

/** Whether the marketplace is actually offering this yet. */
export type ActivationStatus =
  /** Live and dispatchable. */
  | "ACTIVE"
  /** Modelled and visible internally, not offered to customers. */
  | "PILOT"
  /** Modelled only, so the taxonomy scales without shipping dead services. */
  | "INACTIVE";

/**
 * How much verification a service demands before anyone is sent.
 *
 * LICENSE_REQUIRED is not a stronger version of ENHANCED — it means a
 * specific statutory licence gates this work, and no amount of identity
 * checking substitutes for it. The exact licences that are mandatory per
 * trade are a legal question, not an engineering one (/CLAUDE.md §4), so the
 * codebase carries the requirement structurally and the specific list is
 * confirmed by counsel before launch.
 */
export type TrustProfile =
  | "STANDARD"
  /** Entering a home under unusual circumstances — a locksmith on a lockout. */
  | "ENHANCED"
  | "LICENSE_REQUIRED";

export type PricingModel = "FIXED" | "VISIT_QUOTE" | "HOURLY" | "DISTANCE_TIME";

/**
 * A credential verified for THIS service before dispatch. Eligibility is per
 * service, never per account (/CLAUDE.md §3) — this list is what makes that
 * sentence true rather than aspirational.
 */
export type CredentialKind =
  | "IDENTITY"
  | "IDENTITY_ENHANCED"
  | "BUSINESS"
  | "LIABILITY_INSURANCE"
  | "ELECTRICIAN_LICENSE"
  | "GAS_LICENSE"
  | "PEST_CONTROL_LICENSE"
  | "DRIVING_LICENSE"
  | "VEHICLE_INSURANCE"
  | "PROPERTY_LINK_POLICY";

export interface CatalogServiceDef {
  id: string;
  code: string;
  nameHe: string;
  descriptionHe: string;
  mark: string;
  /** What the customer types when they have this problem. Feeds matching. */
  keywordsHe: string[];
  /** Concrete cases, offered as taps on the service page. */
  symptomsHe: string[];
  pricingModel: PricingModel;
  fulfillmentProfile: FulfillmentProfile;
  activationStatus: ActivationStatus;
  trustProfile: TrustProfile;
  requiredCredentials: CredentialKind[];
  /** What a licensed photograph of this service would show. */
  photoSubjectHe: string;
  /** Typical on-site duration, for the professional's offer card. */
  typicalMinutes?: [number, number];
}

export interface CatalogCategoryDef {
  code: string;
  nameHe: string;
  mark: string;
  services: CatalogServiceDef[];
}

export interface CatalogDepartmentDef {
  code: string;
  nameHe: string;
  categories: CatalogCategoryDef[];
}

export function allServices(departments: CatalogDepartmentDef[]): CatalogServiceDef[] {
  return departments.flatMap((d) => d.categories.flatMap((c) => c.services));
}

/**
 * What the home screen may offer as available right now.
 *
 * Both conditions, always: the service has to be switched on AND urgent
 * enough that someone is plausibly online for it. Callers use this rather
 * than filtering inline, because an inline `.filter()` copied to a second
 * screen is exactly how a SCHEDULED_ONLY service eventually appears beside a
 * live count.
 */
export function dispatchableNow(departments: CatalogDepartmentDef[]): CatalogServiceDef[] {
  return allServices(departments).filter(
    (s) =>
      s.activationStatus === "ACTIVE" &&
      (s.fulfillmentProfile === "URGENT_NOW" || s.fulfillmentProfile === "SAME_DAY_NOW")
  );
}

/** Services that exist in the catalogue but are not dispatched now. */
export function browseOnly(departments: CatalogDepartmentDef[]): CatalogServiceDef[] {
  const now = new Set(dispatchableNow(departments).map((s) => s.id));
  return allServices(departments).filter((s) => !now.has(s.id) && s.activationStatus !== "INACTIVE");
}

export function credentialsFor(services: CatalogServiceDef[]): CredentialKind[] {
  const out = new Set<CredentialKind>();
  for (const s of services) for (const c of s.requiredCredentials) out.add(c);
  return [...out];
}

/**
 * The services a professional may be dispatched for, given what they have
 * actually had verified. Pure, so eligibility is a test rather than a hope.
 */
export function eligibleServices(
  services: CatalogServiceDef[],
  verified: CredentialKind[]
): CatalogServiceDef[] {
  const have = new Set(verified);
  return services.filter((s) => s.requiredCredentials.every((c) => have.has(c)));
}

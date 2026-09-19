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
  /**
   * Alone with a person, for an hour, often touching them.
   *
   * This is NOT "ENHANCED but more". It is a different kind of risk, and
   * conflating the two would hide it. A locksmith's risk is about property
   * and about a door that might not be the customer's; a massage therapist's
   * or a personal trainer's is about a person who will be alone, sometimes
   * undressed, with a stranger the platform sent. The failure modes, the
   * checks that address them, and the recourse afterwards are all different.
   *
   * What the platform must actually require here — background checks,
   * professional certification, chaperone or public-space options, a
   * different cancellation and reporting path — is a policy and legal
   * decision (/CLAUDE.md §4). The codebase carries the distinction so the
   * decision has somewhere to land, and so nobody can quietly ship these
   * services under STANDARD because the shape of the record allowed it.
   */
  | "PERSONAL_CONTACT"
  | "LICENSE_REQUIRED";

/**
 * WHAT THE PROFESSIONAL BRINGS — and the sentence that actually defines this
 * marketplace.
 *
 * PRO NOW is not "an app for home repairs". It is a network of independent
 * professionals who can be somewhere within the hour — and what makes that
 * possible is not the trade, it is the LOGISTICS. A massage therapist with a
 * folding table, an electrician with a tool bag and a courier on a scooter
 * are the same kind of supply: self-contained, already mobile, able to say
 * yes to a stranger's address without a day of preparation. A kitchen
 * renovation is not, and no amount of product design makes it one.
 *
 * So this field, not the department, is what predicts whether NOW works.
 * It also sets the honest dispatch radius: someone carrying nothing can
 * cross a city on a bus; someone with a van is bounded by traffic and
 * parking.
 */
export type MobilityProfile =
  /** Arrives as themselves. A tutor, a trainer, a carer, a helper. */
  | "CARRIES_NOTHING"
  /** Everything needed fits on a person or a scooter — a bag, a case, a table. */
  | "CARRIES_ON_PERSON"
  /** Needs the van: parts, machines, ladders, or the load itself. */
  | "NEEDS_VEHICLE";

export type PricingModel = "FIXED" | "VISIT_QUOTE" | "HOURLY" | "DISTANCE_TIME";

/**
 * HOW THE RIGHT PROFESSIONAL IS FOUND — and it is not one question.
 *
 * For a blocked drain the customer wants one thing: anyone competent, soon.
 * Which competent person is a detail they are happy to delegate, and being
 * asked to choose would be a burden at the exact moment they have no
 * patience for one.
 *
 * For a barber coming to their home, "anyone competent" is the wrong
 * answer to a question they did not ask. The person IS the service. Who is
 * coming through the door, what their work looks like, whether they cut the
 * kind of hair I have — those are the decision, not trivia attached to it.
 *
 * Running both through one dispatch and changing only the copy is how a
 * marketplace ends up feeling like a plumbing app with a beauty section.
 */
export type MatchingMode =
  /** Anyone eligible, nearest first. The customer delegates the choice. */
  | "FASTEST_ELIGIBLE"
  /** The person is the service. The customer confirms the match. */
  | "PERSON_FIT";

/** Whether the server assigns outright, or proposes and waits. */
export type ProviderChoiceMode = "AUTO_ASSIGN" | "CONFIRM_MATCH";

/**
 * WHAT THE CUSTOMER'S MEDIA IS FOR — the generalisation of Amit's point
 * about the barber.
 *
 * The first version of this was a photo prompt per service, which fixed the
 * wording. But the wording was a symptom: the real question is never "does
 * this service allow a photo", it is "what is the PURPOSE of the input
 * here". A leak photograph is EVIDENCE — it documents a state of the world
 * that someone will come and change. A haircut photograph is INSPIRATION —
 * it describes a state of the world that does not exist yet and is being
 * requested. They travel to the professional differently, they mean
 * different things on the offer card, and one of them is a reference the
 * professional works FROM rather than a fault they work ON.
 */
export type MediaIntent =
  /** Documents the problem. Plumbing, appliances, electrical. */
  | "PROBLEM_EVIDENCE"
  /** Describes the wanted result. Hair, nails, decorating. */
  | "INSPIRATION"
  /** Identifies the thing. A parcel, a piece of furniture, a model number. */
  | "ITEM_REFERENCE"
  /** Nothing to show. A training session, a massage, a lesson. */
  | "NONE";

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
  | "PROPERTY_LINK_POLICY"
  /**
   * A recognised qualification for a trade that has no statutory licence —
   * a massage diploma, a fitness certification, a teaching credential.
   *
   * Deliberately NOT modelled as a licence. Calling a diploma a licence
   * would let the product imply state authorisation that does not exist,
   * and which qualifications the platform accepts per service is a business
   * and legal decision (/CLAUDE.md §4).
   */
  | "PROFESSIONAL_CERTIFICATE"
  /**
   * A background check, for services where someone is alone with a person
   * rather than with a pipe. Whether it is required, what it covers and who
   * performs it are §4 decisions; the field exists so they have a home.
   */
  | "BACKGROUND_CHECK";

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
  /** What the professional has to bring. See `MobilityProfile`. */
  mobilityProfile: MobilityProfile;
  /** How the right professional is found. See `MatchingMode`. */
  matchingMode: MatchingMode;
  /** What the customer's photographs and recordings are FOR. */
  mediaIntent: MediaIntent;
  requiredCredentials: CredentialKind[];
  /** What a licensed photograph of this service would show. */
  photoSubjectHe: string;
  /**
   * What a photograph FROM THE CUSTOMER would be of, in this service's own
   * terms — or null when a photograph makes no sense here.
   *
   * THE ASSUMPTION THIS FIELD REMOVES. Every capture surface in this app was
   * built around a fault: photograph the problem, record the noise. Amit put
   * it exactly right — "אם מישהו צריך ספר אני לא מצפה שהוא ישלח תמונה של
   * השיער שלו". Asking a person booking a haircut to photograph the problem
   * is not a small awkwardness; it tells them the app was built for burst
   * pipes and they are visiting.
   *
   * Note the field is not a boolean. A photograph is often useful for a
   * non-fault service too — but of a DIFFERENT THING. For a plumber it is
   * the leak; for a barber it is a haircut they liked; for a tutor it is the
   * worksheet. The prompt carries that difference, which a boolean could
   * not, and null carries the real "not applicable" case for services where
   * there is nothing to show at all.
   */
  customerPhotoPromptHe?: string | null;
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

/**
 * Services whose supply can plausibly be everywhere at once.
 *
 * Useful because it is the honest answer to "which services can we open in a
 * new city cheaply": the ones nobody needs a van for. A city with no movers
 * can still have tutors and masseurs on its first day.
 */
/**
 * Whether the customer confirms the match, derived rather than stored.
 *
 * Kept as a function so the rule lives in one place: PERSON_FIT always
 * confirms. A separate stored field would let a service declare PERSON_FIT
 * and AUTO_ASSIGN at once, which is the one combination that makes no
 * sense — "the person matters, and you do not get to see who".
 */
export function providerChoiceFor(s: CatalogServiceDef): ProviderChoiceMode {
  return s.matchingMode === "PERSON_FIT" ? "CONFIRM_MATCH" : "AUTO_ASSIGN";
}

export function lightweightServices(departments: CatalogDepartmentDef[]): CatalogServiceDef[] {
  return allServices(departments).filter((s) => s.mobilityProfile !== "NEEDS_VEHICLE");
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

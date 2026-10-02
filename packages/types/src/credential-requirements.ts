/**
 * WHAT A SERVICE REQUIRES, IN THE FORM THE ENGINE READS IT.
 *
 * ---------------------------------------------------------------------
 * THE ENGINE HAS BEEN ANSWERING AN EMPTY QUESTION
 * ---------------------------------------------------------------------
 * `credential-eligibility.ts` is careful work. It was written to replace
 * a one-line check that had three defects, each of which would have sent
 * an insufficiently-verified stranger into somebody's home, and it has
 * twenty-seven tests holding it in place.
 *
 * It reads `ServiceRequirement` rows. There are none. Not one service in
 * the database has ever had a requirement row, so every call has
 * evaluated an empty list — and an empty list of mandatory requirements
 * is satisfied by anybody. The engine has been correct and inert: a
 * professional with no licence at all is dispatch-eligible for pest
 * control, and the rule that says otherwise has never had anything to
 * compare against.
 *
 * ---------------------------------------------------------------------
 * THE ANSWER ALREADY EXISTS
 * ---------------------------------------------------------------------
 * `/CLAUDE.md §4` names "which credentials are mandatory per category" as
 * a decision this codebase must not invent — and `pilot-catalog.ts`
 * records one per service, deliberately, with reasoning: a locksmith on a
 * lockout carries IDENTITY_ENHANCED and a property-link policy because
 * the job's whole purpose is opening a door for someone who cannot prove
 * it is theirs; pest control carries a licence.
 *
 * So the work here is carrying that answer, not making it. This file is
 * the translation and nothing else.
 *
 * ---------------------------------------------------------------------
 * TWO VOCABULARIES
 * ---------------------------------------------------------------------
 * The catalogue names a credential (`ELECTRICIAN_LICENSE`). The engine
 * parses a requirement as `KIND:SPECIALISATION`, where the kind must be
 * LICENSE, CERTIFICATE or INSURANCE to be matched against a document a
 * professional uploads. Anything else is ACCOUNT-LEVEL — identity, a
 * business registration, a background check — and is settled by the
 * account's verification status rather than by a row per service. The
 * engine returns those separately rather than dropping them, "so the
 * caller can never mistake 'not handled here' for 'satisfied'".
 *
 * A requirement this file cannot classify is not guessed at. It is
 * returned as account-level, which is the conservative direction: a
 * mis-classified account-level requirement fails to gate, and is visible;
 * a mis-classified document requirement would gate on a document nobody
 * can ever produce, and would look like a bug in onboarding.
 */

/** Credential names used by `pilot-catalog.ts`. */
export type CatalogCredential = string;

/**
 * Catalogue credential -> the requirement string the engine parses.
 *
 * Only the document-shaped ones are listed. Everything absent is
 * account-level by construction, which `requirementForCredential`
 * implements rather than a second list restating it.
 */
const DOCUMENT_REQUIREMENTS: Readonly<Record<string, string>> = {
  ELECTRICIAN_LICENSE: "LICENSE:ELECTRICIAN",
  GAS_LICENSE: "LICENSE:GAS",
  PEST_CONTROL_LICENSE: "LICENSE:PEST_CONTROL",
  MEDICAL_LICENSE: "LICENSE:MEDICAL",
  VETERINARY_LICENSE: "LICENSE:VETERINARY",
  DRIVING_LICENSE: "LICENSE:DRIVING",
  LIABILITY_INSURANCE: "INSURANCE:LIABILITY",
  VEHICLE_INSURANCE: "INSURANCE:VEHICLE",
  PROFESSIONAL_CERTIFICATE: "CERTIFICATE:PROFESSIONAL",
};

export interface RequirementRow {
  /** The string stored in `ServiceRequirement.requirement`. */
  requirement: string;
  /** Every credential the catalogue lists is mandatory; it lists no optional ones. */
  mandatory: boolean;
  /** True when a professional must upload a document for it. */
  isDocument: boolean;
}

export function requirementForCredential(credential: CatalogCredential): RequirementRow {
  const mapped = DOCUMENT_REQUIREMENTS[credential];
  if (mapped) return { requirement: mapped, mandatory: true, isDocument: true };
  // Account-level: identity, business registration, background check, the
  // property- and vehicle-link policies. Carried through under its own
  // name so it appears in `accountLevelRequirements` and is not lost.
  return { requirement: credential, mandatory: true, isDocument: false };
}

/** Every requirement row a service needs, from the credentials it lists. */
export function requirementsForService(
  requiredCredentials: readonly CatalogCredential[]
): RequirementRow[] {
  const seen = new Set<string>();
  const out: RequirementRow[] = [];
  for (const credential of requiredCredentials) {
    const row = requirementForCredential(credential);
    if (seen.has(row.requirement)) continue;
    seen.add(row.requirement);
    out.push(row);
  }
  return out;
}

/** The credential kinds a professional's document can carry, for seeding and tests. */
export function credentialTypeFor(requirement: string): "LICENSE" | "CERTIFICATE" | "INSURANCE" | null {
  const [kind] = requirement.split(":");
  const upper = (kind ?? "").trim().toUpperCase();
  return upper === "LICENSE" || upper === "CERTIFICATE" || upper === "INSURANCE" ? upper : null;
}

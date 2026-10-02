/**
 * AVAILABILITY, TOLD AS A SCENE.
 *
 * ---------------------------------------------------------------------
 * AMIT'S IDEA, AND WHY IT IS HONEST RATHER THAN CUTE
 * ---------------------------------------------------------------------
 *   "חייב שיהיה אפשרות לזוז במפה, לגרור עם האצבע ולתת תחושה שאתה ממש עובר
 *    בין המספרות ורואה מי פנוי… או לעבור בין דוג ווקרים ולראות מי ללא כלב
 *    וממתין לטיול… לראות טנדרים ולראות מי פנוי להובלה."
 *
 * The thing that makes this work is not the drawing. It is that
 * **availability is real data**. The server knows who is ONLINE and
 * eligible for this service right now — that is the same fact a green
 * "זמין עכשיו" badge would have shown. Drawing it as a barber standing in
 * their doorway is a different *rendering* of a true statement, not a new
 * claim.
 *
 * Position is the opposite: before assignment, where a professional is
 * remains theirs. So the venue stays an avatar (`VirtualVenue`), and the
 * person is standing outside their avatar rather than at a place.
 *
 * ---------------------------------------------------------------------
 * AND WHAT IS DELIBERATELY NOT DRAWN
 * ---------------------------------------------------------------------
 * Nothing is ever drawn for someone who is unavailable. A barber shown
 * mid-haircut would tell you that this specific professional is working for
 * somebody else right now, which is their business and not ours to
 * broadcast. **Only the available appear, and an absence means nothing at
 * all** — a closed shop is a closed shop, not a statement about a person.
 */

/** How an available professional is shown waiting, per trade shape. */
export type AvailabilityPosture =
  /** Standing in the doorway of their venue. Shops and studios. */
  | "AT_DOOR"
  /** Holding an empty lead. The dog walker with nobody to walk yet. */
  | "EMPTY_LEAD"
  /** Beside an open, empty vehicle. Movers, couriers, tow. */
  | "EMPTY_LOAD"
  /** Kit in hand, ready to leave. Trades that travel to you. */
  | "KIT_READY";

/** What each district's available professional is doing while they wait. */
const POSTURE_BY_DEPARTMENT: Readonly<Record<string, AvailabilityPosture>> = {
  BEAUTY: "AT_DOOR",
  WELLNESS: "AT_DOOR",
  TECH: "AT_DOOR",
  PETS: "EMPTY_LEAD",
  LOGISTICS: "EMPTY_LOAD",
  VEHICLE: "EMPTY_LOAD",
  HOME_URGENT: "KIT_READY",
  APPLIANCES: "KIT_READY",
  HOME_CARE: "KIT_READY",
  ODD_JOBS: "KIT_READY",
  IMPROVEMENT: "KIT_READY",
};

export function postureFor(departmentCode: string): AvailabilityPosture {
  return POSTURE_BY_DEPARTMENT[departmentCode] ?? "KIT_READY";
}

/**
 * The one line of Hebrew that says what the picture already says.
 *
 * Present for a screen reader and for anyone who does not read the scene,
 * because the world being legible to the eye is not the same as it being
 * legible to everyone.
 */
export function postureLabelHe(posture: AvailabilityPosture): string {
  switch (posture) {
    case "AT_DOOR":
      return "פנוי עכשיו · ממתין בכניסה";
    case "EMPTY_LEAD":
      return "פנוי עכשיו · ממתין לטיול";
    case "EMPTY_LOAD":
      return "פנוי עכשיו · פנוי להובלה";
    case "KIT_READY":
      return "פנוי עכשיו · מוכן לצאת";
  }
}

/** What the world may draw for one candidate. */
export interface AvailabilityScene {
  candidateId: string;
  posture: AvailabilityPosture;
  labelHe: string;
}

/**
 * Build the scene for the candidates who are genuinely available.
 *
 * Takes `availableCandidateIds` — the server's answer — rather than
 * deciding anything itself. A screen that worked out availability locally
 * would be a screen that could be wrong about it.
 */
export function availabilityScenes(args: {
  candidateIds: readonly string[];
  availableCandidateIds: readonly string[];
  departmentCode: string;
}): AvailabilityScene[] {
  const available = new Set(args.availableCandidateIds);
  const posture = postureFor(args.departmentCode);

  return args.candidateIds
    .filter((id) => available.has(id))
    .map((candidateId) => ({ candidateId, posture, labelHe: postureLabelHe(posture) }));
}

/**
 * Everything wrong with an availability scene.
 *
 * Two of these are the whole point of the file: nobody unavailable is ever
 * drawn, and nobody is drawn who is not a candidate at all.
 */
export function availabilitySceneViolations(args: {
  scenes: readonly AvailabilityScene[];
  candidateIds: readonly string[];
  availableCandidateIds: readonly string[];
}): string[] {
  const v: string[] = [];
  const candidates = new Set(args.candidateIds);
  const available = new Set(args.availableCandidateIds);
  const seen = new Set<string>();

  for (const s of args.scenes) {
    if (!candidates.has(s.candidateId)) {
      v.push(`"${s.candidateId}" is waiting in the world but is not a candidate. Supply is never invented.`);
    }
    if (!available.has(s.candidateId)) {
      v.push(
        `"${s.candidateId}" is drawn waiting while unavailable. What a professional is doing for someone else is theirs, not ours to show.`
      );
    }
    if (seen.has(s.candidateId)) v.push(`"${s.candidateId}" appears twice in the world.`);
    seen.add(s.candidateId);
    if (!s.labelHe.trim()) v.push(`"${s.candidateId}" is shown with no label; the scene has to be readable aloud too.`);
  }

  return v;
}

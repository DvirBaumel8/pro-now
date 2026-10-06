import { DEMO_WORLD, themeForDepartment, type JobMatchView, type LivingMapState } from "@pro-now/types";

/**
 * WHO IS COMING, SHOWN IN THE STREET (the demo's MATCH_REVEAL).
 *
 * The demo keeps the search screen up once someone is found: the camera flies
 * into the trade's shop and the match card rises over it, with one person on
 * it. The product had a separate screen. This builds the search screen's
 * reveal from what the server returned (`GET /v1/jobs/:id/match`) and nothing
 * else: exactly one candidate, CHOSEN, the assigned professional, with only
 * the reputation the server has for them (`scenePhaseForJob` explains why the
 * reveal waits for the match).
 *
 * `face` is the face they chose to show (D1): their photo, or the drawn
 * character of their trade.
 */
export function matchRevealState(
  match: Pick<JobMatchView, "professional">,
  departmentCode: string | null,
  serviceNameHe: string,
  face: string | null,
): LivingMapState {
  const pro = match.professional;
  return {
    phase: "MATCH_REVEAL",
    theme: themeForDepartment(departmentCode ?? "HOME_URGENT"),
    adapter: DEMO_WORLD,
    candidates: [
      {
        candidateId: pro.id,
        displayNameHe: pro.displayName,
        professionHe: serviceNameHe,
        photoUri: face,
        state: "CHOSEN",
        ratingAverage: pro.proNowRatingAverage,
        ratingCount: pro.proNowRatingCount,
        completedJobs: pro.proNowCompletedJobs,
      },
    ],
    journey: null,
  };
}

/**
 * The figure in the shop's doorway once the camera lands: the full-length
 * trade character they chose (the demo's `character_<shop>_world`), or their
 * photo in a ring.
 */
export function revealFigure(face: string | null, character: boolean): { uri: string; round: boolean } | null {
  if (!face) return null;
  return character ? { uri: face.replace("_icon.", "_world."), round: false } : { uri: face, round: true };
}

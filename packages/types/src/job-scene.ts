import type { JobState } from "./job";
import type { LivingMapPhase } from "./living-map";

/**
 * WHAT THE WORLD IS DOING, DERIVED FROM WHAT THE JOB IS DOING.
 *
 * ---------------------------------------------------------------------
 * WHY THIS IS A FUNCTION AND NOT A `useState` IN A SCREEN
 * ---------------------------------------------------------------------
 * The Living Map has four phases and the server has seventeen job states.
 * Until now the mapping between them existed only inside the design
 * gallery, where a human clicked "next step" — so the phase was whatever
 * the reviewer said it was, and the real app never took part.
 *
 * The moment the real app polls `/v1/jobs/:id`, somebody has to answer
 * "the job says PRO_EN_ROUTE, what is the world showing?" — and the
 * dangerous way to answer it is a `switch` inside a screen, because a
 * screen cannot be tested and because the next screen that needs the same
 * answer will write a second, slightly different `switch`.
 *
 * ---------------------------------------------------------------------
 * THE ONE RULE THAT MATTERS
 * ---------------------------------------------------------------------
 * Amit's phase split, in his words:
 *
 *   "השלב של החיפוש יהיה שלב שהרדאר שלנו עובר בלי כפתור לחיצות, עם הדמות
 *    בין הרחובות... השלב של המשחק מגיע בשלב ההמתנה לאיש מקצוע. לדוגמה, יש
 *    20 דקות עד שהוא מגיע, ב-20 דקות האלה אני רוצה שיהיה משחק."
 *
 * Searching SHOWS. Waiting PLAYS. `LivingMapScene` already enforces this —
 * it only lets the customer steer in `ASSIGNED_ROUTE` — which means this
 * mapping is what decides whether the arrows appear. Get it wrong by one
 * state and either the game shows up while we are still looking (Amit's
 * "no buttons" rule broken) or it never shows up at all.
 *
 * ---------------------------------------------------------------------
 * AND THE TWO PHASES THIS FUNCTION CANNOT RETURN
 * ---------------------------------------------------------------------
 * `CANDIDATES_FOUND` and `MATCH_REVEAL` need real people: the first needs
 * a list of eligible candidates, the second needs exactly one chosen one.
 * `GET /v1/jobs/:id` returns neither — it gives a status and an assigned
 * professional's ID, not a roster. Returning `CANDIDATES_FOUND` from a
 * status alone would mean drawing bubbles for candidates nobody named,
 * which is /CLAUDE.md §3's fabricated supply wearing a costume.
 *
 * So this function answers from the job alone and the screen upgrades to
 * `MATCH_REVEAL` only once `/v1/jobs/:id/match` has actually handed it a
 * professional. A caller with no match data gets a world that is honestly
 * still searching.
 */
export function scenePhaseForJob(status: JobState): LivingMapPhase {
  switch (status) {
    /*
     * Still looking. DRAFT is here because a job that has not been sent is
     * not a job that has found anybody — and showing the search is a
     * better answer than a blank screen if a draft ever reaches here.
     */
    case "DRAFT":
    case "SEARCHING":
    case "OFFERING":
      return "SEARCHING";

    /*
     * Somebody is coming. Everything from assignment to the end of the
     * visit is the same world: the customer's figure in the street with a
     * professional on the way to them or already there.
     *
     * PRO_ARRIVED through IN_PROGRESS stay here deliberately. The screen
     * that owns those moments is Tracking, and this map is not it — but if
     * a customer is still on this screen when the knock comes, the world
     * should not snap back to "searching" as if the job had evaporated.
     */
    case "PRO_ASSIGNED":
    case "PRO_EN_ROUTE":
    case "PRO_ARRIVED":
    case "DIAGNOSIS":
    case "WAITING_QUOTE_APPROVAL":
    case "IN_PROGRESS":
    case "COMPLETION_PENDING":
      return "ASSIGNED_ROUTE";

    /*
     * Over, one way or another. There is no fifth phase for "finished", and
     * inventing one here would be a scene nobody has designed. The screen
     * navigates away on these states; the phase is what it shows for the
     * frame before it does, and a quiet search is the safe frame.
     */
    default:
      return "SEARCHING";
  }
}

/**
 * Whether this screen is still the thing standing between the customer and
 * their money.
 *
 * Leaving before anyone is assigned cancels the request; leaving afterwards
 * is only navigation, because the professional is already on the way. The
 * back control changes from a labelled pill to a bare chevron on exactly
 * this boundary, and `SearchingBody` takes the label rather than deciding
 * it, so the decision lives here where it can be tested.
 */
export function leavingCancels(status: JobState): boolean {
  return scenePhaseForJob(status) === "SEARCHING" && status !== "CANCELLED";
}

/** Job states this screen has nothing left to show, and must hand on. */
export function sceneIsOver(status: JobState): boolean {
  return status === "CANCELLED" || status === "CLOSED" || status === "DISPUTED";
}

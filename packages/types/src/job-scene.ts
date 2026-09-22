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

/**
 * WHAT IS HAPPENING NOW, AND WHAT HAPPENS NEXT.
 *
 * ---------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------
 * Amit, on the visit: *"חייב לעבוד על מסך העבודה בעיצומה, זה לא מובן
 * בכלל. אחרי הקוד הגעתי לפה, לא קורה פה כלום."*
 *
 * He is right and the screen was not broken — it was silent. Once the
 * arrival code is verified the journey is over, so everything that
 * screen had been saying (a countdown, a clock, "בדרך אליך") stops being
 * true, and what replaced it was a status word: "העבודה בעיצומה". That
 * is a label, not an answer. A person standing in their own kitchen
 * watching a stranger work wants to know two things — what is he doing,
 * and what is going to be asked of me — and neither was anywhere on the
 * screen.
 *
 * So each state says both, in one sentence, and the second half is
 * always the customer's own next move. Nothing here promises a time:
 * "how long will the diagnosis take" is not knowable from a state, and
 * inventing it would be the same fabrication as an invented ETA
 * (/CLAUDE.md §3).
 *
 * It lives beside the state machine rather than in a screen for the same
 * reason `arrivalHeadlineHe` does: the words and the state must not be
 * able to drift apart, and they drift the moment they are in different
 * files.
 */
export function jobProgressHe(status: JobState, firstNameHe?: string | null): string | null {
  const who = firstNameHe ?? "המקצוען";
  switch (status) {
    case "PRO_ARRIVED":
      return `${who} הגיע. עכשיו הוא בודק מה צריך.`;
    case "DIAGNOSIS":
      return `${who} בודק את התקלה. בסוף הבדיקה תקבלו ממנו הצעת מחיר לאישור.`;
    case "WAITING_QUOTE_APPROVAL":
      return "הצעת המחיר מחכה לאישור שלכם. אפשר לאשר, לשאול או לסרב.";
    case "IN_PROGRESS":
      return `${who} עובד עכשיו. כשיסיים תקבלו סיכום לאישור לפני התשלום.`;
    case "COMPLETION_PENDING":
      return `${who} סיים וממתין לאישור שלכם שהכול תקין.`;
    default:
      // Before he arrives, the arrival assurance owns the words.
      return null;
  }
}

/**
 * ---------------------------------------------------------------------
 * THE SHAPE OF A VISIT, WITH A MARK WHERE YOU ARE IN IT
 * ---------------------------------------------------------------------
 * Amit: *"בשלב שהמקצוען התחיל לבדוק ועד להצעת מחיר אין שום דבר בזמן
 * העבודה, אין שום תחלופה במסך."*
 *
 * `jobProgressHe` answers "what is happening" in one sentence, and it was
 * the only thing on the screen that moved. Between a professional
 * arriving and a price appearing, minutes pass with one unchanging line
 * of text — so a person standing in their kitchen has no way to tell the
 * app is still alive, let alone how much of this is left.
 *
 * A sentence says where you are. It does not say where that IS. Four
 * steps with one of them marked says both, and it changes at every
 * transition — so the screen visibly moves each time something real
 * happens, and never in between.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. No times, no percentage, no bar
 * filling up. How long a diagnosis takes is not knowable from a state
 * and inventing it is the same fabrication as an invented ETA
 * (/CLAUDE.md §3). A step is either behind you, the one you are in, or
 * ahead — three honest answers, and no fourth one pretending to measure.
 */
export interface VisitStep {
  labelHe: string;
  state: "DONE" | "NOW" | "AHEAD";
}

/** The four steps, in order. Fixed: a visit does not reorder itself. */
const VISIT_STEPS_HE = ["בדיקה", "הצעת מחיר", "העבודה", "סיום ותשלום"] as const;

/**
 * Which step a job state sits in, or null before the visit has begun.
 *
 * Null matters: before the professional arrives the journey owns the
 * screen — a countdown, a map, "בדרך אליך" — and a visit tracker beside
 * it would be answering a question nobody is asking yet.
 */
export function visitStepIndex(status: JobState): number | null {
  switch (status) {
    case "PRO_ARRIVED":
    case "DIAGNOSIS":
      return 0;
    case "WAITING_QUOTE_APPROVAL":
      return 1;
    case "IN_PROGRESS":
      return 2;
    case "COMPLETION_PENDING":
      return 3;
    /*
     * The work is over and the money has moved. The last step reads as
     * done rather than current — a tracker still pointing at "סיום
     * ותשלום" after payment says the visit is unfinished when it is not.
     */
    case "COMPLETED":
    case "PAYMENT_PENDING":
    case "PAYMENT_CAPTURED":
    case "REVIEW_PENDING":
    case "CLOSED":
      return VISIT_STEPS_HE.length;
    default:
      return null;
  }
}

export function visitStepsHe(status: JobState): VisitStep[] | null {
  const at = visitStepIndex(status);
  if (at === null) return null;
  return VISIT_STEPS_HE.map((labelHe, i) => ({
    labelHe,
    state: i < at ? "DONE" : i === at ? "NOW" : "AHEAD",
  }));
}

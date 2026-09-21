/**
 * ARRIVAL ASSURANCE — what happens between "he accepted" and "he knocked".
 *
 * ---------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------
 * It is the difference between this product and the market leader, stated
 * as code rather than as marketing.
 *
 * ספץ — the closest Israeli competitor, and the one Amit actually tried —
 * shows "ספץ בדרך אליך!" and then has nothing. Their own FAQ answer to
 * *"איש המקצוע לא הגיע, מה אפשר לעשות?"* is that the customer should open
 * their referrals screen and telephone the professional themselves. Their
 * recovery path is an automated call where you press 2. They promise
 * arrival and deliver a phone number.
 *
 * ChatGPT put the moat precisely: *"Spetz: הנה מספר טלפון, תסתדרו. PRO NOW:
 * אנחנו יודעים מי בדרך. אם הוא מפסיק להיות בדרך — המערכת יודעת לפני שאתה
 * צריך לרדוף אחריו."*
 *
 * So the customer must never be the one who discovers that the arrival
 * broke. This module is the machine that notices first.
 *
 * ---------------------------------------------------------------------
 * WHY IT IS ASSURANCE AND NOT GUARANTEE
 * ---------------------------------------------------------------------
 * A guarantee is a contract: it needs an SLA, a remedy and a policy for who
 * pays when it is missed. Those are business and legal decisions
 * (/CLAUDE.md §4) and none of them has been made. Writing "מתחייבים להגעה"
 * before they exist would be the same class of error as ספץ's "בדרך אליך"
 * — a promise the product cannot keep, which is worse than no promise
 * because it is the one people remember.
 *
 * Assurance is what we CAN honestly offer today: we watch, we tell you
 * first, and we act without being asked.
 *
 * ---------------------------------------------------------------------
 * WHY IT IS A .ts AND NOT INSIDE A SCREEN
 * ---------------------------------------------------------------------
 * Same reason the catalogue is a file: three surfaces need to agree about
 * whether an arrival is in trouble — the customer's tracking screen, the
 * professional's job screen, and the server that decides to re-dispatch. A
 * rule re-implemented per surface is a rule that will disagree with itself
 * within a month, and the disagreement will surface as the app telling a
 * customer everything is fine while dispatch is already replacing the
 * person.
 */

/**
 * The states of an arrival, in the order they can occur.
 *
 * Note that three of the six are failures. That ratio is deliberate: an
 * emergency product is judged on the day it goes wrong, because the day it
 * goes right is indistinguishable from any competitor's.
 */
export type ArrivalPhase =
  /**
   * HE IS HERE. THE JOURNEY IS OVER AND NOTHING ABOUT IT IS TRUE ANY MORE.
   *
   * This phase was missing, and what it cost is the plainest possible
   * example of why the words and the state have to live in one file. The
   * screen's own status line read "העבודה בעיצומה" — the professional is
   * inside the house, working — while the card above it said
   * "דוגמה א׳ בדרך אליכם" over a countdown ticking down fourteen minutes
   * to an arrival that had already happened.
   *
   * Every part of that was working as written. `assessArrival` answers
   * "how is the journey going", and a journey with no bad news in it is
   * ON_ROUTE; it was never told the journey had ended, because there was
   * no way to tell it. So the one screen in the product whose job is to
   * be honest about a promised time was inventing one (/CLAUDE.md §3),
   * for the whole length of the visit.
   */
  | "ARRIVED"
  /** Accepted, moving, ETA holding. */
  | "ON_ROUTE"
  /** The ETA slipped past its tolerance, but he is still coming. */
  | "DELAYED"
  /**
   * We no longer believe he will arrive: his location stopped updating, or
   * the delay passed the point where a delay is a different problem.
   *
   * Separate from DELAYED because they call for different words and
   * different actions. "מתעכב" asks the customer to wait; this one is us
   * saying we are checking, before they have to ask.
   */
  | "ARRIVAL_AT_RISK"
  /** He cancelled, or we gave up on him. The job is unassigned again. */
  | "RECOVERY"
  /** Actively looking for a replacement, with the original brief intact. */
  | "REMATCHING"
  /** Someone else accepted. A new ETA, and the brief carried across. */
  | "NEW_PRO_ASSIGNED";

/** Why the arrival stopped being trustworthy. Drives the words shown. */
export type ArrivalRisk =
  | "ETA_EXCEEDED"
  /** No position update for longer than the staleness window. */
  | "LOCATION_STALE"
  | "PRO_CANCELLED"
  /** The professional stopped responding to the server. */
  | "PRO_UNREACHABLE"
  /** No replacement found. The honest dead end. */
  | "NO_REPLACEMENT";

export interface ArrivalTolerance {
  /**
   * Minutes past the promised arrival before we call it DELAYED.
   *
   * Not zero, and the reason matters: traffic makes every ETA slightly
   * wrong, and an app that announces a crisis at sixty seconds trains
   * people to ignore it. The alarm has to be rarer than the noise.
   */
  delayAfterMinutes: number;
  /** Minutes past promised arrival before a delay becomes a risk. */
  atRiskAfterMinutes: number;
  /** Seconds without a position update before we stop believing the route. */
  locationStaleAfterSeconds: number;
}

/**
 * Pilot tolerances.
 *
 * These are product settings, not legal ones — they decide when we speak,
 * not what we owe. The SLA that decides what we owe is a §4 decision and
 * does not live here.
 */
export const PILOT_ARRIVAL_TOLERANCE: ArrivalTolerance = {
  delayAfterMinutes: 5,
  atRiskAfterMinutes: 12,
  locationStaleAfterSeconds: 180,
};

export interface ArrivalSignals {
  /**
   * True once the professional is at the door — the server's own arrival,
   * never a client's inference from a countdown reaching zero. See the
   * `ARRIVED` phase for what it cost to have no way of saying this.
   */
  arrived?: boolean;
  /** Server's promised arrival, epoch ms. Null when none was ever computed. */
  promisedArrivalMs: number | null;
  /** When the professional's position last updated, epoch ms. */
  lastLocationMs: number | null;
  /** True once the professional has cancelled or been dropped. */
  proGone?: boolean;
  /** True while dispatch is searching for a replacement. */
  searchingReplacement?: boolean;
  /** Set once a replacement accepted. */
  replacementAssigned?: boolean;
  /** True when dispatch has exhausted the pool. */
  replacementImpossible?: boolean;
  nowMs: number;
}

export interface ArrivalAssessment {
  phase: ArrivalPhase;
  risk: ArrivalRisk | null;
  /** Minutes past the promise. Negative means still early. Null if unknown. */
  minutesLate: number | null;
  /**
   * Whether the customer should be told something has changed RIGHT NOW,
   * rather than on next open. The push decision belongs to the server, but
   * the judgement of "this is worth interrupting someone for" belongs with
   * the rule that detected it.
   */
  shouldNotify: boolean;
}

/**
 * The whole rule, in one pure function.
 *
 * ORDER MATTERS AND IS NOT ARBITRARY. A cancelled professional outranks a
 * late one: if he has gone, how late he was is no longer the customer's
 * problem. And a found replacement outranks the search, because otherwise
 * a race between the two would leave the screen saying "we are looking"
 * after someone already accepted.
 */
export function assessArrival(
  s: ArrivalSignals,
  tolerance: ArrivalTolerance = PILOT_ARRIVAL_TOLERANCE
): ArrivalAssessment {
  const minutesLate =
    s.promisedArrivalMs === null
      ? null
      : Math.round((s.nowMs - s.promisedArrivalMs) / 60_000);

  /*
   * ARRIVAL OUTRANKS EVERYTHING, INCLUDING THE BAD NEWS.
   *
   * It is first for the same reason a cancelled professional outranks a
   * late one: once he is at the door, how the journey went stopped being
   * the customer's problem. A promise that was running twenty minutes
   * late and was then kept is a kept promise, and telling somebody their
   * professional is at risk of not arriving while he is standing in
   * their kitchen is worse than saying nothing.
   */
  if (s.arrived) {
    return { phase: "ARRIVED", risk: null, minutesLate, shouldNotify: false };
  }

  // --- the professional is gone, in one of its three shapes ---
  if (s.replacementAssigned) {
    return { phase: "NEW_PRO_ASSIGNED", risk: null, minutesLate: null, shouldNotify: true };
  }
  if (s.replacementImpossible) {
    return {
      phase: "RECOVERY",
      risk: "NO_REPLACEMENT",
      minutesLate,
      shouldNotify: true,
    };
  }
  if (s.searchingReplacement) {
    return { phase: "REMATCHING", risk: "PRO_CANCELLED", minutesLate, shouldNotify: true };
  }
  if (s.proGone) {
    return { phase: "RECOVERY", risk: "PRO_CANCELLED", minutesLate, shouldNotify: true };
  }

  /*
   * A ROUTE WE CANNOT SEE IS NOT A ROUTE. If the position has gone stale we
   * stop asserting he is on his way, even if the clock still says he should
   * arrive in four minutes — that number is now derived from a position we
   * no longer have. Showing it would be exactly the fabricated-ETA problem
   * in its most seductive form: the number is real, it is just no longer
   * about anything (/CLAUDE.md §3).
   */
  const staleFor =
    s.lastLocationMs === null ? null : Math.round((s.nowMs - s.lastLocationMs) / 1000);
  if (staleFor !== null && staleFor > tolerance.locationStaleAfterSeconds) {
    return { phase: "ARRIVAL_AT_RISK", risk: "LOCATION_STALE", minutesLate, shouldNotify: true };
  }

  if (minutesLate === null) {
    return { phase: "ON_ROUTE", risk: null, minutesLate: null, shouldNotify: false };
  }
  if (minutesLate >= tolerance.atRiskAfterMinutes) {
    return { phase: "ARRIVAL_AT_RISK", risk: "ETA_EXCEEDED", minutesLate, shouldNotify: true };
  }
  if (minutesLate >= tolerance.delayAfterMinutes) {
    return { phase: "DELAYED", risk: "ETA_EXCEEDED", minutesLate, shouldNotify: true };
  }
  return { phase: "ON_ROUTE", risk: null, minutesLate, shouldNotify: false };
}

/**
 * WHAT CARRIES ACROSS A REMATCH.
 *
 * ChatGPT: *"Rematch אוטומטי, תוך שמירת הבריף, התמונות, הכתובת והמחיר שכבר
 * אושר ככל שהמודל מאפשר."*
 *
 * The list is short and every item on it is something the customer would
 * otherwise have to do twice — and doing it twice, at the moment the first
 * professional just fell through, is precisely when people abandon a
 * product and telephone someone from Google instead.
 *
 * The approved price is the one that needs a caveat, and it is written into
 * the type rather than a comment: a price approved with ONE professional is
 * not automatically binding on another, since it may have reflected his own
 * rate. `priceCarriesOver` is therefore a decision the server makes under a
 * pricing policy that has not been written yet (§4) — not something a
 * client assumes.
 */
export interface RematchCarryOver {
  serviceId: string;
  addressId: string;
  /** What the customer typed or recorded. */
  briefHe: string | null;
  photoCount: number;
  voiceSeconds: number | null;
  /** Answers to the intake questions. Re-asking them is the insult. */
  intakeAnswerIds: string[];
  /**
   * Whether the already-approved amount still stands for a different
   * professional. Server-decided under a §4 pricing policy; never assumed.
   */
  priceCarriesOver: boolean;
  approvedTotalMinorUnits: number | null;
}

/**
 * The customer-facing sentence for each phase.
 *
 * Kept here beside the rule rather than in a screen, because the words and
 * the state must not be able to drift apart: a screen that says "בדרך
 * אליך" while the machine says ARRIVAL_AT_RISK is the exact failure this
 * module exists to prevent, and it is invisible in review when the two live
 * in different files.
 *
 * Note that no line here promises a time. Times come from the server, and
 * a phase alone never implies one.
 */
export function arrivalHeadlineHe(a: ArrivalAssessment, displayNameHe?: string | null): string {
  const who = displayNameHe ?? "המקצוען";
  switch (a.phase) {
    case "ARRIVED":
      return displayNameHe ? `${who} הגיע אליכם` : "המקצוען הגיע";
    case "ON_ROUTE":
      return displayNameHe ? `${who} בדרך אליכם` : "בדרך אליכם";
    case "DELAYED":
      return "יש עיכוב בהגעה";
    case "ARRIVAL_AT_RISK":
      return a.risk === "LOCATION_STALE" ? "בודקים איפה הוא" : "אנחנו בודקים את המצב";
    case "RECOVERY":
      return a.risk === "NO_REPLACEMENT"
        ? "כרגע לא מצאנו מקצוען חלופי"
        : `${who} לא יוכל להגיע`;
    case "REMATCHING":
      return "מחפשים לכם מחליף עכשיו";
    case "NEW_PRO_ASSIGNED":
      return "מצאנו לכם מישהו אחר";
  }
}

/** The line under the headline. Explains, never reassures falsely. */
export function arrivalDetailHe(a: ArrivalAssessment): string | null {
  switch (a.phase) {
    case "ARRIVED":
      return null;
    case "ON_ROUTE":
      return null;
    case "DELAYED":
      return a.minutesLate !== null
        ? `מאחר בכ-${a.minutesLate} דקות. נעדכן אתכם אם זה ישתנה.`
        : "נעדכן אתכם אם זה ישתנה.";
    case "ARRIVAL_AT_RISK":
      return a.risk === "LOCATION_STALE"
        ? "המיקום שלו הפסיק להתעדכן, אז הפסקנו להציג זמן הגעה. אנחנו בודקים."
        : "ההגעה חרגה ממה שהבטחנו. אנחנו בודקים ונעדכן אתכם.";
    case "RECOVERY":
      return a.risk === "NO_REPLACEMENT"
        ? "אין כרגע מי שפנוי לעבודה הזאת באזור שלכם. לא נמציא זמן הגעה שאין לנו."
        : "לא צריך לעשות כלום — התחלנו לטפל בזה.";
    case "REMATCHING":
      return "הפרטים, התמונות והכתובת נשמרים. לא צריך למלא שוב.";
    case "NEW_PRO_ASSIGNED":
      return "הפרטים שמסרתם עברו אליו.";
  }
}

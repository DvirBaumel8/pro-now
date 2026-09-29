/**
 * The numbers on the professional's shift screen.
 *
 * Every figure a professional sees about their own shift is a claim the
 * platform is making about their money and their time, and they will check
 * it. So this module is pure, small, and tested — and it says "—" far more
 * readily than an app normally allows itself to.
 *
 * THE RULE THAT SHAPES THE WHOLE FILE: a rate is a division, and a division
 * with a tiny denominator is not a small error — it is a wild one. Nine
 * minutes online and one ₪120 job is ₪800 an hour. Show that number and you
 * have told a professional something about their earning power that is not
 * true, that they will plan around, and that they will hold against you when
 * the day ends at ₪95 an hour. So the rate is withheld until the shift is
 * long enough for it to mean anything, and the screen says why.
 *
 * The second rule: earnings shown here are what the server has settled. A
 * job in progress is not money yet — it is a job in progress. Counting it
 * early makes the number go DOWN when something is cancelled, and a number
 * that goes down is the single fastest way to lose a professional's trust in
 * every other number on the screen.
 */

/**
 * When a per-hour rate is stable enough to show.
 *
 * The first version of this was a bare 45 minutes, and that was wrong in a
 * way worth recording: TIME ALONE DOES NOT MAKE A RATE STABLE. Three hours
 * online with a single job is one data point stretched over a long
 * denominator — it looks authoritative and is not. And the number 45 was
 * invented at a keyboard; presenting it as though it carried statistical
 * meaning is its own small dishonesty.
 *
 * So the gate is two conditions, both required — enough time AND enough
 * completed work — and it lives in config rather than in the code, because
 * the right values come from watching real shifts, not from a guess. These
 * are the pilot's values, labelled as such.
 */
export interface RateStabilityRule {
  minOnlineMinutes: number;
  minCompletedJobs: number;
}

export const PILOT_RATE_STABILITY: RateStabilityRule = {
  minOnlineMinutes: 45,
  minCompletedJobs: 2,
};

/** @deprecated Read `PILOT_RATE_STABILITY.minOnlineMinutes`. */
export const RATE_MIN_ONLINE_MINUTES = PILOT_RATE_STABILITY.minOnlineMinutes;

export interface ShiftSnapshot {
  /** When the current shift went ONLINE. Null when offline. */
  onlineSinceMs: number | null;
  /** Server-settled net earnings for this shift, in minor units. */
  settledNetMinorUnits: number | null;
  /** Jobs completed and settled in this shift. */
  completedJobs: number;
  /** A job currently in progress, if any. Deliberately not counted as money. */
  inProgressJobs?: number;
  /** Minutes of this shift spent on a job, per the server. */
  busyMinutes?: number | null;
}

export type ShiftPhase = "OFFLINE" | "WARMING" | "RUNNING";

export interface ShiftReading {
  phase: ShiftPhase;
  /** Whole minutes online. 0 when offline. */
  onlineMinutes: number;
  completedJobs: number;
  inProgressJobs: number;
  settledNetMinorUnits: number | null;
  /**
   * Net per online hour, in minor units. Null whenever it would be a
   * misleading number rather than a small one.
   */
  perOnlineHourMinorUnits: number | null;
  /** Why the rate is absent. Null when it is present. */
  rateWithheldReason: "OFFLINE" | "TOO_SHORT" | "TOO_FEW_JOBS" | "NO_SETTLED_EARNINGS" | null;
  /** The rule that was applied, so the copy can state it without guessing. */
  rule: RateStabilityRule;
  /**
   * Share of online time spent on jobs, 0–1. Null when unknown or when the
   * shift is too short for the ratio to be stable.
   */
  utilisation: number | null;
}

const offlineReading = (rule: RateStabilityRule): ShiftReading => ({
  phase: "OFFLINE",
  onlineMinutes: 0,
  completedJobs: 0,
  inProgressJobs: 0,
  settledNetMinorUnits: null,
  perOnlineHourMinorUnits: null,
  rateWithheldReason: "OFFLINE",
  rule,
  utilisation: null,
});

/**
 * Reads a shift. Always returns a reading — there is no null case, because
 * "we don't know" is a state this screen must render, not an absence the
 * caller has to invent copy for.
 */
export function readShift(
  snapshot: ShiftSnapshot,
  nowMs: number,
  rule: RateStabilityRule = PILOT_RATE_STABILITY
): ShiftReading {
  const { onlineSinceMs } = snapshot;

  if (onlineSinceMs === null || !Number.isFinite(onlineSinceMs)) return offlineReading(rule);

  // A shift that started in the future is a clock disagreement between the
  // device and the server, not a shift. Treat it as just-started rather than
  // rendering a negative duration.
  const elapsedMs = Math.max(0, nowMs - onlineSinceMs);
  const onlineMinutes = Math.floor(elapsedMs / 60_000);

  const completedJobs = Math.max(0, Math.trunc(snapshot.completedJobs));
  const inProgressJobs = Math.max(0, Math.trunc(snapshot.inProgressJobs ?? 0));

  const settled =
    snapshot.settledNetMinorUnits === null || snapshot.settledNetMinorUnits === undefined
      ? null
      : Math.max(0, Math.round(snapshot.settledNetMinorUnits));

  const tooShort = onlineMinutes < rule.minOnlineMinutes;
  /**
   * ZERO JOBS IS NOT A SMALL SAMPLE — IT IS THE ANSWER.
   *
   * A long shift with no completed work earned exactly ₪0 per hour, and that
   * is not an estimate that needs more data; it is the fact. One job IS a
   * small sample. So the sample-size rule applies only above zero. Without
   * this carve-out the screen would hide precisely the bad news a
   * professional opened it to find, behind a rule written to protect them
   * from misleading good news.
   */
  const tooFewJobs = completedJobs > 0 && completedJobs < rule.minCompletedJobs;

  let perOnlineHourMinorUnits: number | null = null;
  let rateWithheldReason: ShiftReading["rateWithheldReason"] = null;

  if (tooShort) {
    rateWithheldReason = "TOO_SHORT";
  } else if (tooFewJobs) {
    // Three hours and one job is one data point with a long denominator. It
    // reads as authority and carries none.
    rateWithheldReason = "TOO_FEW_JOBS";
  } else if (settled === null) {
    rateWithheldReason = "NO_SETTLED_EARNINGS";
  } else {
    // Zero is a legitimate rate: a long quiet shift earned nothing per hour,
    // and saying so is more useful than hiding it.
    perOnlineHourMinorUnits = Math.round(settled / (onlineMinutes / 60));
  }

  let utilisation: number | null = null;
  const busy = snapshot.busyMinutes;
  if (!tooShort && busy !== null && busy !== undefined && Number.isFinite(busy)) {
    // Busy time can exceed online time by a minute or two at a boundary;
    // clamping is right, because a ratio above 1 is noise, not information.
    utilisation = Math.min(1, Math.max(0, busy) / Math.max(1, onlineMinutes));
  }

  return {
    phase: tooShort || tooFewJobs ? "WARMING" : "RUNNING",
    onlineMinutes,
    completedJobs,
    inProgressJobs,
    settledNetMinorUnits: settled,
    perOnlineHourMinorUnits,
    rateWithheldReason,
    rule,
    utilisation,
  };
}

/** "3 שעות 12 דקות" — the shift clock, in words rather than as 03:12:44. */
export function formatOnlineDuration(minutes: number): string {
  const m = Math.max(0, Math.trunc(minutes));
  if (m < 1) return "פחות מדקה";
  if (m < 60) return `${m} דק׳`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  const hoursHe = h === 1 ? "שעה" : h === 2 ? "שעתיים" : `${h} שעות`;
  return rem === 0 ? hoursHe : `${hoursHe} ו־${rem} דק׳`;
}

/** Why the rate is not on screen, said plainly to the person waiting for it. */
export function rateWithheldCopy(reading: ShiftReading): string | null {
  switch (reading.rateWithheldReason) {
    case null:
      return null;
    case "OFFLINE":
      return "התחל משמרת כדי לראות רווח לשעת חיבור";
    case "TOO_SHORT":
      return `נציג אחרי ${reading.rule.minOnlineMinutes} דק׳ חיבור — קודם לכן המספר מטעה`;
    case "TOO_FEW_JOBS":
      return reading.rule.minCompletedJobs === 2
        ? "נציג אחרי שתי עבודות — עבודה אחת זה עוד לא קצב"
        : `נציג אחרי ${reading.rule.minCompletedJobs} עבודות — פחות מזה זה עוד לא קצב`;
    case "NO_SETTLED_EARNINGS":
      return "טרם נסגרה עבודה במשמרת הזו";
    default:
      return null;
  }
}

// ---------------------------------------------------------------------
// The offline briefing
// ---------------------------------------------------------------------

/**
 * What the screen may say BEFORE the shift starts.
 *
 * This is the most tempting place in the entire product to lie. "12 קריאות
 * באזור שלך בשעה האחרונה" would get people online, and if the server has not
 * actually reported it, it is an invented demand signal — precisely what
 * /CLAUDE.md §3 forbids, and a professional who drives across town on it and
 * finds nothing will never trust the app again.
 *
 * So the briefing carries only what the server sent. A missing field renders
 * as absent, and the screen falls back to the one thing that is always true:
 * the professional's own recent history.
 */
export interface ShiftBriefing {
  /** Recent completed calls in this professional's area, per the server. */
  recentCallsInArea?: number | null;
  /** The window those calls were counted over, in minutes. */
  windowMinutes?: number | null;
  /** How many professionals in this trade are online nearby. */
  peersOnline?: number | null;
  /** The professional's own settled earnings over the last 7 days. */
  lastWeekNetMinorUnits?: number | null;
  lastWeekOnlineMinutes?: number | null;
}

export interface BriefingLine {
  kind: "DEMAND" | "PEERS" | "HISTORY";
  textHe: string;
}

/**
 * Turns whatever the server actually sent into lines. Returns only the lines
 * it can support — an empty array is a valid, honest result, and the screen
 * renders the GO ONLINE button with no claims above it.
 */
export function briefingLines(b: ShiftBriefing): BriefingLine[] {
  const out: BriefingLine[] = [];

  const calls = b.recentCallsInArea;
  const win = b.windowMinutes;
  if (typeof calls === "number" && calls > 0 && typeof win === "number" && win > 0) {
    const windowHe = win >= 60 ? `${Math.round(win / 60)} השעות האחרונות` : `${win} הדקות האחרונות`;
    out.push({
      kind: "DEMAND",
      textHe: calls === 1 ? `קריאה אחת באזור שלך ב${windowHe}` : `${calls} קריאות באזור שלך ב${windowHe}`,
    });
  }

  const peers = b.peersOnline;
  if (typeof peers === "number" && peers >= 0) {
    out.push({
      kind: "PEERS",
      // Said as a fact about competition, not as encouragement. A
      // professional deciding whether to drive in deserves the real number
      // even when the real number is discouraging.
      textHe:
        peers === 0
          ? "אף בעל מקצוע בתחום שלך לא מחובר כרגע באזור"
          : peers === 1
            ? "בעל מקצוע אחד נוסף בתחום שלך מחובר באזור"
            : `${peers} בעלי מקצוע בתחום שלך מחוברים באזור`,
    });
  }

  const net = b.lastWeekNetMinorUnits;
  const mins = b.lastWeekOnlineMinutes;
  if (typeof net === "number" && net >= 0 && typeof mins === "number" && mins >= 60) {
    const perHour = Math.round(net / (mins / 60));
    out.push({
      kind: "HISTORY",
      textHe: `בשבוע האחרון: ₪${Math.round(net / 100)} ב־${formatOnlineDuration(mins)} חיבור · ₪${Math.round(
        perHour / 100
      )} לשעה`,
    });
  }

  return out;
}

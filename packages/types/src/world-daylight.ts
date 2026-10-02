/**
 * ---------------------------------------------------------------------
 * THE NEIGHBOURHOOD IS AT THE SAME HOUR YOU ARE
 * ---------------------------------------------------------------------
 * Amit: *"חייב להשתמש בכל היכולות האנימציה וה-AI שלך לייצר פה משהו שלא
 * ראו בשום אפליקציה."*
 *
 * The world was painted once, at one hour, and stayed there. Open the app
 * at seven in the morning and you got the same dusk-lit street as at
 * eleven at night — which is the single thing that most makes an
 * illustrated world read as a PICTURE rather than as a place. Every
 * marketplace has pictures.
 *
 * What almost none of them have is a world that is at the same moment you
 * are. The product is called NOW. So the light over the neighbourhood is
 * taken from the clock on the phone holding it: cold and blue before
 * dawn, low and warm at either end of the day, flat and bright at midday,
 * and after sunset the street lamps and the shop windows are the only
 * things lit.
 *
 * ---------------------------------------------------------------------
 * WHY THIS IS HONEST, WHICH IS NOT OBVIOUS
 * ---------------------------------------------------------------------
 * /CLAUDE.md §3 forbids inventing anything the server has not said, and
 * this invents nothing: the hour is a fact the device already holds, the
 * same fact the customer can read on their own lock screen. It makes no
 * claim about supply, about weather, about where anybody is, or about
 * what any real street looks like right now. It says only "it is evening",
 * to somebody for whom it is evening.
 *
 * It is also deliberately NOT applied to a real street extract. A wash
 * over our own painting is a property of the painting. The same wash over
 * somebody's actual neighbourhood starts to read as a photograph of that
 * place at this hour, which is a claim, and `geo-truth.ts` exists to stop
 * exactly that kind of drift.
 *
 * ---------------------------------------------------------------------
 * WHY IT IS A FUNCTION OF MINUTES AND NOT A SET OF NAMED PICTURES
 * ---------------------------------------------------------------------
 * Six named states would step between two looks at 17:59:59, which is the
 * one thing a person actually notices: a screen that flickers between two
 * colours while nothing has happened. The keyframes below are
 * interpolated, so the light moves the way light does — continuously, and
 * slowly enough that nobody watching for a minute sees it move at all.
 *
 * Sunrise and sunset are fixed at 06:00 and 19:00 rather than computed
 * from a latitude, and that is on purpose: computing them needs a real
 * position, and the one place this runs is a phone whose position we do
 * not ask for. Fixed hours are honest about being approximate; a
 * calculated sun over a guessed location would not be.
 */

/** What the light is doing, for anything that needs to branch rather than blend. */
export type DaylightPhase = "NIGHT" | "DAWN" | "MORNING" | "MIDDAY" | "GOLDEN" | "DUSK";

export interface Daylight {
  phase: DaylightPhase;
  /**
   * A wash laid over the painting: an RGB triple and how strongly it is
   * applied. Never opaque — the artwork has to stay the thing you see.
   */
  wash: { r: number; g: number; b: number; opacity: number };
  /**
   * Whether the lamps, the shop windows and the lit signs are on.
   *
   * A boolean rather than a fade because that is what a light is: the
   * shopkeeper flicks the switch at dusk. It also means anything that
   * draws a glow can ask one question rather than reproducing this table.
   */
  lampsLit: boolean;
  /** For a caption, when a screen wants to say what it is showing. */
  labelHe: string;
}

interface Keyframe {
  /** Minutes since midnight. */
  at: number;
  r: number;
  g: number;
  b: number;
  opacity: number;
  phase: DaylightPhase;
  labelHe: string;
}

/*
 * The day, in seven marks. Blue before the sun, warm as it comes up,
 * neutral and almost invisible at midday — the painting's own light is
 * a bright day, so noon is where the wash gets out of the way — warm
 * again as it goes down, and deep blue after.
 */
const KEYFRAMES: readonly Keyframe[] = [
  { at: 0, r: 18, g: 22, b: 58, opacity: 0.52, phase: "NIGHT", labelHe: "לילה" },
  { at: 5 * 60, r: 22, g: 30, b: 70, opacity: 0.46, phase: "NIGHT", labelHe: "לפנות בוקר" },
  { at: 6 * 60 + 30, r: 120, g: 96, b: 110, opacity: 0.24, phase: "DAWN", labelHe: "עלות השחר" },
  { at: 9 * 60, r: 200, g: 200, b: 210, opacity: 0.07, phase: "MORNING", labelHe: "בוקר" },
  { at: 13 * 60, r: 255, g: 250, b: 235, opacity: 0.03, phase: "MIDDAY", labelHe: "צהריים" },
  { at: 17 * 60 + 30, r: 235, g: 150, b: 80, opacity: 0.18, phase: "GOLDEN", labelHe: "שעת הזהב" },
  { at: 19 * 60, r: 150, g: 90, b: 90, opacity: 0.3, phase: "DUSK", labelHe: "שקיעה" },
  { at: 21 * 60, r: 18, g: 22, b: 58, opacity: 0.52, phase: "NIGHT", labelHe: "ערב" },
  { at: 24 * 60, r: 18, g: 22, b: 58, opacity: 0.52, phase: "NIGHT", labelHe: "לילה" },
];

/** The lamps come on at dusk and go off after dawn. */
const LAMPS_ON_MINUTE = 18 * 60 + 15;
const LAMPS_OFF_MINUTE = 6 * 60 + 45;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * The light at a moment, from the clock the caller is holding.
 *
 * Takes the minutes rather than a Date so it can be tested at every
 * minute of the day without a fake clock, and so a caller that already
 * has a tick does not build a Date to throw away.
 */
export function daylightAtMinute(minuteOfDay: number): Daylight {
  const m = ((minuteOfDay % 1440) + 1440) % 1440;

  let i = 0;
  while (i < KEYFRAMES.length - 2 && KEYFRAMES[i + 1]!.at <= m) i += 1;
  const a = KEYFRAMES[i]!;
  const b = KEYFRAMES[i + 1]!;
  const span = b.at - a.at;
  const t = span <= 0 ? 0 : (m - a.at) / span;

  /*
   * The PHASE is the nearer keyframe rather than the earlier one. Taking
   * the earlier one means the screen calls it "night" until the instant
   * it becomes morning, which is exactly the stepping the blend is here
   * to avoid — in words rather than in colour.
   */
  const near = t < 0.5 ? a : b;

  return {
    phase: near.phase,
    labelHe: near.labelHe,
    wash: {
      r: Math.round(lerp(a.r, b.r, t)),
      g: Math.round(lerp(a.g, b.g, t)),
      b: Math.round(lerp(a.b, b.b, t)),
      opacity: Number(lerp(a.opacity, b.opacity, t).toFixed(3)),
    },
    lampsLit: m >= LAMPS_ON_MINUTE || m < LAMPS_OFF_MINUTE,
  };
}

/** The same, from a clock. Local time, because it is the viewer's evening. */
export function daylightAt(now: Date): Daylight {
  return daylightAtMinute(now.getHours() * 60 + now.getMinutes());
}

/**
 * The wash as a colour a style can take.
 *
 * Kept here rather than in the component so the one place that decides
 * what the light looks like is also the one place that writes it down.
 */
export function daylightWashColor(d: Daylight): string {
  return `rgba(${d.wash.r}, ${d.wash.g}, ${d.wash.b}, ${d.wash.opacity})`;
}

/**
 * The invariants, as a test rather than as a comment — the same shape as
 * `navigationViolations`.
 */
export function daylightViolations(): string[] {
  const out: string[] = [];

  // Never opaque: the artwork has to stay the thing you are looking at.
  for (let m = 0; m < 1440; m += 1) {
    const d = daylightAtMinute(m);
    if (d.wash.opacity > 0.6) out.push(`minute ${m} washes the painting out at ${d.wash.opacity}`);
    if (d.wash.opacity < 0) out.push(`minute ${m} has a negative wash`);
  }

  // Continuous: no step a person could catch. A tenth of the strongest
  // wash, per minute, is the most the light may move.
  for (let m = 1; m < 1440; m += 1) {
    const prev = daylightAtMinute(m - 1).wash;
    const now = daylightAtMinute(m).wash;
    const jump =
      Math.abs(now.opacity - prev.opacity) +
      (Math.abs(now.r - prev.r) + Math.abs(now.g - prev.g) + Math.abs(now.b - prev.b)) / 255 / 3;
    if (jump > 0.05) out.push(`the light jumps at minute ${m}`);
  }

  // Midday must be the lightest touch and the middle of the night the heaviest.
  if (daylightAtMinute(13 * 60).wash.opacity >= daylightAtMinute(0).wash.opacity) {
    out.push("midday is washed at least as heavily as midnight");
  }

  // Lamps: off in daylight, on in the dark. The two hours that matter.
  if (daylightAtMinute(13 * 60).lampsLit) out.push("the lamps are lit at one in the afternoon");
  if (!daylightAtMinute(23 * 60).lampsLit) out.push("the lamps are out at eleven at night");

  return out;
}

/**
 * THE GREETING, FROM THE SAME CLOCK AS THE LIGHT.
 *
 * The home screen said "ערב טוב" at every hour, which was survivable
 * while the world was painted at one hour too. It stops being survivable
 * the moment the sky above the words is at the viewer's own time: a
 * bright midday street under "ערב טוב" is the app contradicting itself
 * on one screen, and that is worse than either half alone.
 *
 * So both come from the same minute, and there is nowhere for them to
 * drift apart to.
 */
export function greetingAtMinute(minuteOfDay: number): string {
  const m = ((minuteOfDay % 1440) + 1440) % 1440;
  if (m < 5 * 60) return "לילה טוב";
  if (m < 12 * 60) return "בוקר טוב";
  if (m < 16 * 60) return "צהריים טובים";
  /*
   * Evening begins when the lamps do, and reads that constant rather
   * than repeating the hour: a greeting that says evening while the
   * street is still lit by the sun is the two halves disagreeing, which
   * is the whole thing this shares a clock to avoid.
   */
  if (m < LAMPS_ON_MINUTE) return "אחר צהריים טובים";
  if (m < 22 * 60) return "ערב טוב";
  return "לילה טוב";
}

export function greetingAt(now: Date): string {
  return greetingAtMinute(now.getHours() * 60 + now.getMinutes());
}

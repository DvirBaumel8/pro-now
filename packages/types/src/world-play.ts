/**
 * WORLD PLAY — the waiting, made worth staying for.
 *
 * ---------------------------------------------------------------------
 * WHAT WAS WRONG WITH THE VERSION THIS REPLACES
 * ---------------------------------------------------------------------
 * The first mini-game was seven yellow orbs you tapped until a counter
 * reached seven. Amit played it and said the two things that matter:
 *
 *   "קחו את המשחק גם לכיוון סופר מריו חדשני יותר ולא סתם ללחוץ על עיגולים
 *    צהובים… זה גרוע, וכשאתה מסיים זה נתקע על המסך ואין מה לעשות, אין
 *    אפשרות לחזור לתפריט."
 *
 * Two separate failures. The first is that collecting identical tokens is
 * the generic mobile-game placeholder, not a thing anyone would show a
 * friend. The second is worse and is a straight defect: finishing left the
 * screen in a dead end.
 *
 * ChatGPT's reframing is the design here, and it is a real change rather
 * than a new coat of paint: *"GameLayer לא צריך להיות layer שמונח מעל
 * Living Map. Living Map הוא המשחק."* Nothing is laid over the city.
 * Objects in the city become touchable, and touching one makes the world
 * answer — a tree releases pigeons, a shutter rolls up and the light comes
 * on inside, a scooter drives off and stops by the kiosk.
 *
 * ---------------------------------------------------------------------
 * THE TWO THINGS PLAY MAY NEVER DO
 * ---------------------------------------------------------------------
 * It may not touch the job, and it may not trap the person.
 *
 * The first is enforced by the type: a `WorldInteraction` cannot carry an
 * ETA, an assignment, a price or a discount, so no amount of enthusiasm
 * turns finding a cat into a claim about when the professional arrives or
 * what the work will cost. A discount is a pricing decision (/CLAUDE.md §4)
 * and none has been made.
 *
 * The second is enforced by there being no end state to get stuck in.
 * There is no modal, no "Game Over", no completion screen. Finding
 * everything changes one line of text in a drawer that was always there.
 */

export type WorldInteractionType = "TAP" | "SWIPE" | "HOLD";

/**
 * The three built first, chosen because each proves a different thing:
 * that the world reacts, that a building has an inside, and that something
 * can move through the scene under the person's finger.
 */
export type WorldInteractionAnimation =
  /** A tree shaken — leaves move, pigeons scatter. */
  | "RUSTLE"
  /** A shutter rolls up and the light comes on behind the glass. */
  | "OPEN_SHUTTER"
  /** A parked scooter pulls away and stops further down the street. */
  | "DRIVE_BY";

export interface WorldInteraction {
  type: WorldInteractionType;
  animation: WorldInteractionAnimation;
  /** Unique within a scene. What "found" is counted by. */
  discoveryId: string;
  /** Read aloud by a screen reader. The world is touchable for everyone. */
  labelHe: string;

  /*
   * PLAY CANNOT REACH THE JOB. Each of these is something a future change
   * would plausibly add — a reward, a faster arrival, a coupon — and each
   * would turn an animation into a promise the server never made.
   */
  etaMinutes?: never;
  etaSeconds?: never;
  assignmentId?: never;
  priceAgorot?: never;
  discountPercent?: never;
  points?: never;
}

/** What has been found so far. Lives for the length of one wait. */
export interface DiscoveryState {
  /** Every discoveryId placed in the current scene. */
  available: readonly string[];
  /** Those touched, in the order they were found. */
  found: readonly string[];
}

export const emptyDiscoveries = (available: readonly string[]): DiscoveryState => ({ available, found: [] });

/** Idempotent: touching the same tree twice is still one discovery. */
export function discover(state: DiscoveryState, discoveryId: string): DiscoveryState {
  if (!state.available.includes(discoveryId)) return state;
  if (state.found.includes(discoveryId)) return state;
  return { ...state, found: [...state.found, discoveryId] };
}

/**
 * The progress line, or nothing.
 *
 * Returns `null` before anything has been found, because "מצאת 0 מתוך 6"
 * is an instruction to play, and the whole point is that nobody has to.
 * ChatGPT: *"לא הייתי הופך את זה ל'משחק שחייבים לשחק'."* The drawer offers
 * it; the counter appears once someone has actually started.
 */
export function discoveryProgressHe(state: DiscoveryState): string | null {
  const total = state.available.length;
  const found = state.found.length;
  if (total === 0 || found === 0) return null;
  if (found >= total) return "מצאת את כל ההפתעות בשכונה ✦";
  return `מצאת ${found} מתוך ${total} הפתעות בשכונה`;
}

/**
 * ---------------------------------------------------------------------
 * THE DRAWER — the fix for "it gets stuck and there is nothing to do"
 * ---------------------------------------------------------------------
 * A small permanent strip at the bottom during the wait. It states the one
 * fact that matters and offers the ways out. It is not a modal, it never
 * covers the HUD, and it has no state in which it disappears — which is
 * precisely why the dead end cannot come back.
 */
export type PlayDrawerActionId = "PLAY_MORE" | "FOLLOW_PRO" | "JOB_DETAILS" | "WHILE_YOU_WAIT";

export interface PlayDrawerAction {
  id: PlayDrawerActionId;
  labelHe: string;
}

/**
 * What the drawer offers, given where the wait has got to.
 *
 * `firstNameHe` is threaded through rather than formatted at the call site
 * so "לראות את דניאל בדרך" is one string built in one place, and a missing
 * name degrades to a sentence that still reads.
 */
export function playDrawerActions(args: {
  firstNameHe: string | null;
  discoveries: DiscoveryState;
  hasJobDetails: boolean;
}): PlayDrawerAction[] {
  const all = args.discoveries.found.length >= args.discoveries.available.length;
  const actions: PlayDrawerAction[] = [];

  // Once everything is found, "play more" becomes "wander", because
  // offering more of something there is no more of is a small lie.
  if (args.discoveries.available.length > 0) {
    /* Amit: *"להמשיך לטייל בעולם ולראות עסקים נוספים"* — the offer is to
       wander, found everything or not. */
    actions.push({ id: "PLAY_MORE", labelHe: "לטייל בעולם" });
  }
  actions.push({
    id: "FOLLOW_PRO",
    labelHe: args.firstNameHe ? `לעקוב אחרי ${args.firstNameHe}` : "לעקוב אחרי ההגעה",
  });
  if (args.hasJobDetails) actions.push({ id: "JOB_DETAILS", labelHe: "פרטי העבודה" });

  return actions;
}

/** The headline the drawer carries. Real ETA or an honest absence. */
export function playDrawerStatusHe(args: { firstNameHe: string | null; etaMinutes: number | null }): string {
  const who = args.firstNameHe ? `${args.firstNameHe} בדרך אליך` : "בדרך אליך";
  if (args.etaMinutes === null) return `${who} · זמן ההגעה יתעדכן`;
  return `${who} · ${args.etaMinutes} דק׳`;
}

/**
 * Everything wrong with a playable scene.
 *
 * The rules worth checking are the ones a later change would break by
 * accident: two objects sharing a discovery id so the counter can never
 * complete, an interaction on something the person cannot see, or play
 * placed under the HUD or the drawer where a tap meant for safety would be
 * swallowed instead.
 */
export function worldPlayViolations(args: {
  interactions: readonly { key: string; interaction: WorldInteraction; withinSafeZone: boolean }[];
  discoveries: DiscoveryState;
}): string[] {
  const v: string[] = [];
  const ids = new Set<string>();

  for (const { key, interaction, withinSafeZone } of args.interactions) {
    if (ids.has(interaction.discoveryId)) {
      v.push(`Two objects share discoveryId "${interaction.discoveryId}"; the counter could never complete.`);
    }
    ids.add(interaction.discoveryId);

    if (!interaction.labelHe.trim()) {
      v.push(`"${key}" is touchable with no Hebrew label; the world has to be playable by screen reader too.`);
    }
    if (withinSafeZone) {
      v.push(`"${key}" is interactive inside a safe zone. Play may never take a touch meant for the HUD or the drawer.`);
    }
    if (!args.discoveries.available.includes(interaction.discoveryId)) {
      v.push(`"${interaction.discoveryId}" is placed but not counted; it can be found and never register.`);
    }
  }

  for (const id of args.discoveries.available) {
    if (!ids.has(id)) v.push(`"${id}" is counted but not placed; the counter would stall short of its total.`);
  }
  for (const id of args.discoveries.found) {
    if (!args.discoveries.available.includes(id)) v.push(`"${id}" was found but is not available in this scene.`);
  }

  return v;
}

import type { NormalizedPoint } from "./virtual-venue";

/**
 * WHAT A DRAWING MEANS ONCE THE STREET IS REAL.
 *
 * ---------------------------------------------------------------------
 * THE RULE THAT CHANGES MEANING WITHOUT CHANGING WORDING
 * ---------------------------------------------------------------------
 * `/CLAUDE.md §3`: *Real supply only. Real ETA only. Never fabricate
 * availability, demand, or a trust score.*
 *
 * On the painted neighbourhood that sentence is about text. The world is
 * full of invented life — `WorldLife` walks people past, `DemoCity` parks a
 * van, eleven district shopfronts carry trade names — and none of it is a
 * claim, because nobody can read an address off a street that does not
 * exist. The figures are scenery in a place that is admittedly scenery.
 *
 * Put the identical scene on a real street plan and every one of those
 * drawings becomes a statement about somewhere. A walker outside a real
 * building says a person is outside that building. A shopfront on a real
 * plot says a business trades at that address — and if the plot belongs to
 * a real barber who has never heard of us, we have just put his competitor
 * in his doorway.
 *
 * Nothing in the renderer would catch that. It is not a bug that produces
 * a wrong pixel; it produces a perfectly good picture of a false claim. So
 * it is caught here, at the type, before anything is drawn.
 *
 * ---------------------------------------------------------------------
 * THE MECHANISM
 * ---------------------------------------------------------------------
 * Every position that reaches a surface declares where it came from. A
 * surface declares whether it is a real place. `plottable` is the one
 * function that decides, and `plotViolations` is the test that proves the
 * ambient world cannot leak onto a map.
 *
 * The honest degradation is not "hide the decoration" — a city with nobody
 * in it reads as broken. It is: **the decorated world stays illustrated.**
 * A screen that wants ambient life gets the painted plate; a screen that
 * wants real geography gets real positions only, and gets them sparse,
 * because sparse and true beats busy and invented.
 */

/** Where a drawn position came from. */
export type Provenance =
  /** The server said so: an assignment, a job, a professional's own fix. */
  | "SERVER"
  /** The device's own location, with the user's permission. */
  | "SELF"
  /**
   * INVENTED, BUT ABOUT NOBODY.
   *
   * -------------------------------------------------------------------
   * THE DISTINCTION THE FIRST VERSION OF THIS FILE MISSED
   * -------------------------------------------------------------------
   * The rule below started as "invented things may not stand on a real
   * street", and the consequence was a dead city — every walker, every
   * van, every lit window switched off the moment the streets were real.
   * Amit's note was immediate and correct: *"אני לא יכול עם המסך הכהה
   * הזה."* A place with nothing happening in it is not more honest, it
   * is just worse, and nobody was ever misled by a tree.
   *
   * What made the old ambient world dangerous was not that it was
   * invented. It was that its inventions had IDENTITIES: a courier, a
   * moving van, a shopfront with a trade name on it. Put those on a real
   * street and every one of them is a claim that somebody of that trade
   * is at that address — which is exactly `/CLAUDE.md §3`.
   *
   * `AMBIENT` is the other kind: invented, and carrying no identity at
   * all. Leaves moving, a lamp breathing, light on wet asphalt, a
   * silhouette of an unbranded car crossing the far end of a street.
   * None of it says anyone is anywhere, none of it is a professional,
   * none of it can be tapped, and none of it may ever carry a name — all
   * of which is enforced below rather than promised.
   */
  | "AMBIENT"
  /** Invented WITH an identity — ambient professionals, district markers. */
  | "DECOR";

export type SurfaceKind =
  /** The painted neighbourhood. Nothing here is anywhere. */
  | "ILLUSTRATED"
  /** A real street plan. Everything here is somewhere. */
  | "REAL";

export interface Plotted {
  id: string;
  at: NormalizedPoint;
  provenance: Provenance;
  /** A name painted on it — a shopfront sign, a person's first name. */
  labelHe?: string;
  /** Can somebody tap it and get somewhere? Ambient things cannot. */
  interactive?: boolean;
}

/**
 * May this be drawn on this surface?
 *
 * The asymmetry is deliberate and is the whole point: an illustrated world
 * takes anything, a real one takes only what somebody is accountable for.
 */
export function plottable(item: Plotted, surface: SurfaceKind): boolean {
  if (surface === "ILLUSTRATED") return true;
  if (item.provenance === "DECOR") return false;
  if (item.provenance === "AMBIENT") {
    /*
     * Atmosphere earns its place on a real street by being about nobody.
     * A named or tappable ambient object is a thing pretending to be
     * atmosphere, which is worse than the honest version of either.
     */
    return !item.labelHe && item.interactive !== true;
  }
  return true;
}

export function plottableOnly(items: readonly Plotted[], surface: SurfaceKind): Plotted[] {
  return items.filter((i) => plottable(i, surface));
}

/**
 * A NAME IS A STRONGER CLAIM THAN A DOT.
 *
 * A grey marker at a real coordinate says "something of ours is here". The
 * same marker with "פרו נאו ניקיון" painted on it says a cleaning business
 * trades at that address. The second needs a business behind it; the first
 * does not.
 *
 * So on a real surface a label requires SERVER provenance even where the
 * position itself would have been allowed — which in practice means the
 * district markers lose their signage on the real map and keep it on the
 * painted one. That is the right trade: the signs were always a way of
 * saying "this trade exists in this city", and on a real city that
 * sentence has to be said without standing on somebody's shop.
 */
export function labelAllowed(item: Plotted, surface: SurfaceKind): boolean {
  if (!item.labelHe) return true;
  if (surface === "ILLUSTRATED") return true;
  return item.provenance === "SERVER";
}

/**
 * The atmosphere a real street may carry, in order of how much life it
 * buys per unit of risk.
 *
 * Written down as a list rather than left to each screen, because "a bit
 * of movement" is exactly the kind of instruction that grows a courier.
 */
export const AMBIENT_KINDS = [
  /** Lamp pools breathing, and shopfront glow. */
  "LAMP_BREATH",
  /** Windows changing luminance, slowly and out of step. */
  "WINDOW_LUMINANCE",
  /** Canopies and grass moving one to three points. */
  "LEAF_SWAY",
  /** Light on wet asphalt, shifting with the camera. */
  "ASPHALT_SHEEN",
  /** Near things moving faster than far ones as you walk. */
  "PARALLAX",
] as const;

export type AmbientKind = (typeof AMBIENT_KINDS)[number];

/**
 * MOTION WITHOUT AGENCY IS AMBIENCE. MOTION WITH AGENCY IS AN ENTITY.
 *
 * ---------------------------------------------------------------------
 * THE LINE, AND WHERE I HAD PUT IT WRONG
 * ---------------------------------------------------------------------
 * My own first list ended with `DISTANT_TRAFFIC` — one unbranded car
 * crossing the far end of a street, small, as a silhouette. ChatGPT cut
 * it, and the argument is better than the concession I was making:
 *
 *     "אם משהו גורם למשתמש לחשוב 'יש שם מישהו/משהו שנמצא עכשיו ברחוב
 *      הזה', הוא Entity. לכן לא הייתי שם אפילו מונית רחוקה על מפה
 *      אמיתית. היא עדיין נקראת כרכב במקום אמיתי."
 *
 * Which is exactly right, and worse for us than for most products: this
 * app's entire promise is that somebody is on their way to you. A moving
 * vehicle is the one shape a customer of PRO NOW is primed to read as an
 * arrival. Making it small and grey does not make it mean less.
 *
 * So the rule is a property of the motion, not of its size:
 *
 *     Light may move. Leaves may move. Water may move. A shadow may
 *     breathe. Anything that travels from A to B ON PURPOSE — a person,
 *     a dog, a bicycle, a van — needs a source of truth.
 *
 * `ambientViolations` is that sentence as a check, and it is deliberately
 * unforgiving: atmosphere with a name on it, atmosphere that can be
 * tapped, or atmosphere claiming a provenance it does not have are all
 * refused, because each is a thing pretending to be weather.
 */
export function ambientViolations(kind: AmbientKind, item: Plotted): string[] {
  const out: string[] = [];
  if (item.provenance !== "AMBIENT") out.push(`${item.id} is ${kind} but claims a source`);
  if (item.labelHe) out.push(`${item.id} is atmosphere with a name on it`);
  if (item.interactive) out.push(`${item.id} is atmosphere that can be tapped`);
  return out;
}

/**
 * Whether a described motion is allowed to exist without a server behind
 * it.
 *
 * `travels` is the whole question: does this thing go from one place to
 * another under its own steam? A canopy that sways returns to where it
 * was; a courier does not. The signature is short on purpose — anything
 * that needs a paragraph to argue it is not travelling, is travelling.
 */
export function motionNeedsTruth(motion: { travels: boolean; readsAsSomebody: boolean }): boolean {
  return motion.travels || motion.readsAsSomebody;
}

export interface PlotScene {
  surface: SurfaceKind;
  /** True only for an extract that is a place. A fixture is not. */
  surfaceIsRealPlace: boolean;
  items: readonly Plotted[];
}

/** Everything a scene is claiming that it has no right to claim. */
export function plotViolations(scene: PlotScene): string[] {
  const out: string[] = [];

  if (scene.surface === "REAL" && !scene.surfaceIsRealPlace) {
    out.push("a surface drawn as a real place is standing on a fixture");
  }

  for (const item of scene.items) {
    if (!plottable(item, scene.surface)) {
      out.push(
        item.provenance === "AMBIENT"
          ? `${item.id} is atmosphere pretending to be something you can reach`
          : `${item.id} is invented and is being drawn on a real street`
      );
    }
    if (!labelAllowed(item, scene.surface)) {
      out.push(`${item.id} paints "${item.labelHe}" on a real address without a business behind it`);
    }
  }

  const ids = new Set<string>();
  for (const item of scene.items) {
    if (ids.has(item.id)) out.push(`${item.id} is plotted twice`);
    ids.add(item.id);
  }

  return out;
}

/**
 * The control this file needs in order to be worth anything.
 *
 * Every check here passes trivially on a scene that happens to contain no
 * decoration, and the ambient world is exactly the input that would break
 * it — so the test asserts both directions, and this is the failing side
 * written down once rather than in three test files.
 */
export function decorScene(surface: SurfaceKind): PlotScene {
  return {
    surface,
    surfaceIsRealPlace: surface === "REAL",
    items: [
      { id: "ambient_walker_1", at: { u: 0.4, v: 0.5 }, provenance: "DECOR" },
      { id: "district_clean", at: { u: 0.6, v: 0.4 }, provenance: "DECOR", labelHe: "פרו נאו ניקיון" },
    ],
  };
}

/**
 * WHAT THE SCREEN HAS TO SAY, ONCE THE STREETS ARE REAL.
 *
 * ---------------------------------------------------------------------
 * THE LINE THAT STOPPED BEING TRUE
 * ---------------------------------------------------------------------
 * Three screens carry a version of *"תצוגת העיר היא המחשה · המפה האמיתית
 * תיכנס עם ספק המפות"* — the city is an illustration, the real map arrives
 * with the provider. That was exactly right for a painted street and it
 * becomes false in two directions at once the moment a real extract is
 * underneath: the map HAS arrived, and it did not come from a provider.
 *
 * Worse, the half of the sentence that still matters gets weaker. "The
 * city is an illustration" reads as a note about the artwork. On real
 * streets the thing a customer needs told is narrower and sharper: **the
 * roads are real and the shops are not.** Somebody looking at a shopfront
 * on their own street has to know we are not saying a business is there.
 *
 * So the copy is a function of the ground rather than a constant, and it
 * is here — next to the rule it is the user-facing half of — rather than
 * typed into three screens, which is how the three of them drifted apart
 * in the first place.
 */
export interface GroundDisclosure {
  /** True when a real street plan is underneath. */
  realStreets: boolean;
  /** True when the screen also shows who is available. */
  showsSupply?: boolean;
}

export function groundDisclosureHe({ realStreets, showsSupply = false }: GroundDisclosure): string {
  const supply = showsSupply
    ? "מי זמין עכשיו נבדק רק כששולחים בקשה"
    : "המפה האמיתית תיכנס עם ספק המפות";
  if (!realStreets) return `תצוגת העיר היא המחשה · ${supply}`;
  /*
   * On a real plan the second clause about a maps provider is simply
   * wrong — the streets are already real — so it is replaced rather than
   * appended to. Two sentences, both true, in the order somebody reads
   * them: what IS real first, because that is the surprising part.
   */
  const shops = "הרחובות אמיתיים · העסקים בתצוגה הם המחשה ולא כתובות";
  return showsSupply ? `${shops} · מי זמין עכשיו נבדק רק כששולחים בקשה` : shops;
}

/**
 * Everything wrong with a disclosure, as a list.
 *
 * A line of copy is exactly where a claim sneaks in, which is why the
 * errands have `errandViolations` and why this exists. It checks the one
 * property that matters and is easy to lose in a rewrite: on real streets
 * the line must SAY so, and must not promise a maps provider that has
 * already been made unnecessary.
 */
export function disclosureViolations(input: GroundDisclosure): string[] {
  const line = groundDisclosureHe(input);
  const out: string[] = [];
  if (input.realStreets) {
    if (!line.includes("הרחובות אמיתיים")) out.push("real streets are not disclosed as real");
    if (!line.includes("לא כתובות")) out.push("the line does not say the shops are not addresses");
    if (line.includes("ספק המפות")) out.push("the line still promises a maps provider that has arrived");
  } else {
    if (!line.includes("המחשה")) out.push("an illustrated city is not disclosed as an illustration");
    if (line.includes("הרחובות אמיתיים")) out.push("a painted street is being called real");
  }
  if (input.showsSupply && !line.includes("נבדק רק כששולחים בקשה")) {
    out.push("a screen showing supply does not say when supply is checked");
  }
  return out;
}

/**
 * THE CUSTOMER'S OWN AVATAR.
 *
 * ---------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------
 * Amit: *"אני רוצה שהלקוח יגדיר לעצמו אווטאר בהתחלה לפי מגדר וכו', ואיתו
 * הוא יטייל בין העסקים, וכל החוויה תהיה דרך האווטאר של הלקוח... פשוט ממש,
 * שלוקח 20 שניות עד דקה, שלא ידלגו — לא חובה."*
 *
 * This closes the loop on the world. Until now the customer was a camera
 * hovering over a street: they could look at the neighbourhood but they
 * were not in it. An avatar is what turns "like VR" from a description of
 * the art into a mechanism — somebody walking past the shops is a person
 * choosing, and a camera panning over them is a map.
 *
 * ---------------------------------------------------------------------
 * A CLOSED SET, NOT A CHARACTER CREATOR
 * ---------------------------------------------------------------------
 * The tempting build is sliders: body, skin, hair, clothes. Three reasons
 * not to, and the first is fatal.
 *
 * The art is raster. A layered avatar — a body PNG, a hair PNG, a shirt
 * PNG, all anchored — breaks at the first pixel: the hair fits one head,
 * the shirt fits one shoulder line, and every new body multiplies the
 * work. It is the route that has already been rejected twice here.
 *
 * Second, twenty seconds. Amit set the budget and it is the right one: a
 * customer who came here because their kitchen is flooding has not
 * arrived to dress a doll. Sliders cannot be done in twenty seconds.
 *
 * Third, an editor implies the result matters. It does not: this is who
 * walks down the street, not a profile photo other people judge.
 *
 * So: one screen of finished people, pick a face, carry on.
 *
 * ---------------------------------------------------------------------
 * WHAT AN AVATAR IS NOT ALLOWED TO BE
 * ---------------------------------------------------------------------
 * It is not identity. It is never shown to a professional as what the
 * customer looks like, it is not evidence of anything, and it carries no
 * name. A professional arriving at a door must not have been given a
 * picture of who to expect — that is a real safety property, not a
 * nicety. The type therefore has no field for a name, and the choice is
 * stored as an id rather than as a description of a person.
 *
 * And it is OPTIONAL. Amit was explicit. Skipping leaves `null`, and every
 * screen has to work with `null` — which is also the state of every
 * customer who signed up before this existed.
 */

/**
 * How an avatar presents.
 *
 * "UNSPECIFIED" is a real answer rather than a missing one: a customer who
 * does not want to say still gets to walk down the street.
 *
 * "ANIMAL" is not a joke entry. Amit asked for animals and ChatGPT locked
 * the roster at ten people and two of them — and the reason to keep them
 * is that they are the clearest possible statement that this choice is
 * not a profile photo. Somebody who picks the cat has understood exactly
 * what the avatar is for, which is the understanding the whole screen is
 * trying to produce in twenty seconds.
 */
export type AvatarPresentation = "WOMAN" | "MAN" | "UNSPECIFIED" | "ANIMAL";

export interface AvatarOption {
  /** Stable id. What gets stored; never a description of a person. */
  id: string;
  /** The face shown in the picker. */
  portraitAssetId: string;
  /**
   * The figure seen walking the street — from BEHIND.
   *
   * The file name says so (`_world_back`) because the id IS the file name:
   * one naming scheme, no translation table, and a file that arrives
   * works.
   *
   * Every other character in this world faces the camera, which is right
   * for somebody standing in a shop doorway. The one person you follow is
   * seen from three-quarters behind, and a front-facing figure walking
   * away from you is the single most obvious tell that a world is a
   * collage.
   */
  worldAssetId: string;
  presentation: AvatarPresentation;
  /**
   * A short label, for the accessibility layer only.
   *
   * Deliberately about the DRAWING and never about a person: "דמות עם
   * כיסוי ראש", not an age, an ethnicity or a name. Screen readers need
   * something to distinguish twelve buttons; nothing here may become a
   * claim about who the customer is.
   */
  labelHe: string;
  /**
   * How tall this figure is drawn, as a fraction of a standing person.
   *
   * A dog rendered at a person's height is a dog the size of a horse, and
   * the world's whole depth model rests on everything at the same distance
   * agreeing about scale. One number per identity keeps that true without
   * the renderer needing to know what any of them are.
   */
  heightRatio: number;
}

/**
 * The roster: ten people and two animals.
 *
 * Twelve, and the number is a judgement rather than a constant: enough
 * that most people in Israel find somebody close, few enough to fit one
 * screen without scrolling and be chosen in twenty seconds. Order is
 * fixed so the grid does not reshuffle between visits — a picker whose
 * contents move is a picker you have to read twice.
 *
 * The split is ten and two rather than twelve people, and that was a
 * decision rather than a shortage. The first instinct was to add two more
 * people so the human half came to six and six — and it is the wrong
 * instinct, because the picker never asks about gender in the first
 * place. It shows a grid and takes a tap. Balancing a question nobody is
 * asked buys nothing, and it would have cost the two entries that make
 * the screen fun.
 */
export const AVATARS: readonly AvatarOption[] = [
  { id: "av_01", portraitAssetId: "avatar_01_portrait", worldAssetId: "avatar_01_world_back", presentation: "WOMAN", heightRatio: 1, labelHe: "דמות 1" },
  { id: "av_02", portraitAssetId: "avatar_02_portrait", worldAssetId: "avatar_02_world_back", presentation: "WOMAN", heightRatio: 1, labelHe: "דמות 2" },
  { id: "av_03", portraitAssetId: "avatar_03_portrait", worldAssetId: "avatar_03_world_back", presentation: "WOMAN", heightRatio: 1, labelHe: "דמות 3 · כיסוי ראש" },
  { id: "av_04", portraitAssetId: "avatar_04_portrait", worldAssetId: "avatar_04_world_back", presentation: "WOMAN", heightRatio: 1, labelHe: "דמות 4" },
  { id: "av_05", portraitAssetId: "avatar_05_portrait", worldAssetId: "avatar_05_world_back", presentation: "WOMAN", heightRatio: 1, labelHe: "דמות 5" },
  { id: "av_06", portraitAssetId: "avatar_06_portrait", worldAssetId: "avatar_06_world_back", presentation: "MAN", heightRatio: 1, labelHe: "דמות 6" },
  { id: "av_07", portraitAssetId: "avatar_07_portrait", worldAssetId: "avatar_07_world_back", presentation: "MAN", heightRatio: 1, labelHe: "דמות 7" },
  { id: "av_08", portraitAssetId: "avatar_08_portrait", worldAssetId: "avatar_08_world_back", presentation: "MAN", heightRatio: 1, labelHe: "דמות 8 · כיסוי ראש" },
  { id: "av_09", portraitAssetId: "avatar_09_portrait", worldAssetId: "avatar_09_world_back", presentation: "MAN", heightRatio: 1, labelHe: "דמות 9" },
  { id: "av_10", portraitAssetId: "avatar_10_portrait", worldAssetId: "avatar_10_world_back", presentation: "MAN", heightRatio: 1, labelHe: "דמות 10" },
  /*
   * The two animals. Shorter, and the number is the whole of what the
   * renderer needs to know about them: `Walker` multiplies the standing
   * height by it and the contact shadow, the depth scale and the gait all
   * follow from there. ChatGPT: *"הכלב והחתול יקבלו כמובן אותה לוגיקה
   * בגובה ובפרופורציה שלהם."*
   */
  { id: "av_11", portraitAssetId: "avatar_11_portrait", worldAssetId: "avatar_11_world_back", presentation: "ANIMAL", heightRatio: 0.46, labelHe: "כלב" },
  { id: "av_12", portraitAssetId: "avatar_12_portrait", worldAssetId: "avatar_12_world_back", presentation: "ANIMAL", heightRatio: 0.38, labelHe: "חתול" },
];


/** The customer's choice. `null` is a real and permanent state. */
export type AvatarChoice = string | null;

export function avatarById(id: AvatarChoice): AvatarOption | null {
  if (!id) return null;
  return AVATARS.find((a) => a.id === id) ?? null;
}

/**
 * Which figure walks the street for this customer.
 *
 * Null when they have not chosen, and null must render as NOTHING rather
 * than as a default person. Putting a stranger in the street on somebody's
 * behalf is worse than an empty pavement: they did not choose it, and they
 * will assume the app decided something about them.
 */
export function walkingAssetFor(id: AvatarChoice): string | null {
  return avatarById(id)?.worldAssetId ?? null;
}

/** Every rule this roster has to satisfy, as a test rather than as prose. */
export function avatarViolations(roster: readonly AvatarOption[] = AVATARS): string[] {
  const out: string[] = [];

  const ids = new Set<string>();
  const portraits = new Set<string>();
  const worlds = new Set<string>();
  for (const a of roster) {
    if (ids.has(a.id)) out.push(`duplicate avatar id "${a.id}"`);
    ids.add(a.id);
    // Two avatars sharing a drawing is two people who look identical in
    // the street, which defeats the point of choosing.
    if (portraits.has(a.portraitAssetId)) out.push(`"${a.portraitAssetId}" is used twice`);
    if (worlds.has(a.worldAssetId)) out.push(`"${a.worldAssetId}" is used twice`);
    portraits.add(a.portraitAssetId);
    worlds.add(a.worldAssetId);

    if (!a.labelHe.trim()) out.push(`"${a.id}" has no label`);
    // The label describes a DRAWING. An age or an origin in here would
    // become a claim about the customer the moment they picked it.
    if (/\d{2}/.test(a.labelHe.replace(/דמות \d+/, ""))) {
      out.push(`"${a.id}" label looks like it describes a person`);
    }
  }

  // One screen, twenty seconds. More than this is a catalogue and it will
  // be scrolled rather than chosen.
  if (roster.length > 12) out.push("the roster is too long to choose from in twenty seconds");
  if (roster.length < 6) out.push("the roster is too short to find yourself in");

  // Nobody should have to pick somebody who presents as another gender to
  // find a figure at all. Counted against the PEOPLE rather than against
  // the whole roster, so adding an animal can never make this fail.
  for (const p of ["WOMAN", "MAN"] as const) {
    if (roster.filter((a) => a.presentation === p).length < 3) {
      out.push(`too few options presenting as ${p}`);
    }
  }

  // The grid is people with a couple of animals in it, not a pet shop.
  const animals = roster.filter((a) => a.presentation === "ANIMAL").length;
  if (animals > roster.length / 4) out.push("the roster is mostly animals");

  for (const a of roster) {
    // A height of zero is an invisible avatar; a height above a person is
    // an animal the size of a van, and both would pass every other rule
    // here while being obviously wrong on screen.
    if (a.heightRatio <= 0) out.push(`"${a.id}" has no height`);
    if (a.heightRatio > 1) out.push(`"${a.id}" is taller than a standing person`);
    // An animal drawn at a person's height is the specific mistake this
    // field exists to prevent.
    if (a.presentation === "ANIMAL" && a.heightRatio >= 0.8) {
      out.push(`"${a.id}" is an animal drawn at human height`);
    }
    if (a.presentation !== "ANIMAL" && a.heightRatio !== 1) {
      out.push(`"${a.id}" is a person and must be a person's height`);
    }
  }

  return out;
}

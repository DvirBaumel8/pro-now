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

import type { Gait } from "./world-motion";

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
/**
 * `VEHICLE` is not a person and is not decoration.
 *
 * Amit: *"רוצה שתהיה לי אפשרות לבחור באווטארים גם כלי רכב להסתובב ולחקור
 * את העיר שלנו — משאית קטנה של פרו נאו, קטנוע של פרו נאו, משהו מיתוגי של
 * פרו נאו. חייב שהמותג לא יצא להם מהראש."*
 *
 * The presentation matters downstream because a vehicle moves
 * differently from a person: it rides rather than walks, it does not bob
 * once per stride, and it does not lean into a turn the way somebody
 * walking does. Reading it from the roster keeps those three facts in one
 * place instead of in three `if` statements at three call sites.
 */
/*
 * CREATURE: an upright character in clothes — the dog-person, the robot,
 * the dragon with a backpack. Not an ANIMAL (on four legs, knee height)
 * and not a person, so it gets its own word rather than borrowing either
 * one's rules: it walks at close to a person's height and is labelled by
 * what it is.
 */
export type AvatarPresentation = "WOMAN" | "MAN" | "UNSPECIFIED" | "ANIMAL" | "CREATURE" | "VEHICLE";

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
   * How this one moves, when it is not a pair of legs.
   *
   * The steer pad reports WALK or RUN, which is the right vocabulary for
   * a person and meaningless for a van. A ride carries its own gait and
   * the pad's is ignored for it — a scooter does not sprint, and the
   * gait table already gives a ride its own speed, its own suspension
   * chatter and no lean, so one word here changes all of that together.
   *
   * Absent for everybody who walks.
   */
  gaitHint?: Gait;
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
  /*
   * YESTERDAY'S TWELVE: FIVE PEOPLE AND SEVEN CREATURES.
   *
   * Amit asked for it in so many words — *"שיעשה אווטרים מגניבים, חיות,
   * יצורים מיוחדים... גם בני אדם אבל גם דברים מיוחדים"* — and the set was
   * drawn on 2026-09-24 in three directions each (front, side, back), eight
   * walking poses per direction. It replaced an older roster of ten people
   * and a dog and a cat, and for a day the picker kept showing the old faces
   * while the street was given the new bodies, so whatever you chose,
   * somebody else walked. The portraits are now cut from each character's
   * own front sheet (`make-portraits.mjs`), so the two cannot drift again.
   *
   * The creatures walk upright at close to a person's height — they are
   * characters in clothes with backpacks, not pets — so they share the
   * people's ruler, a touch shorter.
   */
  { id: "av_01", portraitAssetId: "avatar_01_portrait", worldAssetId: "avatar_01_world_back", presentation: "MAN", heightRatio: 1, labelHe: "דמות 1" },
  { id: "av_02", portraitAssetId: "avatar_02_portrait", worldAssetId: "avatar_02_world_back", presentation: "WOMAN", heightRatio: 1, labelHe: "דמות 2" },
  { id: "av_03", portraitAssetId: "avatar_03_portrait", worldAssetId: "avatar_03_world_back", presentation: "MAN", heightRatio: 1, labelHe: "דמות 3" },
  { id: "av_04", portraitAssetId: "avatar_04_portrait", worldAssetId: "avatar_04_world_back", presentation: "WOMAN", heightRatio: 1, labelHe: "דמות 4" },
  { id: "av_05", portraitAssetId: "avatar_05_portrait", worldAssetId: "avatar_05_world_back", presentation: "MAN", heightRatio: 1, labelHe: "דמות 5" },
  { id: "av_06", portraitAssetId: "avatar_06_portrait", worldAssetId: "avatar_06_world_back", presentation: "CREATURE", heightRatio: 0.92, labelHe: "כלב" },
  { id: "av_07", portraitAssetId: "avatar_07_portrait", worldAssetId: "avatar_07_world_back", presentation: "CREATURE", heightRatio: 0.92, labelHe: "חתול" },
  { id: "av_08", portraitAssetId: "avatar_08_portrait", worldAssetId: "avatar_08_world_back", presentation: "CREATURE", heightRatio: 0.92, labelHe: "שועל" },
  { id: "av_09", portraitAssetId: "avatar_09_portrait", worldAssetId: "avatar_09_world_back", presentation: "CREATURE", heightRatio: 0.95, labelHe: "רובוט" },
  { id: "av_10", portraitAssetId: "avatar_10_portrait", worldAssetId: "avatar_10_world_back", presentation: "CREATURE", heightRatio: 0.9, labelHe: "חייזר" },
  { id: "av_11", portraitAssetId: "avatar_11_portrait", worldAssetId: "avatar_11_world_back", presentation: "CREATURE", heightRatio: 0.95, labelHe: "דרקון" },
  { id: "av_12", portraitAssetId: "avatar_12_portrait", worldAssetId: "avatar_12_world_back", presentation: "CREATURE", heightRatio: 0.92, labelHe: "דוב" },

  /*
   * THE THREE THINGS YOU CAN RIDE, AND WHY THEY CARRY THE WORDMARK.
   *
   * *"משהו מיתוגי של פרו נאו. חייב שהמותג לא יצא להם מהראש."* Every shop
   * in this city already has PRO NOW painted over the door; these are the
   * same mark, moving. A customer who spends twenty minutes driving a
   * PRO NOW van around a street of PRO NOW shopfronts has been told what
   * this product is called without being told anything.
   *
   * The heights are multiples of a standing person, the same ruler
   * everything alive in this world is measured with (`WORLD_SIZE`): a
   * small electric van is about a third taller than the person driving
   * it, a scooter with a rider is about level with somebody standing, and
   * a kick scooter is the rider plus the deck they are on.
   *
   * The "portrait" of a ride is its side view — what it looks like on the
   * road — because a vehicle has no face and the picker is choosing a
   * thing, not a person. `_back` is what follows down the street, exactly
   * as it is for the twelve people.
   */
  { id: "av_13", portraitAssetId: "ride_van_side", worldAssetId: "ride_van_back", presentation: "VEHICLE", gaitHint: "DRIVE", heightRatio: 1.3, labelHe: "ואן PRO NOW" },
  { id: "av_14", portraitAssetId: "ride_scooter_side", worldAssetId: "ride_scooter_back", presentation: "VEHICLE", gaitHint: "RIDE", heightRatio: 1.05, labelHe: "קטנוע PRO NOW" },
  { id: "av_15", portraitAssetId: "ride_kick_side", worldAssetId: "ride_kick_back", presentation: "VEHICLE", gaitHint: "RIDE", heightRatio: 1.02, labelHe: "קורקינט PRO NOW" },
];

/** Whether this choice is something ridden rather than somebody walking. */
export function isRide(id: AvatarChoice): boolean {
  return avatarById(id)?.presentation === "VEHICLE";
}

/**
 * How this choice moves: its own gait if it has one, the steer pad's
 * otherwise.
 *
 * One function rather than a ternary at each call site, because the
 * walking screen and the strolling screen both ask and they must not
 * answer differently.
 */
export function gaitForAvatar(id: AvatarChoice, steered: Gait): Gait {
  return avatarById(id)?.gaitHint ?? steered;
}


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

/**
 * THE FACE, FOR WHEN THE FIGURE HAS NOT BEEN DRAWN YET.
 *
 * ---------------------------------------------------------------------
 * WHY THIS EXISTS AT ALL
 * ---------------------------------------------------------------------
 * `Walker` renders nothing when it has no source, which is right: an
 * invisible customer is better than a grey rectangle walking down a
 * street. But the twelve `avatar_XX_world_back` files have not been drawn,
 * and the twelve portraits have — so the shipped result was that a
 * customer picked a character, walked into the world, and there was
 * NOBODY THERE. Amit, exactly: *"עכשיו לראות איך הוא במפה זז, אני לא
 * רואה ולא מבין."* He could not see it because it was not there.
 *
 * The portrait is a head-and-shoulders bust. Standing one in the street at
 * a person's height would be a floating head, which is worse than nothing.
 * So the caller draws it as a MARKER — a ringed portrait on a pin — which
 * is a convention everybody already reads as "you are here" and which
 * nothing about it claims to be the finished figure.
 *
 * It swaps itself out: the day `avatar_XX_world_back` lands,
 * `walkingAssetFor` resolves and this is never consulted again.
 */
export function walkingFallbackFor(id: AvatarChoice): string | null {
  return avatarById(id)?.portraitAssetId ?? null;
}

/** Every rule this roster has to satisfy, as a test rather than as prose. */
/**
 * How many FIGURES the grid may hold.
 *
 * Amit's twenty seconds is about finding yourself among faces. Rides sit
 * at the end of the grid and are skipped by anybody looking for one, so
 * they are counted separately.
 */
export const PEOPLE_BUDGET = 12;

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

  /*
   * One screen, twenty seconds. More than this is a catalogue and it will
   * be scrolled rather than chosen.
   *
   * Fifteen rather than twelve, and the three that were added are the
   * reason the number moved: they are not more PEOPLE to sort through —
   * *"רוצה שתהיה לי אפשרות לבחור באווטארים גם כלי רכב"* — they are a
   * second, obviously different kind of thing at the end of the grid,
   * and the eye skips a van when it is looking for a face. The budget
   * that matters is still the one on the twelve: `PEOPLE_BUDGET`.
   */
  if (roster.length > 15) out.push("the roster is too long to choose from in twenty seconds");
  if (roster.length < 6) out.push("the roster is too short to find yourself in");
  const people = roster.filter((a) => a.presentation !== "VEHICLE").length;
  if (people > PEOPLE_BUDGET) {
    out.push("there are too many figures to choose between in twenty seconds");
  }

  /*
   * Nobody should have to pick somebody who presents as another gender to
   * find a figure at all. Counted against the PEOPLE rather than against
   * the whole roster, so adding an animal can never make this fail.
   *
   * Two, not three, since 2026-09-25: Amit chose five people and seven
   * creatures, and the creatures are the half of the grid that asks
   * nothing about who you are — a robot is a fine answer for anybody. Two
   * is still a choice rather than a token; one would be a token.
   */
  for (const p of ["WOMAN", "MAN"] as const) {
    if (roster.filter((a) => a.presentation === p).length < 2) {
      out.push(`too few options presenting as ${p}`);
    }
  }

  // Rides are an alternative to a figure, never the grid itself.
  const rides = roster.filter((a) => a.presentation === "VEHICLE").length;
  if (rides > roster.length / 3) out.push("the roster is mostly vehicles");

  // The grid is people with a couple of animals in it, not a pet shop.
  const animals = roster.filter((a) => a.presentation === "ANIMAL").length;
  if (animals > roster.length / 4) out.push("the roster is mostly animals");

  for (const a of roster) {
    // A height of zero is an invisible avatar; a height above a person is
    // an animal the size of a van, and both would pass every other rule
    // here while being obviously wrong on screen.
    if (a.heightRatio <= 0) out.push(`"${a.id}" has no height`);
    /*
     * A person taller than a person is a mistake; a VAN taller than a
     * person is a van. The cap moves for rides and stays low, because a
     * ride that towers over the shopfronts it drives past stops reading
     * as a street — the same rule the ambient traffic is held to (see
     * `VEHICLE_OF_PERSON`).
     */
    const maxHeight = a.presentation === "VEHICLE" ? 1.6 : 1;
    /* A creature stands among people: shorter by a little, never by half,
       or the dragon you picked is a toy at their knees. */
    if (a.presentation === "CREATURE" && (a.heightRatio < 0.8 || a.heightRatio > 1)) {
      out.push(`"${a.id}" is a creature drawn at the wrong height`);
    }
    if (a.heightRatio > maxHeight) out.push(`"${a.id}" is taller than it can be`);
    // An animal drawn at a person's height is the specific mistake this
    // field exists to prevent.
    if (a.presentation === "ANIMAL" && a.heightRatio >= 0.8) {
      out.push(`"${a.id}" is an animal drawn at human height`);
    }
    if (a.presentation !== "ANIMAL" && a.presentation !== "VEHICLE" && a.presentation !== "CREATURE" && a.heightRatio !== 1) {
      out.push(`"${a.id}" is a person and must be a person's height`);
    }
    // A ride that does not ride would be steered with a walking gait,
    // bobbing once per stride down the road.
    if (a.presentation === "VEHICLE" && !a.gaitHint) {
      out.push(`"${a.id}" is a vehicle with no gait of its own`);
    }
    if (a.presentation !== "VEHICLE" && a.gaitHint) {
      out.push(`"${a.id}" is a person carrying a vehicle's gait`);
    }
  }

  return out;
}

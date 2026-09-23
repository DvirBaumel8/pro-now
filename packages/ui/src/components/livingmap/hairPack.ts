import {
  DEFAULT_ANCHOR,
  type ScenePlacement,
  type WorldAssetManifest,
  type WorldAssetManifestItem,
  type WorldInteraction,
} from "@pro-now/types";

/**
 * HAIR ASSET PACK v0.1 — the manifest, ahead of the files.
 *
 * ---------------------------------------------------------------------
 * PROVISIONAL, AND SAYING SO
 * ---------------------------------------------------------------------
 * The art is being produced outside this repository. These ids and
 * filenames are the ones the pack was commissioned under; the intrinsic
 * sizes below are **expected values, not measured ones**, and every one of
 * them is replaced when the real files land. `manifestViolations` runs
 * against whatever is here, so a wrong number becomes a loud failure rather
 * than a subtly stretched building.
 *
 * Until a file exists for an id, `AssetSlot` draws a grey rectangle. That
 * is the intended state of this screen right now, and it is why the
 * composition can be reviewed today.
 *
 * ---------------------------------------------------------------------
 * WHAT IS NOT IN HERE
 * ---------------------------------------------------------------------
 * No coordinates, no business names, no POI ids — the type forbids all
 * three. An asset knows what it is; the scene knows where it is. See
 * `packages/types/src/world-assets.ts`.
 */

function asset(over: Partial<WorldAssetManifestItem> & { id: string; file: string }): WorldAssetManifestItem {
  return {
    intrinsicWidth: 1024,
    intrinsicHeight: 1024,
    anchor: { ...DEFAULT_ANCHOR },
    role: "BUILDING",
    theme: "SHARED",
    defaultWidthRatio: 0.27,
    critical: false,
    ...over,
  };
}

export const HAIR_PACK_V0: WorldAssetManifest = Object.freeze({
  /**
   * The one asset that has to carry the whole idea: remove every word from
   * the screen and this still says "barber". Neon scissors, a barber pole,
   * a striped awning, a lit window with a chair — iconography, never a
   * business name.
   */
  hair_barbershop_hero: asset({
    id: "hair_barbershop_hero",
    file: "hair_barbershop_hero.webp",
    role: "HERO_BUILDING",
    theme: "HAIR",
    defaultWidthRatio: 0.4,
    critical: true,
    /*
     * MEASURED, NOT GUESSED. `tools/design-preview/ingest-asset.mjs` trims
     * the transparent margin and reports these. The anchor is 0.5152
     * rather than 0.5 because the building is drawn in 3/4 perspective and
     * is wider at the roof than at the pavement — centring the bounding
     * box would leave it standing beside its own feet.
     */
    intrinsicWidth: 954,
    intrinsicHeight: 1089,
    anchor: { x: 0.5152, y: 1 },
  }),

  /* ------------------------------------------------------------------
     THE INSIDE OF A BUSINESS, ONE PER TRADE.

     Amit, four times: *"אני חייב להיכנס לתוך החנות ממש."* Cut from the
     open-front shops in his generated pack — the part behind the
     shutter, which is the picture "going inside" needs and the one a
     façade cannot give however far the camera pushes.

     `HERO_INTERIOR` rather than `HERO_BUILDING`: these do not stand on
     a pavement and have no ground contact, so the anchor is the middle
     of the frame and nothing tries to plant them in a street.
     ------------------------------------------------------------------ */
  /** מוסך: רכב על מגבה, צמיגים, ארון כלים */
  /*
   * A SHOP THAT IS NOT OURS.
   *
   * Amit: *"למה אין מבנה של לאסט במפה??"* — so the first sponsored
   * brand has a building in the neighbourhood like everybody else, and
   * the inside of it like everybody else.
   *
   * Registered here for one reason only: `shapeOf` needs the real
   * intrinsic size or the building is drawn into a square box and
   * floats above its own footing. Nothing about being registered makes
   * it a PRO NOW business — `sponsor-shops.ts` holds every rule that
   * keeps the two apart, and the `sponsor_` prefix is what tells them
   * apart everywhere else.
   *
   * The shopfront's anchor is 0.5: the cutout was trimmed to the
   * building's own bounding box by `knockout-white.mjs`, so its footing
   * is the middle of its base rather than off to one side the way the
   * hand-placed district plates are.
   */
  sponsor_lust_venue: asset({
    id: "sponsor_lust_venue",
    file: "sponsor_lust_venue.webp",
    role: "HERO_BUILDING",
    theme: "SHARED",
    defaultWidthRatio: 0.3,
    critical: false,
    intrinsicWidth: 1401,
    intrinsicHeight: 943,
    anchor: { x: 0.5, y: 1 },
  }),
  /** בפנים: מדפים, דלפק, ומוכרת. נחתך מתוך החזית עצמה. */
  sponsor_lust_hero: asset({
    id: "sponsor_lust_hero",
    file: "sponsor_lust_hero.webp",
    role: "HERO_BUILDING",
    theme: "SHARED",
    defaultWidthRatio: 1,
    critical: false,
    intrinsicWidth: 715,
    intrinsicHeight: 547,
    anchor: { x: 0.5, y: 0.5 },
  }),
  auto_garage_hero: asset({
    id: "auto_garage_hero",
    file: "auto_garage_hero.webp",
    role: "HERO_BUILDING",
    theme: "SHARED",
    defaultWidthRatio: 1,
    critical: false,
    intrinsicWidth: 744,
    intrinsicHeight: 554,
    anchor: { x: 0.5, y: 0.5 },
  }),
  /** מספרת חיות: שולחן טיפוח, מדפי מוצרים */
  pets_salon_hero: asset({
    id: "pets_salon_hero",
    file: "pets_salon_hero.webp",
    role: "HERO_BUILDING",
    theme: "SHARED",
    defaultWidthRatio: 1,
    critical: false,
    intrinsicWidth: 692,
    intrinsicHeight: 566,
    anchor: { x: 0.5, y: 0.5 },
  }),
  /** חנות מזגנים ומכשירי חשמל, ואן שירות */
  appliance_workshop_hero: asset({
    id: "appliance_workshop_hero",
    file: "appliance_workshop_hero.webp",
    role: "HERO_BUILDING",
    theme: "SHARED",
    defaultWidthRatio: 1,
    critical: false,
    intrinsicWidth: 677,
    intrinsicHeight: 601,
    anchor: { x: 0.5, y: 0.5 },
  }),
  /** חנות ניקיון: עגלה, ציוד, ואן */
  care_studio_hero: asset({
    id: "care_studio_hero",
    file: "care_studio_hero.webp",
    role: "HERO_BUILDING",
    theme: "SHARED",
    defaultWidthRatio: 1,
    critical: false,
    intrinsicWidth: 692,
    intrinsicHeight: 566,
    anchor: { x: 0.5, y: 0.5 },
  }),
  /** סדנת כלי עבודה: לוח כלים, שולחן, סולם */
  home_workshop_hero: asset({
    id: "home_workshop_hero",
    file: "home_workshop_hero.webp",
    role: "HERO_BUILDING",
    theme: "SHARED",
    defaultWidthRatio: 1,
    critical: false,
    intrinsicWidth: 717,
    intrinsicHeight: 567,
    anchor: { x: 0.5, y: 0.5 },
  }),

  /**
   * THE FLOOR THE WHOLE WORLD STANDS ON.
   *
   * Commissioned ahead of everything else because Amit found the defect it
   * fixes: a perfect building on empty navy still reads as a sticker. It
   * covers the full width of the world and is anchored at its centre
   * rather than its base, because it IS the base — there is nothing
   * underneath it to stand on.
   */
  /*
   * THE NEIGHBOURHOOD.
   *
   * The world Amit approved — *"אוהב את אווירת הטיול ברחובות פרו נאו"* —
   * and the one he then asked the right question about: *"זה? למרות שאין
   * פה זכר לפרו נאו?"*
   *
   * Yes. Carrying no sign is what makes it usable. Every shop in this world
   * stands for a real candidate the server returned, so a PRO NOW shopfront
   * baked into the ground would be there when three barbers are online,
   * when one is, and when none is — supply with a roof on it. It also could
   * not be tapped, and tapping a shop is how the customer opens that
   * professional's profile. So the plate is the place, and our shops arrive
   * as separate transparent files placed on top, one per person.
   *
   * The anchor is the centre, like every GROUND asset: for everything else
   * the handle is where it meets the floor, but this IS the floor.
   */
  /**
   * PRO NOW ציפורניים — a second front for the beauty trade.
   *
   * Not a new department: nails sit inside BEAUTY. It exists so that two
   * beauticians online are two different places on the street instead of
   * one building drawn twice. See `venueAssetFor`.
   */
  district_nails: asset({
    id: "district_nails",
    file: "district_nails.webp",
    role: "HERO_BUILDING",
    theme: "HAIR",
    intrinsicWidth: 1383,
    intrinsicHeight: 1006,
    anchor: { x: 0.2343, y: 1 },
    defaultWidthRatio: 0.3,
    critical: true,
  }),

  /** PRO NOW כושר — the wellness venue. */
  district_well: asset({
    id: "district_well",
    file: "district_well.webp",
    role: "HERO_BUILDING",
    intrinsicWidth: 1487,
    intrinsicHeight: 989,
    anchor: { x: 0.2787, y: 1 },
    defaultWidthRatio: 0.3,
    critical: true,
  }),

  /** PRO NOW ניקיון — the home-care venue. */
  district_care: asset({
    id: "district_care",
    file: "district_care.webp",
    role: "HERO_BUILDING",
    intrinsicWidth: 1407,
    intrinsicHeight: 990,
    anchor: { x: 0.2765, y: 1 },
    defaultWidthRatio: 0.3,
    critical: true,
  }),

  /** PRO NOW רכב — the vehicle venue. */
  district_auto: asset({
    id: "district_auto",
    file: "district_auto.webp",
    role: "HERO_BUILDING",
    intrinsicWidth: 1489,
    intrinsicHeight: 980,
    anchor: { x: 0.2649, y: 1 },
    defaultWidthRatio: 0.3,
    critical: true,
  }),

  /** PRO NOW מכשירי חשמל — the appliances venue. */
  district_appliance: asset({
    id: "district_appliance",
    file: "district_appliance.webp",
    role: "HERO_BUILDING",
    intrinsicWidth: 1419,
    intrinsicHeight: 993,
    anchor: { x: 0.2731, y: 1 },
    defaultWidthRatio: 0.3,
    critical: true,
  }),

  /** PRO NOW הובלות — the logistics venue. */
  district_move: asset({
    id: "district_move",
    file: "district_move.webp",
    role: "HERO_BUILDING",
    intrinsicWidth: 1467,
    intrinsicHeight: 1001,
    anchor: { x: 0.2958, y: 1 },
    defaultWidthRatio: 0.3,
    critical: true,
  }),

  /** PRO NOW מחשבים וסלולר — the tech venue. */
  district_tech: asset({
    id: "district_tech",
    file: "district_tech.webp",
    role: "HERO_BUILDING",
    intrinsicWidth: 1465,
    intrinsicHeight: 1002,
    anchor: { x: 0.2451, y: 1 },
    defaultWidthRatio: 0.3,
    critical: true,
  }),

  /** PRO NOW חיות — the pets venue. */
  district_pets: asset({
    id: "district_pets",
    file: "district_pets.webp",
    role: "HERO_BUILDING",
    intrinsicWidth: 1384,
    intrinsicHeight: 984,
    anchor: { x: 0.2421, y: 1 },
    defaultWidthRatio: 0.3,
    critical: true,
  }),

  /**
   * PRO NOW תיקונים — the home-repairs venue.
   *
   * Which trade a building belongs to is not decided here and never has
   * been: `WORLD_DISTRICTS` maps HOME_URGENT to the id `district_home`, so
   * a file landing under that name attaches itself to home repairs the
   * moment it exists. That is the entire reason the ids are the art
   * director's own file names — there is no table to keep in sync and no
   * step where somebody wires a shop to a trade by hand.
   */
  district_home: asset({
    id: "district_home",
    file: "district_home.webp",
    role: "HERO_BUILDING",
    intrinsicWidth: 1171,
    intrinsicHeight: 974,
    anchor: { x: 0.5337, y: 1 },
    defaultWidthRatio: 0.3,
    critical: true,
  }),

  /**
   * THE HAIR VENUE — the first of the eleven.
   *
   * Amit's goal, stated plainly: *"המטרה לבנות לכל בעל מקצוע את העסק
   * הווירטואלי שלו בטיול, לפי מקצוע."* One shopfront per trade, placed
   * once per real candidate, so three barbers online means three salons on
   * the street and none means an empty one.
   *
   * MEASURED, and the anchor is 0.71 rather than 0.5 for a reason worth
   * keeping: the building is drawn in 3/4 with a pavement plinth extending
   * to the left, so its bounding box is far wider than its footing.
   * Centring the box would stand the salon well to the side of the spot it
   * was placed on.
   */
  district_hair: asset({
    id: "district_hair",
    file: "district_hair.webp",
    role: "HERO_BUILDING",
    theme: "HAIR",
    intrinsicWidth: 1299,
    intrinsicHeight: 995,
    anchor: { x: 0.7698, y: 1 },
    defaultWidthRatio: 0.3,
    critical: true,
  }),

  /**
   * The welcome screen's plate. GROUND, because it is a floor-to-edge
   * picture rather than an object; it is never placed in the live world.
   */
  welcome_hero: asset({
    id: "welcome_hero",
    file: "welcome_hero.webp",
    role: "GROUND",
    intrinsicWidth: 947,
    intrinsicHeight: 1661,
    anchor: { x: 0.5, y: 0.5 },
    defaultWidthRatio: 1,
  }),

  world_neighbourhood: asset({
    id: "world_neighbourhood",
    file: "world_neighbourhood.webp",
    role: "GROUND",
    intrinsicWidth: 948,
    intrinsicHeight: 1659,
    anchor: { x: 0.5, y: 0.5 },
    /*
     * The plate fills the world layer exactly. `WorldViewport` already
     * draws that layer at WORLD_EXTENT times the viewport, so a ratio
     * above 1 here would scale the world twice and crop it.
     */
    defaultWidthRatio: 1,
  }),
  shared_ground_street: asset({
    id: "shared_ground_street",
    file: "shared_ground_street.webp",
    role: "GROUND",
    /*
     * Measured. The anchor is forced to the centre rather than taken from
     * the ingest script's ground-contact reading: for every other asset
     * "where it touches the floor" is the right anchor, but the ground IS
     * the floor, so its centre is the only meaningful handle.
     */
    intrinsicWidth: 1024,
    intrinsicHeight: 1536,
    anchor: { x: 0.5, y: 0.5 },
    /*
     * 1.3x the viewport on BOTH axes — the ground is sized to cover rather
     * than by its own aspect ratio, so this is a plain zoom control. It
     * leaves 30% of a screen of world spare in every direction to pan into,
     * comfortably past WORLD_GROUND.minOverhang.
     */
    defaultWidthRatio: 1.3,
  }),

  shared_residential_01: asset({
    id: "shared_residential_01",
    file: "shared_residential_01_v01.webp",
    intrinsicHeight: 1200,
    defaultWidthRatio: 0.28,
  }),

  shared_residential_02: asset({
    id: "shared_residential_02",
    file: "shared_residential_02_v01.webp",
    intrinsicHeight: 1200,
    defaultWidthRatio: 0.26,
  }),

  shared_ficus_01: asset({
    id: "shared_ficus_01",
    file: "shared_ficus_01_v01.webp",
    role: "TREE",
    defaultWidthRatio: 0.2,
  }),

  shared_scooter_01: asset({
    id: "shared_scooter_01",
    file: "shared_scooter_01_v01.webp",
    role: "VEHICLE",
    intrinsicWidth: 1024,
    intrinsicHeight: 700,
    defaultWidthRatio: 0.15,
  }),

  /**
   * The half-second tell that this is Israel and not a generic town. It
   * attaches — a roof prop with its own ground line would sort itself
   * behind the building holding it up.
   */
  shared_roof_solar_01: asset({
    id: "shared_roof_solar_01",
    file: "shared_roof_solar_01_v01.webp",
    role: "ROOF_PROP",
    intrinsicWidth: 1024,
    intrinsicHeight: 620,
    anchor: { x: 0.5, y: 0.5 },
    defaultWidthRatio: 0.11,
  }),

  /* ===================================================================
   * THE PEOPLE, AND THE THINGS THEY ARRIVE IN
   * ===================================================================
   * Twenty-six files, cut from one contact sheet that arrived with real
   * alpha. Three kinds, and the difference between them is what they are
   * FOR rather than how they were drawn:
   *
   *   `_world`  — full-length, standing on their own feet, for the doorway
   *               of their trade's shop. Until these existed, "פנוי עכשיו"
   *               was a line of text over an empty building.
   *   `_icon`   — head and shoulders, for the category tiles on the home
   *               screen, which were typographic and which Amit called
   *               dead.
   *   movers    — the scooter, the van, the tow truck and the dog walker:
   *               what actually travels the lane on the tracking screen,
   *               which until now had a route and a camera and nobody on
   *               it.
   *
   * WHAT THESE ARE NOT. A character is a picture of a TRADE, not of a
   * person the server returned. Nobody's face, name or rating is in this
   * file. The one standing in the hair shop's doorway stands there
   * whenever somebody is online for hair, and is not there when nobody is
   * — which is the only claim the art is allowed to make.
   *
   * The anchors were MEASURED, not chosen: the horizontal centre of the
   * bottom band of solid pixels, so a figure stands on both feet. Taking
   * the single lowest row instead anchors a walking person on one shoe and
   * leans them into the road.
   */

  /** תיקונים בבית — the professional who stands in that doorway. */
  character_home_world: asset({
    id: "character_home_world",
    file: "character_home_world.webp",
    role: "CHARACTER",
    intrinsicWidth: 132,
    intrinsicHeight: 378,
    anchor: { x: 0.4848, y: 1 },
    defaultWidthRatio: 0.09,
  }),

  /** מכשירי חשמל — the professional who stands in that doorway. */
  character_appliance_world: asset({
    id: "character_appliance_world",
    file: "character_appliance_world.webp",
    role: "CHARACTER",
    intrinsicWidth: 135,
    intrinsicHeight: 360,
    anchor: { x: 0.4407, y: 1 },
    defaultWidthRatio: 0.09,
  }),

  /** ניקיון — the professional who stands in that doorway. */
  character_care_world: asset({
    id: "character_care_world",
    file: "character_care_world.webp",
    role: "CHARACTER",
    intrinsicWidth: 125,
    intrinsicHeight: 353,
    anchor: { x: 0.448, y: 1 },
    defaultWidthRatio: 0.09,
  }),

  /** שיער — the professional who stands in that doorway. */
  character_hair_world: asset({
    id: "character_hair_world",
    file: "character_hair_world.webp",
    role: "CHARACTER",
    intrinsicWidth: 122,
    intrinsicHeight: 367,
    anchor: { x: 0.5205, y: 1 },
    defaultWidthRatio: 0.09,
  }),

  /** בריאות וכושר — the professional who stands in that doorway. */
  character_well_world: asset({
    id: "character_well_world",
    file: "character_well_world.webp",
    role: "CHARACTER",
    intrinsicWidth: 81,
    intrinsicHeight: 361,
    anchor: { x: 0.4691, y: 1 },
    defaultWidthRatio: 0.09,
  }),

  /** חיות — the professional who stands in that doorway. */
  character_pets_world: asset({
    id: "character_pets_world",
    file: "character_pets_world.webp",
    role: "CHARACTER",
    intrinsicWidth: 176,
    intrinsicHeight: 361,
    anchor: { x: 0.4915, y: 1 },
    defaultWidthRatio: 0.09,
  }),

  /** רכב — the professional who stands in that doorway. */
  character_auto_world: asset({
    id: "character_auto_world",
    file: "character_auto_world.webp",
    role: "CHARACTER",
    intrinsicWidth: 123,
    intrinsicHeight: 365,
    anchor: { x: 0.4959, y: 1 },
    defaultWidthRatio: 0.09,
  }),

  /** הובלות — the professional who stands in that doorway. */
  character_move_world: asset({
    id: "character_move_world",
    file: "character_move_world.webp",
    role: "CHARACTER",
    intrinsicWidth: 146,
    intrinsicHeight: 370,
    anchor: { x: 0.4521, y: 1 },
    defaultWidthRatio: 0.09,
  }),

  /** מחשבים וסלולר — the professional who stands in that doorway. */
  character_tech_world: asset({
    id: "character_tech_world",
    file: "character_tech_world.webp",
    role: "CHARACTER",
    intrinsicWidth: 126,
    intrinsicHeight: 363,
    anchor: { x: 0.4484, y: 1 },
    defaultWidthRatio: 0.09,
  }),

  /** עזרה כללית — the professional who stands in that doorway. */
  character_help_world: asset({
    id: "character_help_world",
    file: "character_help_world.webp",
    role: "CHARACTER",
    intrinsicWidth: 129,
    intrinsicHeight: 360,
    anchor: { x: 0.5271, y: 1 },
    defaultWidthRatio: 0.09,
  }),

  /** בנייה ושיפוצים — the professional who stands in that doorway. */
  character_build_world: asset({
    id: "character_build_world",
    file: "character_build_world.webp",
    role: "CHARACTER",
    intrinsicWidth: 140,
    intrinsicHeight: 369,
    anchor: { x: 0.45, y: 1 },
    defaultWidthRatio: 0.09,
  }),

  /** תיקונים בבית — the portrait on the category tile. */
  character_home_icon: asset({
    id: "character_home_icon",
    file: "character_home_icon.webp",
    role: "CHARACTER",
    intrinsicWidth: 137,
    intrinsicHeight: 202,
    anchor: { x: 0.4927, y: 1 },
    defaultWidthRatio: 0.16,
  }),

  /** מכשירי חשמל — the portrait on the category tile. */
  character_appliance_icon: asset({
    id: "character_appliance_icon",
    file: "character_appliance_icon.webp",
    role: "CHARACTER",
    intrinsicWidth: 137,
    intrinsicHeight: 195,
    anchor: { x: 0.5036, y: 1 },
    defaultWidthRatio: 0.16,
  }),

  /** ניקיון — the portrait on the category tile. */
  character_care_icon: asset({
    id: "character_care_icon",
    file: "character_care_icon.webp",
    role: "CHARACTER",
    intrinsicWidth: 130,
    intrinsicHeight: 194,
    anchor: { x: 0.5192, y: 1 },
    defaultWidthRatio: 0.16,
  }),

  /** שיער — the portrait on the category tile. */
  character_hair_icon: asset({
    id: "character_hair_icon",
    file: "character_hair_icon.webp",
    role: "CHARACTER",
    intrinsicWidth: 136,
    intrinsicHeight: 200,
    anchor: { x: 0.5184, y: 1 },
    defaultWidthRatio: 0.16,
  }),

  /** בריאות וכושר — the portrait on the category tile. */
  character_well_icon: asset({
    id: "character_well_icon",
    file: "character_well_icon.webp",
    role: "CHARACTER",
    intrinsicWidth: 140,
    intrinsicHeight: 202,
    anchor: { x: 0.5, y: 1 },
    defaultWidthRatio: 0.16,
  }),

  /** חיות — the portrait on the category tile. */
  character_pets_icon: asset({
    id: "character_pets_icon",
    file: "character_pets_icon.webp",
    role: "CHARACTER",
    intrinsicWidth: 132,
    intrinsicHeight: 202,
    anchor: { x: 0.4962, y: 1 },
    defaultWidthRatio: 0.16,
  }),

  /** רכב — the portrait on the category tile. */
  character_auto_icon: asset({
    id: "character_auto_icon",
    file: "character_auto_icon.webp",
    role: "CHARACTER",
    intrinsicWidth: 138,
    intrinsicHeight: 203,
    anchor: { x: 0.5, y: 1 },
    defaultWidthRatio: 0.16,
  }),

  /** הובלות — the portrait on the category tile. */
  character_move_icon: asset({
    id: "character_move_icon",
    file: "character_move_icon.webp",
    role: "CHARACTER",
    intrinsicWidth: 158,
    intrinsicHeight: 203,
    anchor: { x: 0.4842, y: 1 },
    defaultWidthRatio: 0.16,
  }),

  /** מחשבים וסלולר — the portrait on the category tile. */
  character_tech_icon: asset({
    id: "character_tech_icon",
    file: "character_tech_icon.webp",
    role: "CHARACTER",
    intrinsicWidth: 136,
    intrinsicHeight: 196,
    anchor: { x: 0.5, y: 1 },
    defaultWidthRatio: 0.16,
  }),

  /** עזרה כללית — the portrait on the category tile. */
  character_help_icon: asset({
    id: "character_help_icon",
    file: "character_help_icon.webp",
    role: "CHARACTER",
    intrinsicWidth: 124,
    intrinsicHeight: 202,
    anchor: { x: 0.5161, y: 1 },
    defaultWidthRatio: 0.16,
  }),

  /** בנייה ושיפוצים — the portrait on the category tile. */
  character_build_icon: asset({
    id: "character_build_icon",
    file: "character_build_icon.webp",
    role: "CHARACTER",
    intrinsicWidth: 133,
    intrinsicHeight: 202,
    anchor: { x: 0.4962, y: 1 },
    defaultWidthRatio: 0.16,
  }),

  /** שליחויות ומשלוחים — הקטנוע שנוסע אליך. */
  courier_scooter: asset({
    id: "courier_scooter",
    file: "courier_scooter.webp",
    role: "VEHICLE",
    intrinsicWidth: 255,
    intrinsicHeight: 197,
    anchor: { x: 0.5196, y: 1 },
    defaultWidthRatio: 0.22,
  }),

  /** הובלות — המשאית שיוצאת לדרך. */
  moving_van: asset({
    id: "moving_van",
    file: "moving_van.webp",
    role: "VEHICLE",
    intrinsicWidth: 418,
    intrinsicHeight: 195,
    anchor: { x: 0.4713, y: 1 },
    defaultWidthRatio: 0.22,
  }),

  /** גרר — הרכב שמגיע לרכב שלך. */
  tow_truck: asset({
    id: "tow_truck",
    file: "tow_truck.webp",
    role: "VEHICLE",
    intrinsicWidth: 496,
    intrinsicHeight: 184,
    anchor: { x: 0.4355, y: 1 },
    defaultWidthRatio: 0.22,
  }),

  /** חיות — המטפל שמגיע אל הכלב. */
  dog_walker: asset({
    id: "dog_walker",
    file: "dog_walker.webp",
    role: "CHARACTER",
    intrinsicWidth: 264,
    intrinsicHeight: 197,
    anchor: { x: 0.5, y: 1 },
    defaultWidthRatio: 0.14,
  }),
});

/**
 * THE THREE INTERACTIONS BUILT FIRST.
 *
 * ChatGPT named exactly these, and the reason they are the first three is
 * that each proves something different about whether the world is alive:
 * that it reacts, that a building has an inside, and that something can
 * move through the scene. *"אם שלושת הדברים האלה מרגישים כמו עולם שרוצים
 * לחקור, ממשיכים. אם הם מרגישים כמו שלושה כפתורים בתחפושת — עוצרים
 * ומשנים."*
 *
 * There are three. Not seven, and not one per object — a street where
 * everything is tappable is a board of buttons wearing a city.
 */
const HAIR_INTERACTIONS = {
  tree: {
    type: "TAP",
    animation: "RUSTLE",
    discoveryId: "hair-tree-pigeons",
    labelHe: "לגעת בעץ",
  },
  shop: {
    type: "TAP",
    animation: "OPEN_SHUTTER",
    discoveryId: "hair-shop-shutter",
    labelHe: "לפתוח את התריס של המספרה",
  },
  scooter: {
    type: "TAP",
    animation: "DRIVE_BY",
    discoveryId: "hair-scooter-ride",
    labelHe: "להסיע את הקטנוע",
  },
} as const satisfies Record<string, WorldInteraction>;

/**
 * ONE STREET, NOT THREE ISLANDS.
 *
 * The buildings are set on a shallow arc rather than a line — the hero
 * slightly forward and centre, its neighbours further back and to the
 * sides — because a row of façades at identical depth reads as a cardboard
 * cut-out. Trees and the scooter sit forward of everything, which is what
 * produces foreground, midground and background from placement alone. That
 * separation was the sixth thing missing from the rejected version.
 *
 * Nothing here is a coordinate. `x` and `y` are fractions of the world box,
 * so the same composition holds on any screen.
 */
export const HAIR_SCENE: readonly ScenePlacement[] = Object.freeze([
  /*
   * THE PLATE IS THE NEIGHBOURHOOD.
   *
   * The ground arrived as a full portrait street — road down the middle,
   * pavements and residential blocks on both sides, kiosk, jacaranda,
   * solar heaters, AC units. That is more than infrastructure, and it
   * changes what goes on top of it: the separate residential blocks and
   * street trees that used to be placed here would now sit on top of
   * buildings that are already drawn.
   *
   * So the composition inverts. The plate carries the neighbourhood, and
   * the layer above it carries only what has to be separate: the hero the
   * request summoned, the things that answer when touched, and the
   * professional on the way.
   */
  /*
   * The neighbourhood, replacing the single street plate. The street one
   * stays registered so an older build still renders, but nothing places
   * it any more: it was one road seen end to end, which is the shape Amit
   * rejected twice.
   */
  { key: "ground", assetId: "world_neighbourhood", x: 0.5, y: 0.5 },

  /*
   * NO SEPARATE BARBERSHOP. The plate already contains one — neon
   * scissors, striped awning, barber pole, lit window — so placing the
   * standalone hero on top would put two barbershops on one street.
   *
   * That is not a loss. It is the plate proving the point: the world
   * already says "barber" with the text switched off, which was the
   * acceptance test. The standalone asset stays in the manifest for the
   * day the world is a real map and the shop has to be placed rather than
   * drawn in.
   */
  // Parked at the near kerb, in front of the lane.
  { key: "scooter", assetId: "shared_scooter_01", x: 0.7, y: 0.96, interaction: HAIR_INTERACTIONS.scooter },
]);

/** Everything the neighbourhood is hiding, for the counter to total. */
export const HAIR_DISCOVERY_IDS: readonly string[] = Object.freeze(
  HAIR_SCENE.filter((p) => p.interaction).map((p) => p.interaction!.discoveryId)
);

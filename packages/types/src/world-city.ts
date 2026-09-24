/**
 * THE ART THE 3D STREET DRAWS.
 *
 * ---------------------------------------------------------------------
 * WHY THIS LIST LIVES IN `types` AND NOT IN THE RENDERER
 * ---------------------------------------------------------------------
 * There are two consumers of the art pack now. The painted living map
 * in `packages/ui` asks for its assets through the world manifest, and
 * `art-delivery.test.ts` checks that every delivered file is asked for
 * by SOMEBODY — a file ingested under the wrong name is invisible, and
 * that test is the only thing that has ever caught it.
 *
 * The 3D street is the second consumer and it lives in
 * `tools/design-preview`, which the test cannot see and `packages/ui`
 * must never import. So the street's vocabulary is declared here, in
 * the package that already owns the world's nouns, and both read it:
 * the renderer to know what to load, the test to know what is spoken
 * for.
 *
 * The guard keeps its teeth. An id listed here and drawn by nothing is
 * still a lie — it has simply moved from "nobody noticed" to "somebody
 * wrote it down", which is where a claim can be checked.
 */

/** Ordinary buildings, as flat orthographic elevations. */
export const CITY_BUILDING_IDS = [
  "bld_arch",
  "bld_balconies",
  "bld_cafe",
  "bld_flowers",
  "bld_modern",
  "bld_shutter",
  /*
   * `park_dogs` IS NOT A PARK, WHATEVER IT IS CALLED.
   *
   * It was asked for as a dog park — grass, a fence, somewhere a dog
   * walker meets you — and what arrived is a two-storey Mediterranean
   * shopfront with balconies above it, a PRO NOW fascia, and a grooming
   * table with a dog on it in the window. A lovely drawing of a
   * different thing.
   *
   * It mattered more than a wrong picture usually does, because the
   * place it was standing at says "אין כאן חנות — המקצוען מגיע אליכם",
   * and a shopfront is exactly the claim that sentence exists to deny.
   * So it is scenery now, in the pool the ordinary bays draw from,
   * where it is what it is: a shop in a street full of them. The dog
   * park is built out of props until a drawing of a park arrives.
   */
  "park_dogs",
] as const;

/** Seamless, de-shaded materials: the ground and the walls. */
export const CITY_MATERIAL_IDS = [
  "mat_paving",
  "mat_road",
  "mat_plaster_warm",
  "mat_plaster_cool",
  "mat_stone",
  "mat_kerb",
] as const;

/** Cut-outs that stand up on the pavement. */
export const CITY_PROP_IDS = [
  "prop_palm",
  "prop_jacaranda",
  "prop_planter_round",
  "prop_planter_box",
  "prop_bench",
  "prop_bin",
  "prop_lamp",
  "prop_cafe_set",
] as const;

/**
 * PLACES, WHICH ARE NOT SHOPS.
 *
 * Amit: *"אין לו חנות, צריך לחשוב על דרך אחרת לפגוש אותו."*
 *
 * Almost every service in this catalogue is *עד הבית* — the
 * professional comes to you — and for a dog walker, a courier or a tow
 * truck a SHOPFRONT is a lie: there are no premises to walk into. But
 * there is a place. A dog walker meets you at the park.
 *
 * These are scenery and they claim nothing: no availability, no ETA,
 * nobody waiting inside.
 *
 * Each of these four files holds its place on top and a row of spare
 * props underneath — a van, a lamp, traffic cones — so the street crops
 * to the top band rather than hanging a van under a park bench. See
 * `topBand` in the street.
 */
export const CITY_PLACE_IDS = [
  "place_roadside",
  "place_pickup",
  "place_garden",
  "place_bench_stop",
] as const;

/**
 * Vehicles, drawn parked at the kerb.
 *
 * A broadside drawing on a road that runs away from the camera is
 * side-on to its own direction of travel for the whole journey — the
 * mismatch that made the old painted traffic look wrong, and which no
 * transform repairs. So `van_side` and `scooter_side` are PARKED at the
 * kerb, where side-on is exactly what you see.
 *
 * `van_back` is the other half of the same argument and it moves: a
 * rear view is what a vehicle driving away from you looks like, so the
 * PRO NOW vans in the receding lane are that drawing. Only traffic
 * coming towards the camera is still geometry, because there is no
 * front view in the pack and a brand rendered out of boxes says
 * something worse about the brand than no brand at all.
 */
export const CITY_VEHICLE_IDS = [
  "van_side",
  "van_back",
  "scooter_side",
  "scooter_back",
] as const;

/**
 * The passers-by, each a back-view walk cycle.
 *
 * Amit: *"חוץ מהדמות שלי הכל נראה מלפני מאה שנה."* The street used to
 * put blocky geometry figures on the pavement, on the honest ground
 * that the only walk cycle in the project was the customer's own
 * character and a crowd wearing your face is worse than a silhouette.
 * These are that argument's answer: three strangers and a dog.
 *
 * They are ambience and nothing else — nobody here is a professional,
 * nobody is named, and none of them says anything about who is
 * available.
 *
 * The sheets are NOT evenly spaced strips and the engine measures each
 * one rather than dividing it; `walk_dogwalker` is the exception and is
 * the one that is even, because a pose there is a person and a dog with
 * a gap between them. See `cycle()` in the street.
 */
export const CITY_WALKER_IDS = [
  "walk_man",
  "walk_woman",
  "walk_dogwalker",
  "walk_dog",
] as const;

/** One shopfront and one interior per trade, as flat elevations. */
export const CITY_SHOP_IDS = [
  "shop_hair",
  "shop_pets",
  "shop_home",
  "shop_tech",
  "shop_auto",
  "shop_well",
  "shop_appliance",
  "shop_care",
  "shop_nails",
  "shop_move",
  "shop_build",
  "shop_help",
  "shop_vet",
  /* The sponsor's own front, redrawn flat like the rest. It keeps
     its own identity — burgundy and glass where ours are plaster and
     balconies — because a shop somebody paid for must not be mistaken
     for one of ours. */
  "shop_lust",
  "shop_tech_inside",
  "shop_well_inside",
  "shop_move_inside",
  "shop_nails_inside",
  "shop_build_inside",
  "shop_help_inside",
] as const;

/** The twelve characters, each an eight-frame walk sheet from behind. */
export const CITY_AVATAR_SHEET_IDS = Array.from(
  { length: 12 },
  (_, i) => `avatar_${String(i + 1).padStart(2, "0")}_back`
);

/** Everything the 3D street will load if it has been delivered. */
export const CITY_ASSET_IDS: readonly string[] = [
  ...CITY_BUILDING_IDS,
  ...CITY_MATERIAL_IDS,
  ...CITY_PROP_IDS,
  ...CITY_PLACE_IDS,
  ...CITY_VEHICLE_IDS,
  ...CITY_WALKER_IDS,
  ...CITY_SHOP_IDS,
  ...CITY_AVATAR_SHEET_IDS,
];

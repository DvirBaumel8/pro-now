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
 */
export const CITY_PLACE_IDS = [
  "park_dogs",
  "place_roadside",
  "place_pickup",
  "place_garden",
  "place_bench_stop",
] as const;

/**
 * Vehicles, drawn parked at the kerb.
 *
 * The moving traffic stays geometry. A broadside drawing on a road
 * that runs away from the camera is side-on to its own direction of
 * travel for the whole journey — the mismatch that made the old
 * painted traffic look wrong, and which no transform repairs. A van at
 * the kerb, though, is seen side-on, which is exactly what the drawing
 * is.
 */
export const CITY_VEHICLE_IDS = [
  "van_side",
  "van_back",
  "scooter_side",
  "scooter_back",
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
  ...CITY_SHOP_IDS,
  ...CITY_AVATAR_SHEET_IDS,
];

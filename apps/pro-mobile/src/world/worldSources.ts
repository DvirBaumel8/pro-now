import type { WorldAssetSources } from "@pro-now/ui";

/**
 * THE CITY, AS THE PROFESSIONAL'S APP CARRIES IT.
 *
 * ---------------------------------------------------------------------
 * ONE FILE, AND THAT IS DELIBERATE
 * ---------------------------------------------------------------------
 * The customer's app carries the whole pack — eleven shopfronts, eleven
 * people, twelve portraits, four travellers and twelve walking figures,
 * about eight megabytes — because the customer's journey happens INSIDE
 * the world: they choose a character, walk the street, arrive at a shop.
 *
 * The professional's shift screen does not. It needs somewhere to BE
 * while it says "not on shift" and "on shift", and what it had was an
 * abstract grey grid — an honest placeholder for a maps vendor that has
 * not been chosen (/CLAUDE.md §4), and the only screen in the product
 * that does not happen anywhere. A professional opening this app saw a
 * wireframe; their customer, on the same street, saw a city.
 *
 * So it carries the plate and nothing else. `DistrictLayer` draws nothing
 * for a district whose art is missing — *"לא רוצה לראות את הריבועים
 * הריקים"* — and `WorldLife` skips a moment whose asset is absent, so a
 * pack of one file is a complete and correct world: the city as painted,
 * with no PRO NOW shopfronts standing in it. Half a megabyte rather than
 * eight, for a screen that wants a place rather than a cast.
 *
 * Metro resolves `require` at BUILD time, so the path is a literal. See
 * the customer app's copy of this file for what that costs when it is
 * not.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
export const worldSources: WorldAssetSources = {
  world_neighbourhood: require("../../assets/world/world_neighbourhood.webp"),
  /*
   * AND THE REST OF THE GROUND.
   *
   * The plate used to BE the ground, so one line was the whole file. It
   * is three layers now: the painted city in the blocks, the stone the
   * real road corridor is laid in, and the grass a closed road becomes.
   * Shipping only the first gives the professional a city whose streets
   * have no pavement in them — the same two-worlds problem this file's
   * own comment warns about, one layer down.
   *
   * Still no shopfronts and no avatars. The shift screen wants somewhere
   * to BE, not a cast.
   */
  world_ground_mat_1: require("../../assets/world/world_ground_mat_1.webp"),
  world_ground_mat_2: require("../../assets/world/world_ground_mat_2.webp"),
  world_ground_mat_3: require("../../assets/world/world_ground_mat_3.webp"),
  world_ground_mat_4: require("../../assets/world/world_ground_mat_4.webp"),
  world_ground_grass: require("../../assets/world/world_ground_grass.webp"),
};

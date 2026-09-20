import type { WorldAssetSources } from "@pro-now/ui";

/**
 * THE ART THAT HAS ACTUALLY ARRIVED.
 *
 * One line per delivered asset, and nothing else. An id that is not in here
 * renders as `AssetSlot`'s grey rectangle, which is the correct and
 * deliberately ugly picture of "commissioned, not delivered" — it proves
 * the placement, the scale and the depth order while making it impossible
 * to mistake the state of the world for finished.
 *
 * Files live in `public/world/` and are served from the site root, so the
 * same paths work in the dev server and in the published build.
 *
 * Adding one is two steps and no code:
 *
 *   node tools/design-preview/ingest-asset.mjs <file.png> <assetId>
 *   add the line below, paste the measured manifest entry into hairPack.ts
 */
export const worldSources: WorldAssetSources = {
  /*
   * THE NEIGHBOURHOOD, AND WHY IT CARRIES NO PRO NOW SIGN.
   *
   * Amit, sending it: *"זה? למרות שאין פה זכר לפרו נאו?"* Yes — and its
   * absence is the reason it is correct rather than a thing to fix.
   *
   * A shop in this world stands for a real candidate the server returned.
   * If PRO NOW שיער were painted into the ground plate it would be there
   * when three barbers are online, when one is, and when none is — a shop
   * that exists whether or not anybody is behind it, which is invented
   * supply with a roof on it. It also could not be tapped, and tapping a
   * shop is now how you open that professional's profile.
   *
   * So the ground is the place: roads, pavements, trees, street furniture,
   * ordinary buildings. Our shops arrive as separate files with transparent
   * backgrounds and are placed on top, one per candidate.
   */
  world_neighbourhood: { uri: "world/world_neighbourhood.webp" },
  /*
   * THE FIRST SCREEN'S OWN PLATE, WITH OUR SHOPS PAINTED IN.
   *
   * Legitimate here and nowhere else: the welcome screen runs no search,
   * has no candidates and claims nothing about supply. It is a picture of
   * the world PRO NOW happens in, and it has to say what the product is
   * before anybody reads a word. In the LIVE map the same painted shops
   * would be businesses that exist whether or not anyone is online.
   */
  welcome_hero: { uri: "world/welcome_hero.webp" },
  /*
   * The first real venue. Amit: *"המטרה לבנות לכל בעל מקצוע את העסק
   * הווירטואלי שלו בטיול, לפי מקצוע."* This is that, for hair — one file,
   * transparent, placed once per candidate the server returns.
   */
  district_hair: { uri: "world/district_hair.webp" },
  district_home: { uri: "world/district_home.webp" },
  district_pets: { uri: "world/district_pets.webp" },
  district_nails: { uri: "world/district_nails.webp" },
  district_well: { uri: "world/district_well.webp" },
  district_care: { uri: "world/district_care.webp" },
  district_auto: { uri: "world/district_auto.webp" },
  district_appliance: { uri: "world/district_appliance.webp" },
  district_move: { uri: "world/district_move.webp" },
  district_tech: { uri: "world/district_tech.webp" },
  shared_ground_street: { uri: "world/shared_ground_street.webp" },
  hair_barbershop_hero: { uri: "world/hair_barbershop_hero.webp" },

  /*
   * THE PEOPLE. Delivered as one sheet with real alpha and cut on its own
   * transparent columns, so no edge was guessed. `_world` stands in a
   * shop doorway, `_icon` sits on a category tile, and the last four are
   * what travels the lane while somebody is on the way to you.
   */
  character_home_world: { uri: "world/character_home_world.webp" },
  character_appliance_world: { uri: "world/character_appliance_world.webp" },
  character_care_world: { uri: "world/character_care_world.webp" },
  character_hair_world: { uri: "world/character_hair_world.webp" },
  character_well_world: { uri: "world/character_well_world.webp" },
  character_pets_world: { uri: "world/character_pets_world.webp" },
  character_auto_world: { uri: "world/character_auto_world.webp" },
  character_move_world: { uri: "world/character_move_world.webp" },
  character_tech_world: { uri: "world/character_tech_world.webp" },
  character_help_world: { uri: "world/character_help_world.webp" },
  character_build_world: { uri: "world/character_build_world.webp" },
  character_home_icon: { uri: "world/character_home_icon.webp" },
  character_appliance_icon: { uri: "world/character_appliance_icon.webp" },
  character_care_icon: { uri: "world/character_care_icon.webp" },
  character_hair_icon: { uri: "world/character_hair_icon.webp" },
  character_well_icon: { uri: "world/character_well_icon.webp" },
  character_pets_icon: { uri: "world/character_pets_icon.webp" },
  character_auto_icon: { uri: "world/character_auto_icon.webp" },
  character_move_icon: { uri: "world/character_move_icon.webp" },
  character_tech_icon: { uri: "world/character_tech_icon.webp" },
  character_help_icon: { uri: "world/character_help_icon.webp" },
  character_build_icon: { uri: "world/character_build_icon.webp" },
  courier_scooter: { uri: "world/courier_scooter.webp" },
  moving_van: { uri: "world/moving_van.webp" },
  tow_truck: { uri: "world/tow_truck.webp" },
  dog_walker: { uri: "world/dog_walker.webp" },

  /*
   * THE TWELVE FACES — ten people, a dog and a cat.
   *
   * Amit's reaction to the sheet was the shortest review in this project
   * so far: *"את זה ממש אהבתי!!!!!!!!!!!!"*
   *
   * Cut from one 4x3 sheet with real alpha and mapped onto the roster by
   * WHO each one is rather than by where they sat on the sheet — the
   * roster is five women, five men and two animals, and the sheet is in
   * neither order. The coloured rim the generator left at the soft edges
   * was replaced with the nearest opaque colour before the cut; on a dark
   * screen it read as an outline around every face.
   *
   * They are a deliberately different register from the world: brighter,
   * rounder, more of a game. That was settled rather than tolerated — the
   * avatar is the one thing on screen that is NOT part of the world, it
   * is the person looking at it. The figure that walks the street has no
   * such freedom and obeys the same horizon, ground plane and light as
   * everything else.
   */
  avatar_01_portrait: { uri: "world/avatar_01_portrait.webp" },
  avatar_02_portrait: { uri: "world/avatar_02_portrait.webp" },
  avatar_03_portrait: { uri: "world/avatar_03_portrait.webp" },
  avatar_04_portrait: { uri: "world/avatar_04_portrait.webp" },
  avatar_05_portrait: { uri: "world/avatar_05_portrait.webp" },
  avatar_06_portrait: { uri: "world/avatar_06_portrait.webp" },
  avatar_07_portrait: { uri: "world/avatar_07_portrait.webp" },
  avatar_08_portrait: { uri: "world/avatar_08_portrait.webp" },
  avatar_09_portrait: { uri: "world/avatar_09_portrait.webp" },
  avatar_10_portrait: { uri: "world/avatar_10_portrait.webp" },
  avatar_11_portrait: { uri: "world/avatar_11_portrait.webp" },
  avatar_12_portrait: { uri: "world/avatar_12_portrait.webp" },
};

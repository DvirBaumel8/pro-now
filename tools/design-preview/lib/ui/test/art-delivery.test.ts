import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import path from "node:path";

import {
  CITY_ASSET_IDS,
  AVATARS,
  GROUND_GRASS_ID,
  GROUND_MATERIAL_IDS,
  WORLD_DISTRICTS,
  type DepartmentCode,
  ROAD_PLATE_ASSET_ID,
  walkCycleAssets,
} from "@pro-now/demo-types";

/**
 * WHAT THE WORLD ASKS FOR, AND WHAT HAS ARRIVED.
 *
 * ---------------------------------------------------------------------
 * WHY THIS IS A TEST AND NOT A CHECKLIST
 * ---------------------------------------------------------------------
 * The art is drawn outside this repository and arrives a file at a time
 * over days. Every id the world names but does not have draws nothing —
 * which is the correct behaviour and also completely silent. A shopfront
 * that never arrived and a shopfront whose file was ingested under the
 * wrong name look identical from the code: an empty space.
 *
 * So the folder is read and compared to what the types ask for. This does
 * NOT fail when art is missing — most of it legitimately is, and a test
 * that goes red because a drawing has not been made yet is a test people
 * start ignoring. It fails on the two things that are always mistakes:
 *
 *   an asset the world asks for TWICE under different names, and
 *   a file in the folder that nothing will ever draw.
 *
 * The second is the one that catches the real error. A file ingested as
 * `district_hairdresser` when the world wants `district_hair` passes
 * every other check in the project — it is a valid webp, it is in both
 * source lists, it bundles — and the street simply has a gap where the
 * salon should be. Here it shows up as a file nobody asks for.
 */

const WORLD_DIR = path.resolve(__dirname, "../../../public/world");

/** Every id the world will try to draw. */
function requestedIds(): Set<string> {
  const ids = new Set<string>();
  for (const code of Object.keys(WORLD_DISTRICTS) as DepartmentCode[]) {
    const d = WORLD_DISTRICTS[code];
    ids.add(d.venueAssetId);
    ids.add(d.characterWorldAssetId);
    ids.add(d.characterPortraitAssetId);
    /*
     * THE VARIANTS, WHICH THIS TEST MISSED ON ITS FIRST RUN.
     *
     * A district can hold several shopfronts so that two salons on one
     * street are not the same drawing twice — Amit: *"שכל אחת תהיה מובדלת
     * מהשניה בעיצוב אחר."* Leaving them out meant `district_nails` looked
     * like a delivered file nobody drew, and I nearly deleted it. It is
     * BEAUTY's second salon.
     *
     * Which is the test being wrong in exactly the way it exists to
     * catch: an asset the world genuinely asks for, invisible to the
     * check that asks what the world wants.
     */
    for (const variant of d.venueVariantAssetIds ?? []) ids.add(variant);
    /*
     * AND THE INSIDE OF THE BUSINESS.
     *
     * The same omission as the variants above, one field along: five
     * interiors arrived, every one was drawn by the threshold beat, and
     * this reported all five as files nobody would ever use. A check
     * that asks "what does the world want" has to read every field the
     * world reads.
     */
    if (d.venueInteriorAssetId) ids.add(d.venueInteriorAssetId);
  }
  for (const a of AVATARS) {
    ids.add(a.portraitAssetId);
    ids.add(a.worldAssetId);
  }
  /*
   * THE GROUND, BY NAME RATHER THAN BY LITERAL.
   *
   * This said `"world_neighbourhood"`. The day the street became three
   * plates and the ground became `world_neighbourhood_xl`, the check
   * reported the new plate — the largest and most important file in the
   * pack, the one the whole world stands on — as art nobody draws.
   *
   * `ROAD_PLATE_ASSET_ID` is what the world actually reads, so it is
   * what this asks for. A check that names a constant by copying its
   * value is a check that goes stale the first time the value moves.
   */
  ids.add(ROAD_PLATE_ASSET_ID);
  /*
   * THE DRAWN WALK CYCLE.
   *
   * Sixteen poses of one character, played by `Walker` from whatever is
   * in the pack. Asked for by the same function the renderer uses, so
   * the list cannot drift from what is actually drawn.
   */
  for (const id of walkCycleAssets("amit")) ids.add(id);
  /*
   * And the ground as a MATERIAL, which is a different thing from the
   * plate and is asked for by `groundMaterials` rather than by a
   * district — so it was invisible to this check and the four tiles
   * looked like files nobody draws. See `GROUND_MATERIAL_IDS`.
   */
  for (const id of GROUND_MATERIAL_IDS) ids.add(id);
  ids.add(GROUND_GRASS_ID);
  ids.add("courier_scooter");
  ids.add("moving_van");
  ids.add("tow_truck");
  ids.add("dog_walker");
  return ids;
}

/**
 * A sponsor's building, by its name. See the test below for why this is
 * a convention rather than an entry in `requestedIds`.
 */
function isSponsorAsset(id: string): boolean {
  return /^sponsor_.+_(venue|hero)$/.test(id);
}

function deliveredIds(): string[] {
  return readdirSync(WORLD_DIR)
    .filter((f) => f.endsWith(".webp"))
    .map((f) => path.basename(f, ".webp"))
    .sort();
}

describe("the art the world asks for", () => {
  it("never asks for one drawing under two names", () => {
    /*
     * Two ids pointing at the same picture means two files to keep in
     * step, and they will not stay in step. `avatarViolations` already
     * proves this for the avatar roster; this covers the districts, where
     * a copy-pasted entry is the likely mistake.
     */
    const all: string[] = [];
    for (const code of Object.keys(WORLD_DISTRICTS) as DepartmentCode[]) {
      const d = WORLD_DISTRICTS[code];
      all.push(d.venueAssetId, d.characterWorldAssetId, d.characterPortraitAssetId);
    }
    const seen = new Set<string>();
    const twice = all.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
    expect(twice).toEqual([]);
  });

  it("has no delivered file that nothing will ever draw", () => {
    /*
     * The one that catches a misnamed ingest. A few legacy files predate
     * the world layer and are still used by older screens; they are named
     * here so the exception is a decision rather than a hole in the test.
     */
    const LEGACY = new Set([
      "welcome_hero",
      /* The welcome's parade: the twelve venue drawings joined into one strip,
         drawn by the app's own WelcomeScene rather than the world layer. */
      "welcome_street",
      "hair_barbershop_hero",
      "shared_ground_street",
      /*
       * THE SINGLE-PLATE NEIGHBOURHOOD.
       *
       * Superseded by `world_neighbourhood_xl`, which is this drawing
       * with two continuation plates joined onto it. Kept rather than
       * deleted because it is one of the three SOURCES of that
       * composite: the day the street is extended again, the stitch is
       * re-run from the originals, and a source thrown away to satisfy
       * an orphan check is a source that has to be regenerated.
       */
      /*
       * THE SINGLE-PLATE NEIGHBOURHOOD, now a SOURCE rather than a
       * drawing: `world_neighbourhood_xl` is this plate with two
       * continuation plates joined onto it. Kept because the stitch is
       * re-run from the originals the day the street is extended again,
       * and a source thrown away to satisfy an orphan check is a source
       * somebody has to regenerate.
       */
      "world_neighbourhood",
    ]);
    /*
     * THE SECOND CONSUMER.
     *
     * The painted living map is no longer the only thing that draws
     * this pack: the 3D street does too, and it lives in
     * `tools/design-preview`, which this test cannot see and this
     * package must not import. Its vocabulary is declared in
     * `@pro-now/types` so both can read it — the renderer to know what
     * to load, this test to know what is spoken for.
     *
     * The guard keeps its teeth. An id in that list and drawn by
     * nothing is still a lie; it has only moved from "nobody noticed"
     * to "somebody wrote it down", which is where a claim can be
     * checked.
     */
    const wanted = new Set([...requestedIds(), ...CITY_ASSET_IDS]);
    const orphans = deliveredIds().filter(
      (id) => !wanted.has(id) && !LEGACY.has(id) && !isSponsorAsset(id)
    );
    expect(orphans, "delivered but never drawn — probably ingested under the wrong id").toEqual([]);
  });

  /*
   * THE SHOPS THAT ARE NOT OURS.
   *
   * A sponsor's art cannot be listed by `requestedIds`, because which
   * brands have a building is a commercial fact that lives outside this
   * package — see `sponsors.ts` in the gallery, and /CLAUDE.md §4. So
   * the convention is checked instead of the list: `sponsor_<brand>_*`
   * is drawn by `SponsorRow` and `SponsorShopBody` from whatever the
   * caller passes, and every brand with art in the folder must at least
   * have the building you see from the street.
   *
   * That keeps the orphan check above honest — a sponsor file is
   * exempt because something draws it, not because it was waved
   * through — and it still catches the likely mistake, which is an
   * interior delivered for a brand that has no shopfront.
   */
  it("gives every sponsored brand a building before an inside", () => {
    const brands = new Map<string, Set<string>>();
    for (const id of deliveredIds()) {
      const m = /^sponsor_(.+)_(venue|hero|inside)$/.exec(id);
      if (!m) continue;
      if (!brands.has(m[1])) brands.set(m[1], new Set());
      brands.get(m[1])!.add(m[2]);
    }
    const insideOnly = [...brands.entries()]
      .filter(([, parts]) => !parts.has("venue"))
      .map(([brand]) => brand);
    expect(insideOnly, "a sponsor with an interior and no shopfront cannot be entered").toEqual([]);

    // And nothing may call itself a sponsor asset without following it.
    /*
     * `inside` joined `venue` and `hero` when the sponsor's shop became
     * somewhere you walk into rather than a picture that fills the
     * screen. Three parts, three different jobs: the front you see from
     * the street, the product shot the sheet uses, and the room you
     * stand in. The rule above is unchanged and still the point — a
     * brand may not have an interior without a shopfront.
     */
    const malformed = deliveredIds().filter(
      (id) => id.startsWith("sponsor_") && !/^sponsor_(.+)_(venue|hero|inside)$/.test(id)
    );
    expect(malformed, "sponsor art is named sponsor_<brand>_venue|hero|inside").toEqual([]);
  });

  it("reports what is still missing without failing over it", () => {
    /*
     * Deliberately an assertion nobody can break: the count is printed so
     * a run of the suite says how far the art has got, and the suite does
     * not go red because a drawing has not been made yet.
     */
    const have = new Set(deliveredIds());
    const missing = [...requestedIds()].filter((id) => !have.has(id)).sort();
    if (missing.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`\n  art still to arrive (${missing.length}):\n    ${missing.join("\n    ")}\n`);
    }
    expect(Array.isArray(missing)).toBe(true);
  });
});

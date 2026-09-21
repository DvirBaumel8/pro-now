import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import path from "node:path";

import { AVATARS, WORLD_DISTRICTS, type DepartmentCode } from "@pro-now/types";

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

const WORLD_DIR = path.resolve(__dirname, "../../../tools/design-preview/public/world");

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
  }
  for (const a of AVATARS) {
    ids.add(a.portraitAssetId);
    ids.add(a.worldAssetId);
  }
  // The ground, and the four things that travel along it.
  ids.add("world_neighbourhood");
  ids.add("courier_scooter");
  ids.add("moving_van");
  ids.add("tow_truck");
  ids.add("dog_walker");
  return ids;
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
      "hair_barbershop_hero",
      "shared_ground_street",
    ]);
    const wanted = requestedIds();
    const orphans = deliveredIds().filter((id) => !wanted.has(id) && !LEGACY.has(id));
    expect(orphans, "delivered but never drawn — probably ingested under the wrong id").toEqual([]);
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

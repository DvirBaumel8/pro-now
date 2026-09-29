import type { WorldAssetSources } from "@pro-now/demo-ui";

import { worldSources } from "./worldSources";

/**
 * STAND-IN FACES, FOR THE REVIEW GALLERY ONLY.
 *
 * ---------------------------------------------------------------------
 * WHY THIS EXISTS AND WHY IT IS FENCED OFF THIS HARD
 * ---------------------------------------------------------------------
 * The avatar picker and the walk are both built and both invisible,
 * because both refuse to draw anything until `avatar_XX_portrait` and
 * `avatar_XX_world_back` arrive. That is the correct behaviour in the app
 * — ChatGPT put it exactly right: *"עדיף לא לשאול מלשאול עם גריד ריק"* —
 * and it means Amit currently cannot feel the one thing he asked for:
 * *"רוצה חוויה של טיול ברחוב… שירגישו כמו VR."*
 *
 * So the gallery — and only the gallery, which `/CLAUDE.md §8` already
 * calls a developer-only browser gallery and not a shipping target — can
 * borrow the professional figures that HAVE arrived and walk with one.
 *
 * Three things keep this from becoming the thing it is standing in for.
 *
 * It is off by default and turned on by a labelled demo control that says
 * what it is before it says what it does, like every other demo control
 * in this file's neighbourhood.
 *
 * It is deliberately WRONG in the way that matters most: these figures
 * face the camera, and the real avatar is seen from three-quarters
 * behind. A front-facing figure walking away from you is the single most
 * obvious tell that a world is a collage — which means nobody can look at
 * this and mistake it for the finished walk. That is a feature. The
 * rejected intermediates in this project's history were all rejected for
 * being good enough to argue about.
 *
 * And it maps nothing that does not already exist. No new art, no
 * generated placeholder, no grey body.
 *
 * It answers exactly one question — does the control feel like walking —
 * and it is deleted the day the twenty-four real files land.
 */
const FACES = [
  "character_home",
  "character_hair",
  "character_care",
  "character_well",
  "character_pets",
  "character_auto",
  "character_move",
  "character_tech",
  "character_help",
  "character_build",
  "character_appliance",
] as const;

/**
 * `worldSources` plus twelve borrowed walking figures.
 *
 * The roster has twelve and there are eleven professional figures, so the
 * twelfth borrows the first again. Two identical figures is a defect in a
 * real roster and is fine here: only one of them is ever on screen.
 */
export const standInWorldSources: WorldAssetSources = (() => {
  const out: Record<string, unknown> = { ...worldSources };
  for (let i = 0; i < 12; i += 1) {
    const face = FACES[i % FACES.length]!;
    /*
     * ONLY THE WALKING FIGURE IS BORROWED NOW.
     *
     * The twelve portraits arrived and are real, so overriding them would
     * replace finished art with a worse stand-in — the exact inversion of
     * what this file is for. What is still missing is the twelve
     * `_world_back` figures, and that is all this lends.
     */
    const world = worldSources[`${face}_world`];
    const n = String(i + 1).padStart(2, "0");
    if (world) out[`avatar_${n}_world_back`] = world;
  }
  return out as WorldAssetSources;
})();

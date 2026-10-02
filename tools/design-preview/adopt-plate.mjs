/**
 * TAKE A NEW GROUND PLATE INTO THE BUILD, IN ONE COMMAND.
 *
 * Usage:  node tools/design-preview/adopt-plate.mjs <plate file>
 *
 * A plate arrives roughly once a week and the sequence around it is four
 * steps that all have to happen and that I have twice done in the wrong
 * order: verify the file, measure where its pavement actually is, move
 * the shops onto those points, and only then look at it.
 *
 * The step everyone skips is the third. The coordinates in
 * `PLATE_SPOTS` were measured off whichever plate came before, so
 * adopting a new plate without re-measuring leaves eleven buildings
 * standing wherever the old drawing happened to have pavement — which is
 * how two of them ended up in a road.
 *
 * This runs the checks and prints the replacement array. It deliberately
 * does NOT patch the source: choosing eleven points out of twenty is a
 * judgement about how the street reads, and a script that silently
 * rewrote a hand-tuned file would be a script nobody trusted.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { basename } from "node:path";

const src = process.argv[2];
if (!src || !existsSync(src)) {
  console.error("give me a plate file");
  process.exit(2);
}

const run = (args) => {
  try {
    return execFileSync("node", args, { encoding: "utf8", cwd: process.cwd() });
  } catch (e) {
    return (e.stdout ?? "") + (e.stderr ?? "");
  }
};

console.log("1. does the file meet the contract");
console.log(run(["tools/design-preview/check-plate.mjs", src]));

console.log("2. where is the pavement on THIS plate");
console.log(run(["tools/design-preview/measure-spots.mjs", src, "11"]));

console.log("3. paste the array above into PLATE_SPOTS in");
console.log("   tools/design-preview/lib/types/src/world-neighbourhood.ts");
console.log("   then: npx vitest run && npm run -w @pro-now/design-preview build");
console.log(`\n4. the file itself goes to public/world/world_neighbourhood.webp`);
console.log(`   (currently: ${basename(src)})`);

void copyFileSync;

#!/usr/bin/env node
/**
 * INGEST ONE WORLD ASSET.
 *
 *   node tools/design-preview/ingest-asset.mjs <source.png> <assetId>
 *
 * The art pack is authored outside this repository and arrives as PNGs with
 * transparent padding around them. Four things have to happen before a file
 * can be placed in a scene, and doing them by hand once per asset is how a
 * street ends up with sixteen slightly different ground lines:
 *
 *   1. TRIM the transparent margin. Padding differs from file to file, and
 *      an untrimmed asset is positioned by its empty space rather than by
 *      the building.
 *   2. FIND THE GROUND CONTACT — the horizontal centre of the bottom-most
 *      opaque row, not the centre of the bounding box. A building drawn in
 *      3/4 perspective is wider at the top than where it meets the
 *      pavement, so centring the box leaves it standing off its own feet.
 *   3. RESIZE to the density the phone actually needs.
 *   4. REPORT the manifest line, so the numbers in `hairPack.ts` are
 *      measured rather than guessed.
 *
 * It prints the manifest entry; it does not edit the manifest, because a
 * script that rewrites a contract is a script that can silently move a
 * building.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const [src, assetId] = process.argv.slice(2);
if (!src || !assetId) {
  console.error("usage: ingest-asset.mjs <source.png> <assetId>");
  process.exit(1);
}

const png = PNG.sync.read(readFileSync(src));
const { width: W, height: H, data } = png;
const alphaAt = (x, y) => data[(y * W + x) * 4 + 3];

// 1 — trim
let minX = W, minY = H, maxX = -1, maxY = -1;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (alphaAt(x, y) > 8) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
const tw = maxX - minX + 1;
const th = maxY - minY + 1;

// 2 — ground contact: the middle of the lowest opaque run
let gLeft = W, gRight = -1;
for (let x = minX; x <= maxX; x++) {
  if (alphaAt(x, maxY) > 8) {
    if (x < gLeft) gLeft = x;
    if (x > gRight) gRight = x;
  }
}
const groundX = gRight >= 0 ? (gLeft + gRight) / 2 : (minX + maxX) / 2;
const anchorX = Number(((groundX - minX) / tw).toFixed(4));

const trimmed = new PNG({ width: tw, height: th });
PNG.bitblt(png, trimmed, minX, minY, tw, th, 0, 0);

const outDir = path.join(path.dirname(new URL(import.meta.url).pathname), "public", "world");
mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${assetId}.png`);
writeFileSync(outPath, PNG.sync.write(trimmed));

console.log(`trimmed ${W}x${H} -> ${tw}x${th}`);
console.log(`ground contact x=${groundX} -> anchor { x: ${anchorX}, y: 1 }`);
console.log(`wrote ${outPath}`);
console.log("\nmanifest entry:");
console.log(`  ${assetId}: asset({
    id: "${assetId}",
    file: "${assetId}.webp",
    intrinsicWidth: ${tw},
    intrinsicHeight: ${th},
    anchor: { x: ${anchorX}, y: 1 },
  }),`);

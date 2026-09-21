#!/usr/bin/env node
/**
 * SPLIT A TRANSPARENT SHEET INTO ITS OBJECTS.
 *
 *   node tools/design-preview/split-sheet.mjs <sheet.png> <id1> <id2> ...
 *
 * The production rule is that a contact sheet approves art direction and a
 * separate file is the asset. This is the one honest exception: when a
 * sheet arrives with REAL alpha and the objects are separated by fully
 * transparent columns, cutting on those columns is lossless — no edge is
 * guessed, because there is nothing there to guess.
 *
 * It refuses to cut anywhere the alpha is not empty, so a sheet whose
 * objects touch or overlap fails loudly rather than producing three
 * buildings with each other's corners shaved off.
 *
 * ---------------------------------------------------------------------
 * ROWS FIRST, THEN COLUMNS
 * ---------------------------------------------------------------------
 * The first version cut on empty COLUMNS only, which is right for a row
 * of shopfronts and wrong for the 2x2 grids that started arriving — four
 * figures came back as two objects, each a column containing two people
 * stacked, and the ids did not line up.
 *
 * Splitting on empty rows first and then on empty columns inside each
 * band handles both, and reads objects in the order somebody looking at
 * the sheet would name them: left to right along the top, then the next
 * line down.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const [sheet, ...ids] = process.argv.slice(2);
if (!sheet || ids.length === 0) {
  console.error("usage: split-sheet.mjs <sheet.png> <id1> <id2> ...");
  process.exit(1);
}

const png = PNG.sync.read(readFileSync(sheet));
const { width: W, height: H, data } = png;
const alphaAt = (x, y) => data[(y * W + x) * 4 + 3];

/** Runs of "has something in it" along one axis, ignoring specks. */
function runsOf(length, hasAnything, minRun) {
  const out = [];
  let start = -1;
  for (let i = 0; i <= length; i += 1) {
    if (i < length && hasAnything(i)) {
      if (start < 0) start = i;
    } else if (start >= 0) {
      // A stray antialiased pixel is not a building.
      if (i - start > minRun) out.push([start, i - 1]);
      start = -1;
    }
  }
  return out;
}

/*
 * Bands of rows that contain anything, then objects within each band.
 * Reading order: along the top, then the next line down — which is the
 * order somebody looking at the sheet would name them in.
 */
const bands = runsOf(
  H,
  (y) => {
    for (let x = 0; x < W; x += 1) if (alphaAt(x, y) > 8) return true;
    return false;
  },
  H / 50
);

const boxes = [];
for (const [bandTop, bandBottom] of bands) {
  const cols = runsOf(
    W,
    (x) => {
      for (let y = bandTop; y <= bandBottom; y += 1) if (alphaAt(x, y) > 8) return true;
      return false;
    },
    W / 50
  );
  for (const [x0, x1] of cols) boxes.push({ x0, x1, bandTop, bandBottom });
}

if (boxes.length !== ids.length) {
  console.error(
    `found ${boxes.length} objects but got ${ids.length} ids: ` +
      boxes.map((b) => `${b.x0}-${b.x1}@${b.bandTop}`).join(", ")
  );
  process.exit(1);
}

const outDir = path.join(path.dirname(new URL(import.meta.url).pathname), "public", "world");
mkdirSync(outDir, { recursive: true });

boxes.forEach(({ x0, x1, bandTop, bandBottom }, i) => {
  let y0 = H, y1 = -1;
  for (let y = bandTop; y <= bandBottom; y++) {
    for (let x = x0; x <= x1; x++) {
      if (alphaAt(x, y) > 8) {
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        break;
      }
    }
  }
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;

  // Ground contact: the middle of the lowest opaque run, not the middle of
  // the box. A façade in 3/4 is wider at the roof than at the pavement.
  let gl = W, gr = -1;
  for (let x = x0; x <= x1; x++) {
    if (alphaAt(x, y1) > 8) {
      if (x < gl) gl = x;
      if (x > gr) gr = x;
    }
  }
  const anchorX = Number((((gr >= 0 ? (gl + gr) / 2 : (x0 + x1) / 2) - x0) / w).toFixed(4));

  const out = new PNG({ width: w, height: h });
  PNG.bitblt(png, out, x0, y0, w, h, 0, 0);
  const file = path.join(outDir, `${ids[i]}.png`);
  writeFileSync(file, PNG.sync.write(out));

  console.log(`${ids[i]}: ${w}x${h}  anchor { x: ${anchorX}, y: 1 }  -> ${file}`);
});

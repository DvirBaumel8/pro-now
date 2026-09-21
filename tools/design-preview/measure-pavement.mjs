/**
 * WHERE A PERSON MAY PUT THEIR FEET.
 *
 * Usage:  node tools/design-preview/measure-pavement.mjs <plate> [cols] [rows]
 *
 * ---------------------------------------------------------------------
 * WHY A RECTANGLE WAS NOT ENOUGH
 * ---------------------------------------------------------------------
 * `WALKABLE` is four numbers — a box covering almost the whole plate — so
 * the customer's figure could stand in a flowerbed, on a bench, in the
 * middle of the road, or halfway up a palm tree, and nothing stopped it.
 * Amit asked to *"באמת לטייל בין המקצועות"*, and walking through a
 * planter is the exact moment a street stops being a street.
 *
 * The plate already knows. This reads it: the same pavement
 * classification `measure-spots.mjs` uses for buildings, eroded by a
 * person's own footprint rather than a shopfront's, sampled down to a
 * coarse grid that ships as data.
 *
 * ---------------------------------------------------------------------
 * COARSE ON PURPOSE
 * ---------------------------------------------------------------------
 * A per-pixel mask would be a 1.5 MB constant and a walk that catches on
 * every kerbstone. A person is roughly 3% of the world wide, so a grid
 * cell of about that size is as fine as the question can be answered —
 * and at 32x56 the whole thing is a string of 1792 characters.
 *
 * Erosion matters more than resolution here: a cell is walkable only when
 * a person-sized box centred on it is clear, so the figure never ends up
 * with one foot over a kerb.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const file = process.argv[2];
const cols = Number(process.argv[3] ?? 32);
const rows = Number(process.argv[4] ?? 56);
if (!file || !existsSync(file)) {
  console.error("give me a plate file");
  process.exit(2);
}

/** A person's shoulders, as a fraction of the world's width. */
const PERSON_W = 0.03;
/** How much of that footprint has to be clear for a cell to count. */
const CLEAR = 0.7;

const py = `
PERSON_W = ${PERSON_W}
CLEAR = ${CLEAR}
COLS = ${cols}
ROWS = ${rows}
import json
import numpy as np
from PIL import Image

im = Image.open(${JSON.stringify(file)}).convert("RGB")
a = np.array(im).astype(np.float32)
H, W, _ = a.shape
r, g, b = a[:,:,0], a[:,:,1], a[:,:,2]
lum = 0.2126*r + 0.7152*g + 0.0722*b
mx = a.max(axis=2); mn = a.min(axis=2)
sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)

# WARMTH, NOT BRIGHTNESS.
#
# The first version reused the shop test, lum > 95, and produced a
# narrow corridor running down the middle of the plate — the strip
# directly under the lamps. Everything else was rejected: the pavement in
# shadow on both sides is darker than that and is still pavement, while
# the zebra crossings are brighter than it and are still road.
#
# What actually separates them on this plate is colour. Paving is warm
# stone under sodium light, so red runs well ahead of blue; asphalt is
# neutral grey-blue and white road paint is neutral too, so both fail the
# test whatever their brightness. Foliage is caught by the green rule as
# before, which is what keeps a figure out of the flowerbeds.
#
# The luma floor stays, low, only to keep deep shadow out — a figure
# standing in a black hole under a tree reads as a bug even if the pixel
# is technically warm.
green = (g > r + 4) & (g > b + 4)
warm = (r - b) > 26
walkable = warm & (~green) & (lum > 40)
_ = sat

integral = np.zeros((H + 1, W + 1), dtype=np.int64)
integral[1:, 1:] = np.cumsum(np.cumsum(walkable.astype(np.int64), axis=0), axis=1)

fw = max(3, int(W * PERSON_W))
# A person is about two and a half times as tall as they are wide, but
# what matters for standing is the ground under the FEET, so the box is
# nearly square and sits just below the point rather than above it.
fh = max(3, int(fw * 0.8))

out = []
for row in range(ROWS):
    line = []
    for col in range(COLS):
        cu = (col + 0.5) / COLS
        cv = (row + 0.5) / ROWS
        x = int(cu * (W - 1)); y = int(cv * (H - 1))
        x0 = max(0, x - fw // 2); x1 = min(W, x0 + fw)
        y0 = max(0, y - fh // 2); y1 = min(H, y0 + fh)
        area = max(1, (y1 - y0) * (x1 - x0))
        s = integral[y1, x1] - integral[y0, x1] - integral[y1, x0] + integral[y0, x0]
        line.append("1" if s >= CLEAR * area else "0")
    out.append("".join(line))
print(json.dumps({"rows": out, "share": round(float(walkable.mean()), 4)}))
`;

const { rows: grid, share } = JSON.parse(
  execFileSync("python3", ["-c", py], { encoding: "utf8", maxBuffer: 1 << 26 })
);

const open = grid.join("").split("").filter((c) => c === "1").length;
console.log(`\n${file}`);
console.log(`  raw pavement: ${(share * 100).toFixed(1)}% of the plate`);
console.log(`  walkable cells: ${open} of ${cols * rows} (${((open / (cols * rows)) * 100).toFixed(1)}%)\n`);
for (const line of grid) console.log(`  "${line}",`);

/**
 * FIND THE PAVEMENT AND PUT THE SHOPS ON IT.
 *
 * Usage:  node tools/design-preview/measure-spots.mjs <plate> [count]
 *
 * ---------------------------------------------------------------------
 * WHY THE PLATE DECIDES AND NOT THE CODE
 * ---------------------------------------------------------------------
 * I spent a round trip telling the artist to draw pavement at eleven
 * coordinates, and the coordinates were themselves measured off an older
 * plate. That is backwards: the drawing knows where the pavement is, and
 * asking it to match numbers derived from a different drawing is how a
 * shop ends up standing in a road.
 *
 * So this measures. It classifies each pixel as something a building
 * could stand on, then picks well-separated points among them.
 *
 * ---------------------------------------------------------------------
 * THE SEPARATION RULE, AND THE BUG IT ONCE HAD
 * ---------------------------------------------------------------------
 * Two shops collide when they are close on BOTH axes. My first version
 * rejected a candidate that was close on EITHER axis, which threw away
 * every slot further along the same pavement — the most natural place for
 * the next shop — and cut the usable slots almost in half. Fixing that
 * took one plate from twelve slots to eighteen.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const file = process.argv[2];
const count = Number(process.argv[3] ?? 11);
if (!file || !existsSync(file)) {
  console.error("give me a plate file");
  process.exit(2);
}

const py = `
import sys, json
import numpy as np
from PIL import Image

im = Image.open(${JSON.stringify(file)}).convert("RGB")
a = np.array(im).astype(np.float32)
H, W, _ = a.shape
r, g, b = a[:,:,0], a[:,:,1], a[:,:,2]
lum = 0.2126*r + 0.7152*g + 0.0722*b
mx = a.max(axis=2); mn = a.min(axis=2)
sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)

# What a building can stand on: bright enough to be lit stone rather than
# tarmac or shadow, and not green. Foliage is the thing most likely to be
# mistaken for pavement by brightness alone, and a shop in a flowerbed is
# as wrong as a shop in a road.
green = (g > r + 6) & (g > b + 6)
pavement = (lum > 95) & (sat < 0.42) & (~green)

# Erode, so a point is never chosen on the last pixel before a kerb: a
# building placed there hangs half over the road. Done with a cheap box
# min-filter rather than a dependency.
k = max(3, int(min(H, W) * 0.012)) | 1
pad = k // 2
p = np.pad(pavement.astype(np.float32), pad, mode="constant")
acc = np.ones_like(pavement, dtype=np.float32)
for dy in range(k):
    for dx in range(k):
        acc = np.minimum(acc, p[dy:dy+H, dx:dx+W])
solid = acc > 0.5

ys, xs = np.where(solid)
pts = np.stack([xs / (W - 1), ys / (H - 1)], axis=1)
print(json.dumps({"points": pts[::37].round(4).tolist(), "share": round(float(solid.mean()), 4), "size": [W, H]}))
`;

const raw = execFileSync("python3", ["-c", py], { encoding: "utf8", maxBuffer: 1 << 26 });
const { points, share, size } = JSON.parse(raw);

/*
 * Where a shop may STAND, which is tighter than where a person may walk.
 *
 * A figure can stand on the last few percent of the plate and look fine;
 * a building cannot, because it is drawn from its footing upwards and
 * outwards and would be clipped by the edge of the world. The first run
 * of this put a shop at u=0.94 and the plate's own test caught it.
 */
const BUILDABLE = { minU: 0.12, maxU: 0.88, minV: 0.1, maxV: 0.95 };
/*
 * Far enough apart that two shopfronts never touch. See WORLD_SIZE.
 *
 * Measured with a margin rather than to the exact limit: the first run
 * produced a pair separated by 0.13000000000000006 on one axis, which is
 * "apart" by the rule and a coin toss in floating point. A separation
 * that depends on rounding is not a separation.
 */
const MARGIN = 1.06;
const SEP = { u: 0.2 * MARGIN, v: 0.13 * MARGIN };

/*
 * The customer's own doorstep, which is not a place to put a shop.
 *
 * `CUSTOMER_POINT` is where the assignment route ends — where the person
 * waiting actually is. A shop measured onto that spot means a
 * professional's route starts and finishes in the same place, so the
 * journey neither travels nor grows, and the screen shows somebody
 * arriving at a building they were already standing in.
 */
const CUSTOMER = { u: 0.5, v: 0.9 };
const CLEAR_OF_CUSTOMER = 0.14;

const usable = points
  .map(([u, v]) => ({ u, v }))
  .filter(
    (p) =>
      p.u >= BUILDABLE.minU && p.u <= BUILDABLE.maxU && p.v >= BUILDABLE.minV && p.v <= BUILDABLE.maxV
  )
  .filter((p) => Math.hypot(p.u - CUSTOMER.u, (p.v - CUSTOMER.v) * 0.6) > CLEAR_OF_CUSTOMER)
  // Nearest the viewer first: the front of the street is the part
  // somebody sees without walking anywhere.
  .sort((a, b) => b.v - a.v);

/** Two shops collide only when they are close on BOTH axes. See the header. */
const clear = (p, chosen) =>
  chosen.every((c) => Math.abs(c.u - p.u) > SEP.u || Math.abs(c.v - p.v) > SEP.v);

/*
 * EVERY slot first, then a spread of them.
 *
 * Taking the first eleven that fit filled the near end of the street and
 * stopped, so the far half had no shops at all and walking up it was
 * walking towards nothing. Collecting all the separated slots and then
 * sampling evenly through them spreads the trades over the whole plate,
 * which is what makes the street worth the length of it.
 */
const all = [];
for (const p of usable) {
  if (clear(p, all)) all.push(p);
}

const chosen =
  all.length <= count
    ? all
    : Array.from({ length: count }, (_, i) => all[Math.round((i * (all.length - 1)) / (count - 1))]);

console.log(`\n${file}  ${size[0]}x${size[1]}`);
console.log(`  standable ground: ${(share * 100).toFixed(1)}% of the plate`);
console.log(`  ${all.length} separated slots on this plate; using ${chosen.length}\n`);
for (const p of chosen) {
  console.log(`  { u: ${p.u.toFixed(3)}, v: ${p.v.toFixed(3)} },`);
}
if (chosen.length < count) {
  console.log(
    `\n  only ${chosen.length} fit — the pavement is too narrow or too broken for ${count} shops`
  );
  process.exit(1);
}
const vs = chosen.map((p) => p.v);
console.log(
  `\n  spread: v from ${Math.min(...vs).toFixed(2)} to ${Math.max(...vs).toFixed(2)}`
);

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
 * A SHOP IS A BOX, NOT A POINT — THE SECOND BUG
 * ---------------------------------------------------------------------
 * The first version tested the FOOTING: is the pixel the building stands
 * on standable? Every one of eleven footings passed, and six of the
 * eleven shops still looked wrong, because a shopfront is 0.17 of the
 * world wide and rises from its footing — so it covers a box roughly
 * 160x120 plate pixels, and the test was eroding by eleven.
 *
 * Drawing the boxes onto the plate showed it at once: footings on clean
 * pavement, buildings sitting across flowerbeds, over the kerb, and in
 * one case squarely on a zebra crossing. The check said the plate met the
 * contract the whole time, because the check was measuring the wrong
 * thing — which is the same mistake in the tool as in the world.
 *
 * So the erosion is the building's own footprint now, offset upward
 * because that is where the building actually is.
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

/**
 * The building's own footprint, in world units.
 *
 * Kept beside WORLD_SIZE.venue rather than imported, because this script
 * runs against a plate before any of it is wired up. If the two ever
 * disagree the shops will be measured onto ground too small for them,
 * which is the bug this whole file exists to stop — so the numbers are
 * written here with their source named.
 */
const VENUE_W = 0.17; // WORLD_SIZE.venue
const VENUE_ASPECT = 0.75; // a shopfront is about three-quarters as tall as wide

const py = `
VENUE_W = ${VENUE_W}
VENUE_ASPECT = ${VENUE_ASPECT}
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

# WHAT A BUILDING CAN STAND ON — BY WARMTH, NOT BY BRIGHTNESS.
#
# This was lum > 95 & sat < 0.42 & ~green, and the note beside it said a
# shop in a road is as wrong as a shop in a flowerbed. It was right about
# that and wrong about how to tell. measure-pavement.mjs had already
# found out why, when the same brightness test was tried there for where a
# PERSON may stand: the pavement in shadow on both sides is darker than
# 95 and is still pavement, while THE ZEBRA CROSSINGS ARE BRIGHTER THAN IT
# AND ARE STILL ROAD. That tool switched to colour and this one did not,
# so the two disagreed about where the ground was — and the one that
# places the buildings was the one that was wrong.
#
# What it cost: the shopfront at u=0.879, v=0.806 stands on the painted
# crossing, in the middle of the carriageway, one of the eleven this
# script produced. The comment on PLATE_SPOTS says that fault was fixed
# when the footprint erosion went in. It was not; it was only made
# rarer, because the erosion asks whether every pixel of the box is
# "pavement" and the crossing answered yes.
#
# So the test is the pavement tool's, word for word: paving is warm stone
# under sodium light, asphalt is neutral grey-blue and so is the white
# paint on it. Foliage is still caught by the green rule. The luma floor
# stays, low, only to keep a figure or a building out of deep shadow.
green = (g > r + 6) & (g > b + 6)
pavement = ((r - b) > 26) & (~green) & (lum > 40)
_ = sat

# Erode by THE BUILDING, not by a token margin.
#
# A shopfront is WORLD_SIZE.venue (0.17) of the world wide and stands ON
# its footing, rising from it — so the ground it needs is a box that wide,
# about three quarters as tall, sitting directly ABOVE the point. Eroding
# by a few pixels only ever proved the doorstep was clear.
#
# A point is kept only when every pixel of that box is standable. Built from
# a summed-area table so an 160x120 window over 1.5M pixels is instant.
bw = max(3, int(W * VENUE_W))
bh = max(3, int(bw * VENUE_ASPECT))

integral = np.zeros((H + 1, W + 1), dtype=np.int64)
integral[1:, 1:] = np.cumsum(np.cumsum(pavement.astype(np.int64), axis=0), axis=1)

def box_sum(y0, x0, y1, x1):
    """Inclusive-exclusive rectangle sum over the integral image."""
    return (
        integral[y1, x1] - integral[y0, x1] - integral[y1, x0] + integral[y0, x0]
    )

# HOW CLEAN THE GROUND HAS TO BE, AND WHY NOT PERFECTLY.
#
# Demanding every pixel of the box be standable returned ZERO slots on a
# real plate, and rightly: a promenade has lamp posts, benches, bollards
# and bins on it, and a shopfront drawn with transparency sits behind them
# perfectly well. What it cannot do is sit in a flowerbed or on a road.
#
# So two thresholds, and the strict one is at the bottom. The BASE strip is
# where the building meets the ground, and that is the band the eye reads
# as "standing on"; the body above it may have a lamp post in front of it
# without anything looking wrong.
BODY_CLEAN = 0.82
BASE_CLEAN = 0.96
base_h = max(2, int(bh * 0.25))

solid = np.zeros((H, W), dtype=bool)
score = np.zeros((H, W), dtype=np.float32)
# Only rows where the whole building fits above the footing and inside the
# plate; anything else would be a building clipped by the edge of the world.
x0 = np.arange(0, W - bw)
for y in range(bh, H):
    if len(x0) == 0:
        break
    top = y - bh
    body = (
        integral[y, x0 + bw] - integral[top, x0 + bw] - integral[y, x0] + integral[top, x0]
    )
    base_top = y - base_h
    base = (
        integral[y, x0 + bw] - integral[base_top, x0 + bw] - integral[y, x0] + integral[base_top, x0]
    )
    ok = (body >= BODY_CLEAN * bw * bh) & (base >= BASE_CLEAN * bw * base_h)
    # The footing is the CENTRE of the box's base, so shift by half a width.
    solid[y, x0 + bw // 2] = ok
    # How clean, not just whether. See the ranking note below.
    score[y, x0 + bw // 2] = np.minimum(
        body / float(bw * bh), base / float(bw * base_h)
    )

# RANK, DO NOT ONLY PASS OR FAIL.
#
# A hard threshold answered "3 slots" on a plate that has to hold eleven,
# and "no" is not a placement. What the caller actually needs is the ELEVEN
# BEST positions plus an honest statement of how good the worst of them is
# — so a plate that cannot do the job says so in a number rather than by
# returning nothing, and the eleven shops still land on the best ground
# that exists while a better plate is being drawn.
#
# Every point that clears a floor is a candidate; the caller sorts by score.
FLOOR = 0.35
ys, xs = np.where(score > FLOOR)
vals = score[ys, xs]
step = max(1, len(ys) // 40000)
pts = np.stack([xs / (W - 1), ys / (H - 1), vals], axis=1)[::step]
print(json.dumps({
    "points": pts.round(4).tolist(),
    "share": round(float(solid.mean()), 4),
    "clean": round(float(score.max()), 3),
    "size": [W, H],
}))
`;

const raw = execFileSync("python3", ["-c", py], { encoding: "utf8", maxBuffer: 1 << 26 });
const { points, share, clean, size } = JSON.parse(raw);

/*
 * Where a shop may STAND, which is tighter than where a person may walk.
 *
 * A figure can stand on the last few percent of the plate and look fine;
 * a building cannot, because it is drawn from its footing upwards and
 * outwards and would be clipped by the edge of the world. The first run
 * of this put a shop at u=0.94 and the plate's own test caught it.
 */
/*
 * `maxV` is short of the customer at 0.9 on purpose.
 *
 * A shop nearer the viewer than the customer means the professional who
 * leaves it drives AWAY from the eye to reach them, so the van shrinks as
 * it arrives. The first run without this cap produced a shop at 0.922 and
 * the route's own test caught it — which is the cheapest place to find
 * out, and the reason the rule lives in the measurement rather than in a
 * note to whoever reads the screenshot.
 */
const BUILDABLE = { minU: 0.12, maxU: 0.88, minV: 0.1, maxV: 0.86 };
/*
 * Far enough apart that two shopfronts never touch. See WORLD_SIZE.
 *
 * Measured with a margin rather than to the exact limit: the first run
 * produced a pair separated by 0.13000000000000006 on one axis, which is
 * "apart" by the rule and a coin toss in floating point. A separation
 * that depends on rounding is not a separation.
 */
const MARGIN = 1.06;
/*
 * DERIVED FROM THE BUILDING, not written down beside it.
 *
 * SEP was a pair of constants, 0.2 and 0.13, while the shopfront width
 * was a third number somewhere else. So shrinking the shops to fit more
 * of them onto a tight plate changed nothing: they were still held a
 * fifth of the world apart. Two shops collide when they are closer than
 * their own width, which is a fact about the shops.
 */
const SEP = { u: VENUE_W * 1.18 * MARGIN, v: VENUE_W * VENUE_ASPECT * MARGIN };

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
  .map(([u, v, score]) => ({ u, v, score }))
  .filter(
    (p) =>
      p.u >= BUILDABLE.minU && p.u <= BUILDABLE.maxU && p.v >= BUILDABLE.minV && p.v <= BUILDABLE.maxV
  )
  .filter((p) => Math.hypot(p.u - CUSTOMER.u, (p.v - CUSTOMER.v) * 0.6) > CLEAR_OF_CUSTOMER)
  // BEST GROUND FIRST, then nearest the viewer.
  //
  // Sorting by v alone filled the near end of the street with whatever was
  // there, clean or not. Claiming the best ground first means that when a
  // plate cannot hold eleven shops, the ones it does hold are the ones
  // standing on real pavement — and the compromises are visible in the
  // report rather than scattered silently through the street.
  .sort((a, b) => b.score - a.score || b.v - a.v);

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

/*
 * The best `count` of them, laid out front to back.
 *
 * Chosen by ground quality, then ORDERED by depth, so the street still
 * reads as a street: the ordering is presentational and the selection is
 * not, and mixing the two is how the far half of a plate ended up with no
 * shops on it at all.
 */
const chosen = all.slice(0, count).sort((a, b) => b.v - a.v);

console.log(`\n${file}  ${size[0]}x${size[1]}`);
console.log(`  ground clean enough for a whole shopfront: ${(share * 100).toFixed(1)}% of the plate`);
console.log(`  best patch on this plate scores ${clean}`);
console.log(`  ${all.length} separated slots; using ${chosen.length}\n`);
for (const p of chosen) {
  const flag = p.score < 0.9 ? `   // ${(p.score * 100).toFixed(0)}% clear` : "";
  console.log(`  { u: ${p.u.toFixed(3)}, v: ${p.v.toFixed(3)} },${flag}`);
}

/*
 * THE NUMBER THAT DECIDES WHETHER TO ASK FOR A NEW PLATE.
 *
 * A shop on 70%-clear ground has a bench or a lamp post across its front
 * and looks placed; one on 40% is standing in a flowerbed. Printed rather
 * than merely used, because the answer to a low score is not a tweak to
 * this script — it is a plate with room on it.
 */
const worst = Math.min(...chosen.map((p) => p.score));
console.log(`\n  worst placement: ${(worst * 100).toFixed(0)}% clear ground`);
if (worst < 0.8) {
  console.log(
    `  this plate cannot hold ${count} shopfronts cleanly — it needs ${count} clear paved`
  );
  console.log(
    `  stretches of at least ${(VENUE_W * 100).toFixed(0)}% of the width by ${(VENUE_W * VENUE_ASPECT * 100).toFixed(0)}% of it in height`
  );
}
if (chosen.length < count) {
  console.log(
    `\n  only ${chosen.length} separated slots exist — the pavement is too narrow or too broken for ${count} shops`
  );
  process.exit(1);
}
const vs = chosen.map((p) => p.v);
console.log(
  `\n  spread: v from ${Math.min(...vs).toFixed(2)} to ${Math.max(...vs).toFixed(2)}`
);

/**
 * WHERE A VEHICLE MAY DRIVE.
 *
 * Usage:  node tools/design-preview/measure-road.mjs <plate> [samples]
 *
 * ---------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------
 * `STREETS` is an idealised layout — four roads meeting in the middle of
 * the world, written before anybody had measured the plate, and the file
 * says so: *"only the main one lines up with the road actually painted on
 * this plate"*. It does not line up either. `main` runs straight down
 * u≈0.5, and u≈0.5 is where the shops are: six of the eleven measured
 * shopfronts sit within a couple of hundredths of it. So the courier's
 * scooter drove up the middle of a pedestrian square and through the
 * front of the gym, hovering over its awning, which is exactly the
 * *"כל המכוניות והבניינים והנסיעה מבולגנת"* that has been reported twice.
 *
 * The plate knows where the road is. This reads it, the same way
 * `measure-pavement.mjs` reads where a person may stand — and by the
 * opposite test, because the two are complementary: paving is warm stone
 * under sodium light, asphalt is neutral grey-blue and so is the white
 * paint on it.
 *
 * ---------------------------------------------------------------------
 * A CENTRE-LINE, NOT A MASK
 * ---------------------------------------------------------------------
 * A vehicle does not need to know the whole carriageway, only the line it
 * drives along, so this returns a polyline rather than a grid: for each
 * band of the plate, the widest continuous run of road, and its middle.
 * Bands with no convincing run are dropped rather than guessed — the
 * result is a line that exists where the road exists and stops where it
 * stops.
 *
 * The runs are filtered by width before the middle is taken. Without that
 * a dark roof or a patch of shadow elsewhere on the plate reads as
 * neutral, wins a band, and puts a kink in the road.
 *
 * ---------------------------------------------------------------------
 * AND THE WIDEST RUN IS NOT ALWAYS THE ROAD
 * ---------------------------------------------------------------------
 * Taking the widest run per band put a three-hundredth dogleg into the
 * middle of this carriageway: between v=0.27 and v=0.35 a dark roof at
 * u≈0.51-0.66 is WIDER than the road beside it at u≈0.76-0.86, so it won
 * three bands in a row and the line stepped left and back again. A car
 * driving that line swerves across the pavement and returns, which is the
 * fault this tool exists to remove rather than one to introduce.
 *
 * A road is continuous, so continuity is the tie-break: the line is
 * seeded at the widest run on the plate and each band then takes the run
 * whose middle is NEAREST the run before it, falling back to the widest
 * only when nothing is close enough to be the same road. The pass runs
 * outwards from the seed in both directions so the choice is always made
 * against a band that has already been decided.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const file = process.argv[2];
const samples = Number(process.argv[3] ?? 28);
if (!file || !existsSync(file)) {
  console.error("usage: measure-road.mjs <plate> [samples]");
  process.exit(2);
}

/** How wide a run has to be, as a fraction of the plate, to be a road. */
const MIN_RUN = 0.05;
/** How much of a band's column has to be road for that column to count. */
const COLUMN = 0.6;

const py = `
import json
import numpy as np
from PIL import Image

BANDS = ${samples}
MIN_RUN = ${MIN_RUN}
COLUMN = ${COLUMN}

im = Image.open(${JSON.stringify(file)}).convert("RGB")
a = np.array(im).astype(np.float32)
H, W, _ = a.shape
r, g, b = a[:,:,0], a[:,:,1], a[:,:,2]
lum = 0.2126*r + 0.7152*g + 0.0722*b

# The complement of the pavement test in measure-pavement.mjs, and for
# the same reason: what separates the two on this plate is colour, not
# brightness. Asphalt and the paint on it are neutral; paving is warm.
green = (g > r + 4) & (g > b + 4)
warm = (r - b) > 26
road = (~warm) & (~green) & (lum > 28)

def runs_in(i):
    y0 = int(i / BANDS * H); y1 = int((i + 1) / BANDS * H)
    share = road[y0:y1].mean(axis=0)
    idx = np.where(share > COLUMN)[0]
    if len(idx) == 0:
        return []
    out = []
    s = p = int(idx[0])
    for x in idx[1:]:
        x = int(x)
        if x - p > W * 0.02:
            out.append((s, p)); s = x
        p = x
    out.append((s, p))
    return [(x0, x1) for x0, x1 in out if (x1 - x0) > W * MIN_RUN]

bands = {i: runs_in(i) for i in range(BANDS)}
usable = [i for i in bands if bands[i]]
if not usable:
    print(json.dumps({"line": [], "share": 0, "size": [W, H]})); raise SystemExit

# Seed on the widest run anywhere: whatever else is on this plate, the
# road is the broadest continuous stretch of neutral ground on it.
seed = max(usable, key=lambda i: max(x1 - x0 for x0, x1 in bands[i]))
chosen = {}

def take(i, anchor):
    cand = bands[i]
    if not cand:
        return anchor
    if anchor is None:
        x0, x1 = max(cand, key=lambda q: q[1] - q[0])
    else:
        near = min(cand, key=lambda q: abs((q[0] + q[1]) / 2 - anchor))
        # NEAR ENOUGH TO BE THE SAME ROAD. A carriageway bends; it does
        # not jump a fifth of the world between two bands.
        if abs((near[0] + near[1]) / 2 - anchor) > W * 0.18:
            near = max(cand, key=lambda q: q[1] - q[0])
        x0, x1 = near
    chosen[i] = (x0, x1)
    return (x0 + x1) / 2

anchor = take(seed, None)
a = anchor
for i in range(seed + 1, BANDS):
    a = take(i, a)
a = anchor
for i in range(seed - 1, -1, -1):
    a = take(i, a)

line = []
for i in sorted(chosen):
    x0, x1 = chosen[i]
    line.append({
        "v": round((i + 0.5) / BANDS, 4),
        "u": round(((x0 + x1) / 2) / W, 4),
        "width": round((x1 - x0) / W, 4),
    })
print(json.dumps({"line": line, "share": round(float(road.mean()), 4), "size": [W, H]}))
`;

const { line, share, size } = JSON.parse(
  execFileSync("python3", ["-c", py], { encoding: "utf8", maxBuffer: 1 << 26 })
);

/*
 * SMOOTHED, BECAUSE A BAND IS A MEASUREMENT AND A ROAD IS A ROAD.
 *
 * One band's widest run can be a hundredth off its neighbours' where a
 * parked van or a tree overhangs the kerb, and a vehicle interpolating
 * through the raw points twitches sideways as it passes. Three-point
 * smoothing takes that out without moving the line off the asphalt: the
 * carriageway here is ten to fifteen hundredths wide, and the correction
 * is never more than two.
 */
const smooth = line.map((p, i) => {
  const a = line[Math.max(0, i - 1)];
  const b = line[Math.min(line.length - 1, i + 1)];
  return { u: Number(((a.u + p.u + b.u) / 3).toFixed(3)), v: p.v, width: p.width };
});

console.log(`\n${file}  ${size[0]}x${size[1]}`);
console.log(`  road: ${(share * 100).toFixed(1)}% of the plate, ${line.length} of ${samples} bands\n`);
for (const p of smooth) {
  console.log(`  { u: ${p.u.toFixed(3)}, v: ${p.v.toFixed(3)} },`.padEnd(34) + `// ${(p.width * 100).toFixed(0)}% wide`);
}

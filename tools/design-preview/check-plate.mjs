/**
 * VERIFY A GROUND PLATE BEFORE IT COSTS A WEEK.
 *
 * Usage:  node tools/design-preview/check-plate.mjs <file.png|webp>
 *
 * Everything this checks was learned by shipping a plate that got it
 * wrong — see `tools/design-preview/lib/types/src/ground-plate.ts` for what each rule is
 * for. The point is that a plate is verified in seconds rather than
 * discovered in a screenshot days later, by which time ten more files
 * have been drawn to match it.
 *
 * It cannot judge whether the drawing is good. It can tell you whether
 * the eleven shops will land on pavement, whether the edge of the world
 * will come into frame, and whether the lighting will jump as somebody
 * walks across it — which are the three things that have actually gone
 * wrong.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const file = process.argv[2];
if (!file || !existsSync(file)) {
  console.error("give me a plate file");
  process.exit(2);
}

const py = `
import sys, json
import numpy as np
from PIL import Image

im = Image.open(${JSON.stringify(file)}).convert("RGBA")
a = np.array(im).astype(np.float32)
H, W = a.shape[0], a.shape[1]
alpha = a[:, :, 3]
rgb = a[:, :, :3]
lum = rgb @ np.array([0.2126, 0.7152, 0.0722])

# Full bleed: the border ring must be opaque. A plate drawn as an island
# shows black margins the moment the camera reaches the edge.
ring = np.concatenate([alpha[0], alpha[-1], alpha[:, 0], alpha[:, -1]])
edge_opaque = float((ring > 250).mean())
transparent = float((alpha < 250).mean())

# Even lighting: compare the mean brightness of a 3x3 grid of tiles. The
# camera follows a walking person across all of them.
tiles = []
for r in range(3):
    for c in range(3):
        t = lum[r*H//3:(r+1)*H//3, c*W//3:(c+1)*W//3]
        tiles.append(float(t.mean()))

out = {
  "size": [W, H],
  "ratio": round(W / H, 4),
  "edgeOpaque": round(edge_opaque, 4),
  "transparentShare": round(transparent, 4),
  "tileLuma": [round(t, 1) for t in tiles],
  "lumaSpread": round(max(tiles) - min(tiles), 1),
}

# What is underfoot at each required footing: a small patch around the
# point, reported as brightness and saturation. Asphalt is dark and
# almost grey; paving is lighter and warmer. This does not decide — it
# reports, so a human can see which shops landed in the road.
spots = json.loads(sys.argv[1])
probes = []
for s in spots:
    x = int(s["u"] * (W - 1)); y = int(s["v"] * (H - 1))
    r0, r1 = max(0, y-12), min(H, y+13)
    c0, c1 = max(0, x-12), min(W, x+13)
    patch = rgb[r0:r1, c0:c1]
    mx = patch.max(axis=2); mn = patch.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    probes.append({
      "name": s["name"],
      "u": s["u"], "v": s["v"],
      "luma": round(float(lum[r0:r1, c0:c1].mean()), 1),
      "sat": round(float(sat.mean()), 3),
      "alpha": round(float(alpha[r0:r1, c0:c1].mean()), 1),
    })
out["footings"] = probes
print(json.dumps(out))
`;

/*
 * Read through tsx rather than importing the workspace package: this is a
 * developer script and the package is TypeScript source, so a plain node
 * import resolves nothing. One subprocess is cheaper than a build step
 * nobody remembers to run.
 */
const spotsJson = execFileSync(
  "npx",
  [
    "tsx",
    "-e",
    `import { requiredFootings, PLATE_RATIO, RATIO_TOLERANCE } from "./tools/design-preview/lib/types/src/ground-plate";
     import { WORLD_DISTRICTS } from "./tools/design-preview/lib/types/src/world-districts";
     console.log(JSON.stringify({
       ratio: PLATE_RATIO,
       tol: RATIO_TOLERANCE,
       spots: requiredFootings().map(({ department, at }) => ({
         name: WORLD_DISTRICTS[department].brandHe,
         u: Number(at.u.toFixed(4)),
         v: Number(at.v.toFixed(4)),
       })),
     }));`,
  ],
  { encoding: "utf8", cwd: process.cwd() }
);
const { ratio: PLATE_RATIO, tol: RATIO_TOLERANCE, spots } = JSON.parse(
  spotsJson.trim().split("\n").pop()
);

const raw = execFileSync("python3", ["-c", py, JSON.stringify(spots)], {
  encoding: "utf8",
  maxBuffer: 1 << 24,
});
const r = JSON.parse(raw);

const fail = [];
if (Math.abs(r.ratio - PLATE_RATIO) > RATIO_TOLERANCE) {
  fail.push(`aspect ${r.ratio} — needs ${PLATE_RATIO.toFixed(4)} (portrait 2048x3600)`);
}
if (r.edgeOpaque < 0.999) {
  fail.push(`the border is ${((1 - r.edgeOpaque) * 100).toFixed(1)}% transparent — the plate must be full bleed`);
}
if (r.transparentShare > 0.001) {
  fail.push(`${(r.transparentShare * 100).toFixed(1)}% of the plate is transparent`);
}
if (r.lumaSpread > 60) {
  fail.push(`lighting varies by ${r.lumaSpread} across the plate — it will jump as somebody walks`);
}

// Dark AND grey is tarmac. Reported rather than failed, because a plate
// may legitimately put one trade beside a road — but eleven of them
// cannot be, and this is what makes that visible in one line.
const onRoad = r.footings.filter((f) => f.luma < 70 && f.sat < 0.12);

console.log(`\n${file}`);
console.log(`  size            ${r.size[0]}x${r.size[1]}   ratio ${r.ratio}  (want ${PLATE_RATIO.toFixed(4)})`);
console.log(`  border opaque   ${(r.edgeOpaque * 100).toFixed(2)}%`);
console.log(`  transparent     ${(r.transparentShare * 100).toFixed(2)}%`);
console.log(`  lighting spread ${r.lumaSpread}`);
console.log(`  footings:`);
for (const f of r.footings) {
  const flag = f.luma < 70 && f.sat < 0.12 ? "  <-- looks like road" : "";
  console.log(`    ${f.name.padEnd(14)} u=${f.u} v=${f.v}  luma ${String(f.luma).padStart(5)}  sat ${f.sat}${flag}`);
}
if (onRoad.length) {
  console.log(`\n  ${onRoad.length} of 11 shops appear to stand on tarmac`);
}
if (fail.length) {
  console.log("\nNOT USABLE YET:");
  for (const f of fail) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("\nthe plate meets the contract");

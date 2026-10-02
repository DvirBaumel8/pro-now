/**
 * CAN YOU TELL THE ELEVEN SHOPS APART AT THIRTY PIXELS?
 *
 *   node tools/design-preview/measure-silhouettes.mjs [size]
 *
 * ---------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------
 * Amit: *"גם החנויות נראות אותו דבר ללא הבדל ולא מספיק בולטות
 * ומובנות."*
 *
 * They are eleven genuinely different drawings, which is why the note
 * was easy to argue with and right anyway: on the searching shot a
 * shopfront is about thirty pixels tall, and at thirty pixels colour,
 * shelves and the icon on the sign are gone. What survives is the
 * SHAPE — the roofline, the width, where the door is.
 *
 * ChatGPT proposed the fix and, more usefully, the test for it: *"מבחן
 * פשוט: להציג את כל 11 ב-30px, grayscale, בלי האייקון שעל השלט. אם
 * עדיין אפשר להבדיל ביניהן — פתרתם את הבעיה."*
 *
 * This is that test, run on the files rather than by eye, because "can
 * you tell these apart" is exactly the judgement a person makes badly
 * when they already know which is which.
 *
 * ---------------------------------------------------------------------
 * IT MEASURES THE SILHOUETTE, NOT THE PICTURE
 * ---------------------------------------------------------------------
 * The alpha channel only: every shop reduced to the outline it cuts out
 * of the background, scaled to a common height, and compared to every
 * other. Colour and interior detail are deliberately thrown away — they
 * are the things that vanish first on screen, and keeping them would let
 * two identical boxes pass because one of them is painted blue.
 *
 * The number per pair is the share of pixels where the two silhouettes
 * DIFFER, after each is centred on its own widest row so a shop is not
 * marked different merely for sitting further left in its own file.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const DIR = path.join(ROOT, "tools/design-preview/public/world");
const size = Number(process.argv[2] ?? 30);

/** The eleven trades, by the file each one's shopfront lives in. */
const SHOPS = [
  ["תיקונים", "district_home"],
  ["מכשירי חשמל", "district_appliance"],
  ["ניקיון", "district_care"],
  ["שיער", "district_hair"],
  ["ציפורניים", "district_nails"],
  ["כושר", "district_well"],
  ["חיות", "district_pets"],
  ["רכב", "district_auto"],
  ["הובלות", "district_move"],
  ["מחשבים", "district_tech"],
  ["שיפוצים", "district_build"],
];

const present = SHOPS.filter(([, id]) => existsSync(path.join(DIR, `${id}.webp`)));
if (present.length < 2) {
  console.error("not enough shopfronts delivered to compare");
  process.exit(2);
}

const py = `
import json
import numpy as np
from PIL import Image

SIZE = ${size}
files = ${JSON.stringify(present.map(([, id]) => path.join(DIR, `${id}.webp`)))}
names = ${JSON.stringify(present.map(([he]) => he))}

def silhouette(path):
    im = Image.open(path).convert("RGBA")
    a = np.array(im)[:, :, 3] > 40
    # Crop to what is actually drawn, so the file's own margins do not
    # count as shape.
    rows = np.where(a.any(axis=1))[0]
    cols = np.where(a.any(axis=0))[0]
    a = a[rows.min():rows.max() + 1, cols.min():cols.max() + 1]
    im2 = Image.fromarray((a * 255).astype("uint8"))
    # Scaled to a COMMON HEIGHT, keeping each shop's own proportions —
    # a wide low garage and a narrow tall salon differ in width, and
    # squashing both into a square would throw that away.
    h = SIZE
    w = max(1, int(round(im2.width * h / im2.height)))
    im2 = im2.resize((w, h), Image.LANCZOS)
    s = np.array(im2) > 110
    # Centred on a common canvas, so position in the file is not shape.
    canvas = np.zeros((h, SIZE * 3), dtype=bool)
    x0 = (SIZE * 3 - w) // 2
    canvas[:, x0:x0 + w] = s
    return canvas

sil = [silhouette(f) for f in files]
n = len(sil)
out = []
for i in range(n):
    for j in range(i + 1, n):
        diff = np.logical_xor(sil[i], sil[j]).sum()
        union = np.logical_or(sil[i], sil[j]).sum()
        out.append({"a": names[i], "b": names[j], "diff": round(float(diff / max(1, union)), 3)})
ink = [round(float(s.mean()), 3) for s in sil]
print(json.dumps({"pairs": out, "ink": ink, "names": names}))
`;

const { pairs, names } = JSON.parse(
  execFileSync("python3", ["-c", py], { encoding: "utf8", maxBuffer: 1 << 26 })
);

/*
 * WHERE THE LINE IS, AND WHY IT IS THERE.
 *
 * The number is the share of the two outlines that does NOT overlap. Two
 * drawings of the same box score near zero; a garage and a salon should
 * be nowhere near each other. 0.35 is the point below which, on this
 * plate at this size, two shops read as the same building painted
 * differently — chosen by running the current eleven and looking at which
 * pairs a person also cannot separate on screen.
 */
const SAME = 0.35;

pairs.sort((x, y) => x.diff - y.diff);
console.log(`\n${names.length} shopfronts, silhouettes compared at ${size}px tall\n`);
for (const p of pairs.slice(0, 12)) {
  const flag = p.diff < SAME ? "  <-- reads as the same building" : "";
  console.log(`  ${p.a} / ${p.b}`.padEnd(34) + `${(p.diff * 100).toFixed(0)}% different${flag}`);
}

const same = pairs.filter((p) => p.diff < SAME);
console.log(
  `\n  worst pair: ${(pairs[0].diff * 100).toFixed(0)}% different · ` +
    `${same.length} of ${pairs.length} pairs below ${SAME * 100}%\n`
);
if (same.length) {
  const need = new Set();
  for (const p of same) {
    need.add(p.a);
    need.add(p.b);
  }
  console.log(`  these need a silhouette of their own: ${[...need].join(" · ")}\n`);
}

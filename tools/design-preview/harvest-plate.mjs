/**
 * HARVEST THE PAINTED PLATE.
 *
 * Amit: *"תראה את התמונות של הבתים ששלחתי לך... יש לך הכל מהכל שם.
 * תנסה לשדרג את כמה שאתה יכול להשתמש במה שיש לנו."*
 *
 * He is right that the material exists. `world_neighbourhood_xl.webp`
 * is a hand-painted evening promenade — cream paving, palms, flowering
 * jacaranda, raised planters, wrought-iron lamps, a road with a
 * red-and-white kerb — and the 3D street was built beside it out of
 * flat-coloured boxes and spheres. The boxes are not bad on their own;
 * they are bad three metres from a painting, which is exactly what he
 * said.
 *
 * So the painting becomes the source. This cuts patches out of it:
 * ground it can tile, and plants it can stand up as billboards.
 *
 *   node harvest-plate.mjs
 *
 * Chrome is the decoder and the encoder — there is no sharp, no
 * ImageMagick and no cwebp on this machine, which is a fact this
 * project has had to design around several times.
 */
import { launchChromium } from "./browser.mjs";
import { writeFileSync, mkdirSync } from "node:fs";

const SRC = "world/world_neighbourhood_xl.webp";
const OUT = "public/world";
mkdirSync(OUT, { recursive: true });

/* x, y, w, h are FRACTIONS of the plate, so they survive a re-export. */
const CUTS = [
  /*
   * Ground the engine can tile, taken where the paving and the road
   * are clear of everything standing on them. The paving is laid in
   * square slabs, so a rect roughly on the slab grid repeats without
   * an obvious seam.
   */
  { id: "city_paving", x: 0.28, y: 0.1380, w: 0.20, h: 0.0386, kind: "tile" },
  { id: "city_road",   x: 0.875, y: 0.1300, w: 0.12, h: 0.0500, kind: "tile" },
];

const b = await launchChromium();
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.goto("http://localhost:4421/", { waitUntil: "domcontentloaded" });

const out = await p.evaluate(async ({ src, cuts }) => {
  const img = new Image();
  img.src = src;
  await img.decode();
  const res = [];
  for (const c of cuts) {
    const sx = Math.round(img.naturalWidth * c.x);
    const sy = Math.round(img.naturalHeight * c.y);
    const sw = Math.round(img.naturalWidth * c.w);
    const sh = Math.round(img.naturalHeight * c.h);
    const cv = document.createElement("canvas");
    cv.width = sw; cv.height = sh;
    const x = cv.getContext("2d");
    x.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    res.push({ id: c.id, kind: c.kind, w: sw, h: sh, png: cv.toDataURL("image/png") });
  }
  return res;
}, { src: SRC, cuts: CUTS });

for (const r of out) {
  const bytes = Buffer.from(r.png.split(",")[1], "base64");
  writeFileSync(`/private/tmp/claude-501/cut-${r.id}.png`, bytes);
  console.log(r.id, r.kind, r.w + "x" + r.h);
}
await b.close();

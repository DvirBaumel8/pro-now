/**
 * Crop a shop cutout down to its opening — the part that is the inside.
 *
 * The open-front shops in the pack share a composition: the awning and
 * sign across the top, planters down both sides, and the lit interior in
 * the middle. The interior is what "going inside" needs, so this takes a
 * 16:9 window out of it rather than shipping the façade again.
 *
 *   node crop.mjs <src.png> <out.png> <x0> <y0> <x1> <y1>
 *
 * Fractions of the source, left/top/right/bottom.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

const [, , src, out, x0, y0, x1, y1] = process.argv;
const png = PNG.sync.read(readFileSync(src));
const L = Math.round(png.width * Number(x0));
const T = Math.round(png.height * Number(y0));
const W = Math.round(png.width * (Number(x1) - Number(x0)));
const H = Math.round(png.height * (Number(y1) - Number(y0)));

const dst = new PNG({ width: W, height: H });
for (let y = 0; y < H; y += 1) {
  for (let x = 0; x < W; x += 1) {
    const s = ((T + y) * png.width + (L + x)) * 4;
    const d = (y * W + x) * 4;
    dst.data[d] = png.data[s];
    dst.data[d + 1] = png.data[s + 1];
    dst.data[d + 2] = png.data[s + 2];
    dst.data[d + 3] = png.data[s + 3];
  }
}
writeFileSync(out, PNG.sync.write(dst));
console.log(`${W}x${H} -> ${out}`);

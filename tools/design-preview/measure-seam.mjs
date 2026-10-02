/**
 * WHERE THE ROAD MEETS EACH EDGE OF EACH PLATE.
 *
 * Tiles only tile if the road leaves one plate where it enters the
 * next. This reports the centre of the asphalt band a little way in
 * from the top and bottom edges — a little way, because the very first
 * and last rows of a render are often darkened by the generator and a
 * measurement taken there is a measurement of a vignette.
 *
 * The search is restricted to the right half: on every plate in this
 * set the carriageway runs down the right, and a night picture has
 * plenty of dark unsaturated pixels elsewhere that are shadow, not
 * tarmac.
 */
import { readFileSync } from "node:fs";
import { launchChromium } from "/Users/hype/Desktop/pro-now-dev/tools/design-preview/browser.mjs";

const files = process.argv.slice(2);
const browser = await launchChromium();
const page = await browser.newPage();
const out = [];

for (const f of files) {
  const b64 = readFileSync(f).toString("base64");
  const mime = f.endsWith(".webp") ? "image/webp" : "image/png";
  const r = await page.evaluate(async ({ b64, mime }) => {
    const img = new Image();
    img.src = `data:${mime};base64,${b64}`;
    await img.decode();
    const w = img.naturalWidth, h = img.naturalHeight;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);

    const isRoad = (d, i) => {
      const R = d[i], G = d[i+1], B = d[i+2];
      const max = Math.max(R,G,B), min = Math.min(R,G,B);
      return (R+G+B)/3 < 130 && max - min < 40;
    };
    const band = (y0, y1) => {
      const im = ctx.getImageData(0, y0, w, y1 - y0);
      const d = im.data, rows = y1 - y0;
      const hit = [];
      for (let x = 0; x < w; x += 1) {
        let n = 0;
        for (let y = 0; y < rows; y += 1) if (isRoad(d, (y*w + x) * 4)) n += 1;
        hit[x] = x > w * 0.45 && n > rows * 0.75;
      }
      let best = null, run = -1;
      for (let x = 0; x <= w; x += 1) {
        if (x < w && hit[x]) { if (run < 0) run = x; continue; }
        if (run >= 0) { const len = x - run; if (!best || len > best.len) best = { a: run, b: x-1, len }; run = -1; }
      }
      return best ? { from: best.a/w, to: best.b/w, mid: (best.a+best.b)/2/w } : null;
    };
    return { w, h, top: band(26, 74), bottom: band(h-74, h-26) };
  }, { b64, mime });
  out.push({ f: f.split("/").pop(), ...r });
  const g = (s) => s ? `${s.from.toFixed(3)}..${s.to.toFixed(3)} mid ${s.mid.toFixed(3)} w ${(s.to-s.from).toFixed(3)}` : "none";
  console.log(`${out.at(-1).f}\n   top    ${g(r.top)}\n   bottom ${g(r.bottom)}`);
}
await browser.close();

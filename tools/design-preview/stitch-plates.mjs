/**
 * FOUR DRAWINGS, ONE STREET.
 *
 * Amit had three continuation plates generated for the neighbourhood.
 * They are the same street, the same size and the same light — and the
 * road does not leave one exactly where it enters the next, because no
 * image generator counts pixels.
 *
 * So the join is measured rather than eyeballed: `roadedge.mjs` reports
 * the centre of the asphalt at each plate's top and bottom edge, and
 * each plate is nudged sideways until its road continues the one below
 * it. The composite is then cropped to the width every plate still
 * covers, so no plate contributes a strip of nothing.
 *
 * WHICH PLATES, AND WHY NOT ALL OF THEM. Two of the three drift the
 * road the same way — about nine hundredths of the width to the left
 * from bottom edge to top — so stacking both in a row needs a jog of
 * 85 pixels, and the crop that follows eats a fifth of the street.
 * Three plates join with nudges of 12 and 0 pixels. A shorter world
 * that reads as one place beats a taller one with a kink in the road.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { launchChromium } from "/Users/hype/Desktop/pro-now-dev/tools/design-preview/browser.mjs";

/* Bottom of the world first: the plate the customer starts on. */
const ORDER = [
  { file: process.argv[2], shift: 0 },      // original, nearest
  { file: process.argv[3], shift: 0.013 },  // plate_3
  { file: process.argv[4], shift: 0.026 },  // plate_1
];
const OUT = process.argv[5];

const b64s = ORDER.map((p) => readFileSync(p.file).toString("base64"));
const browser = await launchChromium();
const page = await browser.newPage();

const data = await page.evaluate(async ({ b64s, shifts }) => {
  const imgs = [];
  for (const b of b64s) {
    const im = new Image();
    im.src = `data:image/webp;base64,${b}`;
    await im.decode();
    imgs.push(im);
  }
  const w = imgs[0].naturalWidth, h = imgs[0].naturalHeight;
  const px = shifts.map((s) => Math.round(s * w));
  const lo = Math.min(...px, 0), hi = Math.max(...px, 0);
  const cropW = w - (hi - lo);

  /*
   * THE PLATES OVERLAP AND CROSS-FADE.
   *
   * Butted edge to edge, the join is a hairline of changed brightness
   * running the width of the street — the eye finds it instantly and
   * the world reads as three pictures. So each plate is laid BLEND
   * pixels into the one above it and its top edge fades in, which
   * costs a little height and buys a street with no line across it.
   */
  const BLEND = 110;
  const step = h - BLEND;
  const c = document.createElement("canvas");
  c.width = cropW;
  c.height = h + step * (imgs.length - 1);
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";

  /* Furthest first, so each nearer plate fades in over the one behind. */
  for (let i = imgs.length - 1; i >= 0; i -= 1) {
    const y = (imgs.length - 1 - i) * step;
    const t = document.createElement("canvas");
    t.width = cropW; t.height = h;
    const tx = t.getContext("2d");
    tx.drawImage(imgs[i], 0, 0, w, h, px[i] - hi, 0, w, h);
    /* Every plate but the topmost fades in at its own top edge. */
    if (i !== imgs.length - 1) {
      const g = tx.createLinearGradient(0, 0, 0, BLEND);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,1)");
      tx.globalCompositeOperation = "destination-in";
      tx.fillStyle = g;
      /*
       * THE WHOLE CANVAS, NOT JUST THE BAND.
       *
       * `destination-in` keeps the destination only where the source
       * paints — so filling the top strip alone erased everything
       * below it, and the first run produced one plate and two
       * rectangles of nothing. The gradient clamps to its last stop,
       * so painting the full height fades the top and leaves the rest
       * opaque, which is what was meant.
       */
      tx.fillRect(0, 0, cropW, h);
      tx.globalCompositeOperation = "source-over";
    }
    ctx.drawImage(t, 0, y);
  }
  return { url: c.toDataURL("image/webp", 0.9), w: cropW, h: c.height, cropped: hi - lo };
}, { b64s, shifts: ORDER.map((p) => p.shift) });

await browser.close();
const bytes = Buffer.from(data.url.split(",")[1], "base64");
writeFileSync(OUT, bytes);
console.log(`${data.w}x${data.h}  (${data.cropped}px trimmed to align)  ${(bytes.length/1024).toFixed(0)} KB  -> ${OUT}`);

/**
 * Cut a rendered shopfront out of its white studio background.
 *
 *   node knockout-white.mjs <in.{png,webp,jpg}> <out.png> [tolerance]
 *
 * Every building in this world is a cutout on transparency: the street,
 * the pavement and the sky behind it belong to the world, not to the
 * plate. A render that arrives on white paints a white rectangle over
 * the neighbourhood.
 *
 * WHY A FLOOD RATHER THAN "DELETE EVERY WHITE PIXEL".
 *
 * The inside of a shop is full of white — walls, shelves, a tiled
 * floor, a vase. Deleting white by colour punches holes through the
 * middle of the shop. So this floods inwards from the border instead:
 * only white that is CONNECTED to the outside is background. Anything
 * white with the building between it and the edge is part of the
 * building and survives.
 *
 * The edge is then feathered by one pixel, because a hard alpha cut on
 * a soft render leaves a white rim that reads as a sticker.
 *
 * Chrome does the decoding — it reads WebP, PNG and JPEG, and this
 * project already drives Chrome for every visual check. Same reason
 * `to-webp.mjs` exists.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { launchChromium } from "./browser.mjs";

const [, , src, out, tol = "18"] = process.argv;
if (!src || !out) {
  console.error("usage: node knockout-white.mjs <in> <out.png> [tolerance]");
  process.exit(1);
}
const ext = src.split(".").pop().toLowerCase();
const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
const b64 = readFileSync(src).toString("base64");

const browser = await launchChromium();
const page = await browser.newPage();
const data = await page.evaluate(
  async ({ b64, mime, tol }) => {
    const img = new Image();
    img.src = `data:${mime};base64,${b64}`;
    await img.decode();
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const im = ctx.getImageData(0, 0, w, h);
    const d = im.data;

    /*
     * Background is white paper OR already-transparent. Renders arrive
     * both ways — the first Lust plate came back cut out already, and
     * looked like a white rectangle only because the viewer behind it
     * was white. A tool that handles one and not the other reports "0%
     * cut away" and hands back the original, which is exactly what it
     * did.
     */
    const isPaper = (i) =>
      d[i + 3] < 24 ||
      (d[i] > 255 - tol && d[i + 1] > 255 - tol && d[i + 2] > 255 - tol);

    /* The flood, from every border pixel inwards. */
    const seen = new Uint8Array(w * h);
    const stack = [];
    for (let x = 0; x < w; x += 1) {
      stack.push(x, x + (h - 1) * w);
    }
    for (let y = 0; y < h; y += 1) {
      stack.push(y * w, y * w + w - 1);
    }
    while (stack.length) {
      const p = stack.pop();
      if (seen[p]) continue;
      if (!isPaper(p * 4)) continue;
      seen[p] = 1;
      const x = p % w;
      const y = (p - x) / w;
      if (x > 0) stack.push(p - 1);
      if (x < w - 1) stack.push(p + 1);
      if (y > 0) stack.push(p - w);
      if (y < h - 1) stack.push(p + w);
    }

    /*
     * Feather: a pixel that is background but touches the subject keeps
     * half its alpha, so the silhouette has one soft pixel rather than a
     * staircase.
     */
    const alpha = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p += 1) alpha[p] = seen[p] ? 0 : d[p * 4 + 3];
    const soft = Uint8Array.from(alpha);
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const p = y * w + x;
        if (alpha[p] !== 0) continue;
        if (alpha[p - 1] || alpha[p + 1] || alpha[p - w] || alpha[p + w]) soft[p] = 110;
      }
    }
    for (let p = 0; p < w * h; p += 1) d[p * 4 + 3] = soft[p];
    ctx.putImageData(im, 0, 0);

    /* Trim to what is left, so the plate is the building and nothing else. */
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (soft[y * w + x] < 40) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    const tw = x1 - x0 + 1;
    const th = y1 - y0 + 1;
    const t = document.createElement("canvas");
    t.width = tw;
    t.height = th;
    t.getContext("2d").drawImage(c, x0, y0, tw, th, 0, 0, tw, th);
    let cut = 0;
    for (let p = 0; p < w * h; p += 1) if (seen[p]) cut += 1;
    return { url: t.toDataURL("image/png"), w, h, tw, th, cut };
  },
  { b64, mime, tol: Number(tol) }
);
await browser.close();

const bytes = Buffer.from(data.url.split(",")[1], "base64");
writeFileSync(out, bytes);
console.log(
  `${data.w}x${data.h} -> ${data.tw}x${data.th}  ${(data.cut / (data.w * data.h) * 100).toFixed(0)}% cut away  ${(bytes.length / 1024).toFixed(0)} KB  -> ${out}`
);

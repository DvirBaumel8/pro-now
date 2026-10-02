/*
 * THE CITY'S LIGHT EDITION — every drawing, sized for a phone.
 *
 * Amit: *"בטלפון המפה לא נטענת, זה זורק אותי החוצה"*, and then, on the
 * desktop: *"גם פה היא בקושי עולה"*. Measured: 180 files and 51MB
 * before you can take a step, 26 seconds on localhost where the network
 * costs nothing — so the time is not the download. It is the browser
 * decoding and uploading 2048px drawings to the GPU one after another,
 * on the thread that also draws the loading screen. On a phone the
 * same pile does not fit in the memory Safari allows a tab, and the tab
 * is killed: that is "זורק אותי החוצה".
 *
 * A phone shows a shopfront a few hundred pixels wide. 2048 is four
 * times the pixels it can display, paid for in download, in decode time
 * and in GPU memory, and it buys nothing anybody can see.
 *
 * So two editions beside the originals, same names:
 *
 *   m/  long edge 1024 (walk sheets: short edge 560) — the default
 *   s/  long edge 640  (walk sheets: short edge 400) — phones
 *
 * Walk sheets are eight poses side by side, so they are capped by their
 * SHORT edge, or each pose would come out a hundred pixels tall.
 *
 * WHY PHONES GET THEIR OWN. Even at 1024 the street held 455MB of GPU
 * textures on a 390px screen — about 160 distinct drawings, measured,
 * no duplicates to remove — and Safari keeps the decoded copy of each
 * image as well. That is past what a phone tab is allowed, and it is
 * the reason Amit's phone closed the page. At 640 it is ~180MB, and a
 * shopfront on that screen is drawn a few hundred pixels wide anyway.
 *
 *   node make-light.mjs            only files that are new or changed
 *   node make-light.mjs --all      everything, both editions
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync, existsSync } from "node:fs";
import { launchChromium } from "./browser.mjs";

const SRC = new URL("./public/world/", import.meta.url).pathname;
const TIERS = [
  { dir: "m/", LONG: 1024, SHEET_SHORT: 560 },
  { dir: "s/", LONG: 640, SHEET_SHORT: 400 },
];
const all = process.argv.includes("--all");

const b = await launchChromium();
for (const { dir, LONG, SHEET_SHORT } of TIERS) {
const OUT = SRC + dir;
mkdirSync(OUT, { recursive: true });
const files = readdirSync(SRC).filter((f) => f.endsWith(".webp")).filter((f) => {
  if (all || !existsSync(OUT + f)) return true;
  return statSync(SRC + f).mtimeMs > statSync(OUT + f).mtimeMs;
});
if (files.length === 0) { console.log(`${dir} is up to date`); continue; }

const p = await b.newPage();
await p.goto("about:blank");
let before = 0, after = 0;
for (const [i, f] of files.entries()) {
  const buf = readFileSync(SRC + f);
  const r = await p.evaluate(async ({ b64, LONG, SHEET_SHORT }) => {
    const im = new Image();
    im.src = "data:image/webp;base64," + b64;
    await im.decode();
    const w = im.naturalWidth, h = im.naturalHeight;
    const sheet = w / h > 2.5;
    const k = Math.min(1, sheet ? SHEET_SHORT / Math.min(w, h) : LONG / Math.max(w, h));
    if (k >= 1) return { same: true, w, h };
    const c = document.createElement("canvas");
    c.width = Math.round(w * k);
    c.height = Math.round(h * k);
    const g = c.getContext("2d");
    g.imageSmoothingQuality = "high";
    g.drawImage(im, 0, 0, c.width, c.height);
    return { url: c.toDataURL("image/webp", 0.84), w: c.width, h: c.height };
  }, { b64: buf.toString("base64"), LONG, SHEET_SHORT });
  const out = r.same ? buf : Buffer.from(r.url.split(",")[1], "base64");
  writeFileSync(OUT + f, out);
  before += buf.length; after += out.length;
  if (i % 50 === 0 || i === files.length - 1) console.log(`${dir} ${i + 1}/${files.length} ${f} → ${r.w}x${r.h}`);
}
await p.close();
console.log(`${dir}: ${(before / 1048576).toFixed(1)}MB → ${(after / 1048576).toFixed(1)}MB`);
}
await b.close();

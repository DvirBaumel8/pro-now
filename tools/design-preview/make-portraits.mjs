/*
 * THE FACE IN THE PICKER IS THE BODY IN THE STREET.
 *
 * Amit: *"תוודא שאתה מחבר ומתאים את האווטאר הנכון למה שבוחרים
 * בהתחלה."* The picker was showing an older roster of twelve faces
 * while the street had been given yesterday's twelve — five people and
 * seven creatures — so whatever you chose, somebody else walked.
 *
 * So the portrait is cut from the character's own front-facing walk
 * sheet: the first pose, head and shoulders, on a square. One source
 * for both, and they cannot drift apart again.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { launchChromium } from "./browser.mjs";
const W = new URL("./public/world/", import.meta.url).pathname;
const b = await launchChromium();
const p = await b.newPage();
await p.goto("about:blank");
for (let n = 1; n <= 12; n++) {
  const id = String(n).padStart(2, "0");
  const url = await p.evaluate(async (b64) => {
    const im = new Image(); im.src = "data:image/webp;base64," + b64; await im.decode();
    const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const on = (x, y) => d[(y * c.width + x) * 4 + 3] > 40;
    /* the first figure: the first run of occupied columns */
    let x0 = -1, x1 = -1;
    for (let x = 0; x < c.width; x++) {
      let k = 0; for (let y = 0; y < c.height; y += 2) if (on(x, y)) k++;
      if (k > 2 && x0 < 0) x0 = x;
      if (x0 >= 0 && k <= 2) { x1 = x - 1; break; }
    }
    let y0 = c.height, y1 = 0;
    for (let y = 0; y < c.height; y++) for (let x = x0; x <= x1; x++) if (on(x, y)) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const fh = y1 - y0 + 1;
    /* head and shoulders: the top 46% of the figure, centred on it */
    const side = Math.round(fh * 0.46);
    const cx = (x0 + x1) / 2;
    const o = document.createElement("canvas"); o.width = o.height = 512;
    o.getContext("2d").drawImage(im, cx - side / 2, y0 - side * 0.04, side, side, 0, 0, 512, 512);
    return o.toDataURL("image/webp", 0.92);
  }, readFileSync(`${W}avatar_${id}_front.webp`).toString("base64"));
  writeFileSync(`${W}avatar_${id}_portrait.webp`, Buffer.from(url.split(",")[1], "base64"));
}
await b.close();
console.log("12 portraits cut from the front sheets");

/**
 * INSTALL A DELIVERED ART PACK: clean the matte, encode WebP, name it.
 *
 *   node install-pack.mjs <dir-of-pngs>
 *
 * ---------------------------------------------------------------------
 * WHY THERE IS A CLEANING PASS AND NOT JUST AN ENCODER
 * ---------------------------------------------------------------------
 * Cut-outs arrive with a fringe: a rim of half-transparent pixels left
 * over from whatever removed the background, and on this pack they are
 * saturated red and yellow. On a drawing they are invisible against a
 * white page and on a lit 3D plane they are a coloured outline round
 * every building.
 *
 * Measured on the delivered files, the fringe is ONLY in pixels that
 * are already partly transparent — the opaque interior is clean — so
 * the rule is safe and narrow: a pixel that is both not fully opaque
 * AND strongly saturated is matte residue, and its alpha goes to zero.
 * Nothing the artist drew is fully saturated AND half transparent at
 * the same time.
 *
 * Chrome is the decoder and the encoder. There is no sharp, no
 * ImageMagick and no cwebp here, which is a fact this project has had
 * to design around several times.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { launchChromium } from "./browser.mjs";

const dir = process.argv[2];
if (!dir) throw new Error("usage: node install-pack.mjs <dir>");
const OUT = "public/world";

const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".png")).sort();
const browser = await launchChromium();
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
await page.goto("about:blank");

let done = 0;
for (const f of files) {
  const b64 = readFileSync(join(dir, f)).toString("base64");
  const out = await page.evaluate(
    async ({ b64 }) => {
      const img = new Image();
      img.src = "data:image/png;base64," + b64;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const x = c.getContext("2d", { willReadFrequently: true });
      x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height);
      const p = d.data;
      let cut = 0;

      /*
       * THE NUMBER BADGE, PAINTED OUT.
       *
       * Every cut-out in this pack carries the contact-sheet's index —
       * a purple ring with a numeral — burned into the top-left corner
       * of the drawing itself. Asked twice, it came back both times.
       * In the street it appears as a giant glowing "7" floating in
       * the sky above a building, which is exactly what it is.
       *
       * It is patched rather than erased. Erasing leaves a square bite
       * out of the roofline; patching copies the block immediately to
       * its RIGHT, at the same height, which on these facades is the
       * same cornice and the same plaster — and on a prop is the same
       * transparent margin, so a cut-out's margin stays a margin.
       * Horizontal copying is what keeps a cornice line continuous.
       */
      /*
       * The badge is a FIXED SIZE on the sheet these were cut from —
       * roughly a seventh of the long edge — not a fraction of each
       * file's own width. Sizing the patch by width alone made the box
       * narrower than the badge on tall thin props: on the lamp post,
       * 14% of 708 pixels is 99, the badge is about 170, and copying
       * from 99 to the right copied the badge's own right half onto
       * its left. The street grew a "33".
       *
       * Square, off the long edge, and never more than half the width
       * so the source block is always inside the image.
       */
      const box = Math.min(
        Math.floor(c.width / 2) - 1,
        Math.round(Math.max(c.width, c.height) * 0.21)
      );
      const bw = box;
      const bh = Math.min(box, c.height - 1);
      for (let y = 0; y < bh; y += 1) {
        for (let xx = 0; xx < bw; xx += 1) {
          const dst = (y * c.width + xx) * 4;
          const src = (y * c.width + (xx + bw)) * 4;
          p[dst] = p[src];
          p[dst + 1] = p[src + 1];
          p[dst + 2] = p[src + 2];
          p[dst + 3] = p[src + 3];
        }
      }
      for (let i = 0; i < p.length; i += 4) {
        const a = p[i + 3];
        if (a === 0) continue;
        if (a < 24) { p[i + 3] = 0; cut += 1; continue; }
        if (a >= 235) continue;
        const r = p[i], g = p[i + 1], b = p[i + 2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        /* Saturated AND not fully opaque: matte residue, not paint. */
        if (mx > 175 && mn < 90 && mx - mn > 120) { p[i + 3] = 0; cut += 1; }
      }
      x.putImageData(d, 0, 0);
      return { url: c.toDataURL("image/webp", 0.9), w: c.width, h: c.height, cut };
    },
    { b64 }
  );
  const name = basename(f, extname(f)) + ".webp";
  writeFileSync(join(OUT, name), Buffer.from(out.url.split(",")[1], "base64"));
  done += 1;
  console.log(
    String(done).padStart(2) + "/" + files.length,
    name.padEnd(26),
    (out.w + "x" + out.h).padEnd(11),
    "cleaned " + out.cut + "px"
  );
}
await browser.close();

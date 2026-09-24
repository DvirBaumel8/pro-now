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
/**
 * The badge pass now LOOKS, so it needs no flag — see the note in the
 * page code. `--debadge` is still accepted because it is in the notes
 * and in the shell history, and it now means what the default means.
 * `--keep-badges` turns the pass off entirely, and `--dry` decodes and
 * reports without writing anything.
 */
const keepBadges = process.argv.includes("--keep-badges");
const dry = process.argv.includes("--dry");
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
    async ({ b64, keepBadges }) => {
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
       * ---------------------------------------------------------------
       * THE NUMBER BADGE: FOUND, MEASURED, THEN PATCHED
       * ---------------------------------------------------------------
       * Some deliveries carry the contact sheet's index burned into the
       * top-left of every cut-out — a pale lilac ring round a numeral,
       * which in the street appears as a giant glowing "7" floating
       * above a building.
       *
       * This pass has now been wrong in three different ways, and each
       * one is a line of the rule below:
       *
       *   - A fixed box sized off the WIDTH was narrower than the badge
       *     on tall thin props, so the copy brought the badge's own
       *     right half back over its left. The lamp post grew a "33".
       *   - Detecting it by colour was unstable: the same threshold
       *     found `bld_cafe` one run and missed it the next, because a
       *     warm plaster wall and a pale lilac ring are not as far apart
       *     as they look.
       *   - So the decision was handed to the caller as a flag about the
       *     PACK — and the 26-asset pack turned out to carry badges on
       *     eighteen files and not on ten. `van_back.png` is clean, and
       *     the flag stamped 410 pixels of van over its corner: a second
       *     ghost cab, mid-drawing, in the file that is meant to be the
       *     brand driving through the neighbourhood.
       *
       * What makes the test stable now is one extra condition: the ring
       * is bright, only faintly coloured, and BLUE IS ITS STRONGEST
       * CHANNEL. A warm evening drawing has no such pixel — that is what
       * "warm" means — and this is what the earlier colour test was
       * missing. Measured over all 103 files of the three delivered
       * packs, every badged file scores at least 211 ring pixels and
       * every clean one scores exactly zero. There is no threshold to
       * tune between those two numbers.
       *
       * And the patch is sized to what was FOUND rather than to a
       * fraction of the file: the ring's own bounding box, padded, and
       * copied from immediately to its right — which keeps a cornice
       * line continuous and, on a prop, copies transparent margin onto
       * transparent margin. A 200-pixel badge now costs a 230-pixel
       * patch instead of a 410-pixel one.
       */
      let badge = null;
      if (!keepBadges) {
        /* Look in a corner generous enough to hold the whole ring. */
        const look = Math.min(
          Math.floor(c.width / 2) - 1,
          Math.round(Math.max(c.width, c.height) * 0.3)
        );
        let n = 0;
        /* Matches counted by their distance from the very corner, so the
           badge can be separated from anything else in the frame that
           happens to be pale and blue — see the note below. */
        const shell = new Int32Array(look);
        for (let y = 0; y < look; y += 1) {
          for (let xx = 0; xx < look; xx += 1) {
            const i = (y * c.width + xx) * 4;
            if (p[i + 3] < 250) continue;
            const R = p[i] / 255, G = p[i + 1] / 255, B = p[i + 2] / 255;
            const mx = Math.max(R, G, B), dl = mx - Math.min(R, G, B);
            if (mx < 0.72 || dl < 0.06 || dl > 0.3) continue;
            if (B <= R || B <= G) continue;
            let h = mx === R ? 60 * (((G - B) / dl) % 6)
                  : mx === G ? 60 * ((B - R) / dl + 2)
                             : 60 * ((R - G) / dl + 4);
            if (h < 0) h += 360;
            if (h <= 258 || h >= 318) continue;
            n += 1;
            shell[Math.max(xx, y)] += 1;
          }
        }

        /*
         * WHERE THE BADGE ENDS.
         *
         * A bounding box over every match was the obvious thing and it
         * was wrong twice in one dry run: `mat_kerb` has pale blue-grey
         * stone and `bld_cafe` has cool window glass, and a handful of
         * matching pixels out in the frame stretched the patch to 720
         * pixels — over the whole corner of a tiling material.
         *
         * The badge is a solid disc pinned to the corner, so it is a
         * RUN of populated shells starting at the corner and ending at
         * the first real gap. Anything past that gap is the drawing.
         */
        let edge = 0, gap = 0;
        for (let d = 0; d < look; d += 1) {
          if (shell[d] > 0) { edge = d; gap = 0; continue; }
          gap += 1;
          /*
           * A ring is hollow and a numeral has holes in it, so empty
           * shells INSIDE the badge are normal and a fixed tolerance
           * cut `walk_dogwalker`'s patch down to eleven pixels. The
           * tolerance therefore scales with how far the badge has
           * already reached — and it stays far below the gap that
           * separates a badge from anything else that happens to be
           * pale and blue: on `mat_kerb` the badge ends at 275 and the
           * stone begins 180 pixels later, against a tolerance of 96.
           */
          if (edge > 0 && gap > Math.max(30, edge * 0.35)) break;
        }
        const x0 = 0, y0 = 0, x1 = edge, y1 = edge;
        /* Sixty pixels is far below the smallest badge measured (211)
           and far above the noise on a clean file (zero). */
        if (n >= 60) {
          const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.08) + 4;
          const bx0 = Math.max(0, x0 - pad), by0 = Math.max(0, y0 - pad);
          const bw = Math.min(c.width - bx0 - 1, x1 - x0 + 1 + pad * 2);
          const bh = Math.min(c.height - by0 - 1, y1 - y0 + 1 + pad * 2);
          /*
           * ERASE IT WHERE IT FLOATS, COPY OVER IT WHERE IT SITS ON THE
           * DRAWING.
           *
           * Copying sideways is right on a building: it keeps a cornice
           * line continuous and a bitten-out square would be worse. On a
           * CUT-OUT it is wrong, and `walk_man` showed why — the badge
           * floats on empty margin above the figures' heads, and copying
           * the block to its right pasted a slice of somebody's hair into
           * the corner. Erasing empty margin leaves empty margin.
           *
           * Which one a file needs is a measurement, not a guess: how
           * much of the patch box is already transparent.
           */
          let clear = 0;
          for (let y = by0; y < by0 + bh; y += 1) {
            for (let xx = bx0; xx < bx0 + bw; xx += 1) {
              if (p[(y * c.width + xx) * 4 + 3] < 16) clear += 1;
            }
          }
          const floats = clear > bw * bh * 0.5;
          /* The source block sits immediately to the right of the patch
             and must fit inside the image; if it cannot, take it from
             the left instead rather than reading off the end. */
          const from = bx0 + bw + bw <= c.width ? bw : -bx0 - 1;
          /*
           * The badge is a DISC tangent to the corner, so an erase is a
           * disc too. Erasing the whole square bit a notch out of the
           * first figure's hair on `walk_man` and `walk_dogwalker`,
           * where the head reaches into the box's far corner — which is
           * outside the badge by construction.
           */
          const cx = bx0 + bw / 2, cy = by0 + bh / 2;
          /* A little wider than the badge: the ring's outer edge is
             anti-aliased, and a disc cut exactly to it leaves a faint
             lilac hairline behind — visible on `prop_lamp`. */
          const rr = Math.pow((Math.max(bw, bh) / 2) * 1.09 + 4, 2);
          for (let y = by0; y < by0 + bh; y += 1) {
            for (let xx = bx0; xx < bx0 + bw; xx += 1) {
              const dst = (y * c.width + xx) * 4;
              if (floats) {
                if ((xx - cx) * (xx - cx) + (y - cy) * (y - cy) <= rr) p[dst + 3] = 0;
                continue;
              }
              const src = (y * c.width + xx + from) * 4;
              p[dst] = p[src];
              p[dst + 1] = p[src + 1];
              p[dst + 2] = p[src + 2];
              p[dst + 3] = p[src + 3];
            }
          }
          badge = { n, x: bx0, y: by0, w: bw, h: bh, how: floats ? "erased" : "copied" };
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
      return { url: c.toDataURL("image/webp", 0.9), w: c.width, h: c.height, cut, badge };
    },
    { b64, keepBadges }
  );
  const name = basename(f, extname(f)) + ".webp";
  if (!dry) writeFileSync(join(OUT, name), Buffer.from(out.url.split(",")[1], "base64"));
  done += 1;
  console.log(
    String(done).padStart(2) + "/" + files.length,
    name.padEnd(26),
    (out.w + "x" + out.h).padEnd(11),
    "cleaned " + String(out.cut).padStart(7) + "px",
    out.badge
      ? `· badge ${out.badge.n}px ${out.badge.how} ${out.badge.w}x${out.badge.h} at ${out.badge.x},${out.badge.y}`
      : "· no badge",
    dry ? "· DRY RUN, nothing written" : ""
  );
}
await browser.close();

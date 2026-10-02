/**
 * A CHARACTER SHEET IS NOT A CHARACTER UNTIL IT IS CUT UP.
 *
 *   node slice-walkcycle.mjs <sheet> <outDir> <prefix> [rows]
 *
 * Amit had a walk cycle drawn: one image, sixteen poses of the same
 * person seen from behind, laid out on white. That is a contact sheet,
 * and a contact sheet cannot walk. This finds each figure on it, cuts
 * it out of the white, trims it to its own silhouette and writes one
 * file per pose — which is a walk cycle.
 *
 * FOUND RATHER THAN ASSUMED. The obvious thing is to divide the width
 * by eight, and the obvious thing is wrong: a generator does not place
 * figures on a grid, and a figure mid-stride is wider than a figure
 * standing. So the columns that contain any ink are projected down, the
 * runs of ink are the figures, and the gaps between them are the gaps.
 *
 * Chrome does the decoding and the encoding, for the same reason
 * `to-webp.mjs` does: there is no sharp and no ImageMagick here, and
 * this project already drives Chrome for every visual check.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { launchChromium } from "./browser.mjs";

const [, , sheet, outDir, prefix, rowsArg] = process.argv;
if (!sheet || !outDir || !prefix) {
  console.error("usage: node slice-walkcycle.mjs <sheet> <outDir> <prefix> [rows]");
  process.exit(1);
}
const rows = Number(rowsArg ?? 2);
mkdirSync(outDir, { recursive: true });

const ext = sheet.split(".").pop().toLowerCase();
const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
const b64 = readFileSync(sheet).toString("base64");

const browser = await launchChromium();
const page = await browser.newPage();

const cut = await page.evaluate(
  async ({ b64, mime, rows }) => {
    const img = new Image();
    img.src = `data:${mime};base64,${b64}`;
    await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const im = ctx.getImageData(0, 0, W, H);
    const d = im.data;

    /* White paper, or already transparent. Same test the plate cutter uses. */
    const TOL = 22;
    const isPaper = (i) =>
      d[i + 3] < 24 || (d[i] > 255 - TOL && d[i + 1] > 255 - TOL && d[i + 2] > 255 - TOL);

    const out = [];
    const bandH = Math.floor(H / rows);

    for (let r = 0; r < rows; r += 1) {
      const y0 = r * bandH, y1 = (r + 1) * bandH;

      /* Which columns in this band contain ink at all. */
      const inked = new Array(W).fill(false);
      for (let x = 0; x < W; x += 1) {
        let n = 0;
        for (let y = y0; y < y1; y += 2) if (!isPaper((y * W + x) * 4)) { n += 1; if (n > 3) break; }
        inked[x] = n > 3;
      }

      /* Runs of inked columns are figures; short runs are speckle. */
      const raw = [];
      let start = -1;
      for (let x = 0; x <= W; x += 1) {
        if (x < W && inked[x]) { if (start < 0) start = x; continue; }
        if (start >= 0) {
          if (x - start > W * 0.02) raw.push([start, x - 1]);
          start = -1;
        }
      }

      /*
       * TWO FIGURES MID-STRIDE CAN TOUCH, AND THEN THEY ARE ONE RUN.
       *
       * A standing figure is narrow and a running one throws an arm and
       * a leg out, so on this sheet two poses overlapped into a run 338
       * wide and three into one 571 wide — thirteen poses out of
       * sixteen. There is no gap to find inside them, so the run is
       * divided by how many typical figures fit in it. The typical
       * figure is the median of the runs that did separate cleanly,
       * which is measured on the sheet rather than assumed about it.
       */
      const widths = raw.map(([a, b]) => b - a + 1).sort((p, q) => p - q);
      const median = widths[Math.floor(widths.length / 2)] || 1;
      const runs = [];
      for (const [a, b] of raw) {
        const w = b - a + 1;
        const n = Math.max(1, Math.round(w / median));
        if (n === 1) { runs.push([a, b]); continue; }
        const step = w / n;
        for (let k = 0; k < n; k += 1) {
          runs.push([Math.round(a + k * step), Math.round(a + (k + 1) * step) - 1]);
        }
      }

      for (const [a, b] of runs) {
        /* The figure's own top and bottom inside the band. */
        let top = y1, bot = y0;
        for (let y = y0; y < y1; y += 1) {
          for (let x = a; x <= b; x += 1) {
            if (!isPaper((y * W + x) * 4)) { if (y < top) top = y; if (y > bot) bot = y; break; }
          }
        }
        if (bot <= top) continue;

        const w = b - a + 1, h = bot - top + 1;
        const t = document.createElement("canvas");
        t.width = w; t.height = h;
        const tx = t.getContext("2d", { willReadFrequently: true });
        tx.drawImage(c, a, top, w, h, 0, 0, w, h);

        /* Knock the white out of the cut, flooding in from its border so
           white SHIRT or WHITE SHOES survive — they are not connected to
           the paper. Exactly the lesson from the shopfront cutter. */
        const ti = tx.getImageData(0, 0, w, h);
        const td = ti.data;
        const paper = (i) =>
          td[i + 3] < 24 || (td[i] > 255 - TOL && td[i + 1] > 255 - TOL && td[i + 2] > 255 - TOL);
        const seen = new Uint8Array(w * h);
        const stack = [];
        for (let x = 0; x < w; x += 1) { stack.push(x, x + (h - 1) * w); }
        for (let y = 0; y < h; y += 1) { stack.push(y * w, y * w + w - 1); }
        while (stack.length) {
          const p = stack.pop();
          if (seen[p] || !paper(p * 4)) continue;
          seen[p] = 1;
          const px = p % w, py = (p - px) / w;
          if (px > 0) stack.push(p - 1);
          if (px < w - 1) stack.push(p + 1);
          if (py > 0) stack.push(p - w);
          if (py < h - 1) stack.push(p + w);
        }
        const alpha = new Uint8Array(w * h);
        for (let p = 0; p < w * h; p += 1) alpha[p] = seen[p] ? 0 : td[p * 4 + 3];
        /* One soft pixel at the edge, so the silhouette is not a staircase. */
        const soft = Uint8Array.from(alpha);
        for (let y = 1; y < h - 1; y += 1) {
          for (let x = 1; x < w - 1; x += 1) {
            const p = y * w + x;
            if (alpha[p] !== 0) continue;
            if (alpha[p - 1] || alpha[p + 1] || alpha[p - w] || alpha[p + w]) soft[p] = 120;
          }
        }
        /*
         * ONE FIGURE PER FRAME, AND ONLY ONE.
         *
         * Splitting a merged run by width leaves the neighbour's toe in
         * the frame — a shoe floating above somebody's head, which is
         * exactly the kind of thing that survives to production because
         * it is small. The figure is the LARGEST connected piece of ink;
         * everything else in the frame belongs to the pose next door.
         */
        const label = new Int32Array(w * h).fill(-1);
        let best = -1, bestN = 0, id = 0;
        for (let p0 = 0; p0 < w * h; p0 += 1) {
          if (soft[p0] < 40 || label[p0] >= 0) continue;
          const q = [p0];
          label[p0] = id;
          let n = 0;
          while (q.length) {
            const p = q.pop();
            n += 1;
            const px = p % w, py = (p - px) / w;
            const push = (r) => { if (soft[r] >= 40 && label[r] < 0) { label[r] = id; q.push(r); } };
            if (px > 0) push(p - 1);
            if (px < w - 1) push(p + 1);
            if (py > 0) push(p - w);
            if (py < h - 1) push(p + w);
          }
          if (n > bestN) { bestN = n; best = id; }
          id += 1;
        }
        for (let p = 0; p < w * h; p += 1) {
          td[p * 4 + 3] = label[p] === best ? soft[p] : 0;
        }
        tx.putImageData(ti, 0, 0);

        /* And trim again: dropping the stray leaves empty margin. */
        let tx0 = w, ty0 = h, tx1 = -1, ty1 = -1;
        for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
          if (td[(y * w + x) * 4 + 3] < 40) continue;
          if (x < tx0) tx0 = x; if (x > tx1) tx1 = x;
          if (y < ty0) ty0 = y; if (y > ty1) ty1 = y;
        }
        if (tx1 > tx0 && ty1 > ty0) {
          const fw = tx1 - tx0 + 1, fh = ty1 - ty0 + 1;
          const f = document.createElement("canvas");
          f.width = fw; f.height = fh;
          f.getContext("2d").drawImage(t, tx0, ty0, fw, fh, 0, 0, fw, fh);
          out.push({ url: f.toDataURL("image/webp", 0.92), w: fw, h: fh, x: a, y: top, row: r });
          continue;
        }

        out.push({ url: t.toDataURL("image/webp", 0.92), w, h, x: a, y: top, row: r });
      }
    }
    return out;
  },
  { b64, mime, rows }
);
await browser.close();

cut.forEach((f, i) => {
  const n = String(i + 1).padStart(2, "0");
  const path = `${outDir}/${prefix}_${n}.webp`;
  const bytes = Buffer.from(f.url.split(",")[1], "base64");
  writeFileSync(path, bytes);
  console.log(`${prefix}_${n}  ${f.w}x${f.h}  row ${f.row}  at ${f.x},${f.y}  ${(bytes.length / 1024).toFixed(0)}KB`);
});
console.log(`\n${cut.length} poses`);

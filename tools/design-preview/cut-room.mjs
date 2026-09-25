/*
 * A SHOP ROOM, FROM THE ONE PICTURE THE CHAT DREW.
 *
 * The chat draws the room and the counter in front of it as one image:
 * the panorama on top, and under it the counter on a "transparent"
 * background that is really a checkerboard PAINTED into the pixels.
 * Asked to separate them itself, it cropped the sides off the room and
 * stretched it, and its checkerboard removal ate every white bottle on
 * the counter along with the squares — because a white bottle and a
 * white square are the same colour.
 *
 * They are not the same PATTERN. A painted checkerboard is a regular
 * grid of two tones, so for every pixel we can predict which tone the
 * grid would have there. A cell is background only if nearly all of it
 * matches that prediction and it touches another background cell; a
 * bottle sitting on the grid breaks the pattern and survives, even
 * where it happens to be the same white.
 *
 *   node cut-room.mjs <original.png> <trade>
 *   → public/world/room_<trade>_pano.webp and room_<trade>_fore.webp
 */
import { readFileSync, writeFileSync } from "node:fs";
import { launchChromium } from "./browser.mjs";

const [src, trade] = process.argv.slice(2);
if (!src || !trade) { console.error("usage: node cut-room.mjs <original.png> <trade>"); process.exit(1); }
const OUT = new URL("./public/world/", import.meta.url).pathname;

const b = await launchChromium();
const p = await b.newPage();
await p.goto("about:blank");
const r = await p.evaluate(async (b64) => {
  const im = new Image(); im.src = "data:image/png;base64," + b64; await im.decode();
  const W = im.naturalWidth, H = im.naturalHeight;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, W, H).data;
  const lum = (i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  const chroma = (i) => Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);

  /* 1. Where the checkerboard starts: the first row, below the top third,
        in which most of the middle of the row is pale and colourless. */
  let boundary = -1;
  for (let y = Math.floor(H * 0.35); y < H; y++) {
    let n = 0, t = 0;
    for (let x = Math.floor(W * 0.3); x < W * 0.7; x += 2) { const i = (y * W + x) * 4; t++; if (chroma(i) < 12 && lum(i) > 170) n++; }
    if (n / t > 0.85) { boundary = y; break; }
  }
  /*
   * GREEN SCREEN: the better way, asked for from 2026-09-25 on. A flat
   * #00FF00 under the counter is removed exactly — no pattern to guess —
   * and the green that bleeds into an object's edge is taken back out of
   * the colour, so nothing on the counter wears a green halo.
   */
  const green = (i) => d[i + 1] > 190 && d[i] < 110 && d[i + 2] < 110 && d[i + 1] - Math.max(d[i], d[i + 2]) > 100;
  if (boundary < 0) {
    let gb = -1;
    for (let y = Math.floor(H * 0.35); y < H; y++) {
      let n = 0, t = 0;
      for (let x = Math.floor(W * 0.3); x < W * 0.7; x += 2) { t++; if (green((y * W + x) * 4)) n++; }
      if (n / t > 0.85) { gb = y; break; }
    }
    if (gb < 0) return { error: "no checkerboard or green band found" };
    /* the panorama ends where the green begins; walk up past any
       anti-aliased seam */
    const FH = H - gb;
    const fore = document.createElement("canvas"); fore.width = W; fore.height = FH;
    const fg = fore.getContext("2d"); const fi = fg.createImageData(W, FH); const A = fi.data;
    let cleared = 0;
    for (let y = 0; y < FH; y++) for (let x = 0; x < W; x++) {
      const i = ((y + gb) * W + x) * 4, o = (y * W + x) * 4;
      const r0 = d[i], g0 = d[i + 1], b0 = d[i + 2];
      const spill = g0 - Math.max(r0, b0);
      let a = 255;
      if (green(i)) a = 0;
      else if (spill > 25) a = Math.max(0, Math.min(255, 255 - (spill - 25) * 4));
      A[o] = r0; A[o + 1] = spill > 0 ? Math.max(r0, b0) + Math.min(spill, 12) : g0; A[o + 2] = b0; A[o + 3] = a;
      if (a === 0) cleared++;
    }
    fg.putImageData(fi, 0, 0);
    const pano = document.createElement("canvas"); pano.width = W; pano.height = gb - 2;
    pano.getContext("2d").drawImage(im, 0, 0, W, gb - 2, 0, 0, W, gb - 2);
    return { W, H, boundary: gb, cell: 0, lo: 0, hi: 0, mode: "green",
      clearedPct: Math.round((cleared / (W * FH)) * 100),
      pano: pano.toDataURL("image/webp", 0.9), fore: fore.toDataURL("image/webp", 0.9) };
  }

  /* 2. The grid: the two tones, the cell size and the phase, read from a
        row just inside the band where the middle is pure checkerboard. */
  const ry = boundary + 3;
  const xs = [], vals = [];
  for (let x = Math.floor(W * 0.3); x < W * 0.7; x++) { vals.push(lum((ry * W + x) * 4)); xs.push(x); }
  const sorted = [...vals].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.2)], hi = sorted[Math.floor(sorted.length * 0.8)];
  const mid = (lo + hi) / 2;
  const edges = [];
  for (let k = 1; k < vals.length; k++) if ((vals[k] > mid) !== (vals[k - 1] > mid)) edges.push(xs[k]);
  const runs = edges.slice(1).map((e, k) => e - edges[k]).sort((a, b) => a - b);
  const cell = runs[Math.floor(runs.length / 2)];
  if (!cell || cell < 4) return { error: "could not measure the grid", runs: runs.slice(0, 20) };
  const ox = ((edges[0] % cell) + cell) % cell;
  /* vertical phase: walk down a column from the boundary */
  const cx = xs[Math.floor(xs.length / 2)];
  let oy = boundary;
  for (let y = boundary + 1; y < boundary + cell * 3; y++) {
    if ((lum((y * W + cx) * 4) > mid) !== (lum(((y - 1) * W + cx) * 4) > mid)) { oy = y; break; }
  }
  oy = ((oy % cell) + cell) % cell;
  /* which parity is the light tone */
  const par0 = (Math.floor((cx - ox) / cell) + Math.floor((ry - oy) / cell)) & 1;
  const lightPar = lum((ry * W + cx) * 4) > mid ? par0 : 1 - par0;

  /* 3. PHASE-FREE: background is where BOTH tones live together.
        The painted squares are not exactly `cell` wide — they were
        resampled — so a predicted grid drifts out of phase across two
        thousand pixels (the first version of this cleared 0%). What
        does not drift is that any window of real checkerboard holds
        light and dark squares in about equal parts, while a white
        bottle holds only light. Counted with summed-area tables so it
        costs one pass whatever the window. */
  const FH = H - boundary;
  const tol = Math.max(10, (hi - lo) * 0.45);
  const isLo = new Uint8Array(W * FH), isHi = new Uint8Array(W * FH);
  for (let y = 0; y < FH; y++) for (let x = 0; x < W; x++) {
    const i = ((y + boundary) * W + x) * 4;
    if (chroma(i) > 14) continue;
    const L = lum(i);
    if (Math.abs(L - lo) < tol) isLo[y * W + x] = 1;
    else if (Math.abs(L - hi) < tol) isHi[y * W + x] = 1;
  }
  const sat = (a) => {
    const t = new Int32Array((W + 1) * (FH + 1));
    for (let y = 0; y < FH; y++) { let row = 0; for (let x = 0; x < W; x++) { row += a[y * W + x]; t[(y + 1) * (W + 1) + x + 1] = t[y * (W + 1) + x + 1] + row; } }
    return t;
  };
  const SL = sat(isLo), SHh = sat(isHi);
  const box = (t, x0, y0, x1, y1) => t[y1 * (W + 1) + x1] - t[y0 * (W + 1) + x1] - t[y1 * (W + 1) + x0] + t[y0 * (W + 1) + x0];
  const bgAt = (x, y, r, share) => {
    const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(W, x + r + 1), y1 = Math.min(FH, y + r + 1);
    const n = (x1 - x0) * (y1 - y0);
    const l = box(SL, x0, y0, x1, y1), h = box(SHh, x0, y0, x1, y1);
    return l / n >= share && h / n >= share;
  };
  const R1 = cell * 2, R2 = Math.max(3, Math.round(cell * 0.8));

  /* 4. The fore layer. A pixel is cleared if it is one of the two tones
        AND its neighbourhood is checkerboard — a wide window first, then
        a small one, which reaches the few squares showing between the
        leaves of a plant without eating into anything solid. */
  const fore = document.createElement("canvas"); fore.width = W; fore.height = FH;
  const fg = fore.getContext("2d"); const fi = fg.createImageData(W, FH);
  let cleared = 0;
  for (let y = 0; y < FH; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, i = ((y + boundary) * W + x) * 4, o = k * 4;
    /* The tone classes decide what the NEIGHBOURHOOD is; the pixel
       itself only has to be colourless and inside the grid's brightness
       range, because compression leaves in-between greys along every
       square's edge that belong to neither tone. */
    const i0 = ((y + boundary) * W + x) * 4, L0 = lum(i0);
    const inRange = chroma(i0) < 16 && L0 > lo - tol && L0 < hi + tol;
    const clear = inRange && (bgAt(x, y, R1, 0.3) || bgAt(x, y, R2, 0.22));
    fi.data[o] = d[i]; fi.data[o + 1] = d[i + 1]; fi.data[o + 2] = d[i + 2]; fi.data[o + 3] = clear ? 0 : 255;
    if (clear) cleared++;
  }
  /* 5. Specks: whatever opaque island is smaller than a few squares is
        a leftover of the grid, not an object — nothing on a counter is
        that small. */
  const A = fi.data, seen = new Uint8Array(W * FH), stack = [];
  const MIN = cell * cell * 6;
  for (let s0 = 0; s0 < W * FH; s0++) {
    if (seen[s0] || A[s0 * 4 + 3] === 0) continue;
    const comp = []; stack.push(s0); seen[s0] = 1;
    while (stack.length) {
      const q = stack.pop(); comp.push(q);
      const qx = q % W, qy = (q / W) | 0;
      for (const [nx, ny] of [[qx - 1, qy], [qx + 1, qy], [qx, qy - 1], [qx, qy + 1]]) {
        if (nx < 0 || ny < 0 || nx >= W || ny >= FH) continue;
        const n = ny * W + nx;
        if (!seen[n] && A[n * 4 + 3] !== 0) { seen[n] = 1; stack.push(n); }
      }
    }
    if (comp.length < MIN) for (const q of comp) { A[q * 4 + 3] = 0; cleared++; }
  }
  /* 6. The pale rim: a kept pixel on the edge that is much lighter than
        the pixel just inside it is the grid bleeding into the outline.
        Two passes, then a one-pixel soft edge so nothing is cut sharp. */
  const alphaAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= FH ? 0 : A[(y * W + x) * 4 + 3]);
  for (let pass = 0; pass < 5; pass++) {
    const kill = [];
    for (let y = 0; y < FH; y++) for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4; if (A[o + 3] === 0) continue;
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const open = dirs.find(([dx, dy]) => alphaAt(x + dx, y + dy) === 0);
      if (!open) continue;
      /* Compared with a pixel five in, not two: the flecks along the
         counter's top edge were thicker than two pixels, so the pixel
         "inside" was still fleck and the rule never fired. */
      const ix = x - open[0] * 5, iy = y - open[1] * 5;
      if (alphaAt(ix, iy) === 0) continue;
      const Lp = 0.299 * A[o] + 0.587 * A[o + 1] + 0.114 * A[o + 2];
      const q = (iy * W + ix) * 4, Li = 0.299 * A[q] + 0.587 * A[q + 1] + 0.114 * A[q + 2];
      const ch = Math.max(A[o], A[o + 1], A[o + 2]) - Math.min(A[o], A[o + 1], A[o + 2]);
      if (Lp > Li + 22 && ch < 50) kill.push(o);
    }
    for (const o of kill) A[o + 3] = 0;
  }
  const soft = new Uint8ClampedArray(W * FH);
  for (let y = 0; y < FH; y++) for (let x = 0; x < W; x++) {
    const a = alphaAt(x, y); if (!a) continue;
    const edge = !alphaAt(x + 1, y) || !alphaAt(x - 1, y) || !alphaAt(x, y + 1) || !alphaAt(x, y - 1);
    soft[y * W + x] = edge ? 150 : 255;
  }
  for (let k = 0; k < W * FH; k++) A[k * 4 + 3] = soft[k];
  fg.putImageData(fi, 0, 0);

  const pano = document.createElement("canvas"); pano.width = W; pano.height = boundary;
  pano.getContext("2d").drawImage(im, 0, 0, W, boundary, 0, 0, W, boundary);
  return {
    W, H, boundary, cell, ox, oy, lo: Math.round(lo), hi: Math.round(hi),
    clearedPct: Math.round((cleared / (W * FH)) * 100),
    pano: pano.toDataURL("image/webp", 0.9), fore: fore.toDataURL("image/webp", 0.9),
  };
}, readFileSync(src).toString("base64"));
await b.close();
if (r.error) { console.error("FAILED:", r.error, r.runs ?? ""); process.exit(1); }
writeFileSync(`${OUT}room_${trade}_pano.webp`, Buffer.from(r.pano.split(",")[1], "base64"));
writeFileSync(`${OUT}room_${trade}_fore.webp`, Buffer.from(r.fore.split(",")[1], "base64"));
console.log(r.mode === "green"
  ? `${trade}: ${r.W}x${r.H}, pano 0..${r.boundary - 3}, green screen, fore cleared ${r.clearedPct}%`
  : `${trade}: ${r.W}x${r.H}, pano 0..${r.boundary - 1}, grid cell ${r.cell}px tones ${r.lo}/${r.hi}, fore cleared ${r.clearedPct}%`);

/*
 * A PAINTED CHECKERBOARD, TAKEN OUT OF A WHOLE DRAWING.
 *
 * The chat says "transparent background" and paints the grey-and-white
 * squares that mean transparent INTO the pixels: measured, 0% of
 * hair_barbershop_hero V2 is transparent. Keying out "light grey and
 * white" would take the awning's white stripes and the barber pole with
 * it, because they are the same colours.
 *
 * They are not the same PATTERN. The grid's two tones are read off the
 * picture's border, where there is nothing but grid; a pixel is
 * background only if it is one of those greys AND its neighbourhood holds
 * both tones in about equal parts, which a white stripe never does. The
 * same rule as cut-room.mjs, over the whole picture instead of a band.
 *
 *   node knockout-checker.mjs <in.png> <out.webp>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { launchChromium } from "./browser.mjs";
const [src, out] = process.argv.slice(2);
const b = await launchChromium();
const p = await b.newPage();
await p.goto("about:blank");
const r = await p.evaluate(async (b64) => {
  const im = new Image(); im.src = "data:image/png;base64," + b64; await im.decode();
  const W = im.naturalWidth, H = im.naturalHeight;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0);
  const img = g.getImageData(0, 0, W, H); const d = img.data;
  const lum = (i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  const chroma = (i) => Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
  /* tones from the border frame */
  const vals = [];
  const fr = Math.max(4, Math.round(Math.min(W, H) * 0.015));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (x >= fr && x < W - fr && y >= fr && y < H - fr) continue;
    const i = (y * W + x) * 4; if (chroma(i) < 14) vals.push(lum(i));
  }
  vals.sort((a, b) => a - b);
  const lo = vals[Math.floor(vals.length * 0.2)], hi = vals[Math.floor(vals.length * 0.8)];
  if (!(hi - lo > 8)) return { error: `no two-tone grid on the border (${lo}/${hi})` };
  const tol = Math.max(10, (hi - lo) * 0.45);
  const isLo = new Uint8Array(W * H), isHi = new Uint8Array(W * H);
  for (let k = 0; k < W * H; k++) {
    const i = k * 4; if (chroma(i) > 14) continue;
    const L = lum(i);
    if (Math.abs(L - lo) < tol) isLo[k] = 1; else if (Math.abs(L - hi) < tol) isHi[k] = 1;
  }
  /* cell size, from runs along the top row */
  const runs = []; let last = -1, prev = -1;
  for (let x = 0; x < W; x++) { const t = isHi[x] ? 1 : isLo[x] ? 0 : -1; if (t !== prev && t >= 0) { if (last >= 0) runs.push(x - last); last = x; } if (t >= 0) prev = t; }
  runs.sort((a, b) => a - b);
  const cell = Math.max(4, runs[Math.floor(runs.length / 2)] || 10);
  const sat = (a) => { const t = new Int32Array((W + 1) * (H + 1)); for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { row += a[y * W + x]; t[(y + 1) * (W + 1) + x + 1] = t[y * (W + 1) + x + 1] + row; } } return t; };
  const SL = sat(isLo), SH = sat(isHi);
  const box = (t, x0, y0, x1, y1) => t[y1 * (W + 1) + x1] - t[y0 * (W + 1) + x1] - t[y1 * (W + 1) + x0] + t[y0 * (W + 1) + x0];
  const bgAt = (x, y, R, share) => { const x0 = Math.max(0, x - R), y0 = Math.max(0, y - R), x1 = Math.min(W, x + R + 1), y1 = Math.min(H, y + R + 1); const n = (x1 - x0) * (y1 - y0); return box(SL, x0, y0, x1, y1) / n >= share && box(SH, x0, y0, x1, y1) / n >= share; };
  const R1 = cell * 2, R2 = Math.max(3, Math.round(cell * 0.8));
  const A = new Uint8ClampedArray(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, i = k * 4, L = lum(i);
    const inRange = chroma(i) < 16 && L > lo - tol && L < hi + tol;
    A[k] = inRange && (bgAt(x, y, R1, 0.3) || bgAt(x, y, R2, 0.22)) ? 0 : 255;
  }
  /* specks */
  const seen = new Uint8Array(W * H), stack = [], MIN = cell * cell * 6;
  for (let s0 = 0; s0 < W * H; s0++) {
    if (seen[s0] || !A[s0]) continue;
    const comp = []; stack.push(s0); seen[s0] = 1;
    while (stack.length) { const q = stack.pop(); comp.push(q); const qx = q % W, qy = (q / W) | 0;
      for (const n of [qx > 0 ? q - 1 : -1, qx < W - 1 ? q + 1 : -1, qy > 0 ? q - W : -1, qy < H - 1 ? q + W : -1]) if (n >= 0 && !seen[n] && A[n]) { seen[n] = 1; stack.push(n); } }
    if (comp.length < MIN) for (const q of comp) A[q] = 0;
  }
  /* soft one-pixel edge */
  let clear = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x; if (!A[k]) { d[k * 4 + 3] = 0; clear++; continue; }
    const edge = (x > 0 && !A[k - 1]) || (x < W - 1 && !A[k + 1]) || (y > 0 && !A[k - W]) || (y < H - 1 && !A[k + W]);
    d[k * 4 + 3] = edge ? 160 : 255;
  }
  g.putImageData(img, 0, 0);
  return { W, H, lo: Math.round(lo), hi: Math.round(hi), cell, clearPct: Math.round((clear / (W * H)) * 100), url: c.toDataURL("image/webp", 0.92) };
}, readFileSync(src).toString("base64"));
await b.close();
if (r.error) { console.error("FAILED:", r.error); process.exit(1); }
writeFileSync(out, Buffer.from(r.url.split(",")[1], "base64"));
console.log(`${r.W}x${r.H} grid ${r.cell}px tones ${r.lo}/${r.hi} → ${r.clearPct}% cleared`);

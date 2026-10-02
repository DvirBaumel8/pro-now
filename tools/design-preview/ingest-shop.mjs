/*
 * ONE SHOP, FROM THE CHAT'S ZIP TO THE CITY.
 *
 * The brief of 2026-09-25 asks the chat for seven drawings per shop, each
 * its own drawing, anything that needs a transparent background drawn on
 * flat #00FF00. This takes that ZIP's folder and puts every file where the
 * city looks for it:
 *
 *   <id>_street.png     → shop_<id>.webp            the facade in the street
 *   <id>_hero.png       → hero_<id>.webp            the building at the door
 *   <id>_venue.png      → venue_<id>.webp           the shop open, its pro inside (order sheet)
 *   <id>_wall_back.png  → room_<id>_back.webp       the room, a real box
 *   <id>_wall_left.png  → room_<id>_left.webp
 *   <id>_wall_right.png → room_<id>_right.webp
 *   <id>_floor.png      → room_<id>_floor.webp
 *   <id>_props.png      → room_<id>_prop1..N.webp   each piece cut apart
 *
 * Green is keyed out with its spill taken back out of the colour, so no
 * edge wears a green halo. The props sheet is split where a run of empty
 * columns separates two pieces, and each piece is trimmed to itself.
 * A file that did not arrive is reported and skipped, never guessed.
 *
 *   node ingest-shop.mjs <folder> <id>
 */
import { existsSync, readFileSync, renameSync, writeFileSync, mkdirSync } from "node:fs";
import { launchChromium } from "./browser.mjs";

const [dir, id] = process.argv.slice(2);
if (!dir || !id) { console.error("usage: node ingest-shop.mjs <folder> <id>"); process.exit(1); }
const OUT = new URL("./public/world/", import.meta.url).pathname;

const b = await launchChromium();
const p = await b.newPage();
await p.goto("about:blank");

/** key: remove green; split: cut into pieces by empty columns. */
const run = (file, { key, split, trim }) =>
  p.evaluate(async ({ b64, key, split, trim }) => {
    const im = new Image(); im.src = "data:image/png;base64," + b64; await im.decode();
    let W = im.naturalWidth, H = im.naturalHeight;
    let c = document.createElement("canvas"); c.width = W; c.height = H;
    let g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0);
    /*
     * A WALL WITH A GREEN HEM. The chat, asked for a wall right after a
     * sheet on #00FF00, sometimes paints a band of that green along an
     * edge — and in the room it showed as a neon-green strip under the
     * ceiling. Rows and columns that are screen green are cut off.
     */
    if (trim) {
      const d0 = g.getImageData(0, 0, W, H).data;
      const isG = (x, y) => { const i = (y * W + x) * 4; return d0[i + 1] > 190 && d0[i] < 110 && d0[i + 2] < 110; };
      const rowG = (y) => { let n = 0; for (let x = 0; x < W; x += 8) n += isG(x, y); return n / (W / 8); };
      const colG = (x) => { let n = 0; for (let y = 0; y < H; y += 8) n += isG(x, y); return n / (H / 8); };
      let t = 0, b2 = H - 1, l = 0, r = W - 1;
      while (t < H / 4 && rowG(t) > 0.02) t++;
      while (b2 > H * 3 / 4 && rowG(b2) > 0.02) b2--;
      while (l < W / 4 && colG(l) > 0.02) l++;
      while (r > W * 3 / 4 && colG(r) > 0.02) r--;
      if (t || l || b2 < H - 1 || r < W - 1) {
        const c2 = document.createElement("canvas"); c2.width = r - l + 1; c2.height = b2 - t + 1;
        c2.getContext("2d").drawImage(c, l, t, c2.width, c2.height, 0, 0, c2.width, c2.height);
        c = c2; W = c.width; H = c.height; g = c.getContext("2d", { willReadFrequently: true });
      }
    }
    const img = g.getImageData(0, 0, W, H); const d = img.data;
    let greenPx = 0;
    if (key) {
      for (let k = 0; k < W * H; k++) {
        const i = k * 4, r = d[i], gg = d[i + 1], bl = d[i + 2];
        const spill = gg - Math.max(r, bl);
        /* Pure screen green only: a leaf is green too, but never this bright
           and this clean — (80,170,60) stays, (20,250,30) goes. */
        if (gg > 190 && r < 110 && bl < 110 && spill > 100) { d[i + 3] = 0; greenPx++; continue; }
        if (spill > 20 && gg > 150) {
          d[i + 3] = Math.max(0, Math.min(d[i + 3], 255 - (spill - 20) * 4));
          d[i + 1] = Math.max(r, bl) + Math.min(spill, 10);
        }
      }
      /* one-pixel feather on the cut edge */
      const A = new Uint8ClampedArray(W * H);
      for (let k = 0; k < W * H; k++) A[k] = d[k * 4 + 3];
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const k = y * W + x; if (!A[k]) continue;
        if (!A[k - 1] || !A[k + 1] || !A[k - W] || !A[k + W]) d[k * 4 + 3] = Math.min(A[k], 170);
      }
      g.putImageData(img, 0, 0);
    }
    const shares = { green: greenPx / (W * H) };
    const enc = (cv) => cv.toDataURL("image/webp", 0.92);
    if (!split) return { W, H, shares, parts: [enc(c)] };
    /*
     * PIECES BY SHAPE, NOT BY COLUMN.
     *
     * The props sheet came back in two rows — three chairs over a counter
     * and a sofa — and a column split cannot separate things stacked
     * above each other. So each piece is a connected blob of opaque
     * pixels, found on a quarter-size mask with a small dilation (a chair's
     * base and its seat are one piece even where a thin stem joins them),
     * and blobs whose boxes nearly touch are merged.
     */
    const S = 4, w = Math.ceil(W / S), h = Math.ceil(H / S);
    const m = new Uint8Array(w * h);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 60) m[((y / S) | 0) * w + ((x / S) | 0)] = 1;
    const dil = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let on = 0;
      for (let dy = -2; dy <= 2 && !on; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h && m[yy * w + xx]) { on = 1; break; }
      }
      dil[y * w + x] = on;
    }
    const lab = new Int32Array(w * h).fill(-1), boxes = [];
    for (let s0 = 0; s0 < w * h; s0++) {
      if (!dil[s0] || lab[s0] >= 0) continue;
      const id = boxes.length, st = [s0]; lab[s0] = id;
      let x0 = w, y0 = h, x1 = 0, y1 = 0, n = 0;
      while (st.length) {
        const q = st.pop(), qx = q % w, qy = (q / w) | 0; n++;
        if (qx < x0) x0 = qx; if (qx > x1) x1 = qx; if (qy < y0) y0 = qy; if (qy > y1) y1 = qy;
        for (const nb of [qx > 0 ? q - 1 : -1, qx < w - 1 ? q + 1 : -1, qy > 0 ? q - w : -1, qy < h - 1 ? q + w : -1])
          if (nb >= 0 && dil[nb] && lab[nb] < 0) { lab[nb] = id; st.push(nb); }
      }
      boxes.push({ x0, y0, x1, y1, n });
    }
    let bx = boxes.filter((b0) => b0.n > w * h * 0.008);
    const near = (a0, b0) => a0.x0 <= b0.x1 + 3 && b0.x0 <= a0.x1 + 3 && a0.y0 <= b0.y1 + 3 && b0.y0 <= a0.y1 + 3;
    for (let merged = true; merged; ) {
      merged = false;
      outer: for (let i = 0; i < bx.length; i++) for (let j = i + 1; j < bx.length; j++) if (near(bx[i], bx[j])) {
        const A0 = bx[i], B0 = bx[j];
        bx[i] = { x0: Math.min(A0.x0, B0.x0), y0: Math.min(A0.y0, B0.y0), x1: Math.max(A0.x1, B0.x1), y1: Math.max(A0.y1, B0.y1), n: A0.n + B0.n };
        bx.splice(j, 1); merged = true; break outer;
      }
    }
    /*
     * A ROW OF PIECES STANDING CLOSE.
     *
     * The briefs now ask for one row, and the pieces come back a few pixels
     * apart — closer than the blob merge above tolerates, so four pieces
     * became one. Where the sheet has clean empty columns between pieces,
     * those gaps are the cut.
     */
    {
      const col = new Uint16Array(W);
      for (let x = 0; x < W; x++) for (let y = 0; y < H; y += 2) if (d[(y * W + x) * 4 + 3] > 60) col[x]++;
      const segs = []; let st = -1;
      for (let x = 0; x <= W; x++) {
        const on = x < W && col[x] > 1;
        if (on && st < 0) st = x;
        if (!on && st >= 0) { if (x - st > W * 0.03) segs.push([st, x - 1]); st = -1; }
      }
      if (segs.length > bx.length) {
        bx = segs.map(([a, z]) => {
          let y0 = H, y1 = 0;
          for (let y = 0; y < H; y++) for (let x = a; x <= z; x += 2) if (d[(y * W + x) * 4 + 3] > 60) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
          return { x0: Math.floor(a / S), y0: Math.floor(y0 / S), x1: Math.floor(z / S), y1: Math.floor(y1 / S), n: 1 };
        });
      }
    }
    const parts = [];
    for (const r of bx) {
      const X0 = Math.max(0, r.x0 * S - 2), Y0 = Math.max(0, r.y0 * S - 2);
      const X1 = Math.min(W - 1, r.x1 * S + S + 1), Y1 = Math.min(H - 1, r.y1 * S + S + 1);
      const cv = document.createElement("canvas"); cv.width = X1 - X0 + 1; cv.height = Y1 - Y0 + 1;
      cv.getContext("2d").drawImage(c, X0, Y0, cv.width, cv.height, 0, 0, cv.width, cv.height);
      parts.push(enc(cv));
    }
    return { W, H, shares, parts };
  }, { b64: readFileSync(file).toString("base64"), key, split, trim });

const plan = [
  [`${id}_street.png`, [`shop_${id}.webp`], { key: true }],
  [`${id}_hero.png`, [`hero_${id}.webp`], { key: true }],
  [`${id}_venue.png`, [`venue_${id}.webp`], { key: true }],
  [`${id}_wall_back.png`, [`room_${id}_back.webp`], { trim: true }],
  [`${id}_wall_left.png`, [`room_${id}_left.webp`], { trim: true }],
  [`${id}_wall_right.png`, [`room_${id}_right.webp`], { trim: true }],
  [`${id}_floor.png`, [`room_${id}_floor.webp`], { trim: true }],
  [`${id}_props.png`, null, { key: true, split: true }],
];
for (const [name, outs, opt] of plan) {
  const f = `${dir}/${name}`;
  if (!existsSync(f)) { console.log(`  missing  ${name}`); continue; }
  const r = await run(f, opt);
  const files = outs ?? r.parts.map((_, i) => `room_${id}_prop${i + 1}.webp`);
  r.parts.forEach((u, i) => writeFileSync(OUT + files[i], Buffer.from(u.split(",")[1], "base64")));
  const green = opt.key ? ` green removed ${Math.round(r.shares.green * 100)}%` : "";
  console.log(`  ${name.padEnd(22)} ${r.W}x${r.H}${green} → ${files.join(", ")}`);
}
/*
 * A new street facade makes the old one's depth map wrong: displacement
 * drawn for different windows bends the new drawing's letters. So when a
 * facade arrives, the stale `shop_<id>_height` is moved aside (to
 * public/world/_retired/, never deleted) until a matching one is drawn.
 */
if (existsSync(`${dir}/${id}_street.png`)) {
  for (const sub of ["", "s/", "m/"]) {
    const f = `${OUT}${sub}shop_${id}_height.webp`;
    if (!existsSync(f)) continue;
    mkdirSync(`${OUT}_retired/${sub}`, { recursive: true });
    renameSync(f, `${OUT}_retired/${sub}shop_${id}_height.webp`);
    console.log(`  retired  ${sub}shop_${id}_height.webp (drawn for the old facade)`);
  }
}
await b.close();

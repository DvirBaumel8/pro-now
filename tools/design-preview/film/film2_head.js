// PRO NOW — explainer film composer. Draws every frame on a 1920×1080 canvas
// from the real app recordings and our own art, and scores it procedurally.
const W = 1920, H = 1080, FPS = 30;
export const DURATION = 135.5;
const CORAL = '#FF6B4A', GREEN = '#2FBF8A', INK = '#150F1D';

const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
document.body.appendChild(cv);
let g = cv.getContext('2d');

// ---------- helpers ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eo = (x) => 1 - Math.pow(1 - x, 3);
const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a, b, k) => a + (b - a) * k;
const inOut = (t, a, b, fi = 0.45, fo = 0.4) => Math.min(eo(seg(t, a, a + fi)), 1 - seg(t, b - fo, b));

const imgs = {};
async function loadImg(key, url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('missing ' + url);
  imgs[key] = await createImageBitmap(await r.blob());
}

// clips: frame sequences recorded from the real app / city
const clips = {};
async function loadClip(name) {
  const j = await (await fetch(`m/${name}/index.json`)).json();
  clips[name] = { frames: j.frames, marks: j.marks, cache: new Map() };
}
function frameName(name, t) {
  const f = clips[name].frames;
  let lo = 0, hi = f.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (f[m].t <= t) lo = m; else hi = m - 1; }
  return f[lo].f;
}
async function frame(name, t) {
  const c = clips[name]; const fn = frameName(name, t);
  if (c.cache.has(fn)) { const hit = c.cache.get(fn); c.cache.delete(fn); c.cache.set(fn, hit); return hit; }
  const bm = await createImageBitmap(await (await fetch(`m/${name}/${fn}`)).blob());
  c.cache.set(fn, bm);
  if (c.cache.size > 24) { const k = c.cache.keys().next().value; c.cache.get(k).close(); c.cache.delete(k); }
  return bm;
}

function font(size, weight = 700) { g.font = `${weight} ${size}px Heebo, "Arial Hebrew", sans-serif`; }
function wrap(str, maxW) {
  const words = str.split(' '); const lines = []; let cur = '';
  for (const w of words) { const test = cur ? cur + ' ' + w : w; if (g.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test; }
  if (cur) lines.push(cur); return lines;
}
function text(str, x, y, { size = 40, weight = 700, color = '#fff', align = 'center', alpha = 1, maxW = 0, lh = 1.3, shadow = true, dir = 'rtl' } = {}) {
  if (alpha <= 0) return 0;
  g.save(); g.globalAlpha *= alpha; font(size, weight); g.direction = dir; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = color;
  if (shadow) { g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = size * 0.35; g.shadowOffsetY = size * 0.06; }
  const lines = maxW ? wrap(str, maxW) : [str];
  lines.forEach((l, i) => g.fillText(l, x, y + i * size * lh));
  g.restore(); return lines.length * size * lh;
}
function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function cover(img, x, y, w, h, zoom = 1, fx = 0.5, fy = 0.5) {
  const s = Math.max(w / img.width, h / img.height) * zoom;
  const dw = img.width * s, dh = img.height * s;
  g.drawImage(img, x + (w - dw) * fx, y + (h - dh) * fy, dw, dh);
}
function chip(str, x, y, { size = 26, bg = CORAL, color = '#fff', alpha = 1, scale = 1 } = {}) {
  if (alpha <= 0) return;
  g.save(); g.globalAlpha *= alpha; g.translate(x, y); g.scale(scale, scale); font(size, 700);
  const w = g.measureText(str).width + size * 1.4, h = size * 1.9;
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 18; g.fillStyle = bg; rr(-w / 2, -h / 2, w, h, h / 2); g.fill();
  g.shadowBlur = 0; g.fillStyle = color; g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(str, 0, 2);
  g.restore();
}

// a waist-up figure that dissolves into the floor at its cut
const figC = document.createElement('canvas'); const figG = figC.getContext('2d');
function figure(img, cx, top, h, alpha = 1) {
  const w = img.width * h / img.height; figC.width = Math.ceil(w); figC.height = Math.ceil(h);
  figG.clearRect(0, 0, w, h); figG.globalCompositeOperation = 'source-over'; figG.drawImage(img, 0, 0, w, h);
  const gr = figG.createLinearGradient(0, h * 0.72, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
  figG.globalCompositeOperation = 'destination-out'; figG.fillStyle = gr; figG.fillRect(0, 0, w, h);
  g.save(); g.globalAlpha *= alpha; g.drawImage(figC, cx - w / 2, top); g.restore();
}

// ---------- backgrounds ----------
let bgCanvas;
function buildBackground() {
  bgCanvas = document.createElement('canvas'); bgCanvas.width = 2300; bgCanvas.height = 1300;
  const b = bgCanvas.getContext('2d');
  b.filter = 'blur(22px) brightness(0.62) saturate(1.25)';
  const img = imgs.splash; const s = Math.max(2300 / img.width, 1300 / img.height) * 1.08;
  b.drawImage(img, (2300 - img.width * s) / 2, (1300 - img.height * s) / 2, img.width * s, img.height * s);
  b.filter = 'none';
  const gr = b.createLinearGradient(0, 0, 0, 1300); gr.addColorStop(0, 'rgba(24,14,40,.55)'); gr.addColorStop(1, 'rgba(20,10,26,.78)');
  b.fillStyle = gr; b.fillRect(0, 0, 2300, 1300);
}
const bokeh = Array.from({ length: 26 }, (_, i) => ({ x: (i * 397) % W, y: (i * 613) % H, r: 6 + (i * 7) % 22, sp: 8 + (i % 5) * 5, hue: i % 3 }));
function drawBg(t, warm = 0) {
  const dx = -150 + Math.sin(t * 0.05) * 120, dy = -90 + Math.cos(t * 0.04) * 60;
  g.drawImage(bgCanvas, dx, dy);
  const rg = g.createRadialGradient(W * 0.5, H * 0.45, 50, W * 0.5, H * 0.45, 1100);
  rg.addColorStop(0, `rgba(255,107,74,${0.16 + warm * 0.1})`); rg.addColorStop(1, 'rgba(255,107,74,0)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  g.save();
  for (const p of bokeh) {
    const y = ((p.y - t * p.sp) % (H + 60) + H + 60) % (H + 60) - 30;
    g.globalAlpha = 0.08 + 0.06 * Math.sin(t * 0.8 + p.x);
    g.fillStyle = ['#FFB38A', '#FF6B4A', '#FFE3A3'][p.hue];
    g.beginPath(); g.arc(p.x + Math.sin(t * 0.3 + p.r) * 30, y, p.r, 0, Math.PI * 2); g.fill();
  }
  g.restore();
  vignette(0.55);
}
function vignette(a) {
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${a})`);
  g.fillStyle = v; g.fillRect(0, 0, W, H);
}

// ---------- phone ----------
function phone(img, cx, cy, h, { alpha = 1, dim = 0, glow = 0, label = '', rot = 0, scale = 1 } = {}) {
  if (alpha <= 0) return;
  const w = h * 390 / 844, pad = h * 0.016;
  g.save(); g.globalAlpha *= alpha; g.translate(cx, cy); g.rotate(rot); g.scale(scale, scale);
  g.shadowColor = glow > 0 ? `rgba(255,107,74,${0.55 * glow})` : 'rgba(0,0,0,.55)'; g.shadowBlur = glow > 0 ? 70 : 50; g.shadowOffsetY = glow > 0 ? 0 : 24;
  g.fillStyle = '#0B0910'; rr(-w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2, h * 0.072); g.fill();
  g.shadowBlur = 0; g.shadowOffsetY = 0;
  g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2; g.stroke();
  g.save(); rr(-w / 2, -h / 2, w, h, h * 0.06); g.clip();
  if (img) g.drawImage(img, -w / 2, -h / 2, w, h);
  if (dim > 0) { g.fillStyle = `rgba(12,8,20,${dim})`; g.fillRect(-w / 2, -h / 2, w, h); }
  g.restore();
  if (glow > 0) { g.strokeStyle = `rgba(255,120,90,${0.9 * glow})`; g.lineWidth = 4; rr(-w / 2 - pad - 3, -h / 2 - pad - 3, w + pad * 2 + 6, h + pad * 2 + 6, h * 0.075); g.stroke(); }
  g.restore();
  if (label) chip(label, cx, cy + (h / 2 + 44) * scale, { size: 24, bg: glow > 0.5 ? CORAL : 'rgba(255,255,255,.16)', alpha: alpha });
}

// step caption block (number, title, sub) anchored at centre x
function caption(t, t0, t1, n, title, sub, cx, cy, maxW = 560) {
  const a = inOut(t, t0, t1, 0.5, 0.35); if (a <= 0) return;
  const up = (1 - eo(seg(t, t0, t0 + 0.6))) * 30;
  g.save(); g.globalAlpha = a; g.translate(0, up);
  if (n) {
    const s = 0.6 + 0.4 * eo(seg(t, t0, t0 + 0.5));
    g.save(); g.translate(cx, cy - 120); g.scale(s, s);
    g.shadowColor = 'rgba(255,107,74,.7)'; g.shadowBlur = 40; g.fillStyle = CORAL; g.beginPath(); g.arc(0, 0, 44, 0, Math.PI * 2); g.fill();
    g.shadowBlur = 0; font(46, 900); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 0, 3);
    g.restore();
  }
  const th = text(title, cx, cy - 20, { size: 54, weight: 800, maxW, lh: 1.18 });
  const sa = eo(seg(t, t0 + 0.35, t0 + 0.9));
  if (sub) text(sub, cx, cy - 20 + th + 12, { size: 31, weight: 400, color: 'rgba(255,255,255,.86)', maxW, alpha: sa, lh: 1.42 });
  g.restore();
}

// travelling signal between the two phones
function ping(t, t0, from, to, label) {
  const k = seg(t, t0, t0 + 1.0); if (k <= 0 || k >= 1) return;
  const e = eio(k);
  const x = lerp(from[0], to[0], e), y = lerp(from[1], to[1], e) - Math.sin(e * Math.PI) * 170;
  g.save();
  for (let i = 8; i >= 0; i--) {
    const kk = clamp(e - i * 0.025); const xx = lerp(from[0], to[0], kk), yy = lerp(from[1], to[1], kk) - Math.sin(kk * Math.PI) * 170;
    g.globalAlpha = (1 - i / 9) * 0.5; g.fillStyle = '#FFB199'; g.beginPath(); g.arc(xx, yy, 14 - i, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1; g.shadowColor = CORAL; g.shadowBlur = 45; g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 16, 0, Math.PI * 2); g.fill();
  g.restore();
  chip(label, x, y - 52, { size: 24, alpha: Math.min(1, k * 5, (1 - k) * 5) });
}

function logo(cx, cy, size, a = 1) {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a; font(size, 900); g.direction = 'ltr'; g.textBaseline = 'middle';
  const w1 = g.measureText('PRO ').width, w2 = g.measureText('NOW').width; const x0 = cx - (w1 + w2) / 2;
  g.shadowColor = 'rgba(255,107,74,.65)'; g.shadowBlur = size * 0.45;
  g.textAlign = 'left'; g.fillStyle = '#fff'; g.fillText('PRO ', x0, cy); g.fillStyle = CORAL; g.fillText('NOW', x0 + w1, cy);
  g.restore();
}


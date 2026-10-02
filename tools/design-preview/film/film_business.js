// PRO NOW — explainer film composer. Draws every frame on a 1920×1080 canvas
// from the real app recordings and our own art, and scores it procedurally.
const W = 1920, H = 1080, FPS = 30;
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
  clips[name] = { frames: j.frames, marks: j.marks, rects: j.rects || [], cache: new Map() };
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

const WHICH = 'business';
// ============ PRO NOW — two short films: the customer's and the professional's ============
function hudFont(size, w = 900) { g.font = `${w} ${size}px Orbitron, Heebo, sans-serif`; }
const PXc = 620, PYc = 540, PHc = 960, PWc = PHc * 390 / 844;
function rectOf(clip, label) { return clips[clip].rects?.find((r) => r.label === label)?.r ?? { x: 0.1, y: 0.4, w: 0.8, h: 0.1 }; }

// the phone, big; the camera leans into the one thing that matters
async function phoneShot(lt, cfg) {
  let src = cfg.src0 + lt * (cfg.speed ?? 1);
  if (cfg.skip && src >= cfg.skip[0]) src += cfg.skip[1] - cfg.skip[0];
  src = Math.min(cfg.src1 ?? 1e9, src);
  const img = await frame(cfg.clip, src);
  let k = 0, rect = null, zz = 1;
  for (const z of cfg.zooms ?? []) {
    const kk = eio(inOut(lt, z.a, z.b, 0.9, 0.7));
    if (kk > k) { k = kk; rect = z.rect ?? rectOf(cfg.clip, z.r); zz = z.z ?? 1.7; }
  }
  const s = lerp(1, zz, k);
  const rcx = rect ? rect.x + rect.w / 2 : 0.5, rcy = rect ? rect.y + rect.h / 2 : 0.5;
  const cx = lerp(PXc, PXc - (rcx - 0.5) * PWc * s, k), cy = lerp(PYc, 540 - (rcy - 0.5) * PHc * s, k);
  const inK = eo(seg(lt, 0, 0.7));
  g.save(); g.beginPath(); g.rect(0, 0, 1160, H); g.clip();
  phone(img, cx, cy + (1 - inK) * 50, PHc, { glow: 1, scale: s * (0.96 + 0.04 * inK), alpha: inK });
  if (rect && k > 0.02) {
    const x = cx + (rect.x - 0.5) * PWc * s, y = cy + (rect.y - 0.5) * PHc * s, w = rect.w * PWc * s, h = rect.h * PHc * s;
    g.save(); g.globalAlpha = k * 0.9; g.strokeStyle = CORAL; g.lineWidth = 5; g.shadowColor = CORAL; g.shadowBlur = 30;
    rr(x - 12, y - 12, w + 24, h + 24, 20); g.stroke(); g.restore();
  }
  g.restore();
}
// one sentence, big
function line(lt, dur, title, sub) {
  const a = inOut(lt, 0.35, dur, 0.55, 0.4); if (a <= 0) return;
  const up = (1 - eo(seg(lt, 0.35, 1.0))) * 36;
  g.save(); g.globalAlpha = a; g.translate(0, up);
  const th = text(title, 1810, 470, { size: 92, weight: 900, align: 'right', maxW: 640, lh: 1.1 });
  if (sub) text(sub, 1810, 470 + th + 10, { size: 40, weight: 500, align: 'right', maxW: 640, lh: 1.35, color: 'rgba(255,255,255,.85)', alpha: eo(seg(lt, 0.9, 1.5)) });
  g.restore();
}
function beat(cfg) {
  return async (lt, dur, T) => { drawBg(T, cfg.warm ?? 0.45); await phoneShot(lt, cfg); line(lt, dur, cfg.title, cfg.sub); };
}

// the futuristic clock — a ring of sixty segments, the time in HUD digits
function hudClock(cx, cy, R, hh, mm, ss, frac, a, red) {
  g.save(); g.globalAlpha = a;
  for (let i = 0; i < 60; i++) {
    const on = i / 60 < frac; const ang = -Math.PI / 2 + (i / 60) * Math.PI * 2;
    g.strokeStyle = on ? (red ? '#FF4D5E' : '#6FE3FF') : 'rgba(111,227,255,.12)'; g.lineWidth = R * 0.06;
    g.beginPath(); g.arc(cx, cy, R, ang + 0.012, ang + Math.PI * 2 / 60 - 0.02); g.stroke();
  }
  hudFont(R * 0.52); g.fillStyle = '#EAFBFF'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = red ? '#FF4D5E' : '#6FE3FF'; g.shadowBlur = 30;
  g.fillText(`${hh}:${mm}`, cx, cy - R * 0.05);
  hudFont(R * 0.2, 700); g.fillStyle = red ? '#FF6B7A' : '#6FE3FF'; g.fillText(ss, cx, cy + R * 0.38);
  g.restore();
}
function hudBackdrop(img, lt) {
  g.save(); g.filter = 'brightness(0.3) saturate(0.55) blur(2px)'; cover(img, 0, 0, W, H, 1.12 + lt * 0.006); g.filter = 'none'; g.restore();
  g.fillStyle = 'rgba(6,12,26,.5)'; g.fillRect(0, 0, W, H);
  g.save(); g.strokeStyle = 'rgba(111,227,255,.05)'; g.lineWidth = 1;
  for (let x = 0; x < W; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0; y < H; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.fillStyle = 'rgba(111,227,255,.05)'; g.fillRect(0, (lt * 240) % H, W, 36);
  g.strokeStyle = 'rgba(111,227,255,.45)'; g.lineWidth = 3;
  for (const [x, y, dx, dy] of [[60, 60, 1, 1], [W - 60, 60, -1, 1], [60, H - 60, 1, -1], [W - 60, H - 60, -1, -1]]) { g.beginPath(); g.moveTo(x, y + dy * 50); g.lineTo(x, y); g.lineTo(x + dx * 50, y); g.stroke(); }
  g.restore();
  vignette(0.7);
}
function strike(str, x, y, size, a, k) {
  text(str, x, y, { size, weight: 700, alpha: a });
  if (k <= 0 || a <= 0) return;
  g.save(); g.globalAlpha = a; font(size, 700); const w = g.measureText(str).width;
  g.strokeStyle = '#FF4D5E'; g.lineWidth = 6; g.shadowColor = '#FF4D5E'; g.shadowBlur = 14;
  g.beginPath(); g.moveTo(x + w / 2, y + 4); g.lineTo(x + w / 2 - w * k, y + 4); g.stroke(); g.restore();
}

// ---------------- the customer's opening ----------------
async function customerProblem(lt, dur, T) {
  hudBackdrop(await frame('arrive', 0.9), lt);
  const sec = 40 * 60 + Math.floor(lt * 7);
  const red = lt > 6.2;
  hudClock(W / 2, 330, 190, '21', String(Math.floor(sec / 60) % 60).padStart(2, '0'), String(sec % 60).padStart(2, '0'), Math.max(0, 1 - lt / 9.5), inOut(lt, 0.2, dur, 0.5, 0.3), red);
  text('משהו נשבר בבית.', W / 2, 640, { size: 76, weight: 900, alpha: inOut(lt, 0.9, 4.2, 0.5, 0.3) });
  ['מתקשרים לאחד.', 'לשני.', 'לשלישי.'].forEach((s, i) => {
    const a = inOut(lt, 4.1 + i * 0.6, 8.0, 0.3, 0.3);
    strike(s, W / 2 + (1 - i) * 380, 640, 64, a, eo(seg(lt, 4.45 + i * 0.6, 4.85 + i * 0.6)));
  });
  text('ואף אחד לא פנוי עכשיו.', W / 2, 770, { size: 68, weight: 900, color: '#FFB3BC', alpha: inOut(lt, 6.2, 8.4, 0.5, 0.35) });
  const bl = seg(lt, dur - 0.6, dur); if (bl > 0) { g.fillStyle = `rgba(0,0,0,${bl})`; g.fillRect(0, 0, W, H); }
}
// ---------------- the professional's opening ----------------
async function proProblem(lt, dur, T) {
  hudBackdrop(await frame('arrive', 3.8), lt);
  const mins = 8 * 60 + Math.floor(lt * 58); // the day goes by
  const hh = String(Math.floor(mins / 60)).padStart(2, '0'), mm = String(mins % 60).padStart(2, '0');
  const red = lt > 6.2;
  hudClock(W / 2 + 330, 330, 175, hh, mm, String(Math.floor(lt * 37) % 60).padStart(2, '0'), 1 - lt / 9.5, inOut(lt, 0.2, dur, 0.5, 0.3), red);
  g.save(); g.globalAlpha = inOut(lt, 0.3, dur, 0.6, 0.3); g.filter = 'saturate(0.35) brightness(0.8)';
  figure(imgs.ic_home, 560, 190 + Math.sin(T * 1.2) * 4, 700); g.filter = 'none'; g.restore();
  const rows = [['08:00', 'מחכה שהטלפון יצלצל'], ['11:30', 'עוד מודעה בקבוצה'], ['14:00', 'לקוח ביטל']];
  rows.forEach(([t, s], i) => {
    const a = inOut(lt, 1.2 + i * 1.3, 8.2, 0.35, 0.3); if (a <= 0) return;
    const y = 590 + i * 84;
    g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(8,18,34,.72)'; g.strokeStyle = 'rgba(111,227,255,.35)'; g.lineWidth = 2; rr(1110, y - 34, 700, 68, 14); g.fill(); g.stroke(); g.restore();
    text(s, 1650, y, { size: 36, weight: 700, align: 'right', alpha: a, shadow: false });
    g.save(); g.globalAlpha = a; hudFont(28, 700); g.fillStyle = '#6FE3FF'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(t, 1140, y); g.restore();
  });
  text('עוד יום בלי עבודה.', W / 2 + 330, 880, { size: 68, weight: 900, color: '#FFB3BC', alpha: inOut(lt, 5.4, 8.4, 0.5, 0.35) });
  const bl = seg(lt, dur - 0.6, dur); if (bl > 0) { g.fillStyle = `rgba(0,0,0,${bl})`; g.fillRect(0, 0, W, H); }
}
function reveal(tagline, sub) {
  return async (lt, dur) => {
    const k = seg(lt, 0, dur);
    const img = await frame('arrive', lerp(0.85, 4.6, eio(k)));
    g.save(); g.filter = 'brightness(1.2) saturate(1.15) contrast(1.04)'; cover(img, 0, 0, W, H, 1.02 + 0.04 * k); g.filter = 'none'; g.restore();
    const gr = g.createLinearGradient(0, H * 0.3, 0, H); gr.addColorStop(0, 'rgba(10,6,18,0)'); gr.addColorStop(1, 'rgba(10,6,18,.8)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); vignette(0.5);
    const s = 0.82 + 0.18 * eo(seg(lt, 0.3, 1.5));
    g.save(); g.translate(W / 2, 470); g.scale(s, s); logo(0, 0, 210, eo(seg(lt, 0.3, 1.1))); g.restore();
    text(tagline, W / 2, 660, { size: 74, weight: 900, alpha: eo(seg(lt, 1.3, 2.0)) });
    if (sub) text(sub, W / 2, 750, { size: 40, weight: 500, color: 'rgba(255,255,255,.9)', alpha: eo(seg(lt, 2.1, 2.8)) });
    const f = 1 - seg(lt, 0.3, 0.8); if (lt >= 0.3 && f > 0) { g.fillStyle = `rgba(255,236,220,${0.4 * f})`; g.fillRect(0, 0, W, H); }
  };
}
async function searchFlight(lt, dur, T) {
  const fs = lt < 5 ? lerp(0.6, 8.3, seg(lt, 0, 5)) : lerp(10.9, 13.9, seg(lt, 5, dur));
  const img = await frame('fly_home', fs);
  g.save(); g.filter = 'brightness(1.22) saturate(1.18) contrast(1.05)'; cover(img, 0, 0, W, H, 1.04 + 0.03 * Math.sin(T * 0.4)); g.filter = 'none'; g.restore();
  vignette(0.5);
  if (lt < 5.1) {
    g.save();
    for (let i = 0; i < 4; i++) { const k = (lt * 0.6 + i / 4) % 1; g.globalAlpha = (1 - k) * 0.75; g.strokeStyle = CORAL; g.lineWidth = 6 * (1 - k) + 1; g.beginPath(); g.ellipse(W / 2, H * 0.56, 80 + k * 860, (80 + k * 860) * 0.5, 0, 0, Math.PI * 2); g.stroke(); }
    g.restore();
  }
  const wf = 1 - seg(lt, 5, 5.4); if (lt >= 5 && wf > 0) { g.fillStyle = `rgba(255,245,235,${0.55 * wf})`; g.fillRect(0, 0, W, H); }
  const big = lt < 5 ? 'מחפשים לכם מקצוען פנוי' : 'נמצא!';
  const a = lt < 5 ? inOut(lt, 0.4, 5.1, 0.5, 0.2) : eo(seg(lt, 5.1, 5.6)) * (1 - seg(lt, dur - 0.4, dur));
  g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(12,8,20,.55)'; rr(W / 2 - 560, 110, 1120, 150, 40); g.fill(); g.restore();
  text(big, W / 2, 185, { size: lt < 5 ? 76 : 96, weight: 900, alpha: a, color: lt < 5 ? '#fff' : '#7FE3BC' });
}
async function ending(lt, dur, T, big, sub) {
  const k = seg(lt, 0, dur);
  const img = await frame('fly_home', lerp(11.2, 16.0, k));
  g.save(); g.filter = 'brightness(1.15) saturate(1.15)'; cover(img, 0, 0, W, H, 1.02 + 0.08 * k); g.filter = 'none'; g.restore();
  g.fillStyle = `rgba(12,7,20,${0.4 + 0.25 * seg(lt, 0, 1.2)})`; g.fillRect(0, 0, W, H); vignette(0.6);
  const s = 0.85 + 0.15 * eo(seg(lt, 0.3, 1.3));
  g.save(); g.translate(W / 2, 400); g.scale(s, s); logo(0, 0, 220, eo(seg(lt, 0.3, 1.1))); g.restore();
  text(big, W / 2, 590, { size: 84, weight: 900, alpha: eo(seg(lt, 1.3, 2.0)) });
  if (sub) text(sub, W / 2, 700, { size: 42, weight: 500, color: '#FFD2C4', alpha: eo(seg(lt, 2.4, 3.1)) });
  const out = seg(lt, dur - 1.3, dur); if (out > 0) { g.fillStyle = `rgba(0,0,0,${out})`; g.fillRect(0, 0, W, H); }
}

// while he is on the way: pick a figure, walk our city
async function cityBeat(lt, dur, T) {
  const img = await frame('cwalk', 0.8 + lt * 1.3);
  g.save(); g.filter = 'brightness(1.25) saturate(1.15)'; cover(img, 0, 0, W, H, 1.03 + lt * 0.006); g.filter = 'none'; g.restore();
  const gr = g.createLinearGradient(W, 0, W * 0.5, 0); gr.addColorStop(0, 'rgba(12,8,20,.75)'); gr.addColorStop(1, 'rgba(12,8,20,0)'); g.fillStyle = gr; g.fillRect(W * 0.5, 0, W * 0.5, H);
  vignette(0.45);
  const pimg = await frame('onb', Math.min(42.5, 36.8 + lt * 1.1));
  phone(pimg, 330, 560, 720, { glow: 0.8, rot: -0.03, alpha: eo(seg(lt, 0.2, 0.9)) });
  line(lt, dur, 'בזמן שהוא בדרך', 'בוחרים דמות ומטיילים בעיר שלנו.');
}
// for the people you love: their home, your phone
async function familyBeat(lt, dur, T) {
  drawBg(T, 0.8);
  const a = inOut(lt, 0, dur, 0.5, 0.4);
  g.save(); g.globalAlpha = a;
  const x = 150, y = 110, w = 600, h = 860;
  g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 50; g.fillStyle = '#000'; rr(x, y, w, h, 36); g.fill(); g.shadowBlur = 0;
  g.save(); rr(x, y, w, h, 36); g.clip(); cover(imgs.kitchen, x, y, w, h, 1.04 + 0.08 * (lt / dur), 0.5, 0.4); g.restore();
  g.restore();
  const qimg = await frame('j3', 85.2);
  phone(qimg, 860, 640, 640, { alpha: eo(seg(lt, 0.8, 1.6)) * a, glow: 0.8, rot: 0.05 });
  line(lt, dur, 'גם בשביל מי שאוהבים', 'מזמינים לבית של ההורים, ומאשרים מחיר מהטלפון שלכם.');
}
// the business's opening: ads nobody sees
async function businessProblem(lt, dur, T) {
  hudBackdrop(await frame('arrive', 2.0), lt);
  // a feed scrolling past, too fast to see
  g.save(); g.globalAlpha = 0.5 * inOut(lt, 0.2, dur, 0.5, 0.4);
  for (let i = 0; i < 9; i++) {
    const y = ((i * 170 - lt * 900) % 1530 + 1530) % 1530 - 200;
    g.fillStyle = 'rgba(111,227,255,.08)'; g.strokeStyle = 'rgba(111,227,255,.25)'; g.lineWidth = 2; rr(180, y, 380, 140, 18); g.fill(); g.stroke();
    g.fillStyle = 'rgba(111,227,255,.18)'; rr(200, y + 20, 100, 100, 12); g.fill(); rr(320, y + 30, 200, 18, 9); g.fill(); rr(320, y + 64, 150, 14, 7); g.fill();
  }
  g.restore();
  ['עוד מודעה.', 'עוד פוסט.', 'עוד קמפיין.'].forEach((s, i) => {
    const a = inOut(lt, 1.0 + i * 1.1, 8.0, 0.3, 0.3);
    strike(s, 1180, 330 + i * 110, 70, a, eo(seg(lt, 1.4 + i * 1.1, 1.8 + i * 1.1)));
  });
  text('והלקוחות ממשיכים לגלול.', 1180, 720, { size: 70, weight: 900, color: '#FFB3BC', alpha: inOut(lt, 4.8, 8.4, 0.5, 0.35) });
  const bl = seg(lt, dur - 0.6, dur); if (bl > 0) { g.fillStyle = `rgba(0,0,0,${bl})`; g.fillRect(0, 0, W, H); }
}

const FILMS = {
  customer: [
    { dur: 9.4, mood: 'tension', draw: customerProblem },
    { dur: 5.8, mood: 'reveal', draw: reveal('מקצוען מאומת. עכשיו.', 'ביום ובלילה · כל שירות') },
    { dur: 6.2, mood: 'groove', draw: beat({ clip: 'j3', src0: 14.7, speed: 0.72, src1: 19.0, title: 'מבקשים בשתי לחיצות', sub: 'מה קרה, איפה — ושולחים.', zooms: [{ a: 3.6, b: 6.2, r: 'send', z: 1.6 }] }) },
    { dur: 7.6, mood: 'groove', ping: 5.0, draw: searchFlight },
    { dur: 6.6, mood: 'groove', draw: beat({ clip: 'j3', src0: 26.0, speed: 0.6, src1: 29.8, title: 'רואים מי מגיע, ומתי', sub: 'מקצוען מאומת, זמן הגעה אמיתי.', zooms: [{ a: 1.2, b: 6.4, rect: { x: 0.03, y: 0.63, w: 0.94, h: 0.2 }, z: 1.45 }] }) },
    { dur: 7.2, mood: 'groove', ping: 0.3, draw: beat({ clip: 'j3', src0: 33.9, speed: 1.9, src1: 48.0, title: '״יצא אליך!״', sub: 'והרכב שלו בדרך אליכם, על המפה.', zooms: [{ a: 5.0, b: 7.2, r: 'track_eta', rect: { x: 0.1, y: 0.55, w: 0.8, h: 0.14 }, z: 1.5 }] }) },
    { dur: 6.6, mood: 'groove', draw: cityBeat },
    { dur: 7.6, mood: 'groove', draw: beat({ clip: 'j3', src0: 83.2, speed: 0.6, src1: 87.0, title: 'מאשרים מחיר מראש', sub: 'ומשלמים רק בסיום, לפי מה שאישרתם.', zooms: [{ a: 1.2, b: 4.2, r: 'quote_total', z: 1.55 }, { a: 4.3, b: 7.6, r: 'quote_approve', z: 1.6 }] }) },
    { dur: 6.8, mood: 'groove', draw: familyBeat },
    { dur: 7.2, mood: 'end', draw: (lt, dur, T) => ending(lt, dur, T, 'צריך מקצוען? עכשיו.', 'מקצוען מאומת, בדרך אליכם — תוך דקות.') },
  ],
  business: [
    { dur: 9.2, mood: 'tension', draw: businessProblem },
    { dur: 5.8, mood: 'reveal', draw: reveal('חנות משלכם בעיר.', 'באפליקציה שפותחים כשצריך שירות') },
    { dur: 6.6, mood: 'groove', draw: beat({ clip: 'lust', src0: 0.3, speed: 1, src1: 6.2, title: 'השלט שלכם ברחוב שלנו', sub: 'לקוחות מטיילים כאן בזמן שהם מחכים למקצוען.' }) },
    { dur: 7.2, mood: 'groove', draw: beat({ clip: 'lust', src0: 6.3, speed: 1.2, skip: [9.9, 11.7], src1: 16.8, title: 'נכנסים לחנות שלכם', sub: 'חנות תלת־ממדית, בעיצוב שלכם.' }) },
    { dur: 5.6, mood: 'groove', ping: 0.8, draw: beat({ clip: 'lust', src0: 17.1, speed: 0.75, src1: 20.5, title: 'המוצרים שלכם בלחיצה', sub: 'זוהרים על המדפים.' }) },
    { dur: 6.2, mood: 'groove', draw: beat({ clip: 'lust', src0: 20.7, speed: 0.7, src1: 24.1, title: 'ומשם ישר לאתר שלכם', sub: 'המוצר, המחיר, וכפתור לאתר.', zooms: [{ a: 2.0, b: 6.2, rect: { x: 0.05, y: 0.84, w: 0.9, h: 0.08 }, z: 1.6 }] }) },
    { dur: 7.4, mood: 'end', draw: (lt, dur, T) => ending(lt, dur, T, 'העסק שלכם, בעיר של PRO NOW.', 'שולחים פרטים · מעצבים לכם חנות · נפתחים בעיר') },
  ],
  pro: [
    { dur: 9.4, mood: 'tension', draw: proProblem },
    { dur: 5.8, mood: 'reveal', draw: reveal('העבודה מגיעה אליך.', 'לקוחות קרובים · עכשיו') },
    { dur: 7.4, mood: 'groove', draw: beat({ clip: 'pshift', src0: 10.8, speed: 1.1, src1: 20.3, title: 'עולים לזמינות מתי שבא לך', sub: 'לחיצה אחת, והשעון רץ.', zooms: [{ a: 0.2, b: 1.6, r: 'shift_btn', z: 1.6 }, { a: 2.6, b: 7.4, rect: { x: 0.04, y: 0.2, w: 0.92, h: 0.12 }, z: 1.45 }] }) },
    { dur: 7.4, mood: 'groove', ping: 0.4, draw: beat({ clip: 'j3', src0: 52.7, speed: 0.42, src1: 55.75, title: 'קריאה קופצת רק אליך', sub: 'מה העבודה, כמה רחוק. אתה מחליט.', zooms: [{ a: 1.0, b: 3.6, r: 'offer_timer', z: 1.6 }, { a: 3.8, b: 7.4, r: 'offer_take', z: 1.6 }] }) },
    { dur: 7.0, mood: 'groove', draw: beat({ clip: 'j3', src0: 73.5, speed: 0.95, src1: 78.4, title: 'הצעת מחיר מהטלפון', sub: 'תוך דקה — והלקוח מאשר.', zooms: [{ a: 3.6, b: 7.0, rect: { x: 0.04, y: 0.62, w: 0.92, h: 0.14 }, z: 1.6 }] }) },
    { dur: 6.4, mood: 'groove', ping: 0.3, draw: beat({ clip: 'j3', src0: 108.8, speed: 0.7, src1: 111.8, title: 'ורואים כמה הרווחת', sub: 'שקוף, מיד בסיום העבודה.', zooms: [{ a: 1.0, b: 6.4, r: 'earned', rect: { x: 0.3, y: 0.33, w: 0.62, h: 0.1 }, z: 1.8 }] }) },
    { dur: 7.2, mood: 'end', draw: (lt, dur, T) => ending(lt, dur, T, 'עובדים מתי שבוחרים.', 'מצטרפים ל־PRO NOW — והעבודה מגיעה אליך.') },
  ],
};
const SHOTS = FILMS[WHICH];
const XF2 = 0.45;
let acc = 0;
for (const s of SHOTS) { s.start = acc; acc += s.dur - XF2; }
export const DURATION = acc + XF2;
export const CUES = SHOTS.map((s) => ({ start: s.start, dur: s.dur, mood: s.mood, ping: s.ping != null ? s.start + s.ping : null }));
export const SCORE = 'music3.js';
export async function drawFrame(t) {
  g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const live = SHOTS.filter((s) => t >= s.start && t < s.start + s.dur);
  for (let i = 0; i < live.length; i++) {
    const s = live[i]; const fadeIn = i > 0 ? clamp((t - s.start) / XF2) : 1;
    if (fadeIn >= 1) { g.globalAlpha = 1; await s.draw(t - s.start, s.dur, t); continue; }
    const layer = drawFrame.layer ??= Object.assign(document.createElement('canvas'), { width: W, height: H });
    await withContext(layer.getContext('2d'), () => s.draw(t - s.start, s.dur, t));
    g.globalAlpha = eio(fadeIn); g.drawImage(layer, 0, 0); g.globalAlpha = 1;
  }
  return cv;
}
async function withContext(ctx, fn) { const real = g; g = ctx; g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, W, H); try { await fn(); } finally { g = real; } }
export async function load() {
  for (const f of ['900 80px Heebo', '500 30px Heebo', '700 30px Heebo', '800 30px Heebo', '900 80px Orbitron', '700 30px Orbitron']) await document.fonts.load(f);
  await Promise.all([loadImg('splash', 'world/splash_city.webp'), loadImg('ic_home', 'world/character_home_icon.webp'),
    loadImg('kitchen', 'clips/kitchen.jpg'),
    loadClip('j3'), loadClip('pshift'), loadClip('fly_home'), loadClip('arrive'), loadClip('onb'), loadClip('cwalk'), loadClip('lust')]);
  buildBackground();
}
export { cv as canvas };

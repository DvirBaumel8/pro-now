import { chromium } from 'playwright';

/**
 * Accessibility audit of the running prototype.
 *
 * Two classes of defect, both of which have already bitten this project
 * once: controls too small to hit, and text too low-contrast to read.
 * Checking them by eye is how the first one shipped.
 *
 * WCAG: 4.5:1 for body text, 3:1 for large text (>=18.66px bold or >=24px).
 * Apple's HIG asks for 44x44pt touch targets; 44 CSS px is the equivalent here.
 */

const MIN_TARGET = 44;

function luminance([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
function parseRGB(s) {
  const m = s && s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  return { rgb: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] };
}

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto('http://localhost:4421/', { waitUntil: 'networkidle' });
await p.waitForTimeout(2200);

await p.exposeFunction('__dummy', () => {});

const check = async (label) => {
  return await p.evaluate(({ MIN_TARGET, label }) => {
    const out = { label, small: [], lowContrast: [], unlabelled: [] };

    // Effective background: walk up until something is not transparent.
    const bgOf = (el) => {
      let n = el;
      while (n && n !== document.documentElement) {
        const c = getComputedStyle(n).backgroundColor;
        const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
        if (m && (m[4] === undefined || +m[4] > 0.85)) return [+m[1], +m[2], +m[3]];
        n = n.parentElement;
      }
      return [255, 255, 255];
    };

    const lum = ([r, g, bl]) => {
      const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl);
    };
    const ratio = (a, c) => { const [x, y] = [lum(a), lum(c)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

    // --- touch targets ---
    const clickable = [...document.querySelectorAll('[role="button"],[role="tab"],[role="checkbox"],[role="radio"],button,input')];
    for (const el of clickable) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;             // not rendered
      if (r.bottom < 0 || r.top > window.innerHeight) continue;   // off-screen
      if (r.height < MIN_TARGET || r.width < MIN_TARGET) {
        out.small.push({
          text: (el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 34),
          w: Math.round(r.width), h: Math.round(r.height),
        });
      }
      const name = (el.innerText || '').trim() || el.getAttribute('aria-label');
      if (!name) out.unlabelled.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 30) });
    }

    // --- text contrast ---
    const texts = [...document.querySelectorAll('div,span,p')].filter(
      (el) => el.childElementCount === 0 && el.innerText && el.innerText.trim().length > 1
    );
    for (const el of texts) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.bottom < 0 || r.top > window.innerHeight) continue;
      const cs = getComputedStyle(el);
      const m = cs.color.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
      if (!m) continue;
      const alpha = m[4] === undefined ? 1 : +m[4];
      if (alpha < 0.95) continue; // composited text; measured separately
      const fg = [+m[1], +m[2], +m[3]];
      const bg = bgOf(el.parentElement || el);
      const size = parseFloat(cs.fontSize);
      const weight = parseInt(cs.fontWeight, 10) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const need = large ? 3 : 4.5;
      const got = ratio(fg, bg);
      if (got < need) {
        out.lowContrast.push({
          text: el.innerText.trim().slice(0, 34),
          got: Math.round(got * 100) / 100, need, size: Math.round(size), weight,
        });
      }
    }
    return out;
  }, { MIN_TARGET, label });
};

const results = [];
const visit = async (label, steps) => {
  await p.goto('http://localhost:4421/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1600);
  for (const s of steps) {
    try { await p.locator(`text=${s}`).first().click({ timeout: 4000 }); await p.waitForTimeout(800); } catch {}
  }
  results.push(await check(label));
};

await visit('welcome', []);
await visit('customer-home', ['אני צריך מקצוען']);
await visit('service', ['אני צריך מקצוען', 'תיקון נזילה']);
await visit('describe', ['אני צריך מקצוען', 'תיקון נזילה', 'בקשת בעל מקצוע עכשיו']);
await visit('calls', ['אני צריך מקצוען', 'הקריאות שלי']);
await visit('card', ['אני צריך מקצוען', 'הכרטיס שלי']);
await visit('pro-shift', ['אני בעל מקצוע']);

for (const r of results) {
  console.log(`\n### ${r.label}`);
  if (r.small.length) console.log('  SMALL TARGETS:', JSON.stringify(r.small.slice(0, 6)));
  if (r.lowContrast.length) console.log('  LOW CONTRAST:', JSON.stringify(r.lowContrast.slice(0, 6)));
  if (r.unlabelled.length) console.log('  UNLABELLED:', r.unlabelled.length);
  if (!r.small.length && !r.lowContrast.length && !r.unlabelled.length) console.log('  clean');
}
await b.close();

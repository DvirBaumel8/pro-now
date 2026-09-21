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
const failures = [];

/**
 * A step that does not land is a FAILED AUDIT, not a skipped line.
 *
 * This swallowed its own errors for weeks. Once the app grew a sign-in gate,
 * every "customer-home" click silently missed and the audit dutifully
 * measured the sign-in screen instead — and reported it clean. Seven green
 * ticks, none of them about the screens they named. A verification tool that
 * cannot fail is not a verification tool, so a missed step now records a
 * failure and the run exits non-zero.
 */
const step = async (label, action) => {
  try {
    if (typeof action === 'string') {
      await p.locator(`text=${action}`).first().click({ timeout: 4000 });
    } else {
      await action();
    }
    await p.waitForTimeout(800);
  } catch {
    failures.push(`${label}: step "${typeof action === 'string' ? action : 'fn'}" did not land`);
    throw new Error('step-missed');
  }
};

/**
 * Through the gate: pick a side, then sign in. Both sides, same shape.
 *
 * THE TWO FILLS ARE STEPS TOO, AND LEAVING THEM OUT COST THE WHOLE RUN.
 *
 * `step` exists so that a missed click is recorded as a failure against
 * the screen it was meant to reach, and the audit carries on to the next
 * one. These two `fill` calls sat outside it, so when the phone field was
 * not there the raw Playwright timeout escaped `visit`'s catch, escaped
 * the top level, and killed the process — with every screen after it
 * unmeasured and nothing written down about why. A verification tool that
 * dies rather than reporting is worse than one that reports a failure,
 * because a dead run looks like an infrastructure problem rather than a
 * finding.
 */
const signIn = async (label, sideHe) => {
  await step(label, sideHe);
  await step(label, async () => p.getByLabel('מספר טלפון').fill('0501234567'));
  await step(label, 'שליחת קוד');
  await step(label, async () => p.getByLabel('קוד האימות').fill('123456'));
  await step(label, 'כניסה');
};

/**
 * EVERY VISIT STARTS FROM NOTHING.
 *
 * This reloaded the page and assumed that was a fresh start. It stopped
 * being one when sign-in began to persist: the first visit that signed in
 * left the session behind, so every later visit reloaded straight into
 * the signed-in app, the "אני צריך מקצוען" click landed on a screen that
 * has no such control, and the audit sat waiting thirty seconds for a
 * phone field on the home screen before dying.
 *
 * The audit's whole value is that each screen is measured as itself, so
 * the stored session goes before each run. It is the same reason `visit`
 * navigates at all rather than driving one long journey.
 */
const visit = async (label, sideHe, steps) => {
  await p.goto('http://localhost:4421/', { waitUntil: 'networkidle' });
  await p.evaluate(() => {
    try { localStorage.clear(); } catch { /* private mode, nothing stored anyway */ }
    try { sessionStorage.clear(); } catch { /* same */ }
  });
  await p.goto('http://localhost:4421/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1600);
  try {
    if (sideHe) await signIn(label, sideHe);
    /*
     * The customer side asks who you are before it asks what you need.
     * Skipping is a first-class answer — see `shouldOfferPicker` — and it
     * is the right one here: the picker has a screen of its own in this
     * list and the journeys below are about everything after it.
     */
    try { await p.locator('text=דלג כרגע').first().click({ timeout: 1500 }); await p.waitForTimeout(600); } catch { /* no picker on this build */ }
    // The professional side opens with a "how it works" sheet on arrival.
    try { await p.locator('text=הבנתי, בוא נתחיל').first().click({ timeout: 1500 }); await p.waitForTimeout(500); } catch { /* already dismissed */ }
    for (const s of steps) await step(label, s);
  } catch (e) {
    if (e.message !== 'step-missed') throw e;
    return; // already recorded
  }
  results.push(await check(label));
};

const CUST = 'אני צריך מקצוען';
const PRO = 'אני בעל מקצוע';

await visit('welcome', null, []);
await visit('auth-phone', null, [CUST]);
await visit('customer-home', CUST, []);
/*
 * THE FRONT DOOR IS A QUESTION NOW, NOT A LIST OF SERVICES.
 *
 * Every journey below used to tap a service straight from the home
 * screen, because that is what the home screen was. It is "מה אתם צריכים
 * עכשיו?" and eight ways in, and a customer reaches a service through the
 * category the way these journeys now do. Six screens were unreachable
 * and therefore unaudited until this was corrected — the audit was doing
 * its job by refusing to measure them, and the fix is to walk the walk
 * the app actually has.
 *
 * The department names were rebuilt from what Israeli customers already
 * recognise (see pilot-catalog's tree comment), so the door names here
 * are the ones on the screen rather than the ones in the domain model.
 */
const HOME_DOOR = 'לבית';
const BEAUTY_DOOR = 'ביוטי ושיער';

await visit('service', CUST, [HOME_DOOR, 'פתיחת סתימה']);
await visit('category-drill', CUST, [HOME_DOOR]);
await visit('arrival-verify', CUST, [
  HOME_DOOR,
  'פתיחת סתימה',
  'בקשת בעל מקצוע עכשיו',
  'שליחת הקריאה',
  // The search runs for real; nothing downstream exists until it ends.
  async () => p.waitForTimeout(7000),
  /*
   * AND THE WAY OUT OF THE SEARCH IS THROUGH THE MATCH AND THE DRAWER.
   *
   * This stepped from "שליחת הקריאה" straight onto a tracking control, on
   * the assumption that the search hands you to a tracking screen. It
   * does not: it finds somebody, offers them, and — once accepted — the
   * wait is the world, with the drawer at the foot of it carrying every
   * way out. Following the professional is one of those ways, and it is
   * the one that reaches the screen this journey is named after.
   */
  'כן, מתאים לי',
  // The drawer's label carries the professional's own name, so match on
  // the part of it that does not change.
  'לעקוב אחרי',
  'המקצוען כמעט אצלך',
]);
await visit('person-fit', CUST, [BEAUTY_DOOR, 'תספורת עד הבית', 'הצג איך נראית התאמה אישית']);
await visit('service-scheduled', CUST, [HOME_DOOR, 'הרכבת רהיטים']);
await visit('describe', CUST, [HOME_DOOR, 'פתיחת סתימה', 'בקשת בעל מקצוע עכשיו']);
// The utility row became a branded header; history moved behind the menu.
await visit('calls', CUST, [async () => p.getByLabel('תפריט').first().click()]);
await visit('card', CUST, [async () => p.getByLabel(/החשבון שלי/).first().click()]);
await visit('pro-shift-offline', PRO, []);
await visit('pro-presence', PRO, ['ניהול']);
await visit('pro-shift-online', PRO, ['התחלת משמרת']);
await visit('pro-earnings', PRO, ['כמה הרווחתי']);
await visit('pro-verify', PRO, ['המסמכים שלי']);

for (const r of results) {
  console.log(`\n### ${r.label}`);
  if (r.small.length) console.log('  SMALL TARGETS:', JSON.stringify(r.small.slice(0, 6)));
  if (r.lowContrast.length) console.log('  LOW CONTRAST:', JSON.stringify(r.lowContrast.slice(0, 6)));
  if (r.unlabelled.length) console.log('  UNLABELLED:', r.unlabelled.length);
  if (!r.small.length && !r.lowContrast.length && !r.unlabelled.length) console.log('  clean');
}

if (failures.length) {
  console.log('\n!! NAVIGATION FAILURES — these screens were never audited:');
  for (const f of failures) console.log('  ', f);
}
const defects = results.filter((r) => r.small.length || r.lowContrast.length || r.unlabelled.length);
console.log(`\naudited ${results.length} screens · ${defects.length} with defects · ${failures.length} unreachable`);
await b.close();
if (failures.length || defects.length) process.exit(1);

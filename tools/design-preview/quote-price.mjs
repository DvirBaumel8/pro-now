import { launchChromium } from './browser.mjs';

/**
 * SOME TRADES HAVE A PRICE ALREADY, AND SOME DO NOT.
 *
 * Amit: *"כמובן יש מקצועות שיש להם מחירים קבועים ויש מקצועות שזה
 * משתנה."*
 *
 * The builder treated every job as an open quote. That is right for a
 * leak — nobody knows the price until somebody has looked — and wrong
 * for a tap replacement, where the customer was shown a figure before
 * anybody was dispatched. A blank form there asks the professional to
 * invent a number that was already agreed, and every one they type that
 * is not it is a deal changed by accident.
 *
 * Both halves are walked, because each is the other's control: a
 * FIXED service must open with its price in, and a VISIT_QUOTE one must
 * open EMPTY. A change that filled in both would pass a check that only
 * looked at the first, and it would be the app putting a price in
 * somebody's mouth.
 */
const PORT = process.env.PREVIEW_PORT ?? '4421';
const b = await launchChromium();
const problems = [];

async function walk(serviceRe, label) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  p.on('pageerror', (e) => problems.push(`${label}: page threw: ${e}`));
  const tap = async (name, ms = 1100) => {
    const ok = await p.getByRole('button', { name }).first().click({ timeout: 6000 }).then(() => true).catch(() => false);
    if (!ok) problems.push(`${label}: could not press ${name}`);
    await p.waitForTimeout(ms);
  };
  await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2200);
  await tap(/אני צריך מקצוען/);
  await p.getByLabel('מספר טלפון').fill('0501234567');
  await tap(/שליחת קוד/);
  await p.getByLabel('קוד האימות').fill('123456');
  await tap(/^כניסה/, 1700);
  await tap(/דילוג על ההסבר/, 1300);
  await tap(/המשך בלי דמות/, 1500);
  await tap(/^לבית$/, 1200);
  await tap(serviceRe, 1200);
  await tap(/^בקשת /, 1300);
  await tap(/שליחת הקריאה/, 2600);

  /* Across to the professional, who takes the call the customer just sent. */
  await tap(/מעבר לצד בעל המקצוע/, 2200);
  await tap(/^סגירה$/, 800);
  await tap(/התחלת משמרת/, 1300);
  await tap(/הקריאה ששלחת|קריאה לדוגמה/, 1700);
  await tap(/קבלת העבודה/, 1600);
  await tap(/יוצא לדרך/, 1000);
  await tap(/הגעתי/, 1000);
  await tap(/מתחיל אבחון/, 1000);
  await tap(/שליחת הצעת מחיר/, 1500);

  const state = await p.evaluate(() => {
    const d = document.querySelector('[aria-label="תיאור שורה 1"]');
    const u = document.querySelector('[aria-label="מחיר ליחידה בשורה 1"]');
    return {
      desc: d ? d.value : null,
      unit: u ? u.value : null,
      agreed: document.body.innerText.includes('מחיר קבוע שסוכם מראש'),
    };
  });
  await p.context().close();
  return state;
}

const fixed = await walk(/החלפת ברז/, 'fixed');
if (!fixed.agreed) problems.push('a service with a set price does not say so on the builder');
if (!fixed.unit || Number(fixed.unit) <= 0) {
  problems.push(`a service with a set price opens the builder empty (unit: ${fixed.unit})`);
}
if (!fixed.desc) problems.push('the agreed line has no description');

const open = await walk(/פתיחת סתימ/, 'visit-quote');
if (open.agreed) problems.push('a service priced by quote claims to have an agreed price');
if (open.unit && Number(open.unit) > 0) {
  problems.push(`a service priced by quote opens with a number in it (unit: ${open.unit})`);
}
if (open.desc) problems.push(`a service priced by quote opens with a description in it: ${open.desc}`);

console.log('PROBLEMS:', problems.length ? '\n  ' + problems.join('\n  ') : 'none');
await b.close();
process.exit(problems.length ? 1 : 0);

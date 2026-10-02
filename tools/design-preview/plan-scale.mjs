import { launchChromium } from './browser.mjs';

/**
 * NOTHING DRAWN AT A PAINTING'S SCALE ON A REAL STREET PLAN.
 *
 * Amit, on the tracking screen with the real map on: *"תראה איך נראה
 * המסלול שלו ותראה את הגודל הלא הגיוני שלו."*
 *
 * He was looking at a measurable fault. Everything alive in this world is
 * sized off one ruler — a fraction of the width of a shopfront in the
 * illustrated plate — which is how a scooter comes out the right size
 * next to a painted person. A real extract has no shopfronts and no
 * painted people: it is a street plan whose blocks are buildings from
 * above. The same ruler then puts a figure the height of a city block on
 * it, which is exactly what was on the screen.
 *
 * Two other layers already refuse to draw on a real extract for the same
 * reason — the district shopfronts and the ambient traffic — but the
 * traveller cannot refuse, because it is the thing the screen is about.
 * It is a MARKER there instead: sized in screen points, which cannot be
 * the wrong size relative to a map it was never drawn against.
 *
 * So this walks to the tracking screen, turns the real map on, and
 * asserts that no character or vehicle artwork is being drawn over it.
 * Proven by putting the fault back: with `plan` forced false it reported
 * the trade's own figure — `character_home_world.webp` — being drawn on
 * the street plan.
 */
const PORT = process.env.PREVIEW_PORT ?? '4421';
const b = await launchChromium();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const problems = [];
p.on('pageerror', (e) => problems.push(`page threw: ${e}`));

const tap = async (name, ms = 1200) => {
  const ok = await p.getByRole('button', { name }).first().click({ timeout: 6000 }).then(() => true).catch(() => false);
  if (!ok) problems.push(`could not press ${name}`);
  await p.waitForTimeout(ms);
  return ok;
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
await tap(/פתיחת סתימ/, 1200);
await tap(/^בקשת /, 1400);
await tap(/שליחת הקריאה/, 3200);
await p.waitForTimeout(7000);
await tap(/כן, מתאים לי/, 2000);
await tap(/לעקוב אחרי/, 2000);

/*
 * THE CONTROL COMES FIRST, and it is the drawn plate rather than a
 * planted element: with the illustrated ground on, the traveller IS a
 * painted vehicle, so the query below must find it. If it does not, the
 * query is broken and everything after it would pass for the wrong
 * reason — which is the failure mode this project keeps meeting.
 */
const drawnOn = await p.evaluate(() =>
  [...document.querySelectorAll('img')]
    .filter((i) => /world\//.test(i.currentSrc || i.src || ''))
    .filter((i) => !/ground|neighbourhood|district/.test(i.currentSrc || i.src || ''))
    .map((i) => ({ src: (i.currentSrc || i.src).split('/').pop(), h: Math.round(i.getBoundingClientRect().height) }))
);
if (drawnOn.length === 0) {
  problems.push('the control failed: no painted figure found on the ILLUSTRATED map, so this check is not looking at anything');
}

await tap(/מפה אמיתית|החלפה בין המפה/, 2600);

const onPlan = await p.evaluate(() =>
  [...document.querySelectorAll('img')]
    .filter((i) => /world\//.test(i.currentSrc || i.src || ''))
    .filter((i) => !/ground|neighbourhood|district/.test(i.currentSrc || i.src || ''))
    .filter((i) => i.getBoundingClientRect().height > 0)
    .map((i) => `${(i.currentSrc || i.src).split('/').pop()} at ${Math.round(i.getBoundingClientRect().height)}px`)
);
for (const drawn of onPlan) {
  problems.push(`drawn at plate scale on a real street plan: ${drawn}`);
}

console.log('PROBLEMS:', problems.length ? '\n  ' + problems.join('\n  ') : 'none');
await b.close();
process.exit(problems.length ? 1 : 0);

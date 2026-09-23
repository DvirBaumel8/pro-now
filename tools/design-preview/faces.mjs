import { launchChromium } from './browser.mjs';

/**
 * THE PEOPLE ON THESE SCREENS ARE THE ONES WE DREW.
 *
 * Amit: *"למה התמונה של בעל המקצוע והשם וגם של הלקוח לא מהדמויות
 * שבנינו?"*
 *
 * Neither was a missing asset. Twelve customer portraits and eleven
 * trade characters have been in the pack from the start, and the
 * candidate cards were already using them — the two screens where a
 * person is actually looking at another person were falling back to a
 * monogram because nothing was passing them anything.
 *
 * A monogram is the RIGHT answer when we have nothing: it claims no
 * likeness. It is the wrong answer about somebody who picked a
 * character out of twelve, and about a trade whose figure is drawn. So
 * this walks both directions and fails if either is a monogram again.
 *
 * What it does not assert: any likeness of a real person. The
 * professional's picture is the TRADE's figure on a demonstration
 * account whose name says "(תצוגה)", and the customer's is the avatar
 * they chose for themselves.
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
const fill = async (label, value) => {
  await p.getByLabel(label).fill(value).catch(() => problems.push(`no field called ${label}`));
};
/** Every image big enough to be a face rather than an icon in a chip. */
const drawn = () =>
  p.evaluate(() =>
    [...document.querySelectorAll('img')]
      .filter((i) => i.getBoundingClientRect().height > 20)
      .map((i) => (i.currentSrc || i.src).split('/').pop())
  );

await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2200);

await tap(/אני צריך מקצוען/);
await fill('מספר טלפון', '0501234567');
await tap(/שליחת קוד/);
await fill('קוד האימות', '123456');
await tap(/^כניסה/, 1700);
await tap(/דילוג על ההסבר/, 1400);

/* A figure is chosen, which is the fact the other side must be shown. */
await tap(/^דמות 4$/, 700);
await tap(/אישור הדמות/, 1800);

/* ----------------------------------------------------------------
   THE INSIDE OF A SHOP, WHERE ONE HAS BEEN DRAWN.

   Amit: *"ממש שינוי מצלמה לתוך החנות, שינוי פריים, לא להישאר באותו
   עמוד... שיראו את כל הפרטים של החנות מבפנים."*

   The barber is the one trade whose interior exists, and a barber is
   CHOSEN by the customer rather than dispatched — so the match screen
   is where the inside of a business can be seen today. The other ten
   are named in `npm run art:brief`, and the day one lands it appears
   here and on the map with no change to any of this.

   Walked before the plumbing journey below, in the same session,
   because a reload lands back on the welcome screen.
   ---------------------------------------------------------------- */
await tap(/^ביוטי ושיער$/, 1400);
await tap(/תספורת עד הבית/, 1400);
await tap(/הצג איך נראית התאמה|^בקשת /, 1700);
const inside = await drawn();
if (!inside.includes('hair_barbershop_hero.webp')) {
  problems.push(
    `the one shop whose inside exists does not show it — images were: ${inside.join(', ') || '(none)'}`
  );
}
await p.goBack();
await p.waitForTimeout(900);
await p.goBack();
await p.waitForTimeout(900);
await p.goBack();
await p.waitForTimeout(1200);

await tap(/^לבית$/, 1100);
await tap(/פתיחת סתימ/, 1100);
await tap(/^בקשת /, 1300);
await tap(/שליחת הקריאה/, 3000);
await p.waitForTimeout(7000);
await tap(/כן, מתאים לי/, 1800);
await tap(/לעקוב אחרי/, 2000);

const onTracking = await drawn();
if (!onTracking.some((f) => /^character_\w+_icon\.webp$/.test(f))) {
  problems.push(
    `the customer sees no drawn figure for the professional — images were: ${onTracking.join(', ') || '(none)'}`
  );
}

await tap(/מעבר לצד בעל המקצוע/, 2200);
await tap(/^סגירה$/, 800);
await tap(/התחלת משמרת/, 1300);
await tap(/קריאה לדוגמה|הקריאה ששלחת/, 1800);
await tap(/קבלת העבודה/, 1700);

const onJob = await drawn();
if (!onJob.some((f) => /^avatar_\d+_portrait\.webp$/.test(f))) {
  problems.push(
    `the professional sees no figure for the customer who chose one — images were: ${onJob.join(', ') || '(none)'}`
  );
}
/*
 * And it is the one that was chosen, not simply any of the twelve. A
 * check that accepts any portrait would pass on a screen showing
 * somebody else's face, which is worse than the monogram it replaced.
 */
if (!onJob.includes('avatar_04_portrait.webp')) {
  problems.push(`the professional sees the wrong customer's figure: ${onJob.join(', ')}`);
}

console.log('PROBLEMS:', problems.length ? '\n  ' + problems.join('\n  ') : 'none');
await b.close();
process.exit(problems.length ? 1 : 0);

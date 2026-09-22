import { launchChromium } from './browser.mjs';

/**
 * WALK EVERY SCREEN AND REPORT WHAT IS WRONG WITH IT.
 *
 * Amit: "תבדוק כבר את כל החלונות ואת המעברים הנכונים." Doing that by hand
 * means opening two dozen screens and remembering what each one should
 * have. Doing it here means it is the same check every time and it cannot
 * quietly stop being run.
 *
 * Five faults, each of which has actually shipped in this prototype once:
 *   - a screen that throws
 *   - a screen with no way back
 *   - a control too small to hit on a phone
 *   - a dead end: a screen whose controls lead nowhere
 *   - a panel with words on it, hanging off the edge of the phone
 *
 * The last one was added the morning the chosen professional's name card
 * spent the entire wait a quarter of the way off the right edge of the
 * screen, stable and reproducible, through a dozen screenshots that were
 * being looked at for other things. It is exactly the kind of fault a
 * person stops seeing and a measurement never does.
 */
const b = await launchChromium();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));

const problems = [];
const click = async (t, ms = 800) => { await p.locator(`text=${t}`).first().click({ timeout: 6000 }); await p.waitForTimeout(ms); };
const tryClick = async (t, ms = 800) => { try { await click(t, ms); return true; } catch { return false; } };

/**
 * The page-side scan. ONE copy, used by `inspect` and by the control at
 * the end — a control that re-implements the thing it is controlling
 * proves only that two pieces of arithmetic agree.
 */
const scan = () => {
    const out = { small: [], empty: 0, buttons: 0, offscreen: [], buried: [] };

    /*
     * A BOX YOU HAVE TO GO LOOKING FOR.
     *
     * Amit: *"גם שורות החיפוש תמיד צריכות להיות בלמעלה של התפריטים ולא
     * בתחית המסך אם רוצים לספר מה הבעיה ולאתר אותה."*
     *
     * The address screen was the case. Its typing row was the fourth
     * block down, under the location card and under however many
     * addresses somebody had saved, and the copy on the screen said
     * "type an address BELOW" twice — pointing at something that, for a
     * customer with a few saved places, was off the bottom of the phone.
     *
     * The checked rule is the strict, measurable part of what he asked
     * for: the FIRST place a screen lets you type must be on the screen
     * when the screen opens. Where it sits ABOVE the fold is a judgement
     * and stays a judgement; needing to scroll before you can see that
     * typing is possible at all is not.
     *
     * Only the first one. A form's fifth field is allowed to be down the
     * page — that is what a form is.
     */
    // The first input with an actual box on it. A control rendered at
    // zero size is not a place anybody can type, and skipping those is
    // also what lets the control at the end of this file hide the real
    // inputs and be seen: `display: none` still matches a selector.
    const firstInput = [...document.querySelectorAll('input:not([type="hidden"]), textarea')]
      .find((el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; });
    if (firstInput) {
      const r = firstInput.getBoundingClientRect();
      if (r.top > window.innerHeight) {
        const label = firstInput.getAttribute('aria-label') || firstInput.getAttribute('placeholder') || '(no label)';
        out.buried.push(`${label} — ${Math.round(r.top - window.innerHeight)}px below the fold`);
      }
    }
    for (const el of document.querySelectorAll('[role="button"], button')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      out.buttons += 1;
      if (r.height < 40 || r.width < 40) {
        const label = el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 24) || '(no label)';
        out.small.push(`${label} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }

    /*
     * WORDS HANGING OFF THE EDGE OF THE PHONE.
     *
     * Only panels with their own background are checked, and only ones
     * carrying text. That is deliberate and it is what keeps this from
     * drowning in false positives: the world layer is far wider than the
     * screen ON PURPOSE — it is 1.85 screens of neighbourhood and being
     * able to walk off the edge of the frame is the whole feature — and
     * so are carousels, scroll rows and the ground plate itself.
     *
     * What is never on purpose is a CARD: something with a filled
     * background, a few lines of type, and a name or a price on it. If
     * one of those crosses the edge of the screen, a person is reading a
     * truncated word, and no amount of world being bigger than the phone
     * makes that intentional.
     *
     * A few points of bleed is a rounded corner or a shadow; a tenth of
     * the panel is a bug.
     */
    const W = window.innerWidth;
    for (const el of document.querySelectorAll('div')) {
      const cs = getComputedStyle(el);
      const bg = cs.backgroundColor;
      if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') continue;
      const alpha = bg.startsWith('rgba') ? Number(bg.split(',')[3]) : 1;
      if (!(alpha > 0.5)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 60 || r.height < 24 || r.width > W * 1.4) continue;
      const text = (el.textContent || '').trim();
      if (text.length < 3) continue;
      // Its own words, not a child's: skip a wrapper whose only text is
      // the panel it contains, or every card reports twice.
      if ([...el.children].some((c) => (c.textContent || '').trim() === text && c.tagName === 'DIV')) continue;
      const over = Math.max(r.right - W, -r.left);
      if (over > Math.max(6, r.width * 0.1)) {
        out.offscreen.push(`${text.slice(0, 28)} — ${Math.round(over)}px past the edge`);
      }
    }
  return out;
};

async function inspect(name, { needsBack = true } = {}) {
  await p.waitForTimeout(350);
  const report = await p.evaluate(scan);
  const backs = await p.getByRole('button', { name: /חזרה|חזור|ביטול הבקשה/ }).count();
  if (needsBack && backs === 0) problems.push(`${name}: no way back`);
  for (const s of report.small) problems.push(`${name}: target too small — ${s}`);
  for (const s of report.offscreen) problems.push(`${name}: off the edge of the phone — ${s}`);
  for (const s of report.buried) problems.push(`${name}: you must scroll before you can type — ${s}`);
  if (report.buttons === 0) problems.push(`${name}: nothing to tap`);
  await p.screenshot({ path: `/tmp/claude-0/sweep/${name}.png` });
}

await p.goto('http://127.0.0.1:4421/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1600);
await inspect('01-welcome', { needsBack: false });

await click('אני צריך מקצוען');
await inspect('02-auth');
await p.getByLabel('מספר טלפון').fill('0501234567'); await click('שליחת קוד');
await p.getByLabel('קוד האימות').fill('123456'); await click('כניסה');
await p.waitForTimeout(1400);

/*
 * THE EXPLANATION COMES FIRST NOW.
 *
 * Three slides between signing in and the app, before the avatar — so
 * every journey that used to go straight from the code screen to the
 * picker now walks into them and stops. Skipping is a real answer here
 * (see `IntroBody`), and taking it is what most people will do, so that
 * is the path these checks take.
 *
 * `text=דלג` also matches the picker's own "דלג כרגע", which is why this
 * runs before the picker step rather than being folded into it.
 */
await inspect('02b-intro', { needsBack: false });
await tryClick('דלג', 900);

// The avatar step, which a new customer meets once. Skipping is a real
// answer, so the sweep takes it: that is the path most people will take.
await inspect('03-avatar', { needsBack: false });
await tryClick('דלג כרגע', 1200);
await inspect('04-home', { needsBack: false });

/*
 * THE ADDRESS SCREEN, WHICH NOTHING HAD EVER WALKED.
 *
 * Reached the way a customer reaches it — the address chip at the top of
 * the home screen — and it is worth a stop of its own: it is the one
 * fact the whole dispatch is aimed at, and it was where the buried
 * typing row was found.
 */
if (await p.getByRole('button', { name: 'שינוי כתובת' }).first().click({ timeout: 4000 }).then(() => true).catch(() => false)) {
  await p.waitForTimeout(1000);
  await inspect('04b-address');
  await p.goBack();
  await p.waitForTimeout(900);
} else {
  problems.push('home: the address chip is not tappable');
}

for (const [i, cat] of ['לבית', 'ביוטי ושיער', 'ניקיון', 'הובלות ומשלוחים', 'רכב', 'חיות', 'בריאות וכושר', 'מחשבים וסלולר'].entries()) {
  const ok = await p.getByRole('button', { name: cat }).first().click({ timeout: 4000 }).then(() => true).catch(() => false);
  if (!ok) { problems.push(`home: category "${cat}" not tappable`); continue; }
  await p.waitForTimeout(1100);
  await inspect(`05-cat-${i}-${cat.replace(/\s/g, '_')}`);
  await p.goBack(); await p.waitForTimeout(900);
}

await p.getByRole('button', { name: 'לבית' }).first().click(); await p.waitForTimeout(1100);
await p.getByRole('button', { name: /פתיחת סתימה/ }).first().click(); await p.waitForTimeout(900);
await inspect('06-service');
await click('בקשת בעל מקצוע עכשיו'); await inspect('07-describe');
await click('שליחת הקריאה'); await p.waitForTimeout(2600);
await inspect('07-living-searching', { needsBack: false });
await p.waitForTimeout(3400); await inspect('08-living-found', { needsBack: false });
await p.waitForTimeout(2800); await inspect('09-living-reveal', { needsBack: false });
await tryClick('כן, מתאים לי', 1600);
await inspect('10-living-route', { needsBack: false });

// The professional's side.
await tryClick('מקצוען', 1400);
await inspect('11-pro-shift', { needsBack: false });
await tryClick('הבנתי, בוא נתחיל', 900);
await tryClick('ניהול', 1200); await inspect('12-pro-presence');
await tryClick('המחירים שלך', 1200); await inspect('13-pro-pricing');

/*
 * THE PHONE'S OWN BACK BUTTON, ON THE SIDE THAT NEVER HAD ONE.
 *
 * Amit, on an Android phone: *"כפתור חזרה למסך קודם לא נמצא בכל מקום.
 * באנדרואיד רצוי שהכפתור הטבעי שלו למטרה זו גם יעבוד — כרגע זורק החוצה
 * מהאפליקציה."*
 *
 * The customer side recorded its navigations and the professional side
 * recorded nothing, so the back gesture had no entry to pop on any
 * professional screen and the browser left the page. A claim that this
 * is fixed is worth nothing unless a browser presses the button, so one
 * does: go back from the pricing screen and check we are still inside
 * the prototype and somewhere else than we were.
 */
/*
 * WHAT IS ASSERTED, AND THE WEAKER VERSION THAT PROVED NOTHING.
 *
 * The first attempt checked that the page was still there and showing
 * something different. It passed with the bug deliberately put back,
 * because the history stack is ONE stack for the whole prototype: the
 * customer walk above had already pushed a dozen entries, so a back
 * press on a professional screen that recorded nothing still popped one
 * of THOSE — and landed the reviewer on the customer side. The page did
 * not close and the screen did change, so the check said nothing was
 * wrong while doing exactly the wrong thing.
 *
 * WHERE you land is the claim. Back from the professional's pricing
 * screen belongs on the professional's own previous screen, and the
 * header's switch button names the side you are on: "לקוח" is the way
 * out of the professional side, so seeing it means we are still on it.
 */
/*
 * PROVEN BY PUTTING THE FAULT BACK — and said plainly because this one
 * cannot carry an automatic control the way the two at the end of this
 * file do. Those plant their own evidence inside the page; this fault
 * lives in a React effect that the page cannot switch off.
 *
 * So it was done by hand, once: with `ProApp`'s `setBackHandler`
 * registration removed — the actual original state, where the only
 * listener was inside the unmounted `CustomerApp` — this check reported
 * "the back gesture did nothing on a professional screen". Two weaker
 * versions passed before that and are recorded above, because a check
 * that has only ever passed is not evidence of anything.
 */
const onProSide = () => p.getByRole('button', { name: 'לקוח' }).count().then((n) => n > 0);
if (!(await onProSide())) {
  problems.push('the professional side does not show its own switch button — the back check below cannot tell the sides apart');
}
const beforeBack = await p.evaluate(() => document.body.innerText.slice(0, 400));
await p.goBack();
await p.waitForTimeout(900);
const stillHere = await p.evaluate(() => !!document.querySelector('#root')?.textContent?.trim());
if (!stillHere) {
  problems.push('the back gesture left the prototype from a professional screen');
} else if (!(await onProSide())) {
  problems.push('back from a professional screen left the professional side — that side records no history of its own');
} else {
  const afterBack = await p.evaluate(() => document.body.innerText.slice(0, 400));
  if (afterBack === beforeBack) {
    problems.push('the back gesture did nothing on a professional screen');
  }
}
await inspect('13b-pro-after-back', { needsBack: false });

/*
 * The professional's four tabs, which nothing had ever opened. Tab roots,
 * so no on-screen back is expected — the tab bar is the way out, exactly
 * as it is on the customer's home.
 */
for (const [i, tabName] of ['כמה הרווחתי', 'המסמכים שלי', 'הפרופיל'].entries()) {
  const ok = await tryClick(tabName, 1200);
  if (!ok) { problems.push(`pro: tab "${tabName}" not tappable`); continue; }
  await inspect(`14-pro-tab-${i}-${tabName.replace(/\s/g, '_')}`, { needsBack: false });
}

/*
 * THE CONTROL.
 *
 * A check that has never fired is a check nobody has any reason to
 * believe. `verify:rowlock` proves itself against a deliberate conflict
 * for the same reason, and the off-screen check needs it more than most:
 * it is a filter over every div on the page, tuned to ignore the world
 * layer, carousels and the ground plate, and one careless condition turns
 * it into a function that always returns an empty list and always passes.
 *
 * So a card that IS off the edge is put on the page, the check is asked
 * about it, and the card is taken away again. If this stops failing, the
 * check has stopped working and the sweep says so instead of reporting a
 * clean run it did not earn.
 */
const controlCaught = await p.evaluate((scanSrc) => {
  const card = document.createElement('div');
  Object.assign(card.style, {
    position: 'fixed',
    top: '300px',
    left: `${window.innerWidth - 60}px`,
    width: '180px',
    height: '64px',
    background: 'rgb(16,12,22)',
    zIndex: '99999',
  });
  card.textContent = 'בקרה — הכרטיס הזה אמור להיתפס';
  document.body.appendChild(card);
  // eslint-disable-next-line no-eval
  const found = (0, eval)(`(${scanSrc})`)().offscreen.some((t) => t.includes('בקרה'));
  card.remove();
  return found;
}, scan.toString());
if (!controlCaught) {
  problems.push('the off-screen check did not catch its own control — it is not checking anything');
}

/*
 * The same proof for the buried-input check, which needs it just as
 * much: it starts by asking for the first input on the page, and on a
 * page with no input at all it returns an empty list and passes. So a
 * box IS put below the fold, the check is asked about it, and it is
 * taken away again.
 */
const buriedCaught = await p.evaluate((scanSrc) => {
  const holder = document.createElement('div');
  Object.assign(holder.style, { position: 'absolute', top: `${window.innerHeight + 400}px`, left: '20px', zIndex: '99999' });
  const box = document.createElement('input');
  box.setAttribute('aria-label', 'בקרה — התיבה הזו אמורה להיתפס');
  holder.appendChild(box);
  document.body.appendChild(holder);
  // The check looks at the FIRST input on the page, so anything already
  // there would mask the control. Hidden for the length of the test.
  const others = [...document.querySelectorAll('input:not([type="hidden"]), textarea')].filter((el) => el !== box);
  const was = others.map((el) => el.style.display);
  for (const el of others) el.style.display = 'none';
  // eslint-disable-next-line no-eval
  const found = (0, eval)(`(${scanSrc})`)().buried.some((t) => t.includes('בקרה'));
  others.forEach((el, i) => { el.style.display = was[i]; });
  holder.remove();
  return found;
}, scan.toString());
if (!buriedCaught) {
  problems.push('the buried-input check did not catch its own control — it is not checking anything');
}

console.log('ERRORS:', errors.length ? errors.join('\n  ') : 'none');
console.log('PROBLEMS:', problems.length ? '\n  ' + problems.join('\n  ') : 'none');
await b.close();

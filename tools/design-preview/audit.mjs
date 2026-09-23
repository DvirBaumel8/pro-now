import { launchChromium } from './browser.mjs';

/**
 * Accessibility audit of the running prototype.
 *
 * Three classes of defect, each of which has already bitten this project
 * once: controls too small to hit, text too low-contrast to read, and
 * text lying on the artwork with nothing behind it.
 *
 * WCAG: 4.5:1 for body text, 3:1 for large text (>=18.66px bold or >=24px).
 * Apple's HIG asks for 44x44pt touch targets; 44 CSS px is the equivalent here.
 *
 * ---------------------------------------------------------------------
 * THE THIRD ONE IS HERE BECAUSE THE SECOND ONE CANNOT SEE IT
 * ---------------------------------------------------------------------
 * The contrast check walks up for the first ancestor with an opaque
 * background and measures against that. Over the neighbourhood plate
 * that is the screen's own dark colour — which is behind the ARTWORK,
 * not behind the letters. So every word laid over the city measures
 * against a colour nobody can see, comes back at 12:1, and passes, while
 * the actual pixels are lit paving and a lamp post.
 *
 * Sampling the image would be the wrong tool anyway: the city moves, so
 * the answer would be different a frame later. What holds at every frame
 * is a rule about the TYPE — over the artwork it must carry its own
 * legibility, either a plate behind it or a halo around it — and that is
 * what this checks.
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

const b = await launchChromium();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto('http://localhost:4421/', { waitUntil: 'networkidle' });
await p.waitForTimeout(2200);

await p.exposeFunction('__dummy', () => {});

const check = async (label) => {
  return await p.evaluate(({ MIN_TARGET, label }) => {
    const out = { label, small: [], lowContrast: [], unlabelled: [], overArt: [], artRects: 0 };

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

    /*
     * --- TEXT LYING ON THE ARTWORK ---
     *
     * THE CONTRAST CHECK ABOVE HAS A BLIND SPOT AND IT IS THE WHOLE
     * PRODUCT.
     *
     * `bgOf` walks up for the first ancestor with an opaque background
     * colour. Over the neighbourhood plate that is the screen's own dark
     * colour — which is behind the artwork, not behind the letters. So
     * every word laid over the city measures against a colour nobody can
     * see, comes back at 12:1, and passes. Meanwhile the actual pixels
     * are lit paving and a lamp post, and the reader is squinting.
     *
     * Sampling the image is not available here and would be the wrong
     * tool anyway: the artwork moves, so the answer would be different a
     * frame later. What holds at every frame is a rule about the TEXT —
     * over the city, type must carry its own legibility with it, either a
     * plate behind it or a halo around it. The searching screen's
     * subtitle, the ETA and the city's own disclaimer all failed this
     * before it existed, and each was found by eye, once, after being
     * looked past for a week.
     */
    const art = [...document.querySelectorAll('img')]
      .filter((im) => /\/world\/|world_neighbourhood|welcome_hero/.test(im.currentSrc || im.src || ''))
      .filter((im) => {
        const r = im.getBoundingClientRect();
        return r.width > 200 && r.height > 200;
      });
    out.artRects = art.length;
    if (art.length) {
      /*
       * WHAT COUNTS AS SOMETHING BEHIND THE LETTERS.
       *
       * Not "the first ancestor with a background", which is how the
       * contrast check above got its blind spot: keep walking up and you
       * always reach the screen's own colour, which is behind the ARTWORK
       * rather than behind the type.
       *
       * And not "an ancestor" at all. The welcome screen's scrim is a
       * full-screen gradient panel drawn between the city and the words —
       * it backs every one of them and it is an ancestor of none of them.
       * A walk up the tree cannot see it.
       *
       * So this is a hit test rather than a walk: anything with a
       * background solid enough to sit on, that PAINTS AFTER the artwork
       * (later in document order, and not one of its ancestors), and
       * whose box covers the text. That is the same question the eye
       * asks — is there something between this word and the picture — and
       * it gets the scrim, the cards, the pills and the header bar
       * without needing to know what any of them are.
       */
      // `button` and `a` as well as `div`: react-native-web renders a
      // Pressable as a <button>, so a card's own background very often
      // lives on one — and a check that looked only at divs reported the
      // text inside perfectly ordinary buttons as lying on bare artwork.
      const backings = [...document.querySelectorAll('div,svg,button,a')].filter((el) => {
        const cs2 = getComputedStyle(el);
        const c = cs2.backgroundColor;
        const mm = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
        /*
         * An <svg> counts as a backing on sight. The welcome screen's
         * scrim and its two buttons are drawn with react-native-svg — a
         * painted gradient and two painted rectangles — so they have no
         * CSS background at all, and a check that looked only at CSS
         * reported every word on that screen as lying on bare artwork.
         * What an svg is painting cannot be read from here; that it is
         * painting something between the city and the type can.
         */
        if (el.tagName.toLowerCase() === 'svg') {
          const rr = el.getBoundingClientRect();
          return rr.width >= 24 && rr.height >= 12 && art.every((im) => !el.contains(im));
        }
        /*
         * OPACITY IS PART OF THE COLOUR.
         *
         * `backgroundColor` is the colour that was written down, not the
         * colour that lands on the screen. The living map's theme wash is
         * a full-screen panel of rgb(91,200,232) — bright sky blue — at
         * an element opacity of a few per cent. Read as a colour it is
         * solid; read as pixels it is a tint you can barely see. It
         * covered every word on the screen and answered "yes, there is
         * something behind that", which is how the control got backed by
         * a wash and the check reported nothing on the one screen that is
         * almost entirely artwork.
         */
        let effAlpha = mm ? (mm[4] === undefined ? 1 : +mm[4]) : 0;
        {
          let n2 = el, d2 = 0;
          while (n2 && d2 < 12) {
            const o = parseFloat(getComputedStyle(n2).opacity);
            if (!Number.isNaN(o)) effAlpha *= o;
            n2 = n2.parentElement;
            d2 += 1;
          }
        }
        const solid = effAlpha >= 0.5;
        // A scrim is a gradient, which lives in background-IMAGE and
        // leaves background-color transparent. The welcome screen's whole
        // legibility is one of those, and a check that could not see it
        // reported every word on that screen as lying on bare artwork.
        const gradient = /gradient\(/.test(cs2.backgroundImage || '');
        if (!solid && !gradient) return false;
        const r = el.getBoundingClientRect();
        if (r.width < 24 || r.height < 12) return false;
        /*
         * Anything that is not one of the artwork's own ancestors. The
         * page's background is an ancestor of the plate — that is exactly
         * what makes it the wrong answer, and it is the whole of the
         * blind spot in the contrast check above. Everything else on the
         * screen is drawn over the city.
         */
        return art.every((im) => !el.contains(im));
      });
      out.backings = backings.length;
      /*
       * WHERE THE ARTWORK IS ACTUALLY PAINTED, NOT WHERE ITS BOX IS.
       *
       * `getBoundingClientRect` ignores clipping, and the plate is always
       * clipped: it is 1.85 screens of neighbourhood inside a band a few
       * hundred points tall. Taking the raw box made the artwork appear
       * to reach up under the header, so every word in the header —
       * "PRO", "NOW", "שלום" — was reported as lying on the city, while
       * sitting on a solid bar in front of it. Intersecting with every
       * clipping ancestor gives the rectangle a person can actually see
       * the picture in, which is the only one this question is about.
       */
      const paintedBox = (el) => {
        let r = el.getBoundingClientRect();
        let n = el.parentElement;
        while (n) {
          const cs2 = getComputedStyle(n);
          if (cs2.overflow !== 'visible' || cs2.overflowX !== 'visible' || cs2.overflowY !== 'visible') {
            const q = n.getBoundingClientRect();
            r = {
              left: Math.max(r.left, q.left),
              right: Math.min(r.right, q.right),
              top: Math.max(r.top, q.top),
              bottom: Math.min(r.bottom, q.bottom),
            };
          }
          n = n.parentElement;
        }
        return r;
      };
      const artBoxes = art.map(paintedBox).filter((r) => r.right > r.left && r.bottom > r.top);
      for (const el of texts) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.bottom < 0 || r.top > window.innerHeight) continue;
        const onArt = artBoxes.some((a) => r.left < a.right && r.right > a.left && r.top < a.bottom && r.bottom > a.top);
        if (!onArt) {
          if (el.innerText.trim().startsWith('בקרה')) out.controlBackedBy = `not over art; boxes=${JSON.stringify(artBoxes)}`;
          continue;
        }
        const cs = getComputedStyle(el);
        // A halo of its own is enough.
        if (cs.textShadow && cs.textShadow !== 'none') continue;
        const backer = backings.find((b) => {
          const q = b.getBoundingClientRect();
          return q.left <= r.left + 1 && q.right >= r.right - 1 && q.top <= r.top + 1 && q.bottom >= r.bottom - 1;
        });
        if (backer) {
          if (el.innerText.trim().startsWith('בקרה')) {
            out.controlBackedBy = `${backer.tagName} ${getComputedStyle(backer).backgroundColor} ${Math.round(backer.getBoundingClientRect().width)}x${Math.round(backer.getBoundingClientRect().height)}`;
          }
          continue;
        }
        out.overArt.push({ text: el.innerText.trim().slice(0, 34), size: Math.round(parseFloat(cs.fontSize)) });
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
     * Both of the things the app asks before it asks what you need: the
     * three-slide explanation, and then who you are. Skipping either is a
     * first-class answer — see `IntroBody` and `shouldOfferPicker` — and
     * it is the right one here, because each has a screen of its own in
     * this list and the journeys below are about everything after them.
     *
     * The order matters and so does the exact text: `text=דלג` also
     * matches the picker's "דלג כרגע", so the intro's skip has to be
     * taken first or one click would land on the wrong screen.
     */
    try { await p.locator('text=דלג').first().click({ timeout: 1500 }); await p.waitForTimeout(700); } catch { /* no intro on this build */ }
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
/*
 * "ניהול" was one link beside the service list that opened the PRESENCE
 * screen, so this step audited a screen about location under a label
 * about services — and once the services got their own sheet, this step
 * started auditing the sheet while still calling it pro-presence.
 * Each door is named for where it goes now.
 */
await visit('pro-services', PRO, ['שירותים']);
await visit('pro-presence', PRO, ['מיקום']);
await visit('pro-shift-online', PRO, ['התחלת משמרת']);
await visit('pro-earnings', PRO, ['כמה הרווחתי']);
await visit('pro-verify', PRO, ['המסמכים שלי']);

/*
 * THE SCREENS THAT ARE ALMOST ENTIRELY ARTWORK.
 *
 * The audit walked past them for weeks — they are behind a search that
 * takes seconds to run, so every journey stopped at "שליחת הקריאה". They
 * are also the screens where a contrast measurement is least able to
 * help, because there is no background colour behind the type at all,
 * only a lit city. Which is to say: the ones the check added below this
 * exists for.
 */
await visit('living-searching', CUST, [
  HOME_DOOR,
  'פתיחת סתימה',
  'בקשת בעל מקצוע עכשיו',
  'שליחת הקריאה',
  async () => p.waitForTimeout(2600),
]);
await visit('living-wait', CUST, [
  HOME_DOOR,
  'פתיחת סתימה',
  'בקשת בעל מקצוע עכשיו',
  'שליחת הקריאה',
  async () => p.waitForTimeout(8500),
  'כן, מתאים לי',
  async () => p.waitForTimeout(2000),
]);

/*
 * THE SHOPS THAT ARE NOT OURS.
 *
 * Both screens exist to carry a disclosure — the word `בחסות`, and the
 * sentence saying whose site is about to open — and a disclosure that
 * fails a contrast check or sits under a floating control is not one.
 * Which is not hypothetical: the badge shipped its first afternoon
 * directly beneath the back button, and was found in a screenshot
 * rather than by anything here.
 *
 * `advertise` is reached from the last row of the customer's home
 * screen, so this also proves that row is reachable at all — it is at
 * the bottom of a long scroller, and a door nobody can open is the
 * failure this walk has found more often than any other.
 */
await visit('advertise', CUST, [
  async () => {
    await p.evaluate(() => {
      const s = [...document.querySelectorAll('div')].find((d) => d.scrollHeight > d.clientHeight + 100);
      if (s) s.scrollTop = s.scrollHeight;
    });
    await p.waitForTimeout(500);
    await p.getByRole('button', { name: /פתיחת חנות בשכונה/ }).first().click();
    await p.waitForTimeout(1000);
  },
]);
await visit('sponsor-shop', CUST, [
  HOME_DOOR,
  'פתיחת סתימה',
  'בקשת בעל מקצוע עכשיו',
  'שליחת הקריאה',
  async () => p.waitForTimeout(8500),
  'כן, מתאים לי',
  'לעקוב אחרי',
  async () => {
    await p.evaluate(() => {
      for (const d of document.querySelectorAll('div')) {
        if (d.scrollHeight > d.clientHeight + 60) d.scrollTop = d.scrollHeight;
      }
    });
    await p.waitForTimeout(700);
    await p.getByRole('button', { name: /Lust/ }).first().click();
    await p.waitForTimeout(1200);
  },
]);

/*
 * THE CONTROL, FOR THE CHECK THAT CANNOT BE SEEN FAILING.
 *
 * The other three checks here measure something a person could also
 * measure: a box is 40 points or it is not. "Is this word legible on
 * that picture" is a filter with half a dozen conditions in it — what
 * counts as artwork, what counts as something painted in front of it,
 * where the artwork is actually visible rather than merely boxed — and
 * every one of those conditions was wrong at least once while it was
 * being written. Each time, the symptom was the same: a clean run.
 *
 * So a word IS put on the city, with nothing behind it and no halo, the
 * same scan is asked about it, and it is taken away again. If this ever
 * stops failing, the check has quietly become a function that returns an
 * empty list, and the audit says so rather than reporting a clean run it
 * has not earned.
 */
{
  const caught = await p.evaluate(() => {
    const art = [...document.querySelectorAll('img')].find((im) =>
      /\/world\/|world_neighbourhood|welcome_hero/.test(im.currentSrc || im.src || '')
    );
    if (!art) return 'no artwork on this screen to test against';
    /*
     * The middle of the screen, not the middle of the artwork's BOX. The
     * plate is far larger than the phone and mostly outside it, so its
     * box's top-left corner is usually off-screen — and a probe placed
     * there is not over anything a person can see, which is precisely
     * the distinction the check is built around.
     */
    const probe = document.createElement('div');
    probe.textContent = 'בקרה — המילה הזאת אמורה להיתפס';
    Object.assign(probe.style, {
      position: 'fixed',
      left: `${Math.round(window.innerWidth * 0.25)}px`,
      top: `${Math.round(window.innerHeight * 0.5)}px`,
      color: 'rgb(247,243,250)',
      fontSize: '17px',
      background: 'transparent',
      zIndex: '99998',
    });
    document.body.appendChild(probe);
    return 'ok';
  });
  if (caught !== 'ok') {
    failures.push(`control: ${caught}`);
  } else {
    const report = await check('control');
    await p.evaluate(() => {
      const probe = [...document.querySelectorAll('div')].find(
        (e) => (e.textContent || '').startsWith('בקרה — המילה')
      );
      probe?.remove();
    });
    if (process.env.SWEEP_DEBUG) console.log('  control report:', JSON.stringify(report));
    if (!report.overArt.some((o) => o.text.startsWith('בקרה'))) {
      failures.push('control: the artwork-legibility check did not catch its own control — it is not checking anything');
    }
  }
}

for (const r of results) {
  console.log(`\n### ${r.label}`);
  if (r.small.length) console.log('  SMALL TARGETS:', JSON.stringify(r.small.slice(0, 6)));
  if (r.lowContrast.length) console.log('  LOW CONTRAST:', JSON.stringify(r.lowContrast.slice(0, 6)));
  if (r.overArt.length) console.log('  ON THE ARTWORK, UNPLATED:', JSON.stringify(r.overArt.slice(0, 8)));
  if (process.env.SWEEP_DEBUG) console.log('  art rects:', r.artRects, 'backings:', r.backings);
  if (r.unlabelled.length) console.log('  UNLABELLED:', r.unlabelled.length);
  if (!r.small.length && !r.lowContrast.length && !r.unlabelled.length && !r.overArt.length) console.log('  clean');
}

if (failures.length) {
  console.log('\n!! NAVIGATION FAILURES — these screens were never audited:');
  for (const f of failures) console.log('  ', f);
}
const defects = results.filter(
  (r) => r.small.length || r.lowContrast.length || r.unlabelled.length || r.overArt.length
);
console.log(`\naudited ${results.length} screens · ${defects.length} with defects · ${failures.length} unreachable`);
await b.close();
if (failures.length || defects.length) process.exit(1);

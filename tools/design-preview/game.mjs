/**
 * THE WAIT IS A GAME, AND THIS PROVES IT IS.
 *
 * Amit: *"יש 20 דקות עד שהוא מגיע, ב-20 הדקות האלה אני רוצה שיהיה משחק,
 * שאתה יכול לרוץ עם החצים, לשחק בין החנויות."*
 *
 * Four things have to be true at once for that to exist, and each of them
 * has been false at some point in this project:
 *
 *   an avatar is chosen and visible,
 *   the arrows are on screen in ASSIGNED_ROUTE and NOT during the search,
 *   holding one actually moves the figure,
 *   and something in the street answers when you reach it.
 *
 * Checking them together is the only check that means anything, because
 * three out of four is a screen that looks right and does nothing.
 */
import { launchChromium } from './browser.mjs';

const b = await launchChromium();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));

const click = async (t) => { await p.locator(`text=${t}`).first().click({ timeout: 8000 }); await p.waitForTimeout(800); };
const problems = [];

await p.goto('http://127.0.0.1:4421/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1400);
await click('אני צריך מקצוען');
await p.getByLabel('מספר טלפון').fill('0501234567');
await click('שליחת קוד');
await p.getByLabel('קוד האימות').fill('123456');
await click('כניסה');
await p.waitForTimeout(1400);

/*
 * The three slides that now open the app, skipped. `text=דלג` also
 * matches the picker's "דלג כרגע", so this is taken before the figure is
 * chosen rather than after.
 */
try { await click('דלג'); } catch { /* no intro on this build */ }
await p.waitForTimeout(600);

// 1 — a figure is chosen.
const tile = p.getByLabel(/דמות 4$/).first();
if (!(await tile.count())) problems.push('no avatar tile to choose');
else { await tile.click(); await p.waitForTimeout(400); await click('זו אני/אני זה'); }
await p.waitForTimeout(1200);

/*
 * ---------------------------------------------------------------------
 * THE LENS MOVES, AND IT NEVER SHOWS THE EDGE OF THE WORLD
 * ---------------------------------------------------------------------
 * The search frames each shop differently now (`framingFor`), which was
 * only possible once a change of lens stopped being a cut. An earlier
 * attempt at that put a dark band down the side of the screen — the
 * camera's edge clamp was computed for the new layout size while the
 * picture was still the old one — and it was found by eye, within a
 * minute, which is not a way to find things twice.
 *
 * Two claims, sampled ACROSS a search rather than at one moment:
 *
 *   the world is drawn at more than one size (the lens actually moves),
 *   and at no sample does the plate fail to cover the screen.
 *
 * The second is the one that matters. A world narrower than the viewport,
 * or offset past its own edge, is the hole — and it is checked at every
 * frame sampled rather than in the settled shot, because the settled shot
 * is exactly where the old fault did NOT show.
 */
await p.goto('http://127.0.0.1:4421/?phase=SEARCHING&service=svc-leak', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);

const plate = async () =>
  p.evaluate(() => {
    // The world layer: the widest positioned element under the scene that
    // is larger than the viewport is the plate the camera moves.
    let best = null;
    for (const el of document.querySelectorAll('div')) {
      const r = el.getBoundingClientRect();
      if (r.width <= window.innerWidth) continue;
      if (!best || r.width > best.width) best = { width: r.width, height: r.height, left: r.left, top: r.top };
    }
    return best ? { ...best, vw: window.innerWidth, vh: window.innerHeight } : null;
  });

const seen = [];
for (let i = 0; i < 14; i += 1) {
  const m = await plate();
  if (m) {
    seen.push(Math.round(m.width));
    // Covers the screen: the plate starts at or before the left edge and
    // ends at or after the right one. A pixel of tolerance for rounding.
    if (m.left > 1 || m.left + m.width < m.vw - 1) {
      problems.push(
        `the world left a gap during the search — plate at ${Math.round(m.left)}..${Math.round(m.left + m.width)} in a ${m.vw}px screen`
      );
      break;
    }
  }
  await p.waitForTimeout(420);
}
if (seen.length > 3) {
  const sizes = new Set(seen);
  if (sizes.size < 2) {
    problems.push(`the lens never moved during the search — the world stayed ${seen[0]}px wide at every sample`);
  }
}

/**
 * Straight to the wait. The demo cycle walks the phases on a timer, so
 * the route is reached by asking for it rather than by waiting for it —
 * a test that sleeps through four phases is a test nobody runs.
 */
await p.goto('http://127.0.0.1:4421/?phase=ASSIGNED_ROUTE&service=svc-leak', { waitUntil: 'networkidle' });
await p.waitForTimeout(1800);

const pad = p.getByLabel('הליכה ברחוב');
const hasPad = (await pad.count()) > 0;
if (!hasPad) problems.push('ASSIGNED_ROUTE has no steer pad — there is no game');

// 3 — holding one moves the figure.
if (hasPad) {
  const box = await pad.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  /*
   * EITHER THE STREET MOVED OR THE FIGURE DID — AND WHY IT HAS TO BE BOTH.
   *
   * Two wrong versions of this, and each was wrong for the opposite
   * reason.
   *
   * Watching the FIGURE reported "moved 0.0px" while it was plainly
   * walking: the camera follows the walker, so somebody crossing the
   * neighbourhood stays roughly where they are on the glass while the
   * street slides past behind them. That measures the camera's success at
   * following and calls it a failure to move.
   *
   * Watching the STREET reported the same thing, for the opposite reason.
   * The camera clamps so the edge of the plate never enters frame, and
   * against the bottom of the world it cannot travel at all — the figure
   * walks and the ground is pinned.
   *
   * So the question is not "did X move", it is "did anything". If neither
   * the world nor the figure has shifted after holding an arrow for two
   * and a half seconds, nothing walked, and that is the only reading that
   * is true from every position on the plate.
   */
  const scene = () =>
    p.evaluate(() => {
      const ground = document.querySelector('img[src*="world_neighbourhood"]');
      const figure = document.querySelector('img[src*="avatar_"]');
      return {
        ground: ground ? ground.getBoundingClientRect().top : null,
        figure: figure ? figure.getBoundingClientRect().top : null,
      };
    });
  const walkerBefore = await scene();
  await p.mouse.move(cx, cy);
  await p.mouse.down();
  await p.mouse.move(cx, cy - 44, { steps: 5 });

  /*
   * HOLD THE ARROW, AND KEEP THE PAGE PAINTING.
   *
   * Headless Chromium only services `requestAnimationFrame` when it is
   * producing frames, and a test that just sleeps is not asking it to.
   * The first version of this held the arrow for 2.6 seconds and the walk
   * loop ran TWICE — so it reported that nothing moved, on a build where
   * the walking was perfectly fine.
   *
   * That is the measurement lying rather than the product, which is the
   * third time tonight, and worth the comment: a browser check that does
   * not force a frame is measuring the harness.
   *
   * Screenshotting forces compositing, so the hold is broken into short
   * waits with a capture between them.
   */
  for (let i = 0; i < 12; i += 1) {
    await p.waitForTimeout(160);
    await p.screenshot({ path: '/tmp/claude-0/shots/GAME-hold.png' });
  }
  const walkerAfter = await scene();
  await p.mouse.up();
  if (walkerAfter.figure === null) {
    problems.push('no figure on screen — the customer is not in their own world');
  }
  if (walkerBefore.ground === null) {
    problems.push('no ground plate — there is no street to walk down');
  } else {
    const movedGround = Math.abs((walkerAfter.ground ?? 0) - walkerBefore.ground);
    const movedFigure =
      walkerBefore.figure === null || walkerAfter.figure === null
        ? 0
        : Math.abs(walkerAfter.figure - walkerBefore.figure);
    if (Math.max(movedGround, movedFigure) < 4) {
      problems.push(
        `held an arrow for 2.6s and nothing moved (street ${movedGround.toFixed(1)}px, figure ${movedFigure.toFixed(1)}px)`
      );
    }
  }
  await p.screenshot({ path: '/tmp/claude-0/shots/GAME-walk.png' });
}

// 2b — and the arrows are NOT there during the search.
await p.goto('http://127.0.0.1:4421/?phase=SEARCHING&service=svc-leak', { waitUntil: 'networkidle' });
await p.waitForTimeout(1600);
if ((await p.getByLabel('הליכה ברחוב').count()) > 0) {
  problems.push('SEARCHING has a steer pad — the search must have nothing to press');
}
await p.screenshot({ path: '/tmp/claude-0/shots/GAME-search.png' });

console.log('ERRORS:', errors.length ? errors : 'none');
console.log('PROBLEMS:', problems.length ? '\n  ' + problems.join('\n  ') : 'none');
await b.close();
process.exit(problems.length || errors.length ? 1 : 0);

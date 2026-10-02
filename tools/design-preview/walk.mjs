import { launchChromium } from './browser.mjs';
const b = await launchChromium();
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
const click = async (t) => { await p.locator(`text=${t}`).first().click({timeout:8000}); await p.waitForTimeout(900); };
const shot = (n) => p.screenshot({path:`/tmp/claude-0/shots/${n}.png`});
await p.goto('http://127.0.0.1:4421/', {waitUntil:'networkidle'}); await p.waitForTimeout(2000);
await click('אני צריך מקצוען');
await p.getByLabel('מספר טלפון').fill('0501234567'); await click('שליחת קוד');
await p.getByLabel('קוד האימות').fill('123456'); await click('כניסה');
await p.waitForTimeout(1300);

/*
 * THE PICKER IS PART OF THE JOURNEY NOW.
 *
 * This script walked straight from the code screen to a service and
 * started failing the night the avatar picker went in — not because
 * anything broke, but because the journey grew a step and the script did
 * not. A walk-through that does not match the walk is a walk-through
 * nobody can trust the next time it goes red.
 */
// The three slides that now open the app. Skipping is the path most
// people take, and `text=דלג` would also match the picker's "דלג כרגע",
// so it is taken here rather than folded into the step below.
try { await click('דלג'); } catch { /* no intro on this build */ }

try {
  await p.getByLabel(/דמות 4$/).first().click({ timeout: 4000 });
  await p.waitForTimeout(400);
  await click('זו אני/אני זה');
} catch {
  // Skipping is a first-class answer, so a run without art still gets past.
  try { await click('דלג כרגע'); } catch { /* no picker on this build */ }
}
await p.waitForTimeout(1200);

/*
 * AND THE HOME SCREEN IS A QUESTION NOW, NOT A GRID.
 *
 * It used to list every service flat, so a walk-through could tap one
 * from the front door. It leads with "מה אתם צריכים עכשיו?" and eight
 * ways in, which is the composition Amit and ChatGPT agreed — so the
 * journey goes through the category, the way a customer does.
 */
await click('לבית');
await p.waitForTimeout(900);
await click('פתיחת סתימה'); await click('בקשת בעל מקצוע עכשיו'); await click('שליחת הקריאה');
await p.waitForTimeout(2600); await shot('L1-searching');
await p.waitForTimeout(3200); await shot('L2-found');
await p.waitForTimeout(2600); await shot('L3-reveal');
try { await click('כן, מתאים לי'); } catch {}
await p.waitForTimeout(1400); await shot('L4-route');
await b.close(); console.log('done');

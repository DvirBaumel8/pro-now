import { launchChromium } from './browser.mjs';
const b = await launchChromium();
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
const click = async (t) => { await p.locator(`text=${t}`).first().click({timeout:8000}); await p.waitForTimeout(800); };
const shot = (n) => p.screenshot({path:`/tmp/claude-0/shots/${n}.png`});
await p.goto('http://127.0.0.1:4421/', {waitUntil:'networkidle'}); await p.waitForTimeout(1800);
await click('אני צריך מקצוען');
await p.getByLabel('מספר טלפון').fill('0501234567'); await click('שליחת קוד');
await p.getByLabel('קוד האימות').fill('123456'); await click('כניסה');
await p.waitForTimeout(1200);
try { await click('דלג'); } catch {}
try { await p.getByLabel(/דמות 4$/).first().click({ timeout: 4000 }); await p.waitForTimeout(300); await click('זו אני/אני זה'); }
catch { try { await click('דלג כרגע'); } catch {} }
await p.waitForTimeout(1200);
await click('לבית'); await p.waitForTimeout(700);
await click('פתיחת סתימה'); await click('בקשת בעל מקצוע עכשיו'); await click('שליחת הקריאה');
await p.waitForTimeout(7000);
try { await click('כן, מתאים לי'); } catch {}
await p.waitForTimeout(1800);
try { await click('מפה אמיתית'); } catch { console.log('no ground switch here'); }
await p.waitForTimeout(1600);
// From the living map into the tracking screen.
for (const label of ['לעקוב אחרי דוגמה','לעקוב אחרי','פרטי העבודה']) {
  try { await click(label); break; } catch {}
}
await p.waitForTimeout(2600); await shot('T1-track-real');
await b.close(); console.log('done');

import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
const click = async (t) => { await p.locator(`text=${t}`).first().click({timeout:8000}); await p.waitForTimeout(900); };
const shot = (n) => p.screenshot({path:`/tmp/claude-0/shots/${n}.png`});
await p.goto('http://127.0.0.1:4421/', {waitUntil:'networkidle'}); await p.waitForTimeout(2000);
await click('אני צריך מקצוען');
await p.getByLabel('מספר טלפון').fill('0501234567'); await click('שליחת קוד');
await p.getByLabel('קוד האימות').fill('123456'); await click('כניסה');
await p.waitForTimeout(1300);
await click('פתיחת סתימה'); await click('בקשת בעל מקצוע עכשיו'); await click('שליחת הקריאה');
await p.waitForTimeout(2600); await shot('L1-searching');
await p.waitForTimeout(3200); await shot('L2-found');
await p.waitForTimeout(2600); await shot('L3-reveal');
try { await click('כן, מתאים לי'); } catch {}
await p.waitForTimeout(1400); await shot('L4-route');
await b.close(); console.log('done');

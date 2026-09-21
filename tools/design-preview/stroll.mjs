import { launchChromium } from './browser.mjs';
const b = await launchChromium();
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
p.on('pageerror', e => console.log('PAGE ERR:', String(e).slice(0,300)));
const click = async (t) => { await p.locator(`text=${t}`).first().click({timeout:8000}); await p.waitForTimeout(900); };
const shot = (n) => p.screenshot({path:`/tmp/claude-0/shots/${n}.png`});
await p.goto('http://127.0.0.1:4421/', {waitUntil:'networkidle'}); await p.waitForTimeout(1600);
await click('אני צריך מקצוען');
await p.getByLabel('מספר טלפון').fill('0501234567'); await click('שליחת קוד');
await p.getByLabel('קוד האימות').fill('123456'); await click('כניסה');
await p.waitForTimeout(1400);
await p.getByLabel(/דמות 1$/).first().click(); await p.waitForTimeout(500);
await click('זו אני/אני זה');
await p.waitForTimeout(1200);
await shot('S0-home');
// the door
await click('הליכה (הדגמה)');   // borrow the walking figures
await p.waitForTimeout(700);
await click('טיילו ברחוב של PRO NOW');
await p.waitForTimeout(1500);
await shot('S1-street');
const pad = p.getByLabel('הליכה ברחוב');
console.log('pad', await pad.count());
if (await pad.count()) {
  const box = await pad.boundingBox();
  const cx = box.x + box.width/2, cy = box.y + box.height/2;
  await p.mouse.move(cx, cy); await p.mouse.down();
  await p.mouse.move(cx + 44, cy - 20, {steps:5});
  await p.waitForTimeout(2200); await shot('S2-walking');
  await p.mouse.move(cx, cy - 44, {steps:5});
  await p.waitForTimeout(2200); await shot('S3-north');
  await p.mouse.up(); await p.waitForTimeout(700); await shot('S4-stopped');
}
await b.close(); console.log('done');

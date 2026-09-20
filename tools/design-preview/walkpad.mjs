import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
p.on('console', m => { if (m.type()==='error') console.log('CONSOLE ERR:', m.text().slice(0,200)); });
p.on('pageerror', e => console.log('PAGE ERR:', String(e).slice(0,300)));
const click = async (t) => { await p.locator(`text=${t}`).first().click({timeout:8000}); await p.waitForTimeout(900); };
const shot = (n) => p.screenshot({path:`/tmp/claude-0/shots/${n}.png`});
await p.goto('http://127.0.0.1:4421/', {waitUntil:'networkidle'}); await p.waitForTimeout(1800);

await click('אני צריך מקצוען');
await p.getByLabel('מספר טלפון').fill('0501234567'); await click('שליחת קוד');
await p.getByLabel('קוד האימות').fill('123456'); await click('כניסה');
await p.waitForTimeout(1500);
await shot('W1-picker');

// pick the first face
const tile = p.getByLabel(/דמות 1$/).first();
if (await tile.count()) { await tile.click(); } else { console.log('NO TILE'); }
await p.waitForTimeout(700);
await click('זו אני/אני זה');
await p.waitForTimeout(1200);
await shot('W2-after-pick');

// the walking figures are still missing, so borrow them for the test
await click('הליכה (הדגמה)');
await p.waitForTimeout(800);

await click('לבית');
await p.waitForTimeout(600);
await click('פתיחת סתימה'); await click('בקשת בעל מקצוע עכשיו'); await click('שליחת הקריאה');
await p.waitForTimeout(2500);
await shot('W3-found');

// find the steer pad and drag inside it
const pad = p.getByLabel('הליכה ברחוב');
console.log('pad count', await pad.count());
if (await pad.count()) {
  const box = await pad.boundingBox();
  console.log('pad box', JSON.stringify(box));
  const cx = box.x + box.width/2, cy = box.y + box.height/2;
  await p.mouse.move(cx, cy);
  await p.mouse.down();
  await p.mouse.move(cx + 40, cy, {steps:5});
  await p.waitForTimeout(1600);
  await shot('W4-walking-east');
  await p.mouse.move(cx - 40, cy, {steps:5});
  await p.waitForTimeout(1500);
  await shot('W5-walking-west');
  await p.mouse.up();
  await p.waitForTimeout(600);
  await shot('W6-stopped');
}
await b.close(); console.log('done');

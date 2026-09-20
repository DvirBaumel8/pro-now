import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
const click = async (t) => { await p.locator(`text=${t}`).first().click({timeout:8000}); await p.waitForTimeout(800); };
const shot = (n) => p.screenshot({path:`/tmp/claude-0/shots/${n}.png`});
await p.goto('http://127.0.0.1:4421/', {waitUntil:'networkidle'}); await p.waitForTimeout(1600);
await click('אני צריך מקצוען');
await p.getByLabel('מספר טלפון').fill('0501234567'); await click('שליחת קוד');
await p.getByLabel('קוד האימות').fill('123456'); await click('כניסה');
await p.waitForTimeout(1400);
await p.getByRole('button', { name: 'לבית' }).first().click(); await p.waitForTimeout(1300); await shot('U1-category');
await p.getByRole('button', { name: /פתיחת סתימה/ }).first().click(); await p.waitForTimeout(1000); await shot('U2-service');
await click('בקשת בעל מקצוע עכשיו'); await p.waitForTimeout(800); await shot('U3-describe');
await click('שליחת הקריאה'); await p.waitForTimeout(2600); await shot('U4-searching');
await p.waitForTimeout(3400); await shot('U5-found');
await p.waitForTimeout(2800); await shot('U6-reveal');
for (const label of ['המקצוען יצא לדרך','פרטי העבודה']) {
  try { await p.locator(`text=${label}`).first().click({timeout:2500}); await p.waitForTimeout(1600); } catch {}
}
await shot('U7-tracking');
console.log('ERRORS:', errs.length ? errs.join('\n') : 'none');
const imgs = await p.evaluate(()=>[...document.images].filter(i=>i.currentSrc.includes('world/')).map(i=>i.currentSrc.split('/').pop()));
console.log('IMAGES:', [...new Set(imgs)].join(', '));
await b.close();

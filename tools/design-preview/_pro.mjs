import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
const click = async (t) => { await p.locator(`text=${t}`).first().click({timeout:8000}); await p.waitForTimeout(900); };
await p.goto('http://127.0.0.1:4421/', {waitUntil:'networkidle'}); await p.waitForTimeout(2000);
await click('אני בעל מקצוע');
await p.getByLabel('מספר טלפון').fill('0501234567'); await click('שליחת קוד');
await p.getByLabel('קוד האימות').fill('123456'); await click('כניסה');
await p.waitForTimeout(1600);
try { await click('הבנתי, בוא נתחיל'); } catch {}
await p.screenshot({path:'/tmp/claude-0/shots/PR1.png'});
await p.evaluate(() => { const e = [...document.querySelectorAll('*')].find(n => n.scrollHeight > n.clientHeight + 40 && n.clientHeight > 300); if (e) e.scrollTop = e.scrollHeight; });
await p.waitForTimeout(700);
await p.screenshot({path:'/tmp/claude-0/shots/PR2-bottom.png'});
console.log('SHIFT:', (await p.evaluate(()=>document.body.innerText)).replace(/\n+/g,' | ').slice(0,500));
await b.close();

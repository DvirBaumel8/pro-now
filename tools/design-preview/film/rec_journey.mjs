import { writeFileSync, mkdirSync } from 'node:fs';
import { launchChromium } from '../browser.mjs';
const DIR = new URL('./j/', import.meta.url).pathname; mkdirSync(DIR, { recursive: true });
const b = await launchChromium();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 160)));
const cdp = await ctx.newCDPSession(p);
const frames = []; let T0 = null; const marks = [];
cdp.on('Page.screencastFrame', async (f) => { frames.push({ t: f.metadata.timestamp, d: f.data }); await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
const now = async () => (await cdp.send('Runtime.evaluate', { expression: 'Date.now()/1000', returnByValue: true })).result.value;
const mark = async (label) => { const t = Date.now() / 1000; marks.push({ t, label }); console.log('mark', label); };
const click = async (t) => {
  const exact = p.locator('[role=button],button').filter({ hasText: new RegExp('^\\s*' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
  if (await exact.count()) { await exact.last().click({ timeout: 6000 }); } else { await p.locator(`text=${t}`).first().click({ timeout: 6000 }); }
};
const tryClick = async (t) => { try { await click(t); return true; } catch { console.log('MISS', t); return false; } };
const w = (ms) => p.waitForTimeout(ms);
await p.goto('http://127.0.0.1:4421/', { waitUntil: 'domcontentloaded' });
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
await mark('load');
await p.locator('text=אני צריך מקצוען').first().waitFor(); await mark('welcome'); await w(3500);
await click('אני צריך מקצוען'); await w(900);
await p.getByLabel('מספר טלפון').fill('0501234567'); await tryClick('שליחת קוד'); await w(700);
await p.getByLabel('קוד האימות').fill('123456'); await tryClick('כניסה'); await w(1200);
await mark('intro');
for (let i = 0; i < 5; i++) { await w(2600); await tryClick('הבא'); } await w(1500); await tryClick('בואו נתחיל'); await w(1500);
await mark('avatar');
try { await p.getByLabel(/דמות 1$/).first().click({ timeout: 3000 }); await w(1200); await click('זו אני/אני זה'); } catch { console.log('no avatar'); }
await w(2500); await mark('home'); await w(3000);
await tryClick('לבית'); await w(2500); await mark('category'); await w(1500);
await tryClick('נזילה או דליפת מים'); await w(2000); await tryClick('בקשת בעל מקצוע עכשיו'); await w(1500);
await mark('form');
for (const t of ['מתחת לכיור', 'טפטוף', 'לא', 'מהיום']) { await tryClick(t); await w(700); }
await w(800);
await mark('search'); await tryClick('שליחת הקריאה'); await w(7500);
await mark('match'); await w(2500);
await tryClick('כן, מתאים לי'); await mark('ontheway'); await w(5500);
await mark('street'); await w(3500);
const clock = p.getByLabel(/איפה הוא עכשיו/);
if (await clock.count()) { await clock.first().click(); await mark('tracking'); await w(9000); } else console.log('no clock');
await mark('pro_offer'); await tryClick('מקצוען'); await w(3500);
await mark('pro_accept'); await tryClick('כן, אני לוקח'); await w(3000);
await mark('pro_go'); await tryClick('יוצא לדרך'); await w(3000);
await mark('pro_arrived'); await tryClick('הגעתי'); await w(4500);
await mark('pro_quote'); await tryClick('שליחת הצעת מחיר'); await w(1500);
await p.getByPlaceholder(/מה נעשה/).first().pressSequentially('החלפת אטם בברז המטבח', { delay: 45 }); await w(400);
await p.locator('input').nth(2).pressSequentially('250', { delay: 160 }); await w(900);
await tryClick('שליחה ללקוח'); await mark('pro_waiting'); await w(4000);
await mark('c_quote');
{ const bar = p.locator('[role=button],button').filter({ hasText: 'כדי לאשר את ההצעה' }); await bar.last().click(); await w(3500); }
await tryClick('אישור ההצעה'); await mark('c_approved'); await w(3500);
await mark('pro_working'); await tryClick('מקצוען'); await w(5000);
await mark('pro_done'); await tryClick('סיימתי את העבודה'); await w(3500);
await mark('c_confirm');
{ const bar = p.locator('[role=button],button').filter({ hasText: 'כדי לאשר שהעבודה הושלמה' }); if (await bar.count()) { await bar.last().click(); await w(3000); } }
const bs = (await p.evaluate(() => [...document.querySelectorAll('[role=button],button')].map(e => e.innerText.trim().replace(/\n/g, ' ')).filter(Boolean)));
const fin = bs.find(t => /אישור|הושלמה|הכל תקין|מאשר/.test(t) && !/מעבר|הדגמה/.test(t));
if (fin) { await tryClick(fin); } await mark('c_closed'); await w(4000);
await mark('pro_settled'); await tryClick('מקצוען'); await w(5000);
await mark('end');
await cdp.send('Page.stopScreencast');
const t0 = frames[0].t;
const idx = frames.map((f, i) => { const name = String(i).padStart(5, '0') + '.jpg'; writeFileSync(DIR + name, Buffer.from(f.d, 'base64')); return { t: +(f.t - t0).toFixed(3), f: name }; });
writeFileSync(DIR + 'index.json', JSON.stringify({ frames: idx, marks: marks.map(m => ({ label: m.label, t: +(m.t - t0).toFixed(3) })) }, null, 1));
console.log('frames', frames.length, (frames.at(-1).t - t0).toFixed(1) + 's', 'errors', errs.join(' || '));
await b.close();

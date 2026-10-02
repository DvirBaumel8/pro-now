import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { launchChromium } from '../browser.mjs';
const [NAME, TIME, MODE] = process.argv.slice(2);
const DIR = new URL(`./${NAME}/`, import.meta.url).pathname; rmSync(DIR, { recursive: true, force: true }); mkdirSync(DIR, { recursive: true });
const b = await launchChromium();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 160)));
const cdp = await ctx.newCDPSession(p);
const frames = []; const marks = []; const rects = [];
cdp.on('Page.screencastFrame', async (f) => { frames.push({ t: f.metadata.timestamp, d: f.data }); await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
const mark = (label) => { marks.push({ t: Date.now() / 1000, label }); console.log('mark', label); };
const cap = async (label, re) => {
  const r = await p.evaluate((src) => { const rx = new RegExp(src); let best = null;
    for (const el of document.querySelectorAll('body *')) { const t = (el.innerText || el.getAttribute('aria-label') || '').trim(); if (!t || !rx.test(t)) continue; const b = el.getBoundingClientRect(); if (b.width < 4 || b.height < 4 || b.bottom < 0 || b.top > innerHeight) continue; if (!best || b.width * b.height < best.w * best.h) best = { x: b.left / innerWidth, y: b.top / innerHeight, w: b.width / innerWidth, h: b.height / innerHeight }; }
    return best; }, re.source);
  rects.push({ t: Date.now() / 1000, label, r }); console.log('cap', label, r ? 'ok' : 'MISSING');
};
const click = async (t) => { const exact = p.locator('[role=button],button').filter({ hasText: new RegExp('^\\s*' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }); if (await exact.count()) { await exact.last().click({ timeout: 6000 }); } else { await p.locator(`text=${t}`).first().click({ timeout: 6000 }); } };
const tryClick = async (t) => { try { await click(t); return true; } catch { console.log('MISS', t); return false; } };
const btns = async () => (await p.evaluate(() => [...document.querySelectorAll('[role=button],button')].map(e => (e.innerText.trim() || e.getAttribute('aria-label') || '').replace(/\n/g, ' ')).filter(Boolean).slice(0, 30))).join(' | ');
const w = (ms) => p.waitForTimeout(ms);
await p.goto(`http://127.0.0.1:4421/?time=${TIME}`, { waitUntil: 'domcontentloaded' });
await p.locator('text=אני צריך מקצוען').first().waitFor(); await w(1200);
if (MODE === 'onb') await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
mark('welcome'); await w(3000); await cap('welcome_need', /^אני צריך מקצוען/); await cap('welcome_pro', /^אני בעל מקצוע/); await w(1500);
await click('אני צריך מקצוען'); await w(1500); mark('phone');
await p.getByLabel('מספר טלפון').pressSequentially('0501234567', { delay: 70 }); await w(500); await tryClick('שליחת קוד'); await w(1200);
await p.getByLabel('קוד האימות').pressSequentially('123456', { delay: 110 }); await w(500); await tryClick('כניסה'); await w(1500);
mark('intro');
for (let i = 0; i < 5; i++) { await w(MODE === 'onb' ? 3000 : 300); await tryClick('הבא'); } await w(MODE === 'onb' ? 2500 : 300); await tryClick('בואו נתחיל'); await w(1800);
mark('avatar'); console.log('AVATAR', await btns()); await cap('avatar_grid', /^דמות 1$/); await w(2000);
try { await p.getByLabel(/דמות 3$/).first().click({ timeout: 3000 }); await w(1500); await p.getByLabel(/דמות 1$/).first().click({ timeout: 3000 }); await w(1800); await cap('avatar_ok', /^זו אני\/אני זה/); await w(800); await click('זו אני/אני זה'); } catch (e) { console.log('no avatar', String(e).slice(0, 80)); }
await w(2500); mark('home');
if (MODE === 'day' || MODE === 'pshift') await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
if (MODE === 'onb') { await w(2500); mark('pro_toggle'); await tryClick('מקצוען'); await w(2500); console.log('PRO', await btns()); await cap('pro_online', /זמין|מחובר|ONLINE|משמרת/); await w(3500); }
if (MODE === 'pshift') {
  await w(800); mark('pro_intro'); await tryClick('מקצוען'); await w(2000); await cap('pintro_title', /^איך זה עובד — בקצרה$/); await cap('pintro_1', /^אתה מחליט מתי אתה עובד$/); await cap('pintro_3', /^רואה הכל לפני שאתה מחליט$/); await w(5500);
  await tryClick('הבנתי, בוא נתחיל'); mark('pro_off'); await w(2200); await cap('shift_btn', /^התחלת משמרת$/); await w(1200);
  await tryClick('התחלת משמרת'); mark('pro_on'); await w(2500); await cap('shift_clock', /^00:00:0\d$/); await w(6000);
}
if (MODE === 'day') {
  mark('dhome'); await w(2000); await tryClick('לבית'); await w(2000); await tryClick('נזילה או דליפת מים'); await w(2000); await tryClick('בקשת בעל מקצוע עכשיו'); await w(1200);
  for (const t of ['מתחת לכיור', 'טפטוף', 'לא', 'מהיום']) { await tryClick(t); await w(500); }
  mark('dsearch'); await tryClick('שליחת הקריאה'); await w(7500); mark('dmatch'); await w(3000); await tryClick('כן, מתאים לי'); mark('dotw'); await w(5000); mark('dstreet'); await w(4000);
}
mark('end');
await cdp.send('Page.stopScreencast');
const t0 = frames[0].t;
const idx = frames.map((f, i) => { const name = String(i).padStart(5, '0') + '.jpg'; writeFileSync(DIR + name, Buffer.from(f.d, 'base64')); return { t: +(f.t - t0).toFixed(3), f: name }; });
writeFileSync(DIR + 'index.json', JSON.stringify({ frames: idx, marks: marks.map(m => ({ label: m.label, t: +(m.t - t0).toFixed(3) })), rects: rects.map(r => ({ label: r.label, t: +(r.t - t0).toFixed(3), r: r.r })) }, null, 1));
console.log('frames', frames.length, (frames.at(-1).t - t0).toFixed(1) + 's', 'errors', errs.join(' || '));
await b.close();

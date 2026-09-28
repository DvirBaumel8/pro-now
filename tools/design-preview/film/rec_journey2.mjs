import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { launchChromium } from '../browser.mjs';
const DIR = new URL('./j3/', import.meta.url).pathname; rmSync(DIR, { recursive: true, force: true }); mkdirSync(DIR, { recursive: true });
const b = await launchChromium();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 160)));
const cdp = await ctx.newCDPSession(p);
const frames = []; const marks = []; const rects = [];
cdp.on('Page.screencastFrame', async (f) => { frames.push({ t: f.metadata.timestamp, d: f.data }); await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
const mark = (label) => { marks.push({ t: Date.now() / 1000, label }); console.log('mark', label); };
// where an element sits on the screen, as fractions — for the film's zoom and callouts
const cap = async (label, re) => {
  const r = await p.evaluate((src) => {
    const rx = new RegExp(src);
    let best = null;
    for (const el of document.querySelectorAll('body *')) {
      const t = (el.innerText || el.getAttribute('aria-label') || '').trim();
      if (!t || !rx.test(t)) continue;
      const b = el.getBoundingClientRect();
      if (b.width < 4 || b.height < 4 || b.bottom < 0 || b.top > innerHeight) continue;
      if (!best || b.width * b.height < best.w * best.h) best = { x: b.left / innerWidth, y: b.top / innerHeight, w: b.width / innerWidth, h: b.height / innerHeight };
    }
    return best;
  }, re.source);
  rects.push({ t: Date.now() / 1000, label, r }); console.log('cap', label, r ? 'ok' : 'MISSING');
};
const click = async (t) => {
  const exact = p.locator('[role=button],button').filter({ hasText: new RegExp('^\\s*' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
  if (await exact.count()) { await exact.last().click({ timeout: 6000 }); } else { await p.locator(`text=${t}`).first().click({ timeout: 6000 }); }
};
const tryClick = async (t) => { try { await click(t); return true; } catch { console.log('MISS', t); return false; } };
const w = (ms) => p.waitForTimeout(ms);
await p.goto('http://127.0.0.1:4421/?time=night', { waitUntil: 'domcontentloaded' });
await p.locator('text=אני צריך מקצוען').first().waitFor(); await w(2500);
await click('אני צריך מקצוען'); await w(700);
await p.getByLabel('מספר טלפון').fill('0501234567'); await tryClick('שליחת קוד'); await w(600);
await p.getByLabel('קוד האימות').fill('123456'); await tryClick('כניסה'); await w(1200);
for (let i = 0; i < 5; i++) { await w(700); await tryClick('הבא'); } await w(800); await tryClick('בואו נתחיל'); await w(1200);
try { await p.getByLabel(/דמות 1$/).first().click({ timeout: 3000 }); await w(900); await click('זו אני/אני זה'); } catch { console.log('no avatar'); }
await w(2000);
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
mark('home'); await w(1500); await cap('home_ask', /^מה אתם צריכים עכשיו\?$/); await cap('home_tiles', /^לבית/); await w(1800);
await tryClick('לבית'); await w(2200); mark('category'); await cap('cat_list', /^נזילה או דליפת מים/); await w(1200);
await tryClick('נזילה או דליפת מים'); await w(2200); mark('service');
await p.mouse.wheel(0, 400); await w(1500); await cap('fee_service', /^דמי ביקור לפי המקצוען$/); await w(2500);
await tryClick('בקשת בעל מקצוע עכשיו'); await w(1500); mark('form'); await cap('form_chips', /^מתחת לכיור$/);
for (const t of ['מתחת לכיור', 'טפטוף', 'לא', 'מהיום']) { await tryClick(t); await w(650); }
await w(700); await cap('send', /^שליחת הקריאה$/); await w(600);
mark('search'); await tryClick('שליחת הקריאה'); await w(3000); await cap('search_title', /מחפשים מי זמין עכשיו/); await w(4200);
mark('match'); await w(600); await cap('match_eta', /^14$/); await cap('match_fee', /^דמי הביקור של/); await cap('match_details', /^פרטים על/); await w(2200);
await p.getByRole('button', { name: /פרטים על/ }).first().click().catch(() => console.log('MISS details')); await w(1600);
mark('match_more'); await cap('match_checks', /^כל מי שמוצע לך עבר$/); await w(3200);
await tryClick('כן, מתאים לי'); mark('ontheway'); await w(1500); await cap('otw', /יצא אליך/); await w(4000);
mark('street'); await w(3500);
const clock = p.getByLabel(/איפה הוא עכשיו/);
if (await clock.count()) { await clock.first().click(); mark('tracking'); await w(2500); await cap('track_eta', /^10:\d\d$/); await w(6000); } else console.log('no clock');
mark('pro_offer'); await tryClick('מקצוען'); await w(1500); await cap('offer_timer', /^0:\d\d$/); await cap('offer_dist', /ק״מ|ק"מ/); await cap('offer_take', /^כן, אני לוקח$/); await w(2600);
mark('pro_accept'); await tryClick('כן, אני לוקח'); await w(1500); await cap('stage', /^שלב \d מתוך 7$/); await w(1500);
mark('pro_go'); await tryClick('יוצא לדרך'); await w(3000);
mark('pro_arrived'); await tryClick('הגעתי'); await w(1500); await cap('diag_clock', /^00:0\d$/); await w(2500);
mark('c_visit'); await tryClick('לקוח'); await w(1500); await cap('visit_title', /בודק את התקלה$/); await cap('visit_clock', /^00:0\d$/); await w(3500); await tryClick('מקצוען'); await w(1200);
mark('pro_quote'); await tryClick('שליחת הצעת מחיר'); await w(1500);
await p.getByPlaceholder(/מה נעשה/).first().pressSequentially('החלפת אטם בברז המטבח', { delay: 45 }); await w(400);
await p.locator('input').nth(2).pressSequentially('250', { delay: 160 }); await w(900);
await cap('quote_note', /^דמי הביקור כלולים בהצעה/); await w(1500);
await tryClick('שליחה ללקוח'); mark('pro_waiting'); await w(4000);
mark('c_quote');
{ const bar = p.locator('[role=button],button').filter({ hasText: 'כדי לאשר את ההצעה' }); await bar.last().click(); await w(2000); }
await cap('quote_total', /^\W*250\W*$/); await cap('quote_incl', /^כולל מע״מ ודמי הביקור/); await cap('quote_approve', /^אישור ההצעה/); await w(2500);
await tryClick('אישור ההצעה'); mark('c_approved'); await w(1800); await cap('visit_work', /^עובדים על התיקון$/); await w(2500);
mark('pro_working'); await tryClick('מקצוען'); await w(1500); await cap('work_clock', /^00:0\d$/); await w(3500);
mark('pro_done'); await tryClick('סיימתי את העבודה'); await w(3500);
mark('c_confirm');
{ const bar = p.locator('[role=button],button').filter({ hasText: 'כדי לאשר שהעבודה הושלמה' }); if (await bar.count()) { await bar.last().click(); await w(2500); } }
await cap('visit_done', /^העבודה הסתיימה$/); await cap('pay', /^אישור תשלום/); await w(2500);
const bs = (await p.evaluate(() => [...document.querySelectorAll('[role=button],button')].map(e => e.innerText.trim().replace(/\n/g, ' ')).filter(Boolean)));
const fin = bs.find(t => /אישור|הושלמה|הכל תקין|מאשר/.test(t) && !/מעבר|הדגמה/.test(t));
if (fin) { await tryClick(fin); } mark('c_closed'); await w(3500);
mark('pro_settled'); await tryClick('מקצוען'); await w(1500); await cap('earned', /250/); await w(3500);
mark('end');
await cdp.send('Page.stopScreencast');
const t0 = frames[0].t;
const idx = frames.map((f, i) => { const name = String(i).padStart(5, '0') + '.jpg'; writeFileSync(DIR + name, Buffer.from(f.d, 'base64')); return { t: +(f.t - t0).toFixed(3), f: name }; });
writeFileSync(DIR + 'index.json', JSON.stringify({ frames: idx, marks: marks.map(m => ({ label: m.label, t: +(m.t - t0).toFixed(3) })), rects: rects.map(r => ({ label: r.label, t: +(r.t - t0).toFixed(3), r: r.r })) }, null, 1));
console.log('frames', frames.length, (frames.at(-1).t - t0).toFixed(1) + 's', 'errors', errs.join(' || '));
await b.close();

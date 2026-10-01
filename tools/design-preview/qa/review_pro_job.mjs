// Design review: the whole professional side after joining — onboarding, shift (offline/online),
// the demo call, offer, accept, job, and the other tabs. Photographs each into out/.
import { launchChromium } from '../browser.mjs';
const b = await launchChromium();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
const TAG = process.env.TAG || 'rv';
let n = 0; const texts = [];
const shot = async (name, full = false) => { await p.waitForTimeout(800); await p.screenshot({ path: `out/${TAG}_${String(++n).padStart(2, '0')}_${name}.png`, fullPage: full }); texts.push(`--- ${name}\n` + (await p.evaluate(() => document.body.innerText)).slice(0, 3000)); };
// Scroll every scrollable container down and shoot again, to see below the fold.
const shotScroll = async (name) => { await shot(name); for (let k = 1; k <= 3; k++) { const moved = await p.evaluate((k) => { let any = false; for (const el of document.querySelectorAll('div')) { const s = getComputedStyle(el); if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 40 && el.clientHeight > 200) { const before = el.scrollTop; el.scrollTop = before + el.clientHeight * 0.8; if (el.scrollTop !== before) any = true; } } return any; }, k); if (!moved) break; await shot(`${name}_s${k}`); } await p.evaluate(() => { for (const el of document.querySelectorAll('div')) el.scrollTop = 0; }); };
const press = async (re) => { const loc = p.locator('[role=button],button,[role=radio],[role=checkbox],[role=tab],[role=switch]').filter({ visible: true }); const c = await loc.count(); for (let i = 0; i < c; i++) { const el = loc.nth(i); const a = ((await el.getAttribute('aria-label')) || '').trim(); const t = ((await el.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' '); const lab = re.test(a) ? a : t; if (re.test(lab)) { await el.evaluate((n) => n.scrollIntoView({ block: 'center' })); await p.waitForTimeout(150); await el.click({ force: true }); await p.waitForTimeout(700); return lab; } } return null; };
const listButtons = async (name) => { const r = await p.evaluate(() => [...document.querySelectorAll('[role=button],button,[role=tab],[role=switch],[role=radio],[role=checkbox]')].filter((e) => e.offsetParent !== null).map((e) => `${e.getAttribute('role')}|aria=${(e.getAttribute('aria-label') || '').slice(0, 60)}|text=${(e.innerText || '').replace(/\s+/g, ' ').slice(0, 60)}|${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`)); texts.push(`=== buttons @ ${name}\n` + r.join('\n')); };
const LOGO = process.env.LOGO || new URL('../public/world/avatar_01_portrait.webp', import.meta.url).pathname;
p.on('filechooser', async (fc) => { await fc.setFiles(LOGO); });
try {
  await p.goto('http://127.0.0.1:4421/?time=day'); await p.locator('text=אני בעל מקצוע').first().waitFor();
  await press(/^אני בעל מקצוע/); await p.getByLabel('מספר טלפון').fill('0541112233'); await press(/^שליחת קוד/); await p.getByLabel('קוד האימות').fill('123456'); await press(/^כניסה/);
  for (let k = 0; k < 4; k++) { await shot(`explain${k}`); await press(/^הבא$/); } await shot('explain4'); await press(/^בואו נתחיל|^בוא נתחיל/);
  await shot('welcome'); await listButtons('welcome');
  await press(/^בוא נתחיל/);
  await p.getByLabel('תיאור חופשי של העבודה שלך').fill(process.env.ABOUT || 'אני חשמלאי, מתקין שקעים וגופי תאורה, מתקן קצרים ועושה גם אזעקות ומצלמות');
  await p.waitForTimeout(900); await shotScroll('what'); await listButtons('what');
  await press(/^המשך$/);
  await p.getByLabel('שם מלא').fill('רון לוי'); await p.getByLabel('שם העסק').fill(process.env.BIZ || 'רון חשמל'); await press(/^עוסק מורשה$/); await p.getByLabel('עיר הבסיס').fill('רמת גן'); await press(/^25 ק״מ$/);
  await shotScroll('details'); await press(/^המשך$/);
  await shotScroll('docs');
  for (let k = 0; k < 8; k++) { if (!(await press(/^העלאת /))) break; await p.waitForTimeout(500); }
  const lic = p.getByLabel(/מספר רישיון/); if (await lic.count()) await lic.first().fill('123456');
  await shotScroll('docs_done'); await press(/^המשך$/);
  await shotScroll('prices'); await listButtons('prices'); await press(/^המשך$/);
  await press(/^העלאת לוגו/); await p.waitForTimeout(1200); await shotScroll('shop'); await press(/^המשך$/);
  await press(/^הדמות של המקצוע/); await shot('photo'); await press(/^המשך$/);
  await shotScroll('summary'); await press(/^שליחה לאישור/);
  await p.waitForTimeout(4500); await shot('sent');
  await p.waitForTimeout(8500); await shot('shop_open'); await listButtons('shop_open');
  await press(/^להתחיל משמרת/); await p.waitForTimeout(1500);
  // SHIFT, offline
  await shotScroll('shift_off'); await listButtons('shift_off');
  // go online
  const on = await press(/התחלת משמרת|להתחיל משמרת/); texts.push('pressed online: ' + on);
  await p.waitForTimeout(400); await shot('shift_starting');
  await p.waitForTimeout(2000); await shotScroll('shift_on'); await listButtons('shift_on');
  await p.waitForTimeout(3000); await shot('shift_on_t3');
  // demo call
  const d = await press(/קריאה לדוגמה|ממתינה/); texts.push('pressed demo: ' + d);
  await p.waitForTimeout(600); await shot('offer_0'); await listButtons('offer');
  await p.waitForTimeout(4000); await shotScroll('offer_4');
  const acc = await press(/^(אני לוקח|לוקח|קבלת|אישור|כן)/); texts.push('pressed accept: ' + acc);
  await p.waitForTimeout(300); await shot('job_0');
  await p.waitForTimeout(1200); await shot('job_1'); await p.waitForTimeout(1500); await shotScroll('job_3'); await listButtons('job');
  // advance the job through its states
  for (let k = 0; k < 8; k++) {
    const r = await press(/^(יוצא לדרך|יציאה לדרך|הגעתי|סיימתי את האבחון|סיימתי את הבדיקה|שליחת הצעת מחיר|מתחילים לעבוד|סיימתי את העבודה)/);
    texts.push('advance: ' + r); if (!r) break;
    await p.waitForTimeout(500); await shot(`st${k}_a`); await p.waitForTimeout(2500); await shotScroll(`st${k}_b`); await listButtons(`st${k}`);
    if (/שליחת הצעת מחיר/.test(r)) break;
  }
  const bar = await press(/מעבר לצד הלקוח/); texts.push('handover: ' + bar); await p.waitForTimeout(1500); await shot('handover');
  console.log('OK', errs.join(' | '));
} catch (e) { console.log('FAIL', String(e).slice(0, 300), errs.join(' | ')); await shot('fail'); }
(await import('node:fs')).writeFileSync(`out/${TAG}_texts.txt`, texts.join('\n')); await b.close();

// A new professional joins: every step of ProOnboardingBody, photographed.
import { launchChromium } from '../browser.mjs';
const b = await launchChromium();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
const TAG = process.env.TAG || 'ob';
let n = 0; const shot = async (name) => { await p.waitForTimeout(700); await p.screenshot({ path: `out/${TAG}_${String(++n).padStart(2, '0')}_${name}.png` }); };
const press = async (re) => { const loc = p.locator('[role=button],button,[role=radio],[role=checkbox]').filter({ visible: true }); const c = await loc.count(); for (let i = 0; i < c; i++) { const el = loc.nth(i); const a = ((await el.getAttribute('aria-label')) || '').trim(); const t = ((await el.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' '); const lab = re.test(a) ? a : t; if (re.test(lab)) { await el.evaluate((n) => n.scrollIntoView({ block: 'center' })); await p.waitForTimeout(150); await el.click({ force: true }); await p.waitForTimeout(700); return lab; } } return null; };
const LOGO = process.env.LOGO || new URL('../public/world/avatar_01_portrait.webp', import.meta.url).pathname;
p.on('filechooser', async (fc) => { await fc.setFiles(LOGO); });
try {
  await p.goto('http://127.0.0.1:4421/?time=night'); await p.locator('text=אני צריך מקצוען').first().waitFor();
  await press(/^אני צריך מקצוען/); await p.getByLabel('מספר טלפון').fill('0501234567'); await press(/^שליחת קוד/); await p.getByLabel('קוד האימות').fill('123456'); await press(/^כניסה/);
  await press(/^דילוג על ההסבר/); await press(/^דמות 1$/); await press(/^(אישור הדמות|זו אני)/);
  await p.getByLabel('תפריט').first().click(); await p.waitForTimeout(1200); await shot('menu');
  const join = p.locator('text=הצטרפות כמקצוען').first(); if (!(await join.count())) throw new Error('no join entry'); await join.click(); await p.waitForTimeout(1000);
  await shot('welcome');
  await press(/^מתחילים$/);
  await press(/לכתוב במילים/); await p.getByLabel('תיאור חופשי של העבודה שלך').fill(process.env.ABOUT || 'אני חשמלאי, מתקין שקעים וגופי תאורה, מתקן קצרים ועושה גם אזעקות ומצלמות'); await press(/^הוספה$/);
  await p.waitForTimeout(900); await shot('what');
  await press(/^המשך$/);
  await p.getByLabel('שם מלא').fill('רון לוי'); await p.getByLabel('שם העסק').fill('רון חשמל'); await press(/^עוסק מורשה$/); await p.getByLabel('עיר הבסיס').fill('רמת גן'); await press(/^25 ק״מ$/);
  await shot('details'); await press(/^המשך$/);
  await shot('docs');
  for (let k = 0; k < 8; k++) { if (!(await press(/^העלאת /))) break; await p.waitForTimeout(500); }
  const lic = p.getByLabel(/רישיון חשמלאי — מספר רישיון/); if (await lic.count()) await lic.first().fill('123456');
  await shot('docs_done'); await press(/^המשך$/);
  await shot('prices'); await press(/^המשך$/);
  await press(/^העלאת לוגו/); await p.waitForTimeout(1200); await shot('shop'); await press(/^המשך$/);
  await press(/^הדמות של המקצוע/); await shot('photo'); await press(/^המשך$/);
  await shot('summary'); await press(/^שליחה לאישור/);
  await p.waitForTimeout(4500); await shot('sent');
  await p.waitForTimeout(8500); await shot('shop_open');
  await press(/^להתחיל משמרת/); await p.waitForTimeout(1500); await shot('approved');
  console.log('OK', errs.join(' | '));
} catch (e) { console.log('FAIL', String(e).slice(0, 300), errs.join(' | ')); await shot('fail'); }
await b.close();

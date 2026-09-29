// Registered people go straight in; only the shop's design may be skipped (Amit, 2026-09-30).
import { launchChromium } from '../browser.mjs';
const b = await launchChromium();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
p.on('filechooser', async (fc) => { await fc.setFiles('../public/world/avatar_01_portrait.webp'); });
const press = async (re) => { const loc = p.locator('[role=button],button,[role=radio],[role=checkbox]').filter({ visible: true }); const c = await loc.count(); for (let i = 0; i < c; i++) { const el = loc.nth(i); const a = ((await el.getAttribute('aria-label')) || '').trim(); const t = ((await el.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' '); const lab = re.test(a) ? a : t; if (re.test(lab)) { await el.evaluate((n) => n.scrollIntoView({ block: 'center' })); await p.waitForTimeout(120); await el.click({ force: true }); await p.waitForTimeout(700); return lab; } } return null; };
const has = async (t) => (await p.locator(`text=${t}`).count()) + (await p.locator(`[aria-label^="${t}"]`).count()) > 0;
const signIn = async (door, phone) => { await press(door); await p.getByLabel('מספר טלפון').fill(phone); await press(/^שליחת קוד/); await p.getByLabel('קוד האימות').fill('123456'); await press(/^כניסה/); await p.waitForTimeout(900); };
const out = [];
try {
  await p.goto('http://127.0.0.1:4421/?time=night'); await p.locator('text=אני בעל מקצוע').first().waitFor();
  // 1. a new professional
  await signIn(/^אני בעל מקצוע/, '0521111111');
  await press(/^דילוג על ההסבר/);
  out.push((await has('העסק שלך,')) ? '✓ new pro → joining' : '✗ new pro did not reach joining');
  await press(/^בוא נתחיל/);
  await p.getByLabel('תיאור חופשי של העבודה שלך').fill('מספרה עד הבית, תספורות גברים ונשים'); await p.waitForTimeout(800); await press(/^המשך$/);
  await p.getByLabel('שם מלא').fill('מאיה כהן'); await press(/^עוסק פטור$/); await p.getByLabel('עיר הבסיס').fill('חולון'); await press(/^המשך$/);
  for (let k = 0; k < 6; k++) { if (!(await press(/^העלאת /))) break; } await press(/^המשך$/);
  out.push((await has('המחירים שלך')) ? '✓ prices step' : '✗ prices');
  out.push((await has('דלג')) ? '✗ prices can be skipped' : '✓ prices cannot be skipped');
  await press(/^המשך$/);
  out.push((await press(/^דלג — אעצב את החנות אחר כך/)) ? '✓ shop skipped' : '✗ no shop skip');
  out.push((await has('דלג')) ? '✗ photo can be skipped' : '✓ photo cannot be skipped');
  await press(/^הדמות של המקצוע/); await press(/^המשך$/);
  out.push((await has('עיצוב ברירת מחדל')) ? '✓ summary says shop is default' : '✗ summary');
  await press(/^שליחה לאישור/); await p.waitForTimeout(900); await press(/אישור החשבון/); await p.waitForTimeout(2500);
  out.push((await has('לעצב את החנות')) ? '✓ design-later link on the open shop' : '✗ no design-later link');
  await press(/^להתחיל משמרת/); await p.waitForTimeout(1200);
  // 2. sign out, come back as the same professional
  await press(/^לקוח$/); await p.waitForTimeout(800); await p.getByLabel('תפריט').first().click(); await p.waitForTimeout(900);
  await p.locator('text=התנתקות').first().click(); await p.waitForTimeout(1200);
  await signIn(/^אני בעל מקצוע/, '0521111111');
  const straight = !(await has('העסק שלך,')) && !(await has('דילוג על ההסבר')) && ((await has('המשמרת')) || (await has('התחלת משמרת')));
  out.push(straight ? '✓ registered pro → straight to his page' : '✗ registered pro saw intro/joining again');
  await p.screenshot({ path: 'out/returning_pro.png' });
  // 3. a customer, twice
  await press(/^לקוח$/); await p.waitForTimeout(800); await p.getByLabel('תפריט').first().click(); await p.waitForTimeout(900);
  await p.locator('text=התנתקות').first().click(); await p.waitForTimeout(1200);
  await signIn(/^אני צריך מקצוען/, '0502222222');
  const introFirst = await has('דילוג על ההסבר');
  await press(/^דילוג על ההסבר/); await press(/^דמות 1$/); await press(/^(אישור הדמות|זו אני)/);
  await p.getByLabel('תפריט').first().click(); await p.waitForTimeout(900); await p.locator('text=התנתקות').first().click(); await p.waitForTimeout(1200);
  await signIn(/^אני צריך מקצוען/, '0502222222');
  const again = await has('דילוג על ההסבר'); const home = await has('מה אתם צריכים');
  out.push(`  (customer: intro first time=${introFirst}, intro second time=${again}, home=${home})`);
  out.push(introFirst && !again && home ? '✓ registered customer → straight home' : '✗ customer saw the intro again');
  await p.screenshot({ path: 'out/returning_customer.png' });
} catch (e) { out.push('FAIL ' + String(e).slice(0, 200)); }
console.log(out.join('\n'), errs.length ? '\nERR ' + errs.join(' | ') : '');
await b.close();

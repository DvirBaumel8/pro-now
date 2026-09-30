// The join by trade instead of typing: tap a trade, tick a service, continue — and by typing, auto-detected.
import { launchChromium } from '../browser.mjs';
const b = await launchChromium();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
const press = async (re) => { const loc = p.locator('[role=button],button,[role=checkbox]').filter({ visible: true }); const c = await loc.count(); for (let i = 0; i < c; i++) { const el = loc.nth(i); const a = ((await el.getAttribute('aria-label')) || '').trim(); const t = ((await el.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' '); const lab = re.test(a) ? a : t; if (re.test(lab)) { await el.evaluate((x) => x.scrollIntoView({ block: 'center' })); await el.click({ force: true }); await p.waitForTimeout(700); return lab; } } return null; };
await p.goto('http://127.0.0.1:4421/?time=day'); await p.locator('text=אני בעל מקצוע').first().waitFor();
await press(/^אני בעל מקצוע/); await p.getByLabel('מספר טלפון').fill('054' + String(Date.now()).slice(-7)); await press(/^שליחת קוד/); await p.getByLabel('קוד האימות').fill('123456'); await press(/^כניסה/);
for (let k = 0; k < 4; k++) await press(/^הבא$/); await press(/^בואו נתחיל|^בוא נתחיל/); await press(/^מתחילים$/);
await p.waitForTimeout(800);
await p.screenshot({ path: 'out/fld_0_start.png' }); console.log('trade:', await press(/^חיות$/)); await p.screenshot({ path: 'out/fld_2_field.png' });
console.log('pick:', await press(/^וטרינר עד הבית$/)); await p.screenshot({ path: 'out/fld_3_picked.png' });
await p.getByLabel('תיאור חופשי של העבודה שלך').pressSequentially('ויש לי גם מספרה לכלבים', { delay: 25 }); await p.waitForTimeout(600); await p.screenshot({ path: 'out/fld_4_typed.png' }); console.log('ticked:', (await p.locator('[role=checkbox][aria-checked=true]').allInnerTexts()).map((t) => t.split('\n')[0]).join(' | '));
console.log('continue:', await press(/^המשך$/)); console.log('on details:', (await p.locator('text=שם מלא').count()) > 0);
console.log('errors:', errs.join(' | ') || 'none');
await b.close();

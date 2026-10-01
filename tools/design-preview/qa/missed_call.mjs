// A call left unanswered: after the minute, "חזרה למשמרת" takes him back; the tab bar returns.
import { launchChromium } from '../browser.mjs';
const b = await launchChromium();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const press = async (re) => { const loc = p.locator('[role=button],button,[role=checkbox],[role=radio]').filter({ visible: true }); const c = await loc.count(); for (let i = 0; i < c; i++) { const el = loc.nth(i); const a = ((await el.getAttribute('aria-label')) || '').trim(); const t = ((await el.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' '); const lab = re.test(a) ? a : t; if (re.test(lab)) { await el.evaluate((x) => x.scrollIntoView({ block: 'center' })); await el.click({ force: true }); await p.waitForTimeout(700); return lab; } } return null; };
await p.goto('http://127.0.0.1:4421/?time=day'); await p.locator('text=אני בעל מקצוע').first().waitFor();
await press(/^אני בעל מקצוע/); await p.getByLabel('מספר טלפון').fill('054' + String(Date.now()).slice(-7)); await press(/^שליחת קוד/); await p.getByLabel('קוד האימות').fill('123456'); await press(/^כניסה/);
await press(/^דילוג על ההסבר/);
await press(/^מתחילים$/); await p.getByLabel('תיאור חופשי של העבודה שלך').fill('נגר'); await p.waitForTimeout(600); await press(/^הוספה$/); await press(/^המשך$/);
await p.getByLabel('שם מלא').fill('אבי נגר'); await press(/^עוסק פטור$/); await p.getByLabel('עיר הבסיס').fill('חיפה'); await press(/^המשך$/);
await press(/^אחר כך$/); await press(/^המשך$/); await press(/^המשך$/); await press(/^אחר כך$/) || await press(/^המשך$/);
await press(/^שליחה לאישור/); await p.waitForTimeout(3000); await p.waitForTimeout(8500); await press(/^להתחיל משמרת/); await p.waitForTimeout(2000);
await press(/קריאה לדוגמה/); await p.waitForTimeout(1000);
console.log('call on screen:', (await p.locator('text=קריאה חדשה').count()) > 0);
await p.waitForTimeout(61_000); await p.screenshot({ path: 'out/missed_1.png' });
console.log('back button:', await press(/^חזרה למשמרת$/));
await p.waitForTimeout(800); await p.screenshot({ path: 'out/missed_2.png' });
console.log('on shift with tabs:', (await p.locator('text=המשמרת').count()) > 0, (await p.locator('text=סיום משמרת').count()) > 0);
await b.close();

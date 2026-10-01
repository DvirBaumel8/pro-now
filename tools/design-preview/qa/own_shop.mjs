// Amit's demo: a carpenter opens his shop and goes on shift; on the customer's
// side, searching "נגרות" finds HIS shop first, and ordering matches HIM.
import { launchChromium } from '../browser.mjs';
const b = await launchChromium();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
let n = 0; const shot = async (name) => { await p.waitForTimeout(700); await p.screenshot({ path: `out/own_${String(++n).padStart(2, '0')}_${name}.png` }); };
const press = async (re) => { const loc = p.locator('[role=button],button,[role=checkbox],[role=radio]').filter({ visible: true }); const c = await loc.count(); for (let i = 0; i < c; i++) { const el = loc.nth(i); const a = ((await el.getAttribute('aria-label')) || '').trim(); const t = ((await el.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' '); const lab = re.test(a) ? a : t; if (re.test(lab)) { await el.evaluate((x) => x.scrollIntoView({ block: 'center' })); await el.click({ force: true }); await p.waitForTimeout(700); return lab; } } return null; };
const text = async () => (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
await p.goto('http://127.0.0.1:4421/?time=day'); await p.locator('text=אני בעל מקצוע').first().waitFor();
await press(/^אני בעל מקצוע/); await p.getByLabel('מספר טלפון').fill('0547770001'); await press(/^שליחת קוד/); await p.getByLabel('קוד האימות').fill('123456'); await press(/^כניסה/);
await press(/^דילוג על ההסבר/); await press(/^מתחילים$/);
await p.getByLabel('תיאור חופשי של העבודה שלך').pressSequentially('נגרות', { delay: 40 }); await p.waitForTimeout(1500); console.log('nothing added before a tap:', !(await text()).includes('השירותים שלי')); await press(/^הוספה$/);
await p.getByLabel('תיאור חופשי של העבודה שלך').fill(''); await p.getByLabel('תיאור חופשי של העבודה שלך').pressSequentially('שיש', { delay: 40 }); await p.waitForTimeout(1500); await press(/^הוספה$/);
await shot('what'); console.log('kept after more typing:', (await text()).includes('נגרות') && (await text()).includes('ריצוף'));
await press(/^המשך$/);
await p.getByLabel('שם מלא').fill('רון לוי'); await p.getByLabel('שם העסק').fill('רון נגרות'); await press(/^עוסק פטור$/); await p.getByLabel('עיר הבסיס').fill('חיפה'); await press(/^המשך$/);
await press(/^אחר כך$/); await shot('prices'); await press(/^המשך$/); await press(/^המשך$/); await press(/^אחר כך$/) || await press(/^המשך$/);
await shot('summary'); await press(/^שליחה לאישור/); await p.waitForTimeout(3000); await p.waitForTimeout(8500); await shot('shop_open');
await press(/^להתחיל משמרת/); await p.waitForTimeout(2500); await shot('shift');
console.log('shift is his:', (await text()).includes('רון') && (await text()).includes('נגרות'));
await press(/^הדגמה: מעבר לצד הלקוח|^לקוח$/); await p.waitForTimeout(1500);
// customer sign-in and first-time steps
if (await p.getByLabel('מספר טלפון').count()) { await p.getByLabel('מספר טלפון').fill('0521110002'); await press(/^שליחת קוד/); await p.getByLabel('קוד האימות').fill('123456'); await press(/^כניסה/); }
await press(/^דילוג על ההסבר/); await press(/^דמות 1$/); await press(/^(אישור הדמות|זו אני|זה אני)/); await p.waitForTimeout(1200);
await shot('customer_home');
const box = p.getByRole('textbox').first(); await box.click(); await box.pressSequentially('נגרות', { delay: 40 }); await p.waitForTimeout(1200);
await shot('search'); const t = await text();
console.log('his shop in search:', t.includes('רון נגרות'), '| on shift:', t.includes('במשמרת עכשיו'));
await press(/^החנות של רון נגרות/); await p.waitForTimeout(1200); await shot('service');
console.log('service page:', (await text()).slice(0, 80));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();

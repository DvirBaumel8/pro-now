// Amit's demo: a carpenter opens his shop and goes on shift; on the customer's
// side, searching "נגרות" finds HIS shop first, and ordering matches HIM.
import { launchChromium } from '../browser.mjs';
const b = await launchChromium();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
let n = 0; const shot = async (name) => { await p.waitForTimeout(700); await p.screenshot({ path: `out/${process.env.TAG || 'own'}_${String(++n).padStart(2, '0')}_${name}.png` }); };
const press = async (re) => { const loc = p.locator('[role=button],button,[role=checkbox],[role=radio]').filter({ visible: true }); const c = await loc.count(); for (let i = 0; i < c; i++) { const el = loc.nth(i); const a = ((await el.getAttribute('aria-label')) || '').trim(); const t = ((await el.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' '); const lab = re.test(a) ? a : t; if (re.test(lab)) { await el.evaluate((x) => x.scrollIntoView({ block: 'center' })); await el.click({ force: true }); await p.waitForTimeout(700); return lab; } } return null; };
const text = async () => (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
await p.goto('http://127.0.0.1:4421/?time=day'); await p.locator('text=אני בעל מקצוע').first().waitFor();
await press(/^אני בעל מקצוע/); await p.getByLabel('מספר טלפון').fill('0547770001'); await press(/^שליחת קוד/); await p.getByLabel('קוד האימות').fill('123456'); await press(/^כניסה/);
await press(/^דילוג על ההסבר/); await press(/^מתחילים$/);
await p.getByLabel('תיאור חופשי של העבודה שלך').pressSequentially(process.env.T1 || 'נגרות', { delay: 40 }); await p.waitForTimeout(1500); console.log('nothing added before a tap:', !(await text()).includes('השירותים שלי')); await press(/^הוספה$/);
await p.getByLabel('תיאור חופשי של העבודה שלך').fill(''); await p.getByLabel('תיאור חופשי של העבודה שלך').pressSequentially(process.env.T2 || 'שיש', { delay: 40 }); await p.waitForTimeout(1500); await press(/^הוספה$/);
await shot('what'); console.log('kept after more typing:', (await text()).includes('נגרות') && (await text()).includes('ריצוף'));
await press(/^המשך$/);
await p.getByLabel('שם מלא').fill('רון לוי'); await p.getByLabel('שם העסק').fill('רון נגרות'); await press(/^עוסק פטור$/); await p.getByLabel('עיר הבסיס').fill('חיפה'); await press(/^המשך$/);
await press(/^אחר כך$/); await shot('prices'); await press(/^המשך$/); await press(/^המשך$/); await press(/^אחר כך$/) || await press(/^המשך$/);
await shot('summary'); await press(/^שליחה לאישור/); await p.waitForTimeout(3000); await p.waitForTimeout(8500); await shot('shop_open');
await press(/^להתחיל משמרת/); await p.waitForTimeout(2500); await shot('shift'); await press(/^המחירים שלי/); await p.waitForTimeout(1000); await shot('my_prices'); await p.getByText('המחירון שלך').first().scrollIntoViewIfNeeded().catch(() => {}); await shot('my_list'); console.log('my prices are mine:', !(await text()).includes('החלפת אטם'), '| no list for visit-only:', !(await text()).includes('המחירון שלך')); await press(/^חזרה|חזרה$/); await p.waitForTimeout(800);
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
// …and orders: the match must be HIM, and the call must reach HIS side.
const pressRaw = press;
const toPro = async () => (await pressRaw(/^הדגמה: (הצצה לצד המקצוען|מעבר לצד המקצוען)/)) || ((await pressRaw(/^תפריט$/)) && (await pressRaw(/^הצצה לצד המקצוען|מעבר לצד המקצוען/)));
console.log('request:', await press(/^בקשת בעל מקצוע עכשיו/));
const words = p.locator('textarea').filter({ visible: true }).first(); if (await words.count()) await words.fill('צריך לתקן דלת של ארון מטבח');
const firstLine = p.getByRole('checkbox').first(); if (await firstLine.count()) await firstLine.click({ force: true });
await shot('describe'); console.log('send:', await press(/^שליחת הקריאה/));
await p.locator('text=/מחכים להצעת המחיר|מתאים לי|אישור ההתאמה|בחירה|בדרך/').first().waitFor({ timeout: 25000 }).catch(() => {});
await p.waitForTimeout(2500); await shot('match'); const tm = await text();
console.log('match is him:', tm.includes('רון'), '| new:', tm.includes('חדש'));
if (/מתאים לי|כן, מתאים/.test(tm)) console.log('accept:', await press(/^(כן, מתאים לי|זה מתאים|אישור)/));
await p.waitForTimeout(2500);
console.log('to pro:', await toPro()); await p.waitForTimeout(2500); await shot('pro_side'); const tp = await text();
console.log('pro has the call:', /קריאה|הקריאה ששלחת|העבודה שלך|קריאה חדשה/.test(tp), '| his name:', tp.includes('רון'), '| no plumber:', !tp.includes('נזילה'));

console.log('errors:', errs.join(' | ') || 'none');
await b.close();

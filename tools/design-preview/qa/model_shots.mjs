// Screens of the two pricing kinds: describe, match card, pro at diagnosis, customer tracking, receipt.
import { launchChromium } from '../browser.mjs';
const [tile, svc, tag] = process.argv.slice(2);
const b = await launchChromium();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const press = async (re) => { const loc = p.locator('[role=button],button').filter({ visible: true }); const c = await loc.count(); for (let i = 0; i < c; i++) { const el = loc.nth(i); const a = ((await el.getAttribute('aria-label')) || '').trim(); const t = ((await el.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' '); const lab = re.test(a) ? a : t; if (re.test(lab)) { await el.click({ force: true }); await p.waitForTimeout(1300); return lab; } } return null; };
const shot = (n) => p.screenshot({ path: `out/m_${tag}_${n}.png` });
await p.goto('http://127.0.0.1:4421/?time=day'); await p.locator('text=אני צריך מקצוען').first().waitFor();
await press(/^אני צריך מקצוען/); await p.getByLabel('מספר טלפון').fill('0501234567'); await press(/^שליחת קוד/); await p.getByLabel('קוד האימות').fill('123456'); await press(/^כניסה/);
await press(/^דילוג על ההסבר/); await press(/^דמות 1$/); await press(/^(אישור הדמות|זו אני)/);
await press(new RegExp('^' + tile)); await press(new RegExp('^' + svc)); await shot('1service');
await press(/^בקשת בעל מקצוע עכשיו/);
const cb = p.getByRole('checkbox'); if (await cb.count()) { await cb.nth(1).click({ force: true }); await p.waitForTimeout(400); }
await shot('2describe');
await press(/^שליחת הקריאה/); await p.waitForTimeout(8000); await shot('3match');
await press(/^(כן, מתאים לי|זה מתאים|אישור)/); await p.waitForTimeout(6500);
await press(/^מקצוען$/); await p.locator('text=כן, אני לוקח').first().waitFor({ timeout: 20000 }).catch(() => {}); await p.waitForTimeout(600); await shot('4offer');
await press(/^כן, אני לוקח/); await press(/^יוצא לדרך/); await press(/^הגעתי/); await p.waitForTimeout(600); await shot('5pro_diag');
await press(/^לקוח$/); await p.waitForTimeout(1500); await shot('6cust_diag');
await press(/^מקצוען$/);
if (!(await press(/^סיימתי את האבחון/))) { await press(/^(מתחיל לעבוד)/); await press(/^סיימתי את העבודה/); }
await press(/^לקוח$/); await p.waitForTimeout(1500); await shot('7cust_done');
await press(/^(אישור תשלום|אישור)/); await p.waitForTimeout(1500); await shot('8receipt');
await b.close();

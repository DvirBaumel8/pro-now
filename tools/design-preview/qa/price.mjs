import { launchChromium } from '../browser.mjs';
const [tile, svc, ...picks] = process.argv.slice(2);
const b = await launchChromium();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const press = async (re) => { const loc = p.locator('[role=button],button').filter({ visible: true }); const c = await loc.count(); for (let i = 0; i < c; i++) { const el = loc.nth(i); const a = ((await el.getAttribute('aria-label')) || '').trim(); const t = ((await el.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' '); const lab = re.test(a) ? a : t; if (re.test(lab)) { await el.click({ force: true }); await p.waitForTimeout(700); return lab; } } return null; };
const txt = async () => (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
await p.goto('http://127.0.0.1:4421/?time=day'); await p.locator('text=אני צריך מקצוען').first().waitFor();
await press(/^אני צריך מקצוען/); await p.getByLabel('מספר טלפון').fill('0501234567'); await press(/^שליחת קוד/); await p.getByLabel('קוד האימות').fill('123456'); await press(/^כניסה/);
await press(/^דילוג על ההסבר/); await press(/^דמות 1$/); await press(/^(אישור הדמות|זו אני)/);
await press(new RegExp('^' + tile)); await p.waitForTimeout(800);
const t0 = await txt(); const i0 = t0.indexOf(svc); console.log('tile:', i0 >= 0 ? t0.slice(i0, i0 + 70) : '?');
await press(new RegExp('^' + svc)); await press(/^בקשת בעל מקצוע עכשיו/); await p.waitForTimeout(800);
const line = async () => { const t = await txt(); const m = t.match(/(לפי מה שבחרתם|מחיר קבוע:|[\d,]+\s*₪ לשעה|₪\s*[\d,]+ לשעה).{0,50}/); return m ? m[0] : '(no price line)'; };
console.log('start:', await line());
for (const pk of picks) { const r = await press(new RegExp('^' + pk + '$')); console.log(`pick ${pk}${r ? '' : ' (NOT FOUND)'}:`, await line()); }
await p.screenshot({ path: `out/price_${svc.replace(/\s/g,'_')}.png` });
await b.close();

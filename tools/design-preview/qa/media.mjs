// Photos and a voice note on the describe screen, and what reaches the professional.
import { launchChromium } from '../browser.mjs';
const [tile, svc] = process.argv.slice(2);
const b = await launchChromium({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, permissions: ['microphone', 'camera'] });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
p.on('filechooser', async (fc) => { await fc.setFiles(['out/test_photo.jpg']); });
const press = async (re) => { const loc = p.locator('[role=button],button').filter({ visible: true }); const c = await loc.count(); for (let i = 0; i < c; i++) { const el = loc.nth(i); const a = ((await el.getAttribute('aria-label')) || '').trim(); const t = ((await el.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' '); const lab = re.test(a) ? a : t; if (re.test(lab)) { await el.click({ force: true }); await p.waitForTimeout(1200); return lab; } } return null; };
const txt = async () => (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
const log = (k, v) => console.log(k.padEnd(22), v);
await p.goto('http://127.0.0.1:4421/?time=day'); await p.locator('text=אני צריך מקצוען').first().waitFor();
await press(/^אני צריך מקצוען/); await p.getByLabel('מספר טלפון').fill('0501234567'); await press(/^שליחת קוד/); await p.getByLabel('קוד האימות').fill('123456'); await press(/^כניסה/);
await press(/^דילוג על ההסבר/); await press(/^דמות 1$/); await press(/^(אישור הדמות|זו אני)/);
await press(new RegExp('^' + tile)); await press(new RegExp('^' + svc)); await press(/^בקשת בעל מקצוע עכשיו/);
// photo: the gallery button opens a file chooser
const g = await press(/גלריה|מהגלריה|הוספת תמונה|צילום/); log('photo button', g ?? 'NOT FOUND');
await p.waitForTimeout(1500);
const imgs = await p.evaluate(() => [...document.querySelectorAll('img')].filter((i) => i.src.startsWith('blob:') || i.src.startsWith('data:image/jpeg')).length);
log('photo thumbnails', imgs);
// voice: start, wait, stop
const r1 = await press(/להקליט|הקלטה|התחלת הקלטה/); log('record start', r1 ?? 'NOT FOUND');
await p.waitForTimeout(2500);
const r2 = await press(/עצירה|סיום הקלטה|לעצור/); log('record stop', r2 ?? 'NOT FOUND');
await p.waitForTimeout(1200);
let t = await txt(); log('voice shown', /שנ׳|שניות|0:0\d|הקלטה \(/.test(t) ? 'yes' : 'no — ' + (t.match(/הקלט[^.]{0,60}/)?.[0] ?? ''));
await p.screenshot({ path: 'out/media_describe.png' });
const cb = p.getByRole('checkbox'); if (await cb.count()) await cb.first().click({ force: true });
const dest = p.getByLabel('כתובת היעד'); if (await dest.count()) await dest.first().fill('מוסך בבני ברק');
await press(/^שליחת הקריאה/); await p.waitForTimeout(8000);
await press(/^מקצוען$/); await p.locator('text=/כן, אני לוקח|תן הצעת מחיר/').first().waitFor({ timeout: 20000 }).catch(() => {});
t = await txt(); log('pro sees photos', (t.match(/\d+ תמונ[^ ]*/) ?? ['none'])[0]); log('pro sees voice', /הקלטה|שנ׳/.test(t) ? 'yes' : 'no');
await p.screenshot({ path: 'out/media_offer.png' });
log('errors', errs.join(' | ') || 'none');
await b.close();

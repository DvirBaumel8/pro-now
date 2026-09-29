import { launchChromium } from '../browser.mjs';
const b = await launchChromium();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
const press = async (re) => { const loc = p.locator('[role=button],button,[role=tab]').filter({ visible: true }); const c = await loc.count(); for (let i = 0; i < c; i++) { const el = loc.nth(i); const a = ((await el.getAttribute('aria-label')) || '').trim(); const t = ((await el.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' '); const lab = re.test(a) ? a : t; if (re.test(lab)) { await el.click(); await p.waitForTimeout(1300); return lab; } } return null; };
const txt = async () => (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
await p.goto('http://127.0.0.1:4421/?time=day'); await p.locator('text=אני בעל מקצוע').first().waitFor();
await press(/^אני בעל מקצוע/); await p.getByLabel('מספר טלפון').fill('0501234567'); await press(/^שליחת קוד/); await p.getByLabel('קוד האימות').fill('123456'); await press(/^כניסה/);
await press(/^דילוג על ההסבר/);
console.log('explainer?', /אתה קובע את המחירים שלך/.test(await txt()));
const close = await press(/^(הבנתי|סגירה|בואו נתחיל|אחלה|להתחיל)/); console.log('close explainer:', close);
await press(/^שירותים/); await p.screenshot({ path: 'out/pro_services.png' }); console.log('services text:', (await txt()).slice(0, 200));
await b.close(); process.exit(0);
for (const re of []) {
  const before = await txt(); const r = await press(re); const after = await txt();
  console.log(String(re).padEnd(26), r ? (before !== after ? 'OK' : 'NO CHANGE') : 'NOT FOUND');
  if (/פרופיל|מסמכים|הרווחתי|שירותים|מיקום/.test(String(re))) await press(/^המשמרת$/);
}
console.log('errors', errs.join(' | ') || 'none');
await b.close();

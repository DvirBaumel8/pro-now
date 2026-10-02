import { launchChromium } from '../browser.mjs';
const b = await launchChromium();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
const press = async (re) => { const loc = p.locator('[role=button],button').filter({ visible: true }); const c = await loc.count(); for (let i = 0; i < c; i++) { const el = loc.nth(i); const a = ((await el.getAttribute('aria-label')) || '').trim(); const t = ((await el.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' '); const lab = re.test(a) ? a : t; if (re.test(lab)) { await el.click({ force: true }); await p.waitForTimeout(1300); return lab; } } return null; };
await p.goto('http://127.0.0.1:4421/?time=night'); await p.locator('text=אני צריך מקצוען').first().waitFor();
await press(/^אני צריך מקצוען/); await p.getByLabel('מספר טלפון').fill('0501234567'); await press(/^שליחת קוד/); await p.getByLabel('קוד האימות').fill('123456'); await press(/^כניסה/);
await press(/^דילוג על ההסבר/); await press(/^דמות 1$/); await press(/^(אישור הדמות|זו אני)/);
const box = p.locator('textarea, input[type=text], input:not([type])').filter({ visible: true }).first();
for (const [i, q] of process.argv.slice(2).entries()) {
  await box.fill(''); await box.fill(q); await p.waitForTimeout(1600);
  const t = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  const at = t.search(/נראה שזה|עוד לא בטוחים|מצב מסכן|אם החיה/);
  console.log(q, '→', at >= 0 ? t.slice(at, at + 170) : '(nothing)');
  await p.screenshot({ path: `out/search_${i}.png` });
}
console.log('errors', errs.join(' | '));
await b.close();

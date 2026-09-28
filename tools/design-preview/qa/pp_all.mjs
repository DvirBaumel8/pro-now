// The whole customer ↔ professional ping-pong for one service, to payment.
import { launchChromium } from '../browser.mjs';
const [tile, svc] = process.argv.slice(2);
const b = await launchChromium();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
const press = async (re) => { const loc = p.locator('[role=button],button').filter({ visible: true }); const c = await loc.count(); for (let i = 0; i < c; i++) { const el = loc.nth(i); const a = ((await el.getAttribute('aria-label')) || '').trim(); const t = ((await el.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' '); const lab = re.test(a) ? a : t; if (re.test(lab)) { await el.click({ force: true }); await p.waitForTimeout(1300); return lab; } } return null; };
const txt = async () => (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
const steps = []; const need = async (re, name) => { const r = await press(re); steps.push((r ? '✓ ' : '✗ ') + name); if (!r) throw new Error('stuck at ' + name + ' :: ' + (await txt()).slice(0, 160)); return r; };
try {
  await p.goto('http://127.0.0.1:4421/?time=night'); await p.locator('text=אני צריך מקצוען').first().waitFor();
  await press(/^אני צריך מקצוען/); await p.getByLabel('מספר טלפון').fill('0501234567'); await press(/^שליחת קוד/); await p.getByLabel('קוד האימות').fill('123456'); await press(/^כניסה/);
  await press(/^דילוג על ההסבר/); await press(/^דמות 1$/); await press(/^(אישור הדמות|זו אני)/);
  await need(new RegExp('^' + tile), 'category');
  await need(new RegExp('^' + svc), 'service');
  await need(/^בקשת בעל מקצוע עכשיו/, 'request');
  // answer whatever the intake asks: first chip of each question
  for (let k = 0; k < 4; k++) { const chips = p.locator('[role=button],button').filter({ visible: true }); const n = await chips.count(); for (let i = 0; i < n; i++) { const el = chips.nth(i); const t = ((await el.innerText().catch(() => '')) || '').trim(); if (t && t.length < 22 && !/שליחה|חזרה|תפריט|מקצוען|שלום|ביטול|לקוח|הקלטה|מצלמה|גלריה/.test(t)) { await el.click({ force: true }); await p.waitForTimeout(300); break; } } }
  await need(/^שליחת הקריאה/, 'send');
  await p.waitForTimeout(8000);
  let t = await txt();
  if (/מתאים לי|כן, מתאים/.test(t)) await need(/^(כן, מתאים לי|זה מתאים|אישור)/, 'accept match');
  else if (/בחירה|אישור ההתאמה/.test(t)) await need(/^(אישור|בחירה)/, 'confirm person');
  await p.waitForTimeout(3000);
  await need(/^מקצוען$/, '→ pro');
  await need(/^כן, אני לוקח/, 'pro takes');
  await need(/^יוצא לדרך/, 'pro leaves');
  await need(/^הגעתי/, 'pro arrives');
  t = await txt();
  // quote (visit+quote) or straight to work (fixed/hourly)
  if (await press(/^שליחת הצעת מחיר/)) {
    steps.push('✓ quote form');
    const desc = p.getByPlaceholder(/מה נעשה/); if (await desc.count()) await desc.first().fill('עבודה לדוגמה');
    const price = p.locator('input').nth(2); if (await price.count()) { const v = await price.inputValue().catch(() => ''); if (!v || v === '0') await price.fill('250'); }
    await need(/^שליחה ללקוח/, 'send quote');
    const bar = p.locator('[role=button],button').filter({ hasText: 'כדי לאשר את ההצעה' }); if (await bar.count()) { await bar.last().click(); await p.waitForTimeout(1500); } else await need(/^לקוח$/, '→ customer');
    await need(/^אישור ההצעה/, 'customer approves');
    await need(/^מקצוען$/, '→ pro');
  }
  if (await press(/^(מתחיל לעבוד|התחלת עבודה|מתחיל)/)) steps.push('✓ start work');
  await need(/^סיימתי את העבודה/, 'pro done');
  const bar2 = p.locator('[role=button],button').filter({ hasText: 'כדי לאשר שהעבודה הושלמה' }); if (await bar2.count()) { await bar2.last().click(); await p.waitForTimeout(1500); } else await need(/^לקוח$/, '→ customer');
  await need(/^(אישור תשלום|אישור)/, 'customer pays');
  await need(/^מקצוען$/, '→ pro');
  t = await txt();
  steps.push(/נוסף להכנסות/.test(t) ? '✓ pro paid' : '✗ pro paid? ' + t.slice(0, 80));
  console.log('PASS', svc, '|', steps.join(' '), errs.length ? 'ERR ' + errs[0] : '');
} catch (e) {
  console.log('FAIL', svc, '|', steps.join(' '), '|', String(e.message).slice(0, 220), errs.length ? 'ERR ' + errs[0] : '');
}
await b.close();

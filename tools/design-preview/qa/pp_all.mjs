// The whole customer ↔ professional ping-pong for one service, to payment.
import { launchChromium } from '../browser.mjs';
import { setAddress } from './address.mjs';
const [tile, svc] = process.argv.slice(2);
const b = await launchChromium();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
const pressRaw = async (re) => { const loc = p.locator('[role=button],button').filter({ visible: true }); const c = await loc.count(); for (let i = 0; i < c; i++) { const el = loc.nth(i); const a = ((await el.getAttribute('aria-label')) || '').trim(); const t = ((await el.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' '); const lab = re.test(a) ? a : t; if (re.test(lab)) { await el.click({ force: true }); await p.waitForTimeout(1300); return lab; } } return null; };
/* __toPro: the side switch left the header (2026-09-29) — the demo bar, else the menu. */
const press = async (re) => {
  if (re.source !== '^מקצוען$') return pressRaw(re);
  const viaBar = await pressRaw(/^הדגמה: (הצצה לצד המקצוען|מעבר לצד המקצוען)/); if (viaBar) return 'מקצוען';
  if (await pressRaw(/^תפריט$/)) { const r = await pressRaw(/^הצצה לצד המקצוען/); if (r) return 'מקצוען'; }
  return pressRaw(re);
};
const txt = async () => (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
const steps = []; let shotN = 0;
const SHOTS = process.env.SHOTS || null;
const snap = async (name) => { if (SHOTS) { await p.waitForTimeout(700); await p.screenshot({ path: `out/j_${SHOTS}_${String(++shotN).padStart(2, '0')}_${name.replace(/[^a-z0-9]+/gi, '_')}.png` }); } };
const need = async (re, name) => { const r = await press(re); steps.push((r ? '✓ ' : '✗ ') + name); if (!r) throw new Error('stuck at ' + name + ' :: ' + (await txt()).slice(0, 160)); await snap(name); return r; };
try {
  await p.goto('http://127.0.0.1:4421/?time=night'); await p.locator('text=אני צריך מקצוען').first().waitFor();
  await press(/^אני צריך מקצוען/); await p.getByLabel('מספר טלפון').fill('0501234567'); await press(/^שליחת קוד/); await p.getByLabel('קוד האימות').fill('123456'); await press(/^כניסה/);
  await press(/^דילוג על ההסבר/); await press(/^דמות 1$/); await press(/^(אישור הדמות|זו אני)/); await p.waitForTimeout(800); await setAddress(p, press);
  await need(new RegExp('^' + tile), 'category');
  await need(new RegExp('^' + svc), 'service');
  await need(/^בקשת בעל מקצוע עכשיו/, 'request');
  // no problem questions any more: words, and where to when the service asks
  const words = p.locator('textarea').filter({ visible: true }).first(); if (await words.count()) { await words.fill('בדיקה אוטומטית של הזרימה'); steps.push('✓ described'); }
  const dest = p.getByLabel('כתובת היעד'); if (await dest.count()) { await dest.first().fill('מוסך בבני ברק'); steps.push('✓ destination'); }
  // a price-list service: order the first line
  const firstLine = p.getByRole('checkbox').first(); if (await firstLine.count()) { await firstLine.click({ force: true }); await p.waitForTimeout(400); steps.push('✓ ordered from list'); }
  await snap('describe');
  await need(/^שליחת הקריאה/, 'send');
  /* Under load the match can take longer than 8s; wait for its words, not a clock. */
  await p.locator('text=/מחכים להצעת המחיר|מתאים לי|אישור ההתאמה|בחירה/').first().waitFor({ timeout: 25000 }).catch(() => {});
  await p.waitForTimeout(1500);
  let t = await txt();
  if (/מחכים להצעת המחיר/.test(t)) {
    // priced before he sets off: the professional names a price, the customer approves it
    steps.push('✓ waiting for price');
    await need(/^מקצוען$/, '→ pro');
    await p.locator('text=תן הצעת מחיר').first().waitFor({ timeout: 20000 }).catch(() => {});
    await need(/^תן הצעת מחיר/, 'pro opens price form');
    const simple = p.getByLabel('המחיר ללקוח בשקלים');
    if (await simple.count()) { await simple.first().fill('450'); }
    else {
      const qd = p.getByPlaceholder(/מה נעשה/); if (await qd.count()) await qd.first().fill('גרירה / עבודה לפי התמונות');
      const qp = p.locator('input').nth(2); if (await qp.count()) { const v = await qp.inputValue().catch(() => ''); if (!v || v === '0') await qp.fill('450'); }
    }
    await need(/^שליחה ללקוח/, 'send price');
    t = await txt(); steps.push(/ההצעה נשלחה/.test(t) ? '✓ pro waits' : '✗ pro waits?');
    await need(/^לקוח$/, '→ customer');
    await p.waitForTimeout(2000);
    await need(/^אישור ההצעה/, 'customer approves price');
    await p.waitForTimeout(3000);
    await need(/^מקצוען$/, '→ pro');
  } else {
    if (/מתאים לי|כן, מתאים/.test(t)) await need(/^(כן, מתאים לי|זה מתאים|אישור)/, 'accept match');
    else if (/בחירה|אישור ההתאמה/.test(t)) await need(/^(אישור|בחירה)/, 'confirm person');
    await p.waitForTimeout(3000);
    await need(/^מקצוען$/, '→ pro');
    await need(/^כן, אני לוקח/, 'pro takes');
  }
  await need(/^(יוצא|יציאה) לדרך/, 'pro leaves');
  await need(/^הגעתי/, 'pro arrives');
  t = await txt();
  // diagnosis-only (visit+diagnosis), a quote, or straight to work (price list / hourly)
  const diagOnly = Boolean(await press(/^סיימתי את (האבחון|הבדיקה)/));
  if (diagOnly) steps.push('✓ diagnosis done');
  else if (await press(/^שליחת הצעת מחיר/)) {
    steps.push('✓ quote form');
    const desc = p.getByPlaceholder(/מה נעשה/); if (await desc.count()) await desc.first().fill('עבודה לדוגמה');
    const price = p.locator('input').nth(2); if (await price.count()) { const v = await price.inputValue().catch(() => ''); if (!v || v === '0') await price.fill('250'); }
    await need(/^שליחה ללקוח/, 'send quote');
    const bar = p.locator('[role=button],button').filter({ hasText: 'כדי לאשר את ההצעה' }); if (await bar.count()) { await bar.last().click(); await p.waitForTimeout(1500); } else await need(/^לקוח$/, '→ customer');
    await need(/^אישור ההצעה/, 'customer approves');
    await need(/^מקצוען$/, '→ pro');
  }
  if (!diagOnly) {
    if (await press(/^(מתחילים לעבוד|אספתי|מתחיל לעבוד|התחלת עבודה|מתחיל)/)) steps.push('✓ start work');
    await need(/^(סיימתי|המשלוח נמסר)/, 'pro done');
  }
  const bar2 = p.locator('[role=button],button').filter({ hasText: 'כדי לאשר שהעבודה הושלמה' }); if (await bar2.count()) { await bar2.last().click(); await p.waitForTimeout(1500); } else await need(/^לקוח$/, '→ customer');
  await need(/^(אישור תשלום|אישור)/, 'customer pays');
  await need(/^מקצוען$/, '→ pro');
  t = await txt();
  steps.push(/נוסף להכנסות|סכום העבודה/.test(t) ? '✓ pro paid' : '✗ pro paid? ' + t.slice(0, 80));
  console.log('PASS', svc, '|', steps.join(' '), errs.length ? 'ERR ' + errs[0] : '');
} catch (e) {
  console.log('FAIL', svc, '|', steps.join(' '), '|', String(e.message).slice(0, 220), errs.length ? 'ERR ' + errs[0] : '');
}
await b.close();

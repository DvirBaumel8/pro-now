// The whole customer ↔ professional ping-pong for one service, to payment.
import { launchChromium } from '../browser.mjs';
const [tile, svc] = process.argv.slice(2);
const b = await launchChromium();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errs = []; const REQS = new Set(); p.on('request', (r) => { const m = r.url().match(/127\.0\.0\.1:4421\/([^?#]*)/); if (m && m[1]) REQS.add(decodeURIComponent(m[1])); }); p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
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
  await press(/^דילוג על ההסבר/); await press(/^דמות 1$/); await press(/^(אישור הדמות|זו אני)/);
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
  await p.waitForTimeout(8000);
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
  } else {
    if (/מתאים לי|כן, מתאים/.test(t)) await need(/^(כן, מתאים לי|זה מתאים|אישור)/, 'accept match');
    else if (/בחירה|אישור ההתאמה/.test(t)) await need(/^(אישור|בחירה)/, 'confirm person');
  }
  const W = process.env.W || 'wait';
  for (const [n, ms] of [[1, 2500], [2, 6000], [3, 6000]]) { await p.waitForTimeout(ms); await p.screenshot({ path: `out/w_${W}_${n}.png` }); }
  await p.mouse.move(195, 600); await p.mouse.wheel(0, 900); await p.waitForTimeout(800); await p.screenshot({ path: `out/w_${W}_scroll.png` });
  await p.mouse.wheel(0, -900);
  const f = await press(/^(עקוב אחרי|לעקוב אחרי)/); await p.waitForTimeout(3000); await p.screenshot({ path: `out/w_${W}_follow.png` });
  await p.mouse.move(195, 600); await p.mouse.wheel(0, 900); await p.waitForTimeout(800); await p.screenshot({ path: `out/w_${W}_follow_scroll.png` });
  /* Pull the sheet down by its handle, the way a thumb does. */
  const grab = await p.evaluate(() => { const els = [...document.querySelectorAll('div')].filter((d) => { const r = d.getBoundingClientRect(); return r.width > 30 && r.width < 60 && r.height > 3 && r.height < 7; }); const r = els.length ? els[els.length - 1].getBoundingClientRect() : null; return r ? { x: r.x + r.width / 2, y: r.y + 3 } : null; });
  if (grab) { await p.mouse.move(grab.x, grab.y); await p.mouse.down(); await p.mouse.move(grab.x, grab.y + 420, { steps: 12 }); await p.mouse.up(); await p.waitForTimeout(1200); }
  await p.screenshot({ path: `out/w_${W}_follow_fold.png` });
  (await import('node:fs')).writeFileSync(`out/reqs_${W}.json`, JSON.stringify([...REQS].sort()));
  console.log('OK', f, errs.join(' | '));
} catch (e) { console.log('FAIL', String(e).slice(0, 300), steps.join(' ')); }
await b.close();

// The whole customer ↔ professional ping-pong for one service, to payment.
import { launchChromium } from '../browser.mjs';
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
  await press(/^דילוג על ההסבר/); await press(/^דמות 1$/); await press(/^(אישור הדמות|זו אני)/);
  await need(/^ביוטי ושיער/, 'beauty');
  await need(/^מניקור/, 'nails');
  await need(/^בקשת בעל מקצוע עכשיו/, 'request nails');
  await p.locator('textarea').filter({ visible: true }).first().fill('ציפורניים');
  await p.waitForTimeout(500);
  await pressRaw(/^חזרה$/); await p.waitForTimeout(800); await pressRaw(/^חזרה$/); await p.waitForTimeout(800); await pressRaw(/^חזרה$/); await p.waitForTimeout(1200);
  await need(/^רכב/, 'car');
  await need(/^גרירת רכב/, 'towing');
  await need(/^בקשת בעל מקצוע עכשיו/, 'request towing');
  const v = await p.locator('textarea').filter({ visible: true }).first().inputValue();
  const bad = /ציפורניים/.test(v) || /ציפורניים/.test(await txt());
  console.log(bad ? 'FAIL carry-over: towing shows "' + v + '"' : 'PASS carry-over: towing text is empty ("' + v + '")', errs.join(' | '));
} catch (e) { console.log('FAIL', String(e).slice(0, 300), steps.join(' ')); }
await b.close();

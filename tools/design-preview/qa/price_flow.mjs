import { launchChromium } from '../browser.mjs';
const b = await launchChromium();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const pressRaw = async (re) => { const loc = p.locator('[role=button],button').filter({ visible: true }); const c = await loc.count(); for (let i = 0; i < c; i++) { const el = loc.nth(i); const a = ((await el.getAttribute('aria-label')) || '').trim(); const t = ((await el.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' '); const lab = re.test(a) ? a : t; if (re.test(lab)) { await el.click({ force: true }); await p.waitForTimeout(900); return lab; } } return null; };
/* __toPro: the side switch left the header (2026-09-29) — the demo bar, else the menu. */
const press = async (re) => {
  if (re.source !== '^מקצוען$') return pressRaw(re);
  const viaBar = await pressRaw(/^הדגמה: (הצצה לצד המקצוען|מעבר לצד המקצוען)/); if (viaBar) return 'מקצוען';
  if (await pressRaw(/^תפריט$/)) { const r = await pressRaw(/^הצצה לצד המקצוען/); if (r) return 'מקצוען'; }
  return pressRaw(re);
};
const txt = async () => (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
await p.goto('http://127.0.0.1:4421/?time=day'); await p.locator('text=אני צריך מקצוען').first().waitFor();
await press(/^אני צריך מקצוען/); await p.getByLabel('מספר טלפון').fill('0501234567'); await press(/^שליחת קוד/); await p.getByLabel('קוד האימות').fill('123456'); await press(/^כניסה/);
await press(/^דילוג על ההסבר/); await press(/^דמות 1$/); await press(/^(אישור הדמות|זו אני)/);
await press(/^ביוטי ושיער/); await press(/^איפור/); await press(/^בקשת בעל מקצוע עכשיו/);
for (const k of ['חתונה', 'שניים', 'כן']) await press(new RegExp('^' + k + '$'));
await press(/^שליחת הקריאה/); await p.waitForTimeout(9000);
let t = await txt(); let i = t.search(/המחיר של|התעריף של|דמי הביקור של/); console.log('MATCH:', i >= 0 ? t.slice(i, i + 80) : t.slice(0, 200));
await p.screenshot({ path: 'out/pf_match.png' });
await press(/^(כן, מתאים לי|זה מתאים|אישור)/); await p.waitForTimeout(2500);
await press(/^מקצוען$/); await p.locator('text=כן, אני לוקח').first().waitFor({ timeout: 20000 }).catch(() => {}); await p.waitForTimeout(800);
t = await txt(); i = t.search(/כן, אני לוקח/); console.log('OFFER:', t.slice(Math.max(0, i - 400), i + 20)); i = -1; console.log('X:', i >= 0 ? t.slice(Math.max(0, i - 80), i + 60) : t.slice(0, 200));
await p.screenshot({ path: 'out/pf_offer.png' });
await press(/^כן, אני לוקח/); await press(/^(יוצא|יציאה) לדרך/); await press(/^הגעתי/); await p.waitForTimeout(800);
t = await txt(); i = t.search(/מתחיל לעבוד/); console.log('START:', i >= 0 ? t.slice(i, i + 60) : '(none)');
await b.close();

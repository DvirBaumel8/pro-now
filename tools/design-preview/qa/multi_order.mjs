// Amit, 2026-10-01: a carpenter on the way, a barber ordered meanwhile — both must stay
// visible, each with its own progress, and either one opens. Run: node qa/multi_order.mjs
process.env.PW_CHROMIUM ||= '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
import { open } from './audit_customer_lib.mjs';

let fails = 0;
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); };
const A = await open('mo');
const { p, press } = A;
const shot = (n) => p.screenshot({ path: `out/mo_${n}.png` });
const order = async (cat, svc) => {
  await press(cat); await press(svc); await p.waitForTimeout(800);
  await press(/^בקשת .* עכשיו$/); await p.waitForTimeout(800);
  const ta = p.locator('textarea').filter({ visible: true }).first(); if (await ta.count()) await ta.fill('בדיקה של שתי הזמנות');
  const line = p.getByRole('checkbox').first(); if (await line.count()) await line.click({ force: true });
  await press(/^שליחת הקריאה/);
  for (let i = 0; i < 15 && !(await A.has('כן, מתאים לי')); i++) await p.waitForTimeout(1000);
  await press(/^כן, מתאים לי/); await p.waitForTimeout(1500);
  await p.mouse.click(195, 420); await p.waitForTimeout(800); // past the "קיבל את הקריאה" moment
};
try {
  await A.toHome();
  await order(/^תיקונים בבית$/, /^נזילה או דליפת מים/);
  const first = (await A.text()).match(/(\S+) בדרך אליך/)?.[1] ?? '';
  await press(/^חזרה$/); await p.waitForTimeout(800);
  check('one order: home shows its capsule', (await A.buttons()).some((b) => /בדרך אליך/.test(b)));
  await order(/^ביוטי ושיער$/, /^תספורת/);
  await shot('1_second_tracking');
  check('order screen shows "1 מתוך 2" style switcher', /\d מתוך 2/.test(await A.text()), await A.sig());
  await press(/^חזרה$/); await p.waitForTimeout(1000);
  await shot('2_home_dock');
  const dock = await p.getByLabel(/^הזמנה \d מתוך 2/).count();
  check('home: the dock holds both orders', dock >= 2, `chips=${dock}`);
  check('home: the first order is still there', (await A.text()).includes('נזילה') || (await p.getByLabel(/נזילה/).count()) > 0);
  await p.getByLabel(/^הזמנה 1 מתוך 2/).first().click(); await p.waitForTimeout(1500);
  await shot('3_open_first');
  check('dock → first order opens (the leak)', (await A.text()).includes('נזילה'), await A.sig());
  check('switcher on the first order', /1 מתוך 2/.test(await A.text()));
  await p.getByLabel(/^הזמנה 2 מתוך 2/).first().click(); await p.waitForTimeout(1500);
  check('switcher → the haircut order', (await A.text()).includes('תספורת'), await A.sig());
  await press(/^חזרה$/); await p.waitForTimeout(800);
  await press(/^תפריט$/); await press(/^הקריאות שלי/); await p.waitForTimeout(800);
  await shot('4_calls');
  const t = await A.text();
  check('calls list: both live orders', t.includes('נזילה') && t.includes('תספורת'), t.slice(0, 160));
  await press(/^חזרה$/); await press(/^חזרה$/); await p.waitForTimeout(600);
  if (await press(/^טיול ברחוב/)) {
    await p.waitForTimeout(4000);
    await shot('5_city');
    check('city: the orders strip is on screen', (await p.getByLabel(/^הזמנה \d מתוך 2/).count()) >= 2);
  } else console.log('note: no street door on home');
} catch (e) { fails++; console.log('FAIL threw', String(e).slice(0, 200)); await shot('threw'); }
if (A.errs.filter((e) => !e.startsWith('click fail')).length) { fails++; console.log('FAIL errors', A.errs.slice(0, 3)); }
console.log(fails ? `${fails} FAIL` : 'ALL PASS');
await A.b.close();

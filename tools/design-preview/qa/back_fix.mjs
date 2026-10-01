// Re-checks the customer-side button audit's back findings (#1–#25) after the fix.
// Each case prints PASS/FAIL. Run: node qa/back_fix.mjs  (preview on :4421)
import { open, toMatch, toAssigned } from './audit_customer_lib.mjs';

let fails = 0;
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); };
const run = async (tag, fn) => {
  const A = await open('bf_' + tag);
  try { await fn(A); } catch (e) { fails++; console.log(`FAIL  ${tag} threw ${String(e).slice(0, 160)}`); await A.shot('threw'); }
  if (A.errs.filter((e) => !e.startsWith('click fail')).length) { fails++; console.log('FAIL  errors', tag, A.errs.slice(0, 3)); }
  await A.b.close();
};
const isHome = async (A) => (await A.has('מה צריך')) || (await A.has('כל 47'));

await run('menu', async (A) => {
  await A.toHome();
  await A.press(/^תפריט$/);
  await A.press(/^יש לך עסק/);
  await A.press(/^חזרה$/);
  check('#2 business page back → menu', await A.has('התפריט'), await A.sig());
  await A.press(/^חזרה$/);
  check('#4 menu back → home', await isHome(A), await A.sig());
  await A.histBack();
  check('#2 phone back after does not reopen business page', !(await A.has('לבעלי עסקים')), await A.sig());
});

await run('address', async (A) => {
  await A.toHome();
  await A.press(/^שינוי כתובת/);
  const inp = A.p.locator('input').filter({ visible: true }).first();
  await inp.fill('הרצל 10, חיפה');
  await A.press(/^אישור הכתובת/);
  check('#3 confirm returns home', await isHome(A), await A.sig());
  check('#20 typed address used', await A.has('הרצל 10'));
  await A.histBack();
  check('#3 phone back does not reopen picker', !(await A.has('אישור הכתובת')), await A.sig());
});

await run('cancel', async (A) => {
  await toMatch(A);
  await A.press(/^ביטול הבקשה/);
  await A.histBack();
  check('#5 cancelled match does not come back', !(await A.has('כן, מתאים לי')), await A.sig());
});

await run('waiting', async (A) => {
  await toAssigned(A);
  await A.p.mouse.click(195, 400); await A.p.waitForTimeout(800);
  await A.press(/^חזרה$/);
  check('#7 waiting back → home', await isHome(A), await A.sig());
  await A.histBack();
  check('#6 phone back does not reopen match', !(await A.has('כן, מתאים לי')), await A.sig());
  await A.press(/^תפריט$/);
  await A.press(/^הקריאות שלי/);
  check('#23 calls list shows this job', (await A.has('נזילה')) && !(await A.has('תקלת חשמל בסלון')), await A.sig());
  check('#25 calls list has back', (await A.buttons()).includes('חזרה'));
});

await run('rate', async (A) => {
  // No sample history (Amit, 2026-10-01: "רוצה אמת"): a new customer's list is empty and says so.
  await A.toHome();
  await A.press(/^תפריט$/);
  await A.press(/^הקריאות שלי/);
  check('calls list: no sample history for a new customer', (await A.has('עוד לא שלחת קריאה')) && !(await A.has('התקנת מזגן')), await A.sig());
  await A.press(/^חזרה$/);
  check('#8 calls list back → menu', await A.has('התפריט'), await A.sig());
});

await run('avatar', async (A) => {
  await A.toHome();
  await A.press(/^תפריט$/);
  await A.press(/^הדמות שלי/);
  const bs = await A.buttons();
  check('#16 picker from menu has back', bs.includes('חזרה'), JSON.stringify(bs).slice(0, 200));
  check('#16 no skip that deletes the figure', !bs.some((b) => /בלי דמות/.test(b)));
  await A.press(/^חזרה$/);
  check('#16/#19 back returns to the menu', await A.has('התפריט'), await A.sig());
});

await run('biz', async (A) => {
  await A.p.goto(process.env.URL0 || 'http://127.0.0.1:4421/?time=day');
  await A.p.locator('text=אני צריך מקצוען').first().waitFor({ timeout: 20000 });
  await A.p.waitForTimeout(800);
  await A.press(/^יש לי עסק/);
  await A.p.waitForTimeout(800);
  await A.press(/^חזרה$/);
  check('#18 business door back → welcome', await A.has('אני צריך מקצוען'), await A.sig());
});

await run('allsvc', async (A) => {
  await A.toHome();
  await A.press(/^כל 47 השירותים/);
  await A.histBack();
  check('#13 phone back closes the 47 list and stays home', await isHome(A) && !(await A.has('חיפוש בכל השירותים')), await A.sig());
});

console.log(fails ? `\n${fails} FAIL` : '\nALL PASS');
process.exit(fails ? 1 : 0);

// Every shop's door opens THAT shop (Amit, 2026-09-30: pets opened beauty, Lust opened the barber).
import { launchChromium } from '../browser.mjs';
const SHOPS = [["hair","טיפוח ויופי"],["pets","בעלי חיים"],["home","תיקונים דחופים"],["lust","Lust"],["tech","מחשבים וסלולר"],["auto","רכב ודרך"],["well","בריאות וכושר"],["appliance","מוצרי חשמל"],["care","ניקיון ותחזוקה"],["nails","ציפורניים"],["move","הובלות ומשלוחים"],["vet","וטרינריה"],["build","שיפוץ והתקנות"],["help","עזרה ועבודות קטנות"]];
const b = await launchChromium();
const only = process.argv[2];
for (const [id, he] of SHOPS) {
  if (only && only !== id) continue;
  const desk = process.env.DESK === '1';
  const p = await (await b.newContext(desk ? { viewport: { width: 1280, height: 800 } } : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  /* The published artifact holds only some editions (512-file limit): m/ rooms exist only for these. */
  if (process.env.PUBLISHED === '1') await p.route(/\/world\/m\/room_(?!hair_|home_|lust_|nails_|tech_)/, (r) => r.fulfill({ status: 404, body: 'nope' }));
  const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  await p.goto(`http://127.0.0.1:4421/?city=1&time=${process.env.T || "night"}&enter=${id}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(9000);
  const t = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  const ok = t.includes(he);
  await p.screenshot({ path: `out/door_${id}.png` });
  console.log(`${ok ? 'OK ' : 'BAD'} ${id.padEnd(9)} expect "${he}" · page: ${t.slice(0, 120)} ${errs.join(' | ')}`);
  await p.close();
}
await b.close();

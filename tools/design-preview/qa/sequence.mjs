// One visit, several shops in a row — the way a demo goes.
import { launchChromium } from '../browser.mjs';
const ORDER = (process.env.ORDER || 'hair,pets,lust,auto,vet,nails').split(',');
const AT = { hair: [88, -1, "טיפוח ויופי"], pets: [70.4, 1, "בעלי חיים"], home: [52.8, -1, "תיקונים דחופים"], lust: [35.2, 1, "Lust"], tech: [17.6, -1, "מחשבים וסלולר"], auto: [0, 1, "רכב ודרך"], well: [-17.6, -1, "בריאות וכושר"], appliance: [-35.2, 1, "מוצרי חשמל"], care: [-52.8, -1, "ניקיון ותחזוקה"], nails: [-70.4, 1, "ציפורניים"], move: [-88, -1, "הובלות ומשלוחים"], vet: [-105.6, 1, "וטרינריה"], build: [-123.2, -1, "שיפוץ והתקנות"], help: [-140.8, 1, "עזרה ועבודות קטנות"] };
const b = await launchChromium();
const desk = process.env.DESK === '1';
const p = await (await b.newContext(desk ? { viewport: { width: 1280, height: 800 } } : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 140)));
const [z0, s0] = AT[ORDER[0]];
await p.goto(`http://127.0.0.1:4421/?city=1&time=day&x=${(6.7 * s0).toFixed(1)}&z=${z0}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(6000);
const txt = async () => (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
const teleport = (x, z) => p.evaluate(([x, z]) => { const f = window.__pnTeleport; if (f) { f(x, z); return true; } return false; }, [x, z]);
for (const [k, id] of ORDER.entries()) {
  const [z, side, he] = AT[id];
  if (k > 0) { const ok = await teleport(6.7 * side, z); if (!ok) { console.log('no teleport hook'); break; } await p.waitForTimeout(2500); }
  const btn = p.getByRole('button', { name: /היכנס/ }).first();
  if (!(await btn.count())) { console.log(`?? ${id}: no enter button · ${(await txt()).slice(0, 60)}`); continue; }
  await btn.click({ force: true });
  for (const ms of [250, 600, 1000, 1600, 2400]) { await p.waitForTimeout(ms === 250 ? 250 : ms - [250, 600, 1000, 1600, 2400][[250, 600, 1000, 1600, 2400].indexOf(ms) - 1]); await p.screenshot({ path: `out/seqf_${k}_${id}_${ms}.png` }); }
  await p.waitForTimeout(2000);
  const t = await txt();
  await p.screenshot({ path: `out/seq_${k}_${id}.png` });
  console.log(`${t.includes(he) ? 'ok   ' : 'WRONG'} ${id} · ${t.slice(0, 40)}`);
  const out = p.getByRole('button', { name: /חזרה לרחוב/ }).first(); if (await out.count()) { await out.click({ force: true }); await p.waitForTimeout(3500); }
}
console.log(errs.join(' | '));
await b.close();

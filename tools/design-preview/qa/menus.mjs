// Inside every shop, "מה אפשר להזמין כאן" must list that shop's own services.
import { launchChromium } from '../browser.mjs';
const IDS = ['hair','pets','home','lust','tech','auto','well','appliance','care','nails','move','vet','build','help'];
const b = await launchChromium();
const desk = process.env.DESK === '1';
for (const id of IDS) {
  const p = await (await b.newContext(desk ? { viewport: { width: 1280, height: 800 } } : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await p.goto(`http://127.0.0.1:4421/?city=1&time=day&enter=${id}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(8000);
  const m = p.getByRole('button', { name: /מה אפשר להזמין כאן/ }).first();
  let t = '(no menu button)';
  if (await m.count()) { await m.click({ force: true }); await p.waitForTimeout(2500); t = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' '); await p.screenshot({ path: `out/menu_${id}.png` }); }
  console.log(`${id.padEnd(9)} | ${t.slice(0, 230)}`);
  await p.close();
}
await b.close();

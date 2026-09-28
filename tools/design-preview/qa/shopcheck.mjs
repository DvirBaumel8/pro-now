import { launchChromium } from '../browser.mjs';
const [x, z, name, face] = process.argv.slice(2);
const b = await launchChromium();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
await p.goto(`http://127.0.0.1:4421/?city=1&time=night&x=${x}&z=${z}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(5000);
const stick = (x, y) => p.evaluate(([x, y]) => { for (const el of document.querySelectorAll('div')) if (el.__stick) { el.__stick(x, y); return true; } return false; }, [x, y]);
await stick(0, -0.2); await p.waitForTimeout(300); await stick(0, 0); await p.waitForTimeout(2500);
// turn to face the shop: drag horizontally
const side = Number(x) > 0 ? 1 : -1;
await p.mouse.move(195, 500); await p.mouse.down(); await p.mouse.move(195 - side * Number(face || 150), 500, { steps: 12 }); await p.mouse.up(); await p.waitForTimeout(2500);
await p.screenshot({ path: `out/sc_${name}_street.png` });
const btn = p.getByRole('button', { name: /היכנס/ }).first();
if (await btn.count()) { await btn.click(); await p.waitForTimeout(4500); await p.screenshot({ path: `out/sc_${name}_in.png` });
  await stick(0.6, 0); await p.waitForTimeout(900); await stick(0, 0); await p.waitForTimeout(1200); await p.screenshot({ path: `out/sc_${name}_in2.png` });
  const menu = p.getByRole('button', { name: /מה אפשר להזמין/ }).first(); if (await menu.count()) { await menu.click(); await p.waitForTimeout(2500); await p.screenshot({ path: `out/sc_${name}_menu.png` }); } }
console.log('errors', errs.join(' | '));
await b.close();

import { launchChromium } from '../browser.mjs';
const b = await launchChromium();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const [x, z, name] = process.argv.slice(2);
await p.goto(`http://127.0.0.1:4421/?city=1&x=${x}&z=${z}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(5000);
const txt = async () => (await p.evaluate(() => [...document.querySelectorAll('[role=button],button,p,span')].map((e) => (e.innerText||'').trim().replace(/\n/g,' ')).filter((t)=>t && t.length<60))).filter((v,i,a)=>a.indexOf(v)===i).join(' | ');
const stick = (x, y) => p.evaluate(([x, y]) => { for (const el of document.querySelectorAll('div')) if (el.__stick) { el.__stick(x, y); return true; } return false; }, [x, y]);
await stick(0, -0.3); await p.waitForTimeout(400); await stick(0, 0); await p.waitForTimeout(4000);
console.log('AT', await txt());
const btn = p.getByRole('button', { name: /היכנס|להיכנס|מה אפשר להזמין/ }).first();
if (await btn.count()) { await btn.click(); await p.waitForTimeout(3500); console.log('INSIDE', await txt()); }
await p.screenshot({ path: `out/shop_${name}.png` });
const menu = p.getByRole('button', { name: /מה אפשר להזמין/ }).first();
if (await menu.count()) { await menu.click(); await p.waitForTimeout(3000); console.log('MENU', await txt()); await p.screenshot({ path: `out/menu_${name}.png` }); }
await b.close();

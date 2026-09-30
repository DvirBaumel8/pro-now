// Stand at every door, read the pill, press "היכנס", read the room — as a person does.
import { launchChromium } from '../browser.mjs';
const SHOPS = [["hair",88,-1,"טיפוח ויופי"],["pets",70.4,1,"בעלי חיים"],["home",52.8,-1,"תיקונים דחופים"],["lust",35.2,1,"Lust"],["tech",17.6,-1,"מחשבים וסלולר"],["auto",0,1,"רכב ודרך"],["well",-17.6,-1,"בריאות וכושר"],["appliance",-35.2,1,"מוצרי חשמל"],["care",-52.8,-1,"ניקיון ותחזוקה"],["nails",-70.4,1,"ציפורניים"],["move",-88,-1,"הובלות ומשלוחים"],["vet",-105.6,1,"וטרינריה"],["build",-123.2,-1,"שיפוץ והתקנות"],["help",-140.8,1,"עזרה ועבודות קטנות"]];
const b = await launchChromium();
const desk = process.env.DESK === '1';
for (const [id, z, side, he] of SHOPS) {
  for (const dz of [0, -4, 4]) {
    const p = await (await b.newContext(desk ? { viewport: { width: 1280, height: 800 } } : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
    await p.goto(`http://127.0.0.1:4421/?city=1&time=day&x=${(6.7 * side).toFixed(1)}&z=${z + dz}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(6000);
    const stick = (x, y) => p.evaluate(([x, y]) => { for (const el of document.querySelectorAll('div')) if (el.__stick) { el.__stick(x, y); return true; } return false; }, [x, y]);
    await stick(0, -0.15); await p.waitForTimeout(250); await stick(0, 0); await p.waitForTimeout(1500);
    const pill = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 80);
    const btn = p.getByRole('button', { name: /היכנס|כדאי להיכנס/ }).first();
    let room = '(no enter button)';
    if (await btn.count()) { await btn.click({ force: true }); await p.waitForTimeout(5000); room = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 40); await p.screenshot({ path: `out/walk_${id}_${dz}.png` }); }
    const bad = room !== '(no enter button)' && !room.includes(he);
    console.log(`${bad ? 'WRONG' : 'ok   '} ${id.padEnd(9)} dz=${dz} | pill: ${pill} | room: ${room}`);
    await p.close();
  }
}
await b.close();

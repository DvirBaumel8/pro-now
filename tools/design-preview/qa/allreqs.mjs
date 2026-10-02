import { launchChromium } from '../browser.mjs';
import { writeFileSync } from 'node:fs';
const b = await launchChromium();
const out = new Set();
const track = (p) => p.on('request', (r) => { const m = r.url().match(/127\.0\.0\.1:4421\/([^?#]*)/); if (m && m[1]) out.add(decodeURIComponent(m[1])); });
const press = async (p, re) => { const loc = p.locator('[role=button],button').filter({ visible: true }); const c = await loc.count(); for (let i = 0; i < c; i++) { const el = loc.nth(i); const a = ((await el.getAttribute('aria-label')) || '').trim(); const t = ((await el.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' '); const lab = re.test(a) ? a : t; if (re.test(lab)) { await el.click({ force: true }); await p.waitForTimeout(1200); return lab; } } return null; };
for (const [w, h, mob] of [[390, 844, true], [1280, 800, false]]) {
  for (const t of ['night', 'day']) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob });
    const p = await ctx.newPage(); track(p);
    await p.goto(`http://127.0.0.1:4421/?city=1&time=${t}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(5000);
    await p.goto(`http://127.0.0.1:4421/?time=${t}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(3000);
    for (let s = 0; s < 4; s++) { await p.mouse.move(300, 400); await p.mouse.down(); await p.mouse.move(60, 400, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(1200); }
    await press(p, /^אני צריך מקצוען/); await p.getByLabel('מספר טלפון').fill('0501234567').catch(()=>{}); await press(p, /^שליחת קוד/); await p.getByLabel('קוד האימות').fill('123456').catch(()=>{}); await press(p, /^כניסה/);
    await press(p, /^דילוג על ההסבר/); await press(p, /^דמות 1$/); await press(p, /^(אישור הדמות|זו אני)/); await p.waitForTimeout(3000);
    for (const tile of ['תיקונים בבית', 'חיות', 'רכב']) { if (await press(p, new RegExp('^' + tile))) { await p.waitForTimeout(1500); await press(p, /^(חזרה|‹)/); } }
    await press(p, /^טיילו ברחוב/); await p.waitForTimeout(6000);
    await ctx.close();
  }
}
writeFileSync('out/requested.json', JSON.stringify([...out].sort()));
console.log('requested', out.size);
await b.close();

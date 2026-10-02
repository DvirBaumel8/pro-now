// "אני מקצוען" from the welcome must reach joining — first visit, and again for a device already signed in.
import { launchChromium } from '../browser.mjs';
const b = await launchChromium();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const press = async (re) => { const loc = p.locator('[role=button],button').filter({ visible: true }); const c = await loc.count(); for (let i = 0; i < c; i++) { const el = loc.nth(i); const a = ((await el.getAttribute('aria-label')) || '').trim(); const t = ((await el.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' '); const lab = re.test(a) ? a : t; if (re.test(lab)) { await el.click({ force: true }); await p.waitForTimeout(900); return lab; } } return null; };
const joined = async () => (await p.locator('text=העסק שלך,').count()) > 0;
await p.goto('http://127.0.0.1:4421/?time=night'); await p.locator('text=אני בעל מקצוע').first().waitFor();
await press(/^אני בעל מקצוע/); await p.getByLabel('מספר טלפון').fill('0501234567'); await press(/^שליחת קוד/); await p.getByLabel('קוד האימות').fill('123456'); await press(/^כניסה/);
await press(/^דילוג על ההסבר/); await p.waitForTimeout(800);
console.log('first visit ->', (await joined()) ? 'JOIN OK' : 'NO JOIN');
await p.screenshot({ path: 'out/proentry_1.png' });
// back out and come in again as an already signed-in professional
await p.goto('http://127.0.0.1:4421/?time=night'); await p.waitForTimeout(1500);
if (await p.locator('text=אני בעל מקצוע').count()) await press(/^אני בעל מקצוע/);
await p.waitForTimeout(900);
console.log('signed in before ->', (await joined()) ? 'JOIN OK' : 'NO JOIN');
await p.screenshot({ path: 'out/proentry_2.png' });
await b.close();

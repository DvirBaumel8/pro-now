import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
const click = async (t) => { await p.locator(`text=${t}`).first().click({timeout:8000}); await p.waitForTimeout(700); };
const shot = (n) => p.screenshot({path:`/tmp/claude-0/shots/${n}.png`});
await p.goto('http://127.0.0.1:4421/', {waitUntil:'networkidle'}); await p.waitForTimeout(1800);
await click('אני צריך מקצוען');
await p.getByLabel('מספר טלפון').fill('0501234567'); await click('שליחת קוד');
await p.getByLabel('קוד האימות').fill('123456'); await click('כניסה');
await p.waitForTimeout(1200);
try { await click('דלג'); } catch {}
try {
  await p.getByLabel(/דמות 4$/).first().click({ timeout: 4000 });
  await p.waitForTimeout(300);
  await click('זו אני/אני זה');
} catch { try { await click('דלג כרגע'); } catch {} }
await p.waitForTimeout(1200);
// onto the street
try { await click('לטייל ברחוב'); } catch {
  const alt = await p.locator('text=/טיול|רחוב|לטייל/').first();
  await alt.click({timeout:6000});
}
await p.waitForTimeout(1600); await shot('G0-plate');
await click('מפה אמיתית');
await p.waitForTimeout(1800); await shot('G1-realmap');
await b.close(); console.log('done');

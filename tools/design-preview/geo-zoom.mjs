import { launchChromium } from './browser.mjs';
const b = await launchChromium();
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
const click = async (t) => { await p.locator(`text=${t}`).first().click({timeout:8000}); await p.waitForTimeout(700); };
const shot = (n) => p.screenshot({path:`/tmp/claude-0/shots/${n}.png`});
await p.goto('http://127.0.0.1:4421/', {waitUntil:'networkidle'}); await p.waitForTimeout(1800);
await click('אני צריך מקצוען');
await p.getByLabel('מספר טלפון').fill('0501234567'); await click('שליחת קוד');
await p.getByLabel('קוד האימות').fill('123456'); await click('כניסה');
await p.waitForTimeout(1200);
try { await click('דלג'); } catch {}
try { await p.getByLabel(/דמות 4$/).first().click({ timeout: 4000 }); await p.waitForTimeout(300); await click('זו אני/אני זה'); }
catch { try { await click('דלג כרגע'); } catch {} }
await p.waitForTimeout(1200);
try { await click('לטייל ברחוב'); } catch { await p.locator('text=/טיול|רחוב|לטייל/').first().click({timeout:6000}); }
await p.waitForTimeout(1400);
await click('מפה אמיתית');
await p.waitForTimeout(1400);
const out = p.getByLabel('להתרחק ולראות את השכונה');
for (let i=1;i<=4;i++){ await out.click({timeout:6000}); await p.waitForTimeout(1200); await shot(`Z${i}`); }
await b.close(); console.log('done');

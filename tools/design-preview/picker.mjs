/**
 * The avatar picker, captured at three moments.
 *
 * It is the second screen a customer ever sees and the only one whose
 * entire content is a choice, so how it arrives and how it answers are
 * the screen. Screenshots of the middle of a movement are the only way to
 * check timing that a unit test cannot see.
 */
import { chromium } from 'playwright';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
p.on('pageerror', (e) => console.log('PAGE ERR:', String(e).slice(0, 200)));

const click = async (t) => {
  await p.locator(`text=${t}`).first().click({ timeout: 8000 });
  await p.waitForTimeout(700);
};
const shot = (n) => p.screenshot({ path: `/tmp/claude-0/shots/${n}.png` });

await p.goto('http://127.0.0.1:4421/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1400);
await click('אני צריך מקצוען');
await p.getByLabel('מספר טלפון').fill('0501234567');
await click('שליחת קוד');
await p.getByLabel('קוד האימות').fill('123456');
await p.locator('text=כניסה').first().click();

// Mid-arrival: some tiles down, some still on their way.
await p.waitForTimeout(260);
await shot('P1-arriving');

await p.waitForTimeout(1400);
await shot('P2-settled');

const dog = p.getByLabel(/^כלב$/).first();
console.log('dog tile found:', await dog.count());
if (await dog.count()) {
  await dog.click();
  await p.waitForTimeout(900);
  await shot('P3-picked');
}

await b.close();
console.log('done');

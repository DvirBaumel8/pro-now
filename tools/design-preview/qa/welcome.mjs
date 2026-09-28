import { launchChromium } from '../browser.mjs';
const b = await launchChromium();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await p.goto('http://127.0.0.1:4421/', { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
await p.screenshot({ path: 'out/welcome.png' });
await b.close();

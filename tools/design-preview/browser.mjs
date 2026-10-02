import { chromium } from 'playwright';

/*
 * WHERE THE BROWSER IS.
 *
 * Every script in this folder used to name `/opt/pw-browsers/chromium`
 * literally — the path inside the container this harness was written in,
 * which exists on no developer's machine. The browser is wherever
 * Playwright put it, and Playwright is the thing that knows.
 *
 * Set PW_CHROMIUM to pin a specific binary (a system Chrome, a CI image);
 * otherwise this resolves the download made by `npx playwright install
 * chromium`, which is what the README now asks for.
 */
export function launchChromium(options = {}) {
  const executablePath = process.env.PW_CHROMIUM;
  return chromium.launch(executablePath ? { ...options, executablePath } : options);
}

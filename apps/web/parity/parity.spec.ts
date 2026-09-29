import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

import { linkFor, uniqueEmail } from "../e2e/helpers";

/**
 * The product against the demo, screen by screen (see parity.config.ts for
 * why this is not in CI). Each screen writes demo | product | diff to
 * parity-report/ and asserts the share of differing pixels stays under
 * MAX_DIFF, so a screen that drifts from the demo is caught at the next
 * catch-up.
 *
 * Home is reported but not asserted: it differs by decision (docs/21 W2).
 * Upcoming controls are dimmed, and the demo's invented data (recent jobs,
 * counts, address) is absent.
 */
const DEMO = "http://127.0.0.1:4421";
const PRODUCT = "http://localhost:4100";
const OUT = path.resolve(import.meta.dirname, "../parity-report");
/** Anti-aliasing and the drifting backdrops account for well under this. */
const MAX_DIFF = 0.02;

mkdirSync(OUT, { recursive: true });
const results: Record<string, number> = {};

async function shot(page: Page) {
  await page.waitForTimeout(1500);
  return PNG.sync.read(await page.screenshot({ animations: "disabled" }));
}

function compare(name: string, demo: PNG, product: PNG, assert = true) {
  const { width, height } = demo;
  const diff = new PNG({ width, height });
  const n = pixelmatch(demo.data, product.data, diff.data, width, height, { threshold: 0.15 });
  const share = n / (width * height);
  results[name] = share;
  const sheet = new PNG({ width: width * 3, height });
  PNG.bitblt(demo, sheet, 0, 0, width, height, 0, 0);
  PNG.bitblt(product, sheet, 0, 0, width, height, width, 0);
  PNG.bitblt(diff, sheet, 0, 0, width, height, width * 2, 0);
  writeFileSync(path.join(OUT, `${name}.png`), PNG.sync.write(sheet));
  writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
  if (assert) expect(share, `${name}: ${(share * 100).toFixed(2)}% of pixels differ`).toBeLessThan(MAX_DIFF);
}

test("the product's screens match the demo's", async ({ browser }) => {
  const demo = await (await browser.newContext()).newPage();
  const product = await (await browser.newContext()).newPage();

  await demo.goto(DEMO);
  await product.goto(PRODUCT);
  compare("1-welcome", await shot(demo), await shot(product));

  // Into the intro: the demo by phone and code, the product by email link.
  await demo.getByText("אני צריך מקצוען").click();
  await demo.getByPlaceholder("050-0000000").fill("0501234567");
  await demo.getByText("שליחת קוד").click();
  // The demo takes ~700ms to reach the code stage; fill the code field itself.
  await demo.getByPlaceholder("000000", { exact: true }).fill("123456");
  await demo.getByText("כניסה", { exact: true }).click();

  const email = uniqueEmail("parity");
  await product.getByText("אני צריך מקצוען").click();
  await product.getByPlaceholder("name@example.com").fill(email);
  await product.getByText("שליחת קישור").click();
  await product.goto(await linkFor(email));

  for (let slide = 0; slide < 5; slide++) {
    compare(`2-intro-${slide + 1}`, await shot(demo), await shot(product));
    const next = slide < 4 ? "הבא" : "בואו נתחיל";
    await demo.getByText(next, { exact: true }).click();
    await product.getByText(next, { exact: true }).click();
  }

  compare("3-avatar", await shot(demo), await shot(product));

  await demo.getByText("דלג כרגע").click();
  await product.getByText("דלג כרגע").click();
  compare("4-home", await shot(demo), await shot(product), false);
});

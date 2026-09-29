import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

/**
 * Demo parity (docs/21 W2, docs/22 §4): the product and the demo, side by
 * side, in the same state, at iPhone 15 size.
 *
 * Deliberately NOT in CI. It compares against the demo as it is now, and
 * Amit changes the demo constantly; in CI every one of his commits would
 * turn master red for a difference the product has simply not caught up
 * with yet. It is run during a catch-up (`npm run parity`), where a
 * difference is exactly the information wanted.
 *
 * Output: parity-report/<screen>.png (demo | product | diff) plus the
 * percentage of differing pixels per screen.
 */
const PRODUCT = 4100;
const DEMO = 4421;
const here = import.meta.dirname;

export default defineConfig({
  testDir: "parity",
  timeout: 120_000,
  workers: 1,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, locale: "he-IL" },
  webServer: [
    {
      command: "npm run build && npm run start:ts --prefix ../api",
      cwd: here,
      url: `http://localhost:${PRODUCT}/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: { PORT: String(PRODUCT), PUBLIC_URL: `http://localhost:${PRODUCT}`, WEB_DIST_DIR: path.join(here, "dist"), NODE_ENV: "test" },
      stdout: "ignore",
    },
    {
      command: `npm run build && npx vite preview --port ${DEMO} --strictPort --host 127.0.0.1`,
      cwd: path.resolve(here, "../../tools/design-preview"),
      url: `http://127.0.0.1:${DEMO}/`,
      timeout: 180_000,
      reuseExistingServer: true,
      stdout: "ignore",
    },
  ],
});

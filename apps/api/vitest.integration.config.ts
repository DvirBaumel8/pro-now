import { defineConfig } from "vitest/config";

/**
 * Route-level tests against a real Postgres + PostGIS (`npm run test:int`).
 * global-setup.ts creates a throwaway database, migrates and seeds it, and
 * drops it afterwards. Files run one at a time: they share that database.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/integration/**/*.int.test.ts"],
    globalSetup: ["test/integration/global-setup.ts"],
    setupFiles: ["test/integration/setup-env.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 120_000,
  },
});

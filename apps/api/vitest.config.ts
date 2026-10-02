import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Integration tests need a database; they run under vitest.integration.config.ts.
    exclude: ["test/integration/**", "node_modules/**"],
  },
});

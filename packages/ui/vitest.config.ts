import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Pure formatting logic — no DOM or React Native runtime needed.
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});

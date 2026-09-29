import { describe, expect, it } from "vitest";

import { resolveWebDistRoot } from "../src/plugins/web-app.js";

describe("web app distribution root", () => {
  it("resolves the frontend beside the API package from the compiled API directory", () => {
    expect(resolveWebDistRoot(undefined, "/repo/apps/api/dist")).toBe("/repo/apps/web/dist");
  });
});

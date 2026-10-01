import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("index.html viewport", () => {
  it("never lets iOS zoom into a focused field, on any screen", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const viewport = html.match(/<meta name="viewport" content="([^"]+)"/)?.[1] ?? "";
    expect(viewport.split(/,\s*/)).toContain("maximum-scale=1");
    // Pinching stays the person's choice.
    expect(viewport).not.toMatch(/user-scalable=(no|0)/);
  });
});

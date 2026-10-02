import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/*
 * D1 (docs/21 §5, decided 2026-09-29): no money moves in the app. Copy that
 * says an amount is "approved on the card" was ported from the demo more
 * than once after that, and each time told a customer or a professional
 * something false. This fails the build if it comes back.
 *
 * When in-app payments return, delete this test with the decision.
 */
const ROOTS = [path.resolve(__dirname, "../src"), path.resolve(__dirname, "../../types/src")];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [full] : [];
  });
}

describe("D1: no copy says a card is charged", () => {
  it("finds no 'בכרטיס' in the shared screens and types", () => {
    const hits = ROOTS.flatMap(sources).flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .map((line, i) => ({ file: path.relative(process.cwd(), file), line: i + 1, text: line.trim() }))
        .filter((l) => l.text.includes("בכרטיס"))
    );
    expect(hits).toEqual([]);
  });
});

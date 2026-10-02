#!/usr/bin/env node
/**
 * The demo (tools/design-preview) and the product (apps/*, packages/*) share
 * no code — see docs/22-WORKING-MODEL.md. The demo owns its own copies in
 * tools/design-preview/lib/{ui,types}; the product never imports from the demo.
 * This check fails the lint step when either side reaches into the other.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const SKIP = new Set(["node_modules", "dist", "out", "public", ".expo", ".next", "film"]);
const EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

function* files(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (EXT.test(name)) yield p;
  }
}

// Import specifiers only (from "...", import("..."), require("...")), not comments.
const SPEC = /(?:from\s+|import\s*\(\s*|require_?\s*\(\s*)["']([^"']+)["']/g;

const rules = [
  {
    roots: ["tools/design-preview"],
    bad: (spec, file) =>
      /^@pro-now\/(?!demo-)/.test(spec) ||
      path.resolve(path.dirname(file), spec).includes(`${path.sep}packages${path.sep}`),
    why: "the demo must use @pro-now/demo-ui / @pro-now/demo-types, not product packages",
  },
  {
    roots: ["apps", "packages", "scripts"],
    bad: (spec, file) =>
      /^@pro-now\/(demo-|design-preview)/.test(spec) ||
      (spec.startsWith(".") && path.resolve(path.dirname(file), spec).includes(`tools${path.sep}design-preview`)),
    why: "the product must not import from the demo",
  },
];

let failures = 0;
for (const { roots, bad, why } of rules) {
  for (const root of roots) {
    for (const file of files(root)) {
      if (file === "scripts/check-demo-isolation.mjs") continue;
      const src = readFileSync(file, "utf8");
      for (const [, spec] of src.matchAll(SPEC)) {
        if (bad(spec, file)) {
          console.error(`${file}: imports "${spec}" — ${why}`);
          failures++;
        }
      }
    }
  }
}

if (failures) {
  console.error(`\ndemo isolation: ${failures} violation(s). See docs/22-WORKING-MODEL.md §3.`);
  process.exit(1);
}
console.log("demo isolation: ok");

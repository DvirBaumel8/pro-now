import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Visual System v1 §1 — "Only semantic tokens. A local `fontSize:` is a bug."
 *
 * THIS CHECK EXISTS BECAUSE THE RULE WAS WRITTEN DOWN AND BROKEN ANYWAY.
 *
 * When the rule was agreed, the UI package held 128 literal `fontSize:`
 * values across 27 distinct sizes — 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
 * 20, 22, 24, 26, 28, 30, 32, 34, 38, 40, 42, 44, 46, 52, 58, 64 — every one
 * of them written by someone who was making a single screen look right. None
 * of them was wrong on its own screen. Together they meant the ETA rendered
 * at 44 on the match screen and at 30 on the tracking screen, so its size
 * told the reader nothing.
 *
 * Prose cannot hold this line: the next person building the seventeenth
 * screen will type `fontSize: 15` because 14 looks slightly small, and they
 * will be right, and the scale will be gone again. So the scale is a build
 * gate.
 *
 * THE RULE: outside `theme.ts`, `fontSize` must reference `scale.*`. Nothing
 * else is a style question — it is the difference between a design system
 * and a folder of screens.
 */

const SCALE = { display: 56, hero: 44, title: 32, section: 24, body: 17, meta: 14, micro: 12 };

const ROOTS = ['packages/ui/src', 'apps/customer-mobile', 'apps/pro-mobile', 'tools/design-preview/src'];
const EXEMPT = ['packages/ui/src/theme.ts'];

const walk = (dir, out = []) => {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    if (e === 'node_modules' || e === 'dist' || e === '.expo') continue;
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
};

const problems = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const rel = relative(process.cwd(), file);
    if (EXEMPT.includes(rel)) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      // `fontSize: 15`, `fontSize={15}`, `fontSize: 15.5` — all of them.
      const m = line.match(/fontSize\s*[:=]\s*\{?\s*(\d+(?:\.\d+)?)/);
      if (m) problems.push({ rel, line: i + 1, found: m[1], text: line.trim().slice(0, 72) });
    });
  }
}

if (problems.length === 0) {
  const names = Object.entries(SCALE).map(([k, v]) => `${k} ${v}`).join(' · ');
  console.log(`type scale clean — ${names}`);
  process.exit(0);
}

console.error(`\n${problems.length} literal font size(s). Use a token from \`scale\`:\n`);
console.error('  ' + Object.entries(SCALE).map(([k, v]) => `scale.${k} = ${v}`).join('\n  ') + '\n');
for (const p of problems) {
  const n = Number(p.found);
  const nearest = Object.entries(SCALE).sort((a, b) => Math.abs(a[1] - n) - Math.abs(b[1] - n))[0];
  console.error(`  ${p.rel}:${p.line}  ${p.found} → scale.${nearest[0]} (${nearest[1]})`);
  console.error(`      ${p.text}`);
}
process.exit(1);

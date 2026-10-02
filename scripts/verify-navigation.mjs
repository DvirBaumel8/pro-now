/**
 * EVERY SCREEN LEADS SOMEWHERE, AND EVERY SOMEWHERE EXISTS.
 *
 * ---------------------------------------------------------------------
 * WHY THIS IS A SCRIPT AND NOT A REVIEW
 * ---------------------------------------------------------------------
 * `tools/design-preview/sweep.mjs` already walks the shared screen bodies
 * in a browser and catches a screen that throws, a screen with no way
 * back, a control too small to hit, a dead end and a panel off the edge.
 * It cannot see the APPS: their navigation graph lives in React
 * Navigation, in two stacks, and a tap that calls `navigate("Online")`
 * when no screen is called Online fails silently at runtime on a phone
 * nobody is holding.
 *
 * React Navigation is typed, and `CustomerStackParamList` does describe
 * the screens — but a `navigate()` whose target is missing from the param
 * list is a type error only if the call site is typed, and several are
 * reached through props and callbacks where it is not. The first run of
 * this script found exactly that: a live button to a screen that does not
 * exist.
 *
 * ---------------------------------------------------------------------
 * THE FOUR FAULTS
 * ---------------------------------------------------------------------
 *   BROKEN     a navigate() to a screen that is not registered — a dead
 *              button, silent at runtime
 *   UNREACHED  a registered screen nothing navigates to, and which is not
 *              the stack's entry point — work nobody can get to
 *   UNDECLARED a screen registered in App.tsx and missing from the param
 *              list, so its own parameters are unchecked
 *   ORPHANED   a screen declared in the param list and never registered,
 *              so every navigate() to it is BROKEN by construction
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const APPS = [
  {
    name: "customer-mobile",
    root: "apps/customer-mobile",
    // The first screen of the stack: reached by being the entry, not by a
    // navigate(), so it is never UNREACHED.
    entry: "Intro",
  },
  { name: "pro-mobile", root: "apps/pro-mobile", entry: "Offline" },
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

/** Screens the param list declares. */
function declaredScreens(root) {
  const source = readFileSync(join(root, "src/navigation/types.ts"), "utf8");
  // Entries are `Name: params;` at one level of indentation inside the
  // param list. Comments between them are ignored by the shape of the
  // match rather than by stripping, so a commented-out screen stays out.
  return new Set([...source.matchAll(/^ {2}([A-Z][A-Za-z0-9]*):/gm)].map((m) => m[1]));
}

/** Screens App.tsx actually registers with the navigator. */
function registeredScreens(root) {
  const source = readFileSync(join(root, "App.tsx"), "utf8");
  return new Set([...source.matchAll(/name="([A-Za-z0-9]+)"/g)].map((m) => m[1]));
}

/**
 * Comments removed before anything is read.
 *
 * The first run of this script reported a dead button in
 * PreShiftScreen — `navigation.replace("Online")` to a screen that does
 * not exist. It was inside a comment, quoted as the bug that had already
 * been fixed there: going online anyway when starting the shift failed.
 *
 * A checker that reports a fixed bug because somebody wrote it down is
 * worse than no checker. Files in this repository explain themselves at
 * length and quote the code they replaced; that has to be safe to do.
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * The screen name(s) a navigation call names.
 *
 * Reads the FIRST argument only, whatever shape it is. The first run
 * missed `navigation.replace(offerPicker ? "AvatarPicker" : "Home")` —
 * a ternary — and reported AvatarPicker as a screen nothing reaches,
 * which would have sent somebody looking for a bug that was not there.
 * Both branches of that expression are destinations and both are read
 * now. Stopping at the first top-level comma keeps the params out: a
 * route argument like `{ serviceName: "Foo" }` is not a screen.
 */
function firstArgumentScreens(source, from) {
  let depth = 0;
  let out = "";
  for (let i = from; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "(" || ch === "{" || ch === "[") depth += 1;
    else if (ch === ")" || ch === "}" || ch === "]") {
      if (depth === 0) break;
      depth -= 1;
    } else if (ch === "," && depth === 0) break;
    out += ch;
  }
  return [...out.matchAll(/"([A-Za-z0-9]+)"/g)].map((m) => m[1]);
}

/** Every navigate/replace/push target, with the file that asks for it. */
function navigationTargets(root) {
  const found = [];
  for (const file of walk(join(root, "src"))) {
    const source = stripComments(readFileSync(file, "utf8"));
    for (const m of source.matchAll(
      /\b(?:navigation|nav)\s*\.\s*(?:navigate|replace|push)\s*\(/g
    )) {
      for (const screen of firstArgumentScreens(source, m.index + m[0].length)) {
        found.push({ screen, file: file.replace(root + "/", "") });
      }
    }
  }
  return found;
}

let failures = 0;
const fail = (app, kind, message) => {
  failures += 1;
  console.log(`  FAIL  [${app}] ${kind}  ${message}`);
};

for (const app of APPS) {
  console.log(`\n== ${app.name} ==`);
  const declared = declaredScreens(app.root);
  const registered = registeredScreens(app.root);
  const targets = navigationTargets(app.root);

  for (const screen of registered) {
    if (!declared.has(screen)) {
      fail(app.name, "UNDECLARED", `"${screen}" is registered but not in the param list`);
    }
  }
  for (const screen of declared) {
    if (!registered.has(screen)) {
      fail(app.name, "ORPHANED", `"${screen}" is declared but never registered`);
    }
  }

  const seen = new Set();
  for (const { screen, file } of targets) {
    seen.add(screen);
    if (!registered.has(screen)) {
      fail(app.name, "BROKEN", `${file} navigates to "${screen}", which no screen is called`);
    }
  }

  for (const screen of registered) {
    if (screen === app.entry) continue;
    if (!seen.has(screen)) {
      fail(app.name, "UNREACHED", `"${screen}" is registered and nothing navigates to it`);
    }
  }

  if (failures === 0) {
    console.log(
      `  ${registered.size} screens, ${targets.length} navigations, every one of them lands.`
    );
  }
}

console.log(
  failures === 0
    ? "\nNAVIGATION CLEAN\n"
    : `\n${failures} NAVIGATION FAULT(S)\n`
);
process.exit(failures === 0 ? 0 : 1);

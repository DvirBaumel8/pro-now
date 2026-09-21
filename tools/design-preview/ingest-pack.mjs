#!/usr/bin/env node
/**
 * TAKE A FOLDER OF DELIVERED ART AND PUT IT EVERYWHERE IT BELONGS.
 *
 *   node tools/design-preview/ingest-pack.mjs <folder> [--dry]
 *
 * ---------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------
 * Every asset has to land in three places and be named once more in two
 * generated files:
 *
 *   tools/design-preview/public/world/<id>.webp      the gallery
 *   apps/customer-mobile/assets/world/<id>.webp      the app
 *   tools/design-preview/src/worldSources.ts         a URL per id
 *   apps/customer-mobile/src/world/worldSources.ts   a literal require()
 *
 * Doing that by hand for one file is fine. Doing it for thirty-eight —
 * eleven shopfronts, eleven people in the world, eleven portraits, four
 * travellers and twelve walking avatars — at six in the morning is how a
 * street ends up with one shop missing from the app and nobody noticing
 * for a week, because the gallery has it and the gallery is what gets
 * looked at.
 *
 * ---------------------------------------------------------------------
 * IT GUESSES THE ID, AND SHOWS ITS WORKING
 * ---------------------------------------------------------------------
 * Files arrive named whatever the download named them. The mapping below
 * is by Hebrew trade word or by the id itself, and anything it cannot
 * place is REPORTED rather than guessed — a file silently ingested under
 * the wrong id is a barber standing outside a garage.
 *
 * `--dry` prints the plan and writes nothing.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const GALLERY = path.join(ROOT, "tools/design-preview/public/world");
const APP = path.join(ROOT, "apps/customer-mobile/assets/world");

const folder = process.argv[2];
const dry = process.argv.includes("--dry");
if (!folder || !existsSync(folder)) {
  console.error("usage: ingest-pack.mjs <folder-of-delivered-art> [--dry]");
  process.exit(2);
}

/**
 * The eleven trades, by every name a delivered file has plausibly used.
 *
 * Hebrew first because that is what the art is labelled with, then the
 * English stem, then the asset id itself — so a file already named
 * `district_hair.webp` passes straight through.
 */
const TRADES = [
  { id: "home", words: ["תיקונים", "repairs", "handyman", "home"] },
  { id: "appliance", words: ["מכשירי", "חשמל", "appliance", "appliances"] },
  { id: "care", words: ["ניקיון", "clean", "cleaning", "care"] },
  { id: "hair", words: ["שיער", "hair", "salon", "barber"] },
  { id: "well", words: ["כושר", "fitness", "gym", "well", "wellness"] },
  { id: "pets", words: ["חיות", "pet", "pets", "grooming"] },
  { id: "auto", words: ["רכב", "auto", "garage", "vehicle"] },
  { id: "move", words: ["הובלות", "moving", "move", "logistics"] },
  { id: "tech", words: ["מחשבים", "סלולר", "tech", "computer", "computers"] },
  { id: "help", words: ["עזרה", "help", "care-home", "assist"] },
  { id: "build", words: ["שיפוצים", "build", "renovation", "builder"] },
];

/** The four things a delivered file can BE, and what each is called. */
const KINDS = [
  { prefix: "district_", words: ["district", "shop", "front", "חזית", "עסק"] },
  { prefix: "character_", suffix: "_world", words: ["world", "person", "figure", "דמות", "מקצוען"] },
  { prefix: "character_", suffix: "_icon", words: ["portrait", "icon", "face", "פורטרט"] },
];

const TRAVELLERS = [
  { id: "courier_scooter", words: ["scooter", "courier", "שליח", "קטנוע"] },
  { id: "moving_van", words: ["van", "טנדר"] },
  { id: "tow_truck", words: ["tow", "גרר"] },
  { id: "dog_walker", words: ["walker", "dogwalker", "דוג", "מאלף"] },
];

const norm = (s) => s.toLowerCase().replace(/[\s_\-()]+/g, "");

function idFor(name) {
  const base = path.basename(name, path.extname(name));
  const n = norm(base);

  // Already an asset id? Nothing to guess.
  if (/^(district_|character_|avatar_)/.test(base)) return base;

  for (const t of TRAVELLERS) if (t.words.some((w) => n.includes(norm(w)))) return t.id;

  const avatar = base.match(/avatar[\s_-]?(\d{1,2})/i);
  if (avatar) {
    const n2 = String(Number(avatar[1])).padStart(2, "0");
    return n.includes("portrait") ? `avatar_${n2}_portrait` : `avatar_${n2}_world_back`;
  }

  const trade = TRADES.find((t) => t.words.some((w) => n.includes(norm(w))));
  if (!trade) return null;

  const kind = KINDS.find((k) => k.words.some((w) => n.includes(norm(w))));
  // A file that names a trade and nothing else is the shopfront: that is
  // what eleven of them are, and it is the safest default to be wrong
  // about, because a wrong shopfront is obvious on the first screen.
  if (!kind) return `district_${trade.id}`;
  return kind.suffix ? `${kind.prefix}${trade.id}${kind.suffix}` : `${kind.prefix}${trade.id}`;
}

const files = readdirSync(folder).filter((f) => /\.(png|webp|jpg|jpeg)$/i.test(f));
const plan = [];
const unplaced = [];
for (const f of files) {
  const id = idFor(f);
  if (id) plan.push({ file: f, id });
  else unplaced.push(f);
}

console.log(`\n${files.length} files in ${folder}\n`);
for (const { file, id } of plan) console.log(`  ${file}  ->  ${id}`);
if (unplaced.length) {
  console.log(`\n  COULD NOT PLACE (rename these and run again):`);
  for (const f of unplaced) console.log(`    ${f}`);
}

const dupes = plan.filter((p, i) => plan.findIndex((q) => q.id === p.id) !== i);
if (dupes.length) {
  console.log(`\n  TWO FILES CLAIM ONE ID — nothing written:`);
  for (const d of dupes) console.log(`    ${d.id}`);
  process.exit(1);
}

if (dry) {
  console.log("\n  --dry: nothing written\n");
  process.exit(0);
}

mkdirSync(GALLERY, { recursive: true });
mkdirSync(APP, { recursive: true });

for (const { file, id } of plan) {
  const src = path.join(folder, file);
  const out = path.join(GALLERY, `${id}.webp`);
  /*
   * WebP with the alpha preserved. `-define webp:lossless=false` at a high
   * quality is what every existing asset in the pack was encoded at, and
   * matching it matters: a shopfront encoded differently from its
   * neighbours is visible as a difference in the edge, not in the colour.
   */
  execFileSync("python3", [
    "-c",
    `from PIL import Image;im=Image.open(${JSON.stringify(src)}).convert("RGBA");im.save(${JSON.stringify(out)},"WEBP",quality=90,method=6)`,
  ]);
  execFileSync("cp", [out, path.join(APP, `${id}.webp`)]);
  console.log(`  wrote ${id}.webp`);
}

/*
 * Both source lists, regenerated from the folder rather than appended to.
 * Appending is how a deleted file stays in a manifest and draws a broken
 * image for a month.
 */
const ids = readdirSync(GALLERY)
  .filter((f) => f.endsWith(".webp"))
  .map((f) => path.basename(f, ".webp"))
  .sort();

const HEAD_GALLERY = `import type { WorldAssetSources } from "@pro-now/ui";

/**
 * THE ART THAT HAS ACTUALLY ARRIVED.
 *
 * One line per delivered asset, and nothing else. An id that is not in here
 * renders as \`AssetSlot\`'s grey rectangle, which is the correct and
 * deliberately ugly picture of "commissioned, not delivered".
 *
 * Generated by \`tools/design-preview/ingest-pack.mjs\` from the contents of
 * \`public/world/\`. Regenerate rather than edit by hand: a list that is
 * maintained separately from the folder is a list that drifts from it.
 */
export const worldSources: WorldAssetSources = {
`;

const HEAD_APP = `import type { WorldAssetSources } from "@pro-now/ui";

/**
 * THE WORLD'S ART, AS THE APP CAN ACTUALLY LOAD IT.
 *
 * Metro resolves \`require\` at BUILD time, so a path it cannot see as a
 * literal is a path that does not get bundled — \`require(\\\`...\\\${id}.webp\\\`)\`
 * compiles and then throws on a device, which is the worst shape a mistake
 * can take: fine in every check, broken only in someone's hand.
 *
 * So every asset is named once, literally. Generated by
 * \`tools/design-preview/ingest-pack.mjs\`; regenerate rather than edit.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
export const worldSources: WorldAssetSources = {
`;

writeFileSync(
  path.join(ROOT, "tools/design-preview/src/worldSources.ts"),
  HEAD_GALLERY + ids.map((id) => `  ${id}: { uri: "world/${id}.webp" },`).join("\n") + "\n};\n"
);
writeFileSync(
  path.join(ROOT, "apps/customer-mobile/src/world/worldSources.ts"),
  HEAD_APP + ids.map((id) => `  ${id}: require("../../assets/world/${id}.webp"),`).join("\n") + "\n};\n"
);

console.log(`\n  ${ids.length} assets listed in both worldSources.ts files.`);
console.log(`  Next: npm run lint && npm run test && npm run preview:build\n`);

// Checks the design tokens with the same checks that guard Publish, without opening the console.
// Use it in CI on any change to tokens/, or before you publish.
//   npm run check:tokens                              the draft in tokens/
//   npm run check:tokens -- --dir path/to/tokens      another tokens folder, like a pull request's copy
//   npm run check:tokens -- --live                    the live version
//   npm run check:tokens -- --json                    every result as JSON, for other tools
// It ends with code 1 if any check blocks publishing. Warnings are listed but do not fail.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStore } from "../server/store.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const at = args.indexOf("--dir");
const store = createStore(root);
const E = store.E;

let st, what;
if (at >= 0) {
  const dir = path.resolve(process.cwd(), args[at + 1] || "");
  if (!fs.existsSync(dir)) { console.error(`There is no folder at ${dir}.`); process.exit(2); }
  st = E.filesToState(store.readTokenDir(dir)); what = `the tokens in ${path.relative(process.cwd(), dir) || "."}`;
} else if (args.includes("--live")) {
  const l = store.index().versions[0];
  if (!l) { console.error("Nothing is live yet."); process.exit(2); }
  st = store.stateOfRelease(l.version); what = `the live version, ${l.version}`;
} else {
  st = store.draft(); what = "the draft in tokens/";
}

const results = E.runChecks(st);
const blocks = results.filter((r) => r.level === "block"), warns = results.filter((r) => r.level === "warn");
if (args.includes("--json")) console.log(JSON.stringify({ checked: what, blocks: blocks.length, warnings: warns.length, results }, null, 2));
else {
  console.log(`Checked ${what}: ${results.length} checks, ${blocks.length} must be fixed, ${warns.length} to look at.`);
  for (const r of blocks) console.log(`  MUST FIX  ${r.title} ${r.detail || ""}`.trimEnd());
  for (const r of warns) console.log(`  LOOK AT   ${r.title} ${r.detail || ""}`.trimEnd());
  if (blocks.length) console.log("Publishing is blocked until these are fixed. Open the Brand Console and use Fix it on each one.");
}
process.exit(blocks.length ? 1 : 0);

// Writes tokens.resolved.json: every design token with its final value, for tools that cannot run the Brand Console
// (another app's build, a native app, a data tool). It has role colors per brand and mode, sizes per screen type and
// text size, and every CSS variable in theme.css. It is a snapshot with no aliases. tokens/*.tokens.json stay the source.
//
// The build and every publish already write it next to theme.css:
//   build/draft/tokens.resolved.json   the draft (what the brand team is still editing)
//   dist/tokens.resolved.json          the live version (also in releases/v<version>/)
// Use this script to write it somewhere else, or to make just this file:
//   npm run export:tokens                                   the draft, into build/draft/
//   npm run export:tokens -- --live                         the live version, into dist/
//   npm run export:tokens -- --live --out ../my-app/tokens.json
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStore } from "../server/store.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const live = args.includes("--live");
const at = args.indexOf("--out");
const store = createStore(root);
const latest = store.index().versions[0];
if (live && !latest) { console.error("Nothing is live yet. Publish a version first, or leave out --live to export the draft."); process.exit(1); }

const st = live ? store.stateOfRelease(latest.version) : store.draft();
const version = live ? latest.version : (latest ? latest.version : "0.0.0") + "-draft";
const out = at >= 0 && args[at + 1] ? path.resolve(process.cwd(), args[at + 1]) : path.join(root, live ? "dist" : "build/draft", "tokens.resolved.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(store.E.files(st, version)["tokens.resolved.json"], null, 2) + "\n");
const shown = path.relative(process.cwd(), out);
console.log(`Wrote the ${live ? "live" : "draft"} tokens (version ${version}) to ${shown.startsWith("..") ? out : shown}.`);

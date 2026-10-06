// Gathers the static files the Worker serves into .worker-assets/:
//   /             the console (console/)
//   /storybook/   Storybook with the Guide pages, built from the draft
// Usage: node scripts/build-worker-assets.mjs                 the console and Storybook
//        node scripts/build-worker-assets.mjs --no-storybook  only the console, for a quick wrangler dev
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, ".worker-assets");
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.join(root, "console"), out, { recursive: true });
if (!process.argv.includes("--no-storybook")) {
  execFileSync(process.execPath, [path.join(root, "scripts/build.mjs")], { cwd: root, stdio: "inherit" });
  execFileSync(path.join(root, "node_modules/.bin/storybook"), ["build", "-o", path.join(out, "storybook"), "--quiet"], { cwd: root, stdio: "inherit" });
}
const count = fs.readdirSync(out, { recursive: true }).filter((f) => fs.statSync(path.join(out, f)).isFile()).length;
console.log(`Wrote ${count} files to .worker-assets/${process.argv.includes("--no-storybook") ? " (no Storybook)" : ""}.`);

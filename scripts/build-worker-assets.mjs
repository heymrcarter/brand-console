// Gathers the static files the Worker serves into .worker-assets/:
//   /             the console (console/), with the engine bundled into engine-globals.js
//   /storybook/   the built Storybook, from the @heymrcarter/design-system-storybook package
// The engine comes from @heymrcarter/design-system/engine. A browser cannot import a package by name, so
// engine-globals.js is bundled into one plain script with Vite, the same way the prototype build does it.
// Usage: node scripts/build-worker-assets.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, ".worker-assets");
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.join(root, "console"), out, { recursive: true });

const bundled = await build({
  configFile: false, logLevel: "warn", publicDir: false,
  build: { write: false, minify: false, lib: { entry: path.join(root, "console", "engine-globals.js"), formats: ["iife"], name: "brandConsoleEngine" } },
});
fs.writeFileSync(path.join(out, "engine-globals.js"), [bundled].flat()[0].output[0].code);

const storybookPackage = path.dirname(createRequire(import.meta.url).resolve("@heymrcarter/design-system-storybook/package.json"));
fs.cpSync(path.join(storybookPackage, "storybook"), path.join(out, "storybook"), { recursive: true });

const count = fs.readdirSync(out, { recursive: true }).filter((f) => fs.statSync(path.join(out, f)).isFile()).length;
console.log(`Wrote ${count} files to .worker-assets/.`);

// src/index.d.ts is written by hand. This test makes sure it lists every export in src/index.js, and nothing extra.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("index.d.ts describes every export in index.js", () => {
  const js = new Set([...read("src/index.js").matchAll(/export \{([^}]+)\}/g)].flatMap((m) => m[1].split(",").map((s) => s.trim()).filter(Boolean)));
  const dts = new Set([...read("src/index.d.ts").matchAll(/^export declare (?:const|function) ([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]));
  assert.ok(js.size > 80, "found the exports in index.js");
  assert.deepEqual([...js].filter((n) => !dts.has(n)), [], "exports with no type in src/index.d.ts");
  assert.deepEqual([...dts].filter((n) => !js.has(n)), [], "types in src/index.d.ts with no export");
});

test("package.json points TypeScript at index.d.ts", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.exports["."].types, "./src/index.d.ts");
  assert.equal(pkg.exports["."].default, "./src/index.js");
  assert.ok(pkg.files.includes("src"));
});

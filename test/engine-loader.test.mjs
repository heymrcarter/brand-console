// The engine loader (server/engine.mjs) hands the design system's engine to the server code. These tests make sure
// nothing the server, the scripts, or the tests use goes missing, and that it hands back copies.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEngine } from "../server/engine.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const E = loadEngine(root);

test("every engine name that Node code uses is found", () => {
  const used = new Set();
  for (const dir of ["server", "scripts", "test"]) {
    for (const f of fs.readdirSync(path.join(root, dir)).filter((x) => x.endsWith(".mjs"))) {
      for (const m of fs.readFileSync(path.join(root, dir, f), "utf8").matchAll(/\bE\.([A-Za-z_$][\w$]*)/g)) used.add(m[1]);
    }
  }
  assert.ok(used.size > 20);
  assert.deepEqual([...used].filter((n) => !(n in E)), []);
});

test("it hands back Node objects and leaves out JavaScript's own names", () => {
  assert.ok(Array.isArray(E.BRANDS) && E.BASE instanceof Object);
  assert.ok(E.runChecks(E.withDefaults(E.BASE)) instanceof Array);
  assert.equal(typeof E.nextVer("1.4.0", "major"), "string");
  for (const n of ["Math", "JSON", "Object", "Array", "undefined", "NaN", "toString", "constructor", "hasOwnProperty"]) assert.ok(!Object.hasOwn(E, n), `${n} is not part of the engine`);
});

// The engine files are ES modules. A Worker or a script may import any one of them first, with no web page around it.
// Each must load on its own, without touching the page, and still give the full base system.

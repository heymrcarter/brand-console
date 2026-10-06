// The engine loader finds the console's names on its own. These tests make sure nothing Node needs goes missing,
// and that npm run check:tokens fails a CI run when a check blocks publishing.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
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

function tokensDir(change) {
  const st = E.withDefaults(E.BASE);
  change(st);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dsc-check-"));
  for (const [k, v] of Object.entries(E.stateToFiles(st))) {
    const f = path.join(dir, k.replace(/^tokens\//, ""));
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(v, null, 2));
  }
  return dir;
}
const check = (dir) => spawnSync(process.execPath, [path.join(root, "scripts/check-tokens.mjs"), "--dir", dir], { cwd: root, encoding: "utf8" });

test("check:tokens passes good tokens and fails ones that block publishing", () => {
  const good = tokensDir(() => {});
  const ok = check(good);
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /0 must be fixed/);

  const bad = tokensDir((st) => { st.brands.northfield.primary = "#88BC40"; st.brands.northfield.onPrimary = "white"; });
  const no = check(bad);
  assert.equal(no.status, 1, no.stdout + no.stderr);
  assert.match(no.stdout, /MUST FIX\s+Northfield: button words are too hard to read/);
  for (const d of [good, bad]) fs.rmSync(d, { recursive: true, force: true });
});

// The engine files are ES modules. A Worker or a script may import any one of them first, with no web page around it.
// Each must load on its own, without touching the page, and still give the full base system.
test("each engine module loads first on its own, without a web page", () => {
  for (const f of ["basics.js", "icons.js", "registry.js", "engine.js", "figma.js"]) {
    const code = `for (const k of ["window", "document", "navigator", "localStorage"]) Object.defineProperty(globalThis, k, { get() { throw new Error("touched " + k + " while loading"); } });
await import(${JSON.stringify(path.join(root, "console", f))});
const { BASE, REG_ORDER } = await import(${JSON.stringify(path.join(root, "console", "registry.js"))}).then(async (r) => ({ ...(await import(${JSON.stringify(path.join(root, "console", "engine.js"))})), REG_ORDER: r.REG_ORDER }));
if (REG_ORDER.some((id) => !BASE.comp[id])) throw new Error("some components have no defaults in BASE");`;
    const r = spawnSync(process.execPath, ["--input-type=module", "-e", code], { encoding: "utf8" });
    assert.equal(r.status, 0, `${f} first: ${r.stderr}`);
  }
});

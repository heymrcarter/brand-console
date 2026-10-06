// tokens.resolved.json must say exactly what theme.css says, for every brand, mode, screen type, and text size.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadEngine } from "../server/engine.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const E = loadEngine(root);
const st = E.withDefaults(E.clone(E.BASE));
const f = E.files(st, "9.9.9");
const json = f["tokens.resolved.json"];
const ext = json.$extensions["org.brand-console"];

// Reads one block of theme.css, like [data-brand="northfield"] { --primary: #...; }.
function block(css, selectorStart) {
  const i = css.split("\n").findIndex((l) => l.startsWith(selectorStart) && l.endsWith("{"));
  assert.ok(i >= 0, `theme.css has a block for ${selectorStart}`);
  const out = {};
  for (const l of css.split("\n").slice(i + 1)) { if (l === "}") break; const m = /^\s+(--[\w-]+): (.*);$/.exec(l); if (m) out[m[1]] = m[2]; }
  return out;
}

test("the build writes tokens.resolved.json next to theme.css", () => {
  assert.ok(json && typeof json === "object");
  assert.equal(ext.version, "9.9.9");
  assert.equal(ext.aliases, false);
  assert.match(json.$description, /snapshot/);
});

test("colors and CSS variables match theme.css for every brand and mode", () => {
  const css = f["theme.css"];
  for (const B of E.BRANDS) {
    const light = block(css, `${B.id === E.BRANDS[0].id ? ":root, " : ""}[data-brand="${B.id}"]`);
    const dark = block(css, `[data-mode="dark"][data-brand="${B.id}"]`);
    assert.deepEqual(ext.css.brand[B.id].light, light, `${B.id} light`);
    assert.deepEqual(ext.css.brand[B.id].dark, dark, `${B.id} dark`);
    for (const [mode, vars] of [["light", light], ["dark", dark]]) {
      const roles = json.color[B.id][mode];
      assert.ok(Object.keys(roles).length > 20, `${B.id} ${mode} has role colors`);
      for (const [name, t] of Object.entries(roles)) assert.equal(t.$value.hex, vars["--" + name].toLowerCase(), `${B.id} ${mode} ${name}`);
      assert.equal(roles.primary.$value.hex, vars["--primary"].toLowerCase());
    }
  }
  assert.deepEqual(ext.css.shared, block(css, ":root {"));
});

test("sizes match theme.css for every screen type and text size", () => {
  const css = f["theme.css"];
  for (const c of ["consumer", "employee"]) for (const z of ["standard", "large"]) {
    const vars = block(css, `${c === "consumer" && z === "large" ? ":root, " : ""}[data-screen="${c}"][data-size="${z}"]`);
    assert.deepEqual(ext.css.size[c][z], vars);
    for (const [name, t] of Object.entries(json.size[c][z])) assert.equal(`${t.$value.value}${t.$value.unit}`, vars["--" + name], `${c} ${z} ${name}`);
  }
});

test("npm run export:tokens writes the file where it is asked to", () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "dsc-tok-")), "tokens.json");
  execFileSync(process.execPath, [path.join(root, "scripts/export-tokens.mjs"), "--out", out], { cwd: root, stdio: "ignore" });
  const written = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.match(written.$extensions["org.brand-console"].version, /-draft$/);
  assert.ok(written.color.northfield.light.primary.$value.hex.startsWith("#"));
  fs.rmSync(path.dirname(out), { recursive: true, force: true });
});

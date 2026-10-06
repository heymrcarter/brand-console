// Run with:  npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEngine } from "../server/engine.mjs";
import { createStore } from "../server/store.mjs";
import { createDiskStorage } from "../server/storage/disk.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const E = loadEngine(root);

test("token files round-trip without losing anything", () => {
  const st = E.withDefaults(E.BASE);
  st.brands.crestline.palette = E.PALETTES.crestline;
  const back = E.filesToState(E.stateToFiles(st));
  assert.deepEqual(E.diff(st, back), []);
});

test("token files follow the W3C format", () => {
  const f = E.stateToFiles(E.withDefaults(E.BASE));
  const brand = f["tokens/brands/northfield.tokens.json"];
  assert.equal(brand.color.$type, "color");
  assert.equal(brand.color.brand.primary.$value.colorSpace, "srgb");
  assert.equal(f["tokens/design-system.resolver.json"].version, "2025.10");
});

test("a light button color with white words is blocked", () => {
  const st = E.withDefaults(E.BASE);
  st.brands.northfield.primary = "#88BC40"; st.brands.northfield.onPrimary = "white";
  const block = E.runChecks(st).filter((x) => x.level === "block").map((x) => x.id);
  assert.ok(block.includes("btn-northfield"));
  st.brands.northfield.onPrimary = "dark";
  assert.ok(!E.runChecks(st).some((x) => x.id === "btn-northfield" && x.level === "block"));
});

test("theme.css has every brand, both modes, and every screen size", () => {
  const css = E.themeCss(E.withDefaults(E.BASE), "9.9.9");
  for (const s of ['[data-brand="northfield"]', '[data-brand="crestline"]', '[data-mode="dark"]', '[data-screen="employee"][data-size="standard"]', "@theme inline", "--btn-bg"]) assert.ok(css.includes(s), s);
});

test("publish, block, fix, publish, roll back, and flag all work on disk", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dsc-"));
  fs.cpSync(path.join(root, "console"), path.join(tmp, "console"), { recursive: true });
  const store = createStore(createDiskStorage(tmp));
  const base = E.withDefaults(E.BASE);
  await store.release(base, "1.0.0", { note: "First version." });
  await store.saveDraft(base);
  await assert.rejects(store.publish({ note: "x" }), /no changes/);

  const d = await store.draft(); d.brands.northfield.primary = "#88BC40"; d.brands.northfield.onPrimary = "white";
  await store.saveDraft(d);
  await assert.rejects(store.publish({ note: "x" }), /must be fixed/);

  const d2 = await store.draft(); d2.brands.northfield.onPrimary = "dark"; await store.saveDraft(d2);
  assert.equal(await store.publish({ note: "New green.", who: "Test" }), "1.1.0");
  assert.equal((await store.published()).brands.northfield.primary, "#88BC40");
  assert.ok(fs.readFileSync(path.join(tmp, "dist/theme.css"), "utf8").includes("1.1.0"));

  const d3 = await store.draft(); d3.type.body = "Lexend"; await store.saveDraft(d3);
  assert.equal(await store.rollback({ version: "1.0.0", who: "Test" }), "1.2.0");
  assert.equal((await store.published()).brands.northfield.primary, base.brands.northfield.primary);
  assert.equal((await store.draft()).type.body, "Lexend", "unpublished changes stay in the draft");

  assert.equal(await store.flag("1.1.0"), true);
  assert.ok(fs.readFileSync(path.join(tmp, "CHANGELOG.md"), "utf8").includes("## 1.2.0"));
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("version bumps: patch, minor, and major", () => {
  assert.equal(E.nextVer("1.4.0", "patch"), "1.4.1");
  assert.equal(E.nextVer("1.4.0", "minor"), "1.5.0");
  assert.equal(E.nextVer("1.4.0", "major"), "2.0.0");
  assert.equal(E.nextVer("1.4.3"), "1.5.0", "no bump means minor, like before");
  assert.equal(E.nextVer("1.4.3", "patch"), "1.4.4");
});

test("the suggested bump follows the CSS variables apps use", () => {
  const base = E.withDefaults(E.clone(E.BASE));
  const tweak = E.clone(base); tweak.shape.radius = 10;
  assert.equal(E.bumpFor(base, tweak).bump, "patch");
  const withSet = E.clone(base); withSet.brands.northfield.palette = { groups: [{ id: "a", name: "A", note: "", colors: [{ name: "Sunrise", hex: "#F27333", share: 2 }] }] };
  assert.equal(E.bumpFor(base, withSet).bump, "minor");
  const r = E.bumpFor(withSet, base);
  assert.equal(r.bump, "major"); assert.ok(r.removed.includes("--brand-sunrise"));
});

test("publish takes a bump, and refuses one it does not know", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dsc-"));
  fs.cpSync(path.join(root, "console"), path.join(tmp, "console"), { recursive: true });
  const store = createStore(createDiskStorage(tmp));
  const base = E.withDefaults(E.BASE);
  await store.release(base, "1.4.0", { note: "Start." });
  await store.saveDraft(base);
  const edit = async (f) => { const d = await store.draft(); f(d); await store.saveDraft(d); };
  await edit((d) => { d.shape.radius = 10; });
  assert.equal(await store.publish({ note: "Softer corners.", bump: "patch" }), "1.4.1");
  assert.ok(fs.existsSync(path.join(tmp, "releases/v1.4.1/theme.css")));
  await edit((d) => { d.shape.radius = 12; });
  await assert.rejects(store.publish({ note: "x", bump: "huge" }), /patch", "minor", or "major/);
  assert.equal(await store.publish({ note: "Rounder.", bump: "minor" }), "1.5.0");
  await edit((d) => { d.shape.radius = 6; });
  assert.equal(await store.publish({ note: "New look.", bump: "major" }), "2.0.0");
  assert.equal(await store.rollback({ version: "1.4.1", who: "Test" }), "2.1.0", "a rollback is a minor version");
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("publishing makes a Git commit when the project uses Git, even with no fonts folder", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dsc-git-"));
  const git = (...a) => execFileSync("git", a, { cwd: tmp, encoding: "utf8" });
  git("init", "-q"); git("config", "user.name", "Test"); git("config", "user.email", "test@example.com");
  git("commit", "-q", "--allow-empty", "-m", "Start");
  const store = createStore(createDiskStorage(tmp));
  await store.release(E.withDefaults(E.BASE), "1.0.0", { note: "First version." });
  assert.ok(!fs.existsSync(path.join(tmp, "fonts")), "this project has no uploaded fonts");
  assert.match(git("log", "--format=%s"), /Publish design system v1\.0\.0/);
  assert.equal(git("status", "--porcelain", "tokens", "releases", "dist", "CHANGELOG.md"), "", "everything the publish wrote is committed");
  fs.rmSync(tmp, { recursive: true, force: true });
});

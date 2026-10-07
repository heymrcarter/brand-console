// The store: publishing, blocking, fixing, rolling back, flagging, bumps, and the Git commit. Run with:  npm test
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

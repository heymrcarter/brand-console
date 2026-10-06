// The storage interface (server/storage/storage.mjs): the same checks run on every storage.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDiskStorage, createEnvSecrets } from "../server/storage/disk.mjs";
import { createMemoryStorage, createMemorySecrets } from "../server/storage/memory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "dsc-storage-"));

const storages = {
  disk: () => { const dir = tmpDir(); return { storage: createDiskStorage(dir), done: () => fs.rmSync(dir, { recursive: true, force: true }) }; },
  memory: () => ({ storage: createMemoryStorage(), done: () => {} }),
};

for (const [name, make] of Object.entries(storages)) {
  test(`${name} storage: reads what it wrote, as text or bytes`, async () => {
    const { storage: s, done } = make();
    assert.equal(await s.read("tokens/a.json"), null);
    assert.equal(await s.readBytes("tokens/a.json"), null);
    await s.write("tokens/a.json", '{"a":1}\n');
    assert.equal(await s.read("tokens/a.json"), '{"a":1}\n');
    const bytes = Uint8Array.from([0, 1, 2, 250, 255, 10, 13]);
    await s.write("fonts/x.woff2", bytes);
    assert.deepEqual(await s.readBytes("fonts/x.woff2"), bytes);
    await s.write("tokens/a.json", "changed");
    assert.equal(await s.read("tokens/a.json"), "changed");
    await assert.rejects(s.write("tokens/b.json", { not: "text" }), /text or a Uint8Array/);
    done();
  });

  test(`${name} storage: lists files under a folder, sorted, and removes them`, async () => {
    const { storage: s, done } = make();
    for (const p of ["tokens/brands/b.json", "tokens/a.json", "tokens-old/c.json", "releases/index.json", "CHANGELOG.md"]) await s.write(p, "x");
    assert.deepEqual(await s.list("tokens"), ["tokens/a.json", "tokens/brands/b.json"]);
    assert.deepEqual(await s.list("tokens/"), ["tokens/a.json", "tokens/brands/b.json"]);
    assert.deepEqual(await s.list("tokens/brands"), ["tokens/brands/b.json"]);
    assert.deepEqual(await s.list("nothing-here"), []);
    assert.deepEqual(await s.list(""), ["CHANGELOG.md", "releases/index.json", "tokens-old/c.json", "tokens/a.json", "tokens/brands/b.json"]);
    await s.remove("tokens/a.json");
    await s.remove("tokens/never-was.json");
    assert.deepEqual(await s.list("tokens"), ["tokens/brands/b.json"]);
    done();
  });

  test(`${name} storage: refuses paths that could reach outside it`, async () => {
    const { storage: s, done } = make();
    for (const bad of ["../x.json", "tokens/../../x.json", "/etc/passwd", "tokens//a.json", "./a.json", "tokens\\a.json", "", "a\0b"]) {
      await assert.rejects(s.write(bad, "x"), /not a valid storage path/, `write ${JSON.stringify(bad)}`);
      await assert.rejects(s.read(bad), /not a valid storage path/, `read ${JSON.stringify(bad)}`);
    }
    await assert.rejects(s.list("../"), /not a valid storage path/);
    done();
  });

  test(`${name} storage: commit never fails when there is no history to write to`, async () => {
    const { storage: s, done } = make();
    await s.write("tokens/a.json", "x");
    await s.commit("Publish design system v1.0.0: test");
    done();
  });
}

test("memory storage records each commit with the files it changed", async () => {
  const s = createMemoryStorage({ "tokens/a.json": "1" });
  await s.write("tokens/a.json", "2"); await s.write("dist/theme.css", "x");
  await s.commit("first");
  await s.remove("dist/theme.css");
  await s.commit("second");
  assert.deepEqual(s.commits, [{ message: "first", files: ["dist/theme.css", "tokens/a.json"] }, { message: "second", files: ["dist/theme.css"] }]);
});

test("secrets: .env on this computer, with the environment as a fallback, and in memory for tests", async () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, ".env"), "PORT=5173\nFIGMA_TOKEN = 'from-file'\n");
  const env = createEnvSecrets(dir, { FIGMA_TOKEN: "from-env", OTHER: "only-env" });
  assert.equal(await env.get("FIGMA_TOKEN"), "from-file");
  assert.equal(await env.get("OTHER"), "only-env");
  await env.set("FIGMA_TOKEN", "new");
  assert.equal(fs.readFileSync(path.join(dir, ".env"), "utf8"), "PORT=5173\nFIGMA_TOKEN=new\n");
  await env.set("FIGMA_TOKEN", "");
  assert.equal(fs.readFileSync(path.join(dir, ".env"), "utf8"), "PORT=5173\n");
  assert.equal(await env.get("FIGMA_TOKEN"), "from-env");
  if (process.platform !== "win32") assert.equal(fs.statSync(path.join(dir, ".env")).mode & 0o777, 0o600);
  await assert.rejects(env.get("FIGMA_TOKEN.*"), /not a valid secret name/);
  fs.rmSync(dir, { recursive: true, force: true });

  const mem = createMemorySecrets({ FIGMA_TOKEN: "t" });
  assert.equal(await mem.get("FIGMA_TOKEN"), "t");
  await mem.set("FIGMA_TOKEN", "");
  assert.equal(await mem.get("FIGMA_TOKEN"), "");
});

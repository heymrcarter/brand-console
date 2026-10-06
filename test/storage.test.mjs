// The storage interface (server/storage/storage.mjs): the same checks run on every storage, and the store and the
// Figma sync use nothing else, so they can run in a Cloudflare Worker with another storage.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDiskStorage, createEnvSecrets } from "../server/storage/disk.mjs";
import { createMemoryStorage, createMemorySecrets } from "../server/storage/memory.mjs";
import { createGitHubStorage } from "../server/storage/github.mjs";
import { createGitHubMock } from "./github-mock.mjs";
import { createStore } from "../server/store.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "dsc-storage-"));

const storages = {
  disk: () => { const dir = tmpDir(); return { storage: createDiskStorage(dir), done: () => fs.rmSync(dir, { recursive: true, force: true }) }; },
  memory: () => ({ storage: createMemoryStorage(), done: () => {} }),
  github: () => { const gh = createGitHubMock(); return { storage: createGitHubStorage({ repo: "acme/design-system", token: "test-token", pending: createMemoryStorage(), fetch: gh.fetch }), done: () => {} }; },
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

// The project's tokens and releases, copied into memory.
async function projectInMemory() {
  const disk = createDiskStorage(root), files = {};
  for (const p of [...(await disk.list("tokens")), ...(await disk.list("releases"))]) files[p] = await disk.read(p);
  return createMemoryStorage(files);
}

test("the store works the same in memory as on disk, and never touches the disk", async () => {
  const memory = await projectInMemory();
  const onDisk = createStore(createDiskStorage(root)), inMemory = createStore(memory);
  assert.deepEqual(await inMemory.draft(), await onDisk.draft());
  assert.deepEqual(await inMemory.published(), await onDisk.published());
  assert.deepEqual(await inMemory.index(), await onDisk.index());

  const diskIndex = fs.readFileSync(path.join(root, "releases/index.json"), "utf8");
  const live = (await inMemory.index()).versions[0].version;
  const d = await inMemory.draft(); d.shape.radius += 1;
  await inMemory.saveDraft(d);
  const v = await inMemory.publish({ note: "Rounder corners.", who: "Test", bump: "patch" });
  assert.equal(v, onDisk.E.nextVer(live, "patch"));
  assert.match(await memory.read("dist/theme.css"), new RegExp(v.replace(/\./g, "\\.")));
  assert.ok((await memory.list(`releases/v${v}`)).includes(`releases/v${v}/tokens/foundations.tokens.json`));
  assert.equal(memory.commits.length, 1, "a publish is one commit");
  assert.match(memory.commits[0].message, new RegExp(`v${v.replace(/\./g, "\\.")}: Rounder corners`));
  for (const p of ["releases/index.json", "CHANGELOG.md", "dist/theme.css", `releases/v${v}/theme.css`]) assert.ok(memory.commits[0].files.includes(p), `${p} is in the commit`);
  assert.equal(fs.readFileSync(path.join(root, "releases/index.json"), "utf8"), diskIndex, "the project folder did not change");
  assert.ok(!fs.existsSync(path.join(root, `releases/v${v}`)));
});

test("with copyEngineResults: false the store gives the same results and never changes the engine's own objects", async () => {
  const engine = await import("../console/engine.js");
  const constants = () => JSON.stringify({ BASE: engine.BASE, PALETTES: engine.PALETTES, BRANDS: engine.BRANDS, FONTS: engine.FONTS, GRAYS: engine.GRAYS });
  const before = constants();
  const run = async (copyEngineResults) => {
    const memory = await projectInMemory(), store = createStore(memory, { copyEngineResults });
    const d = await store.draft(); d.shape.radius += 3; d.brands.northfield.palette.groups[0].colors[0].name = "Renamed";
    await store.saveDraft(d);
    const v = await store.publish({ note: "Same either way.", who: "Test", bump: "minor" });
    const d2 = await store.draft(); d2.type.scale = 1.3; await store.saveDraft(d2);
    await store.rollback({ version: "1.4.0", who: "Test" });
    const out = {};
    for (const p of await memory.list("")) out[p] = (await memory.read(p)).replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, "TIME");
    return { v, out, draft: await store.draft() };
  };
  const copied = await run(true), direct = await run(false);
  assert.deepEqual(direct.draft, copied.draft);
  assert.deepEqual(Object.keys(direct.out), Object.keys(copied.out));
  for (const p of Object.keys(copied.out)) assert.equal(direct.out[p], copied.out[p], p);
  assert.equal(constants(), before, "the engine's built-in defaults are unchanged");
});

test("the store runs one call at a time, so a publish sees a save that started first", async () => {
  // Real storage takes time for each write, so a call that does not wait its turn would read old files.
  const memory = await projectInMemory();
  const store = createStore({ ...memory, write: async (p, v) => { await new Promise((ok) => setTimeout(ok, 3)); return memory.write(p, v); } });
  const d = await store.draft(); d.shape.radius += 2;
  // Neither call is awaited before the next one starts.
  const saving = store.saveDraft(d);
  const publishing = store.publish({ note: "Right after a save.", who: "Test" });
  await saving;
  assert.ok(await publishing, "the publish found the saved change instead of an unchanged draft");
  assert.equal((await store.published()).shape.radius, d.shape.radius);
  // A failed call does not stop the ones after it.
  await assert.rejects(store.publish({ note: "Nothing new." }), /no changes/);
  assert.equal((await store.draft()).shape.radius, d.shape.radius);
});

test("the store, the Figma sync, and the storage interface use no Node-only features, so a Worker can run them", () => {
  for (const f of ["server/store.mjs", "server/figma.mjs", "server/engine.mjs", "server/storage/storage.mjs", "server/storage/memory.mjs", "server/storage/github.mjs"]) {
    const code = fs.readFileSync(path.join(root, f), "utf8").replace(/\/\/.*$/gm, "");
    const imports = [...code.matchAll(/^\s*import\s[^;]*?from\s+["']([^"']+)["']/gm)].map((m) => m[1]);
    assert.deepEqual(imports.filter((i) => !i.startsWith(".")), [], `${f} imports only project files`);
    assert.ok(!/\b(process|Buffer|require|__dirname)\b/.test(code), `${f} does not use process, Buffer, require, or __dirname`);
  }
});

// GitHub storage: reads come from a branch, writes wait in a pending storage, and commit() makes one commit.
const REPO = "acme/design-system";
function github(files = {}, opts = {}) {
  const mock = createGitHubMock({ repo: REPO, files });
  const pending = opts.pending || createMemoryStorage();
  const storage = createGitHubStorage({ repo: REPO, token: "test-token", pending, fetch: opts.fetch ? opts.fetch(mock) : mock.fetch, ...opts.options });
  return { mock, pending, storage };
}
const writesOf = (calls, what) => calls.filter((c) => c === what).length;

test("github storage: one commit holds every pending change, with text inline and only binary files uploaded", async () => {
  const { mock, pending, storage } = github({ "tokens/a.json": "old", "dist/old.css": "gone soon", "keep.txt": "same" });
  const font = Uint8Array.from({ length: 300 }, (_, i) => (i * 7) % 256);
  await storage.write("tokens/a.json", "new");
  await storage.write("tokens/brands/b.json", "{}\n");
  await storage.write("fonts/x.woff2", font);
  await storage.remove("dist/old.css");
  await storage.remove("never-was.txt");
  assert.equal(await storage.read("tokens/a.json"), "new", "reads see pending writes");
  assert.equal(await storage.read("dist/old.css"), null, "reads see pending deletes");
  assert.equal(mock.text("tokens/a.json"), "old", "nothing reaches GitHub before the commit");
  assert.deepEqual(await storage.waiting(), { writes: ["fonts/x.woff2", "tokens/a.json", "tokens/brands/b.json"], deletes: ["dist/old.css", "never-was.txt"] });

  mock.calls.length = 0;
  await storage.commit("Publish design system v1.0.0: test");
  assert.deepEqual(mock.log(), ["Publish design system v1.0.0: test", "Start"]);
  assert.equal(writesOf(mock.calls, "POST /repos/acme/design-system/git/blobs"), 1, "only the font is uploaded on its own");
  assert.equal(writesOf(mock.calls, "POST /repos/acme/design-system/git/trees"), 1);
  const after = mock.files();
  assert.deepEqual(Object.keys(after).sort(), ["fonts/x.woff2", "keep.txt", "tokens/a.json", "tokens/brands/b.json"]);
  assert.deepEqual(after["fonts/x.woff2"], font, "binary files arrive byte for byte");
  assert.deepEqual(await pending.list(""), [], "pending is empty after the commit");
  assert.equal(await storage.read("tokens/a.json"), "new", "and reads now come from GitHub");

  mock.calls.length = 0;
  await storage.commit("nothing to send");
  assert.deepEqual(mock.calls, [], "a commit with nothing pending makes no requests");
  assert.equal(mock.log().length, 2);
});

test("github storage: a font is uploaded once however many copies a publish makes, and never again once it is on GitHub", async () => {
  const { mock, storage } = github({ "README.md": "hi" });
  const font = Uint8Array.from({ length: 500 }, (_, i) => (i * 13) % 256);
  for (const p of ["fonts/a.woff2", "dist/fonts/a.woff2", "releases/v1.0.0/fonts/a.woff2", "build/draft/fonts/a.woff2"]) await storage.write(p, font);
  mock.calls.length = 0;
  await storage.commit("First publish with the font");
  assert.equal(writesOf(mock.calls, "POST /repos/acme/design-system/git/blobs"), 1, "four copies, one upload");
  for (const p of ["fonts/a.woff2", "dist/fonts/a.woff2", "releases/v1.0.0/fonts/a.woff2", "build/draft/fonts/a.woff2"]) assert.deepEqual(mock.files()[p], font, `${p} is the font`);
  // The next publish copies the same font into a new release folder.
  const later = createGitHubStorage({ repo: REPO, token: "test-token", pending: createMemoryStorage(), fetch: mock.fetch });
  await later.write("releases/v1.1.0/fonts/a.woff2", font);
  await later.write("dist/fonts/a.woff2", font);
  mock.calls.length = 0;
  await later.commit("Second publish");
  assert.equal(writesOf(mock.calls, "POST /repos/acme/design-system/git/blobs"), 0, "the font is already on GitHub, so nothing is uploaded");
  assert.deepEqual(mock.files()["releases/v1.1.0/fonts/a.woff2"], font);
});

test("github storage: pending changes last between requests, so a restarted Worker still commits them", async () => {
  const shared = createMemoryStorage();
  const first = github({ "tokens/a.json": "old" }, { pending: shared });
  await first.storage.write("tokens/a.json", "saved before the restart");
  const again = createGitHubStorage({ repo: REPO, token: "test-token", pending: shared, fetch: first.mock.fetch });
  assert.equal(await again.read("tokens/a.json"), "saved before the restart");
  await again.commit("Publish after a restart");
  assert.equal(first.mock.text("tokens/a.json"), "saved before the restart");
});

test("github storage: when someone pushes during a commit, it builds the commit again on top of theirs", async () => {
  let pushed = false;
  const { mock, storage } = github({ "tokens/a.json": "old", "README.md": "hi" }, {
    fetch: (m) => async (url, init) => {
      if (!pushed && init.method === "PATCH") { pushed = true; m.push({ "README.md": "their edit" }, "Their commit"); }
      return m.fetch(url, init);
    },
  });
  await storage.write("tokens/a.json", "ours");
  await storage.commit("Our publish");
  assert.deepEqual(mock.log(), ["Our publish", "Their commit", "Start"]);
  assert.equal(mock.text("README.md"), "their edit", "their change stays");
  assert.equal(mock.text("tokens/a.json"), "ours", "ours is on top");
});

test("github storage: after three clashes in a row it stops, says why, and keeps the changes for next time", async () => {
  let n = 0;
  const { mock, storage } = github({ "a.txt": "1" }, { fetch: (m) => async (url, init) => { if (init.method === "PATCH") m.push({ [`theirs-${n++}.txt`]: "x" }); return m.fetch(url, init); } });
  await storage.write("a.txt", "2");
  await assert.rejects(storage.commit("Our publish"), (e) => e.status === 409 && /three times/.test(e.message));
  assert.equal(n, 3);
  assert.equal(await storage.read("a.txt"), "2");
  assert.deepEqual((await storage.waiting()).writes, ["a.txt"]);
  assert.equal(mock.text("a.txt"), "1");
});

test("github storage: a save that lands while a commit is running is kept for the next commit", async () => {
  let storageRef;
  const { mock, storage } = github({ "tokens/a.json": "old" }, {
    fetch: (m) => async (url, init) => {
      if (init.method === "POST" && url.endsWith("/git/commits")) await storageRef.write("tokens/a.json", "saved during the commit");
      return m.fetch(url, init);
    },
  });
  storageRef = storage;
  await storage.write("tokens/a.json", "published");
  await storage.commit("Publish");
  assert.equal(mock.text("tokens/a.json"), "published");
  assert.equal(await storage.read("tokens/a.json"), "saved during the commit");
  assert.deepEqual((await storage.waiting()).writes, ["tokens/a.json"]);
});

test("github storage: reading many files checks the branch once, and a file is downloaded only once", async () => {
  let t = 0;
  const { mock, storage } = github({ "tokens/a.json": "1", "tokens/b.json": "2", "tokens/c.json": "3" }, { options: { now: () => t, headMaxAgeMs: 5000 } });
  for (const p of await storage.list("tokens")) await storage.read(p);
  const first = mock.calls.length;
  assert.equal(writesOf(mock.calls, "GET /repos/acme/design-system/git/ref/heads/main"), 1);
  for (const p of await storage.list("tokens")) await storage.read(p);
  assert.equal(mock.calls.length, first, "within headMaxAgeMs, a second read makes no requests");
  t = 6000; mock.push({ "tokens/b.json": "changed elsewhere" });
  assert.equal(await storage.read("tokens/b.json"), "changed elsewhere", "after headMaxAgeMs, it sees new commits");
  assert.equal(await storage.read("tokens/a.json"), "1");
  assert.equal(mock.calls.slice(first).filter((c) => c.includes("/git/blobs/")).length, 1, "only the changed file is downloaded again");
});

test("github storage: clear errors for a bad token, a missing repository, and its own folder", async () => {
  const mock = createGitHubMock({ repo: REPO });
  const bad = createGitHubStorage({ repo: REPO, token: "wrong", pending: createMemoryStorage(), fetch: mock.fetch });
  await assert.rejects(bad.read("a.txt"), (e) => e.status === 401 && /did not accept the token/.test(e.message));
  const missing = createGitHubStorage({ repo: "acme/nope", token: "test-token", pending: createMemoryStorage(), fetch: mock.fetch });
  await assert.rejects(missing.list(""), (e) => e.status === 404 && /could not find acme\/nope/.test(e.message));
  const noBranch = createGitHubStorage({ repo: REPO, branch: "nope", token: "test-token", pending: createMemoryStorage(), fetch: mock.fetch });
  await assert.rejects(noBranch.read("a.txt"), /its nope branch/);
  const ok = createGitHubStorage({ repo: REPO, token: async () => "test-token", pending: createMemoryStorage(), fetch: mock.fetch });
  assert.deepEqual(await ok.list(""), [], "a token can come from an async function");
  await assert.rejects(ok.write(".github-storage/deleted/x", "y"), /own use/);
  await assert.rejects(ok.list(".github-storage"), /own use/);
  assert.throws(() => createGitHubStorage({ repo: "not a repo", token: "t", pending: createMemoryStorage() }), /owner\/name/);
  assert.throws(() => createGitHubStorage({ repo: REPO, token: "t" }), /pending storage/);
});

test("the store publishes to GitHub as one commit, within a Worker's request limit", async () => {
  const disk = createDiskStorage(root), files = {};
  for (const p of [...(await disk.list("tokens")), ...(await disk.list("releases")), ...(await disk.list("dist")), ...(await disk.list("build/draft")), "CHANGELOG.md"]) files[p] = await disk.read(p);
  const { mock, storage } = github(files);
  const store = createStore(storage), onDisk = createStore(disk);

  // Loading the console from scratch: every file is read from GitHub once.
  mock.calls.length = 0;
  assert.deepEqual(await store.draft(), await onDisk.draft());
  assert.deepEqual(await store.published(), await onDisk.published());
  assert.deepEqual(await store.index(), await onDisk.index());
  const coldLoad = mock.calls.length;
  assert.ok(coldLoad < 50, `loading the console made ${coldLoad} requests`);

  const d = await store.draft(); d.shape.radius += 1;
  await store.saveDraft(d);
  assert.equal(mock.log().length, 1, "saving the draft does not commit");
  mock.calls.length = 0;
  const v = await store.publish({ note: "Rounder corners.", who: "Test", bump: "patch" });
  const publishCalls = mock.calls.length;
  assert.ok(publishCalls <= 10, `a publish made ${publishCalls} requests: ${mock.calls.join(", ")}`);
  assert.deepEqual(mock.log(), [`Publish design system v${v}: Rounder corners.`, "Start"]);
  const after = mock.files();
  for (const p of [`releases/v${v}/theme.css`, `releases/v${v}/tokens/foundations.tokens.json`, "dist/theme.css", "tokens/foundations.tokens.json", "build/draft/theme.css"]) assert.ok(after[p], `${p} is in the commit`);
  assert.match(new TextDecoder().decode(after["dist/theme.css"]), new RegExp(v.replace(/\./g, "\\.")));
  assert.match(new TextDecoder().decode(after["CHANGELOG.md"]), new RegExp(`## ${v.replace(/\./g, "\\.")}`));
  assert.equal(JSON.parse(new TextDecoder().decode(after["releases/index.json"])).versions[0].version, v);
  assert.deepEqual(await storage.waiting(), { writes: [], deletes: [] });
  // A fresh storage with nothing pending reads the same published state straight from GitHub.
  const fresh = createStore(createGitHubStorage({ repo: REPO, token: "test-token", pending: createMemoryStorage(), fetch: mock.fetch }));
  assert.deepEqual(await fresh.published(), await store.published());
  assert.deepEqual(await fresh.draft(), await store.draft());
});

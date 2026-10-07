// The storage interface (server/storage/storage.mjs): the same checks run on every storage, and the store and the
// Figma sync use nothing else, so they can run in a Cloudflare Worker with another storage.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDiskStorage } from "../server/storage/disk.mjs";
import { createMemoryStorage, createMemorySecrets, createMemoryKV } from "../server/storage/memory.mjs";
import { createGitHubStorage } from "../server/storage/github.mjs";
import { createGitHubMock } from "./github-mock.mjs";
import { createDurableStorage, createDurableSecrets } from "../worker/durable-storage.mjs";
import { fakeDurableSql } from "./helpers/durable-sql.mjs";
import { createStore } from "../server/store.mjs";
import { createProposals } from "../server/proposals.mjs";
import { createGitHubClient } from "../server/github-client.mjs";
import { sampleFiles, sampleRepo } from "./helpers/sample-repo.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "dsc-storage-"));

const storages = {
  disk: () => { const dir = tmpDir(); return { storage: createDiskStorage(dir), done: () => fs.rmSync(dir, { recursive: true, force: true }) }; },
  memory: () => ({ storage: createMemoryStorage(), done: () => {} }),
  durable: () => ({ storage: createDurableStorage(fakeDurableSql()), done: () => {} }),
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

test("secrets in memory, for tests", async () => {
  const mem = createMemorySecrets({ FIGMA_TOKEN: "t" });
  assert.equal(await mem.get("FIGMA_TOKEN"), "t");
  await mem.set("FIGMA_TOKEN", "");
  assert.equal(await mem.get("FIGMA_TOKEN"), "");
});

// The project's tokens and releases, copied into memory.
function projectInMemory() { return createMemoryStorage(sampleFiles()); }
function projectOnDisk() {
  const dir = tmpDir();
  for (const [p, v] of Object.entries(sampleFiles())) { fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true }); fs.writeFileSync(path.join(dir, p), v); }
  return { dir, storage: createDiskStorage(dir) };
}

test("the store works the same in memory as on disk, and only ever writes token files", async () => {
  const memory = projectInMemory(), { dir, storage: disk } = projectOnDisk();
  const inMemory = createStore(memory), onDisk = createStore(disk);
  assert.deepEqual(await inMemory.draft(), await onDisk.draft());
  assert.deepEqual(await inMemory.published(), await onDisk.published());
  const d = await inMemory.draft(); d.shape.radius += 1;
  await inMemory.saveDraft(d); await onDisk.saveDraft(d);
  assert.deepEqual(await inMemory.draft(), await onDisk.draft());
  assert.deepEqual(memory.commits, [], "the store never commits: changes reach GitHub through a proposal");
  assert.deepEqual(fs.readdirSync(dir).sort(), [".changeset", "package.json", "tokens"], "no built files, no releases folder");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("with copyEngineResults: false the store gives the same results and never changes the engine's own objects", async () => {
  const engine = await import("@heymrcarter/design-system/engine");
  const constants = () => JSON.stringify({ BASE: engine.BASE, FONTS: engine.FONTS, GRAYS: engine.GRAYS });
  const before = constants();
  const run = async (copyEngineResults) => {
    const memory = projectInMemory(), store = createStore(memory, { live: projectInMemory(), copyEngineResults });
    const d = await store.draft(); d.shape.radius += 3; d.brands.northfield.palette.groups[0].colors[0].name = "Renamed"; delete d.brands.crestline.palette;
    await store.saveDraft(d);
    const target = await store.published(); target.type.scale = 1.2;
    await store.restore(target);
    const out = {};
    for (const p of await memory.list("")) out[p] = await memory.read(p);
    return { out, draft: await store.draft() };
  };
  const copied = await run(true), direct = await run(false);
  assert.deepEqual(direct.draft, copied.draft);
  assert.equal(direct.draft.brands.crestline.palette, undefined);
  assert.deepEqual(Object.keys(direct.out), Object.keys(copied.out));
  for (const p of Object.keys(copied.out)) assert.equal(direct.out[p], copied.out[p], p);
  assert.equal(constants(), before, "the engine's built-in defaults are unchanged");
});

test("the store runs one call at a time, so a read sees a save that started first", async () => {
  // Real storage takes time for each write, so a call that does not wait its turn would read old files.
  const memory = projectInMemory();
  const store = createStore({ ...memory, write: async (p, v) => { await new Promise((ok) => setTimeout(ok, 3)); return memory.write(p, v); } });
  const d = await store.draft(); d.shape.radius += 2;
  // Neither call is awaited before the next one starts.
  const saving = store.saveDraft(d);
  const reading = store.draft();
  await saving;
  assert.equal((await reading).shape.radius, d.shape.radius, "the read found the saved change");
  // A failed call does not stop the ones after it.
  await assert.rejects(store.saveDraft({}), /missing parts/);
  assert.equal((await store.draft()).shape.radius, d.shape.radius);
});

test("the store, the Figma sync, and the storage interface use no Node-only features, so a Worker can run them", () => {
  for (const f of ["server/store.mjs", "server/proposals.mjs", "server/github-client.mjs", "server/figma.mjs", "server/engine.mjs", "server/storage/storage.mjs", "server/storage/memory.mjs", "server/storage/github.mjs", "server/storage/github-app.mjs", "worker/durable-storage.mjs"]) {
    const code = fs.readFileSync(path.join(root, f), "utf8").replace(/\/\/.*$/gm, "");
    const imports = [...code.matchAll(/^\s*import\s[^;]*?from\s+["']([^"']+)["']/gm)].map((m) => m[1]);
    // The engine package loads without a web page or Node, and the design system repository tests that. Its
    // package.json gives the engine's version.
    assert.deepEqual(imports.filter((i) => !i.startsWith(".") && !["@heymrcarter/design-system/engine", "@heymrcarter/design-system/package.json"].includes(i)), [], `${f} imports only project files and the engine`);
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

test("github storage: a file that has not changed is not written again, so a draft save costs few storage writes", async () => {
  const font = Uint8Array.from([1, 2, 3, 0, 255]);
  const mock = createGitHubMock({ repo: REPO, files: { "tokens/a.json": "same", "fonts/f.woff2": font } });
  const memory = createMemoryStorage(), ops = [];
  const pending = { ...memory, write: (p, v) => { ops.push("write " + p); return memory.write(p, v); }, remove: (p) => { ops.push("remove " + p); return memory.remove(p); } };
  const storage = createGitHubStorage({ repo: REPO, token: "test-token", pending, fetch: mock.fetch });
  await storage.write("tokens/a.json", "same");
  await storage.write("fonts/f.woff2", Uint8Array.from(font));
  assert.deepEqual(ops, [], "the same content as on GitHub is not written, text or binary");
  await storage.write("tokens/a.json", "changed");
  await storage.write("tokens/a.json", "changed");
  assert.deepEqual(ops, ["write tokens/a.json"], "the same content as pending is not written again, and no delete mark is cleared when there is none");
  mock.calls.length = 0;
  await storage.write("tokens/new.json", "x");
  assert.ok(!mock.calls.some((c) => c.includes("/git/blobs/")), "deciding needs no download: Git's hash of the content is compared with the branch's list");
  ops.length = 0;
  await storage.remove("tokens/a.json");
  await storage.write("tokens/a.json", "same");
  assert.deepEqual(ops, ["remove tokens/a.json", "write .github-storage/deleted/tokens/a.json", "write tokens/a.json", "remove .github-storage/deleted/tokens/a.json"], "a file deleted and written again is written, and its delete mark cleared");
  assert.equal(await storage.read("tokens/a.json"), "same");
});

test("the store's draft save writes only the files that changed", async () => {
  const mock = createGitHubMock({ repo: REPO, files: sampleFiles() });
  const memory = createMemoryStorage(); let writes = [];
  const pending = { ...memory, write: (p, v) => { writes.push(p); return memory.write(p, v); } };
  const store = createStore(createGitHubStorage({ repo: REPO, token: "test-token", pending, fetch: mock.fetch }), { copyEngineResults: false });
  const d = await store.draft();
  await store.saveDraft(d);
  assert.deepEqual(writes, [], "saving the draft as it is writes nothing");
  d.shape.radius += 1;
  await store.saveDraft(d);
  assert.deepEqual(writes, ["tokens/foundations.tokens.json"], "a one-setting change writes the one file it is in");
  writes = [];
  await store.saveDraft(d);
  assert.deepEqual(writes, [], "saving it again writes nothing");
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

test("loading the console and adding a change stay within a Worker's 50 requests to GitHub", async () => {
  const mock = sampleRepo({ repo: REPO, token: "test-token" });
  const gh = (pending) => createGitHubStorage({ repo: REPO, token: "test-token", pending, fetch: mock.fetch });
  const storage = gh(createMemoryStorage()), store = createStore(storage, { live: gh(createMemoryStorage()), copyEngineResults: false });
  const proposals = createProposals({ github: createGitHubClient({ repo: REPO, token: "test-token", fetch: mock.fetch }), store, edits: storage, kv: createMemoryKV() });
  // Loading the console from scratch: every file is read from GitHub once.
  mock.calls.length = 0;
  await Promise.all([store.draft(), store.published(), proposals.status(), proposals.releases()]);
  assert.ok(mock.calls.length < 50, `loading the console made ${mock.calls.length} requests`);
  const d = await store.draft(); d.shape.radius += 1;
  const commits = mock.log().length;
  await store.saveDraft(d);
  assert.equal(mock.log().length, commits, "saving edits makes no commit");
  for (const note of ["Rounder corners", "Rounder still"]) {
    if (note !== "Rounder corners") { const d2 = await store.draft(); d2.shape.radius += 1; await store.saveDraft(d2); }
    mock.calls.length = 0;
    await proposals.add({ note, who: { email: "maya@example.com" } });
    assert.ok(mock.calls.length <= 25, `"${note}" made ${mock.calls.length} requests: ${mock.calls.join(", ")}`);
  }
  mock.calls.length = 0;
  await Promise.all([store.draft(), store.published(), proposals.status(), proposals.releases()]);
  assert.ok(mock.calls.length < 50, `loading the console with a proposal made ${mock.calls.length} requests`);
});

test("durable storage: a font over 1 MB is split into chunks, and nothing is left behind when it changes or goes", async () => {
  const sql = fakeDurableSql(), s = createDurableStorage(sql);
  const big = Uint8Array.from({ length: 3.5 * 1024 * 1024 }, (_, i) => (i * 7 + (i >> 11)) % 256);
  await s.write("fonts/big.woff2", big);
  const count = (t) => sql.exec(`SELECT COUNT(*) AS n FROM ${t}`).toArray()[0].n;
  assert.equal(count("chunks"), 4, "3.5 MB is four 1 MB chunks, each under the 2 MB row limit");
  assert.deepEqual(await s.readBytes("fonts/big.woff2"), big);
  await s.write("fonts/big.woff2", Uint8Array.from([1, 2, 3]));
  assert.equal(count("chunks"), 0, "a smaller file replaces the chunks");
  assert.deepEqual(await s.readBytes("fonts/big.woff2"), Uint8Array.from([1, 2, 3]));
  await s.write("fonts/big.woff2", big);
  await s.remove("fonts/big.woff2");
  assert.equal(count("chunks") + count("files"), 0, "removing it removes its chunks");
});

test("durable storage: listing reads only paths, and a small file costs one row write", async () => {
  const sql = fakeDurableSql(), s = createDurableStorage(sql);
  await s.write("fonts/big.woff2", new Uint8Array(2 * 1024 * 1024));
  const before = sql.rowsWritten;
  await s.write("tokens/a.json", "{}");
  assert.equal(sql.rowsWritten - before, 1);
  sql.queries.length = 0;
  assert.deepEqual(await s.list(""), ["fonts/big.woff2", "tokens/a.json"]);
  assert.ok(sql.queries.every((q) => /^SELECT path FROM files/.test(q)), "list never loads file data");
});

test("durable secrets: set in the console, with the Worker's own secrets as the fallback", async () => {
  const sql = fakeDurableSql();
  const secrets = createDurableSecrets(sql, { FIGMA_TOKEN: "from-wrangler" });
  assert.equal(await secrets.get("FIGMA_TOKEN"), "from-wrangler");
  await secrets.set("FIGMA_TOKEN", "from-console");
  assert.equal(await createDurableSecrets(sql, { FIGMA_TOKEN: "from-wrangler" }).get("FIGMA_TOKEN"), "from-console", "it lasts");
  await secrets.set("FIGMA_TOKEN", "");
  assert.equal(await secrets.get("FIGMA_TOKEN"), "from-wrangler");
  await assert.rejects(secrets.get("x; DROP TABLE secrets"), /not a valid secret name/);
});

test("the edits wait in a Durable Object, and last when it restarts", async () => {
  const mock = createGitHubMock({ repo: REPO, files: sampleFiles() });
  const sql = fakeDurableSql();
  const storage = () => createGitHubStorage({ repo: REPO, token: "test-token", pending: createDurableStorage(sql), fetch: mock.fetch });
  const store = createStore(storage(), { copyEngineResults: false });
  const d = await store.draft(); d.shape.radius += 1;
  await store.saveDraft(d);
  // The Durable Object can restart between requests. A new store on the same database sees the saved edits.
  const after = createStore(storage(), { copyEngineResults: false });
  assert.equal((await after.draft()).shape.radius, d.shape.radius);
  assert.deepEqual(await createDurableStorage(sql).list(""), ["tokens/foundations.tokens.json"]);
  assert.equal(mock.log().length, 1, "and nothing went to main");
});

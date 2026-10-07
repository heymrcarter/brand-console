// The store: the draft is the repository's files with the edits on top, and live is the repository without them.
// Run with:  npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../server/store.mjs";
import { createMemoryStorage } from "../server/storage/memory.mjs";
import { sampleFiles } from "./helpers/sample-repo.mjs";

function setup(files = sampleFiles()) {
  // Edits go to a copy, so live stays as it was: on GitHub, that is main plus the Durable Object, and main alone.
  const live = createMemoryStorage(files), storage = createMemoryStorage(files);
  return { store: createStore(storage, { live }), storage, live };
}

test("the draft has the edits, live does not, and both carry the version in package.json", async () => {
  const { store, live } = setup();
  const d = await store.draft();
  assert.equal(d.version, "1.0.0");
  d.shape.radius += 3;
  await store.saveDraft(d);
  assert.equal((await store.draft()).shape.radius, d.shape.radius);
  assert.equal((await store.published()).shape.radius, d.shape.radius - 3);
  assert.deepEqual(live.commits, [], "the store never commits");
  const none = Object.fromEntries(Object.entries(sampleFiles()).filter(([p]) => p !== "package.json"));
  assert.equal((await setup(none).store.published()).version, "0.0.0", "with no package.json, no version yet");
});

test("a removed brand's token file is deleted, so it does not come back on the next read", async () => {
  const { store, storage } = setup();
  const { state, id } = store.E.addBrand(await store.draft(), { name: "Harbor", primary: "#0B4F6C", secondary: "#20A39E", accent: "#FFBA49" });
  await store.saveDraft(state);
  assert.ok(await storage.read(`tokens/brands/${id}.tokens.json`));
  await store.saveDraft(store.E.removeBrand(await store.draft(), "crestline"));
  assert.equal(await storage.read("tokens/brands/crestline.tokens.json"), null);
  assert.deepEqual(store.E.brandList(await store.draft()).map((b) => b.id), ["northfield", "harbor"]);
});

test("restore makes the draft an earlier version, and keeps the edits made on top of live", async () => {
  const { store } = setup();
  const target = await store.published();
  target.brands.northfield.primary = "#7A3F92"; target.type.scale = 1.2;
  const d = await store.draft(); d.shape.radius = 9; delete d.brands.crestline.palette;
  await store.saveDraft(d);
  const after = await store.restore(target);
  assert.equal(after.brands.northfield.primary, "#7A3F92");
  assert.equal(after.type.scale, 1.2);
  assert.equal(after.shape.radius, 9, "an edit stays");
  assert.equal(after.brands.crestline.palette, undefined, "a removal stays too");
});

test("bad data is refused with a 400, and fonts must be real font files", async () => {
  const { store } = setup();
  await assert.rejects(store.saveDraft({ brands: {} }), (e) => e.status === 400 && /missing parts/.test(e.message));
  await assert.rejects(store.saveFont({ family: "X", fileName: "x.exe", data: "AAAA" }), /\.woff2/);
  await assert.rejects(store.saveFont({ family: "X", fileName: "x.woff2", data: "AAAA" }), /looks empty/);
  const saved = await store.saveFont({ family: "Avenir Next", weight: 700, style: "italic", fileName: "a.woff2", data: Buffer.alloc(400, 7).toString("base64") });
  assert.equal(saved.file, "fonts/avenir-next-700-italic.woff2");
});

test("two pages saving at once: each one's change is kept, and the second page gets the combined edits back", async () => {
  const { store } = setup();
  const loaded = await store.draft(), rev = await store.revOf(loaded);
  const heath = JSON.parse(JSON.stringify(loaded)), suzie = JSON.parse(JSON.stringify(loaded));
  heath.shape.radius += 2;
  suzie.type.scale = 1.333;
  const first = await store.saveDraft(heath, { base: rev });
  assert.equal(first.merged, undefined, "nothing to combine: it was made on the newest edits");
  assert.notEqual(first.rev, rev);
  const second = await store.saveDraft(suzie, { base: rev });
  assert.equal(second.merged, true);
  assert.equal(second.draft.shape.radius, heath.shape.radius, "Heath's change was not overwritten");
  assert.equal(second.draft.type.scale, 1.333, "and Suzie's is there too");
  const now = await store.draft();
  assert.equal(now.shape.radius, heath.shape.radius);
  assert.equal(now.type.scale, 1.333);
  assert.equal(second.rev, await store.revOf(now));
});

test("a save made on a version the store has forgotten is refused, and the server's own saves replace the edits", async () => {
  const { store } = setup();
  const d = await store.draft(); d.shape.radius += 1;
  await assert.rejects(store.saveDraft(d, { base: "0123456789abcdef" }), (e) => e.status === 409 && /Reload the page/.test(e.message));
  assert.equal((await store.draft()).shape.radius, d.shape.radius - 1, "nothing was saved");
  const r = await store.saveDraft(d);
  assert.equal(r.merged, undefined);
  assert.equal((await store.draft()).shape.radius, d.shape.radius);
});

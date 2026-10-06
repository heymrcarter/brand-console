// The console's API (server/api.mjs), which the Node server and the Cloudflare Worker share.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApi } from "../server/api.mjs";
import { createAsk } from "../server/ask.mjs";
import { createStore } from "../server/store.mjs";
import { createFigma } from "../server/figma.mjs";
import { createDiskStorage } from "../server/storage/disk.mjs";
import { createMemoryStorage, createMemorySecrets } from "../server/storage/memory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function setup(credit) {
  const disk = createDiskStorage(root), files = {};
  for (const p of [...(await disk.list("tokens")), ...(await disk.list("releases"))]) files[p] = await disk.read(p);
  const storage = createMemoryStorage(files), store = createStore(storage);
  const figma = createFigma({ storage, secrets: createMemorySecrets(), store });
  const api = createApi({ store, figma, ask: createAsk({ key: "" }), info: () => ({ ai: false, model: "m", storybook: "/storybook", shared: true }), credit });
  return { api, store };
}

test("the API answers the console's routes and nothing else", async () => {
  const { api } = await setup();
  assert.ok(api.has("GET", "/api/state") && api.has("POST", "/api/publish") && api.has("PUT", "/api/draft"));
  assert.ok(!api.has("GET", "/api/publish") && !api.has("GET", "/api/nope") && !api.has("GET", "/api/toString") && !api.has("GET", "constructor"));
  const s = await api.call("GET", "/api/state");
  assert.equal(s.history.length, 3);
  assert.equal(s.storybook, "/storybook");
  assert.equal(s.shared, true);
  assert.equal(s.model, null, "no model is shown when there is no Claude key");
  assert.equal(s.figma.connected, false);
  assert.equal(s.github, null, "with no GitHub, the console is not told about one");
  assert.deepEqual(await api.call("GET", "/api/health"), { ok: true });
});

test("errors keep their status, like 409 when there is nothing to publish and 503 with no Claude key", async () => {
  const { api } = await setup();
  await api.call("POST", "/api/publish", { note: "The sample draft's changes." });
  await assert.rejects(api.call("POST", "/api/publish", { note: "x" }), (e) => e.status === 409 && /no changes/.test(e.message));
  await assert.rejects(api.call("POST", "/api/ask", { turns: [] }), (e) => e.status === 503 && /\.env/.test(e.message));
  await assert.rejects(api.call("POST", "/api/flag", { version: "9.9.9" }), (e) => e.status === 404);
});

test("credit decides the name a publish and a rollback are recorded under", async () => {
  const { api, store } = await setup((who, user) => (user ? `${who} · ${user.email}` : who));
  const d = await store.draft(); d.shape.radius += 1;
  await api.call("PUT", "/api/draft", { draft: d });
  const r = await api.call("POST", "/api/publish", { note: "Rounder.", who: "Brand team" }, { email: "maya@example.com" });
  assert.equal(r.history[0].who, "Brand team · maya@example.com");
  const back = await api.call("POST", "/api/rollback", { version: "1.4.0", who: "Admin team" }, { email: "sam@example.com" });
  assert.equal(back.history[0].who, "Admin team · sam@example.com");
  assert.equal(back.history[0].rollbackOf, "1.4.0");
});

// The console's API (server/api.mjs), which the Cloudflare Worker runs in its Durable Object.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createApi } from "../server/api.mjs";
import { createAsk } from "../server/ask.mjs";
import { createStore } from "../server/store.mjs";
import { createFigma } from "../server/figma.mjs";
import { createProposals } from "../server/proposals.mjs";
import { createGitHubClient } from "../server/github-client.mjs";
import { createGitHubStorage } from "../server/storage/github.mjs";
import { createMemoryStorage, createMemorySecrets, createMemoryKV } from "../server/storage/memory.mjs";
import { sampleRepo } from "./helpers/sample-repo.mjs";

const REPO = "acme/design-system", TOKEN = "test-token";

// The sample design system on a GitHub stand-in: four released versions, and no edits yet.
function setup() {
  const mock = sampleRepo({ repo: REPO, token: TOKEN });
  const gh = () => createGitHubStorage({ repo: REPO, token: TOKEN, pending: createMemoryStorage(), fetch: mock.fetch, headMaxAgeMs: 0 });
  const storage = gh(), store = createStore(storage, { live: gh() });
  const proposals = createProposals({ github: createGitHubClient({ repo: REPO, token: TOKEN, fetch: mock.fetch }), store, edits: storage, kv: createMemoryKV() });
  const figma = createFigma({ storage, secrets: createMemorySecrets(), store });
  const api = createApi({ store, proposals, figma, ask: createAsk({ key: "" }), info: () => ({ ai: false, model: "m", storybook: "/storybook" }) });
  return { api, store, mock };
}

test("the API answers the console's routes and nothing else", async () => {
  const { api } = setup();
  for (const r of ["GET /api/state", "PUT /api/draft", "POST /api/proposal/add", "POST /api/proposal/submit", "POST /api/proposal/withdraw", "POST /api/proposal/dismiss", "POST /api/rollback"]) assert.ok(api.has(...r.split(" ")), r);
  assert.ok(!api.has("POST", "/api/publish") && !api.has("POST", "/api/flag"), "publishing straight to apps is gone: changes land through a proposal");
  assert.ok(!api.has("GET", "/api/nope") && !api.has("GET", "/api/toString") && !api.has("GET", "constructor"));
  const s = await api.call("GET", "/api/state");
  assert.deepEqual(s.history.map((h) => h.version), ["1.5.0", "1.4.0", "1.3.0", "1.2.0"]);
  assert.equal(s.published.version, "1.5.0");
  assert.equal(s.proposal, null);
  assert.equal(s.base, null);
  assert.equal(s.storybook, "/storybook");
  assert.equal(s.model, null, "no model is shown when there is no Claude key");
  assert.equal(s.figma.connected, false);
  assert.equal(s.github, null, "with no GitHub settings, the console is not told about one");
  assert.deepEqual(await api.call("GET", "/api/health"), { ok: true });
});

test("errors keep their status, like 409 when there are no edits to add and 503 with no Claude key", async () => {
  const { api } = setup();
  await assert.rejects(api.call("POST", "/api/proposal/add", { note: "x" }), (e) => e.status === 409 && /no edits/.test(e.message));
  await assert.rejects(api.call("POST", "/api/proposal/submit"), (e) => e.status === 409);
  await assert.rejects(api.call("POST", "/api/ask", { turns: [] }), (e) => e.status === 503 && /ANTHROPIC_API_KEY/.test(e.message));
  await assert.rejects(api.call("POST", "/api/rollback", { version: "9.9.9" }), (e) => e.status === 404);
});

test("a change is credited to the person signed in, and a rollback becomes edits, not a release", async () => {
  const { api, store, mock } = setup();
  const d = await store.draft(); d.shape.radius += 1;
  await api.call("PUT", "/api/draft", { draft: d });
  const r = await api.call("POST", "/api/proposal/add", { note: "Rounder", who: "Someone else" }, { email: "maya@example.com", name: "Maya R." });
  assert.equal(r.proposal.changes[0].who, "maya@example.com", "the browser cannot say who made it");
  assert.equal(r.proposal.state, "draft");
  assert.equal((await api.call("POST", "/api/proposal/submit", {}, { email: "maya@example.com" })).proposal.state, "in review");
  const back = await api.call("POST", "/api/rollback", { version: "1.3.0" }, { email: "sam@example.com" });
  const v13 = back.history.find((h) => h.version === "1.3.0");
  assert.ok(v13);
  assert.equal(back.published.version, "1.5.0", "nothing is released by a rollback");
  assert.equal(mock.pulls().length, 1);
});

test("the server says who is signed in and their role, and the browser cannot choose a role", async () => {
  const { api } = setup();
  assert.equal((await api.call("GET", "/api/state")).me, null, "with nobody signed in, there is no one to show");
  const me = (await api.call("GET", "/api/state", {}, { email: "maya@example.com", name: "Maya R." })).me;
  assert.deepEqual(me, { email: "maya@example.com", name: "Maya R.", role: "admin" }, "everyone is an admin for now");

  // The Figma sync limits some settings by role. The role it gets is the server's, whatever the browser sends.
  const seen = [];
  const figma = { status: async () => ({}), compare: async (b) => (seen.push(b.role), { rows: [] }), compareFiles: async (b) => (seen.push(b.role), { rows: [] }) };
  const store = { draft: async () => ({}), published: async () => ({}) };
  const proposals = { status: async () => ({ proposal: null, base: null, notice: null }), releases: async () => [] };
  const viewerApi = createApi({ store, proposals, figma, ask: async () => "", info: () => ({}), roleOf: () => "viewer" });
  await viewerApi.call("POST", "/api/figma/compare", { role: "admin" }, { email: "sam@example.com" });
  await viewerApi.call("POST", "/api/figma/files/compare", { role: "admin", files: [] }, { email: "sam@example.com" });
  assert.deepEqual(seen, ["viewer", "viewer"]);
});

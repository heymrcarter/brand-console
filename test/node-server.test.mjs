// The Node server (server/node-server.mjs): the console with no Cloudflare parts, against the stand-in for GitHub.
// The API, fonts, and the live connection, the checks on who may call, static files, and edits that last a restart.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { startNodeServer } from "../server/node-server.mjs";
import { startFakeGitHub, FAKE_REPO, FAKE_TOKEN } from "../scripts/fake-github.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bc-node-"));
const assetsDir = path.join(tmp, "assets"), dataDir = path.join(tmp, "data");
const user = { email: "heath@example.com", name: "Heath" };
let fake, server, env;
const start = async () => { server = await startNodeServer({ env, user, assetsDir, dataDir }); };

before(async () => {
  fs.mkdirSync(path.join(assetsDir, "storybook"), { recursive: true });
  fs.writeFileSync(path.join(assetsDir, "index.html"), "<title>Brand Console</title>");
  fs.writeFileSync(path.join(assetsDir, "storybook", "index.html"), "<html>Storybook</html>");
  fake = await startFakeGitHub(path.join(root, "fixtures", "sample"));
  env = { GITHUB_REPO: FAKE_REPO, GITHUB_TOKEN: FAKE_TOKEN, GITHUB_API: fake.url };
  await start();
});
after(async () => { await server.close(); await fake.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const call = async (method, p, body, headers = { origin: server.url }) => {
  const r = await fetch(server.url + p, { method, headers: { ...headers, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
  const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch { /* Not JSON. */ }
  return { status: r.status, json, text, headers: r.headers };
};

test("the console's state comes from GitHub, and the person is the one the server was started with", async () => {
  const r = await call("GET", "/api/state");
  assert.equal(r.status, 200);
  assert.equal(r.json.published.version, "1.0.0");
  assert.deepEqual(r.json.github, { repo: FAKE_REPO, branch: "main" });
  assert.deepEqual(r.json.me, { ...user, role: "admin" });
});

test("static files, with folders redirected to their trailing slash, and nothing outside the folder", async () => {
  assert.match((await call("GET", "/")).text, /Brand Console/);
  const sb = await call("GET", "/storybook");
  assert.equal(sb.status, 307);
  assert.equal(sb.headers.get("location"), "/storybook/");
  assert.match((await call("GET", "/storybook/")).text, /Storybook/);
  assert.equal((await call("GET", "/%2e%2e/data")).status, 404);
  assert.equal((await call("GET", "/nothing-here.js")).status, 404);
});

test("changes need the console's own origin, and requests must be addressed to this computer", async () => {
  const { json: { draft } } = await call("GET", "/api/state");
  assert.equal((await call("PUT", "/api/draft", { draft }, {})).status, 403);
  assert.equal((await call("PUT", "/api/draft", { draft }, { origin: "https://evil.example" })).status, 403);
  // A page on another domain name that points at 127.0.0.1 sends its own Host.
  const port = new URL(server.url).port;
  const r = await new Promise((ok) => import("node:http").then(({ request }) => request({ host: "127.0.0.1", port, path: "/api/state", headers: { host: `evil.example:${port}` } }, (res) => ok(res.statusCode)).end()));
  assert.equal(r, 403);
});

test("the edits and a font are saved, and last when the server restarts", async () => {
  const { json: { draft } } = await call("GET", "/api/state");
  draft.shape.radius += 3;
  assert.equal((await call("PUT", "/api/draft", { draft })).status, 200);
  const font = Buffer.from(Uint8Array.from({ length: 1.5 * 1024 * 1024 }, (_, i) => (i * 31) % 256));
  const saved = await call("POST", "/api/fonts", { family: "Node Sans", weight: 400, style: "normal", fileName: "n.woff2", data: font.toString("base64") });
  assert.equal(saved.json.file, "fonts/node-sans-400.woff2");

  await server.close();
  await start();
  assert.equal((await call("GET", "/api/state")).json.draft.shape.radius, draft.shape.radius);
  const served = await fetch(server.url + "/fonts/node-sans-400.woff2");
  assert.equal(served.headers.get("content-type"), "font/woff2");
  assert.equal(Buffer.compare(Buffer.from(await served.arrayBuffer()), font), 0);
});

test("the live connection: presence, and a save reaching the other page", async () => {
  const ws = server.url.replace(/^http/, "ws") + "/api/live";
  const open = (page) => new Promise((ok, fail) => {
    const c = new WebSocket(`${ws}?page=${page}`, { origin: server.url });
    c.inbox = []; c.on("message", (m) => c.inbox.push(JSON.parse(m))); c.once("open", () => ok(c)); c.once("error", fail);
  });
  const until = async (c, fn) => { for (let i = 0; i < 100 && !c.inbox.some(fn); i++) await new Promise((r) => setTimeout(r, 20)); return c.inbox.find(fn); };

  const a = await open("pa"), b = await open("pb");
  assert.ok(await until(a, (m) => m.type === "presence" && m.people.length === 2));
  const { json: { draft, draftRev } } = await call("GET", "/api/state");
  draft.shape.radius += 1;
  await call("PUT", "/api/draft", { draft, base: draftRev, page: "pa" });
  const got = await until(b, (m) => m.type === "edits");
  assert.equal(got.draft.shape.radius, draft.shape.radius);
  assert.equal(got.by, "Heath");
  assert.ok(!a.inbox.some((m) => m.type === "edits"), "the page that saved does not get its own change back");
  a.send(JSON.stringify({ type: "ping" }));
  assert.ok(await until(a, (m) => m.type === "pong"));
  a.close();
  assert.ok(await until(b, (m) => m.type === "presence" && m.people.length === 1));
  b.close();

  const refused = await new Promise((ok) => { const c = new WebSocket(ws, { origin: "https://evil.example" }); c.on("unexpected-response", (req, res) => ok(res.statusCode)); c.on("open", () => ok(101)); c.on("error", () => {}); });
  assert.equal(refused, 403);
});

test("GUIDE=off hides the design guide and refuses /api/ask", async () => {
  const off = await startNodeServer({ env: { ...env, GUIDE: "off", ANTHROPIC_API_KEY: "sk-test" }, user, assetsDir, dataDir: path.join(tmp, "data-off") });
  try {
    const state = await (await fetch(off.url + "/api/state")).json();
    assert.equal(state.guide, false);
    assert.equal(state.ai, false, "a key in the settings does not turn it back on");
    const ask = await fetch(off.url + "/api/ask", { method: "POST", headers: { origin: off.url, "content-type": "application/json" }, body: JSON.stringify({ turns: [{ role: "user", content: "hi" }] }) });
    assert.equal(ask.status, 403);
  } finally { await off.close(); }
  assert.equal((await call("GET", "/api/state")).json.guide, true, "it is on unless turned off");
});

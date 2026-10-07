// Runs the real Worker in wrangler dev (Cloudflare's workerd runtime) against a stand-in for GitHub, and checks the
// console's whole flow: sign-in, the API, a big font in the Durable Object, a restart that keeps the edits, a
// proposal with two changes that is submitted and lands as a release, a rollback, and a Worker with Cloudflare
// Access missing refusing everything.
// Run with:  npm run test:worker
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createStore } from "../server/store.mjs";
import { createMemoryStorage } from "../server/storage/memory.mjs";
import { sampleFiles } from "../test/helpers/sample-repo.mjs";
import { startFakeGitHub, FAKE_REPO, FAKE_TOKEN } from "./fake-github.mjs";
import { startWranglerDev } from "./wrangler-dev.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = FAKE_REPO;
const results = [];
// Each result is printed as it happens, so a log shows how far the test got.
const check = (ok, what) => { const line = `${ok ? "ok  " : "FAIL"} ${what}`; results.push(line); console.log(line); if (!ok) process.exitCode = 1; };

// The stand-in for GitHub, holding this project's design system files, served over HTTP for the Worker to reach.
const fake = await startFakeGitHub(path.join(root, "fixtures/sample"));
const github = fake.github, ghUrl = fake.url;

execFileSync(process.execPath, [path.join(root, "scripts/build-worker-assets.mjs"), "--no-storybook"], { cwd: root, stdio: "ignore" });
const state = fs.mkdtempSync(path.join(os.tmpdir(), "bc-worker-"));
const startWorker = (vars) => startWranglerDev({ root, vars, persistTo: state });
const DEV = { GITHUB_REPO: REPO, GITHUB_BRANCH: "main", GITHUB_TOKEN: FAKE_TOKEN, GITHUB_API: ghUrl, ACCESS_LOCAL_DEV: "allow" };

let w = await startWorker(DEV);
const call = async (method, p, body, headers = { origin: w.base }) => {
  const r = await fetch(w.base + p, { method, headers: { ...headers, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch { /* Not JSON. */ }
  return { status: r.status, json, text, type: r.headers.get("content-type") };
};
try {
  let r = await call("GET", "/");
  check(r.status === 200 && /<title>Brand Console<\/title>/.test(r.text), "the console page is served");
  r = await call("GET", "/engine-globals.js");
  check(r.status === 200 && /javascript/.test(r.type) && r.text.includes("runChecks"), "the engine is served to the page, bundled from the design system package");
  r = await call("GET", "/storybook/");
  const stories = await call("GET", "/storybook/index.json");
  check(r.status === 200 && /<html/i.test(r.text) && stories.status === 200 && Object.keys(stories.json.entries || {}).length > 50, `Storybook is served at /storybook/, from its package (${Object.keys((stories.json && stories.json.entries) || {}).length} entries)`);

  r = await call("GET", "/api/state");
  const local = createStore(createMemoryStorage(sampleFiles()));
  check(r.status === 200 && JSON.stringify(r.json.draft) === JSON.stringify(await local.draft()), "GET /api/state: the draft read from GitHub matches the sample's main");
  check(r.json.published.version === "1.0.0" && r.json.history.length === 4 && r.json.history[0].version === "1.0.0", "live is main at 1.0.0, and the versions come from the releases");
  check(r.json.proposal === null && r.json.storybook === "/storybook" && r.json.ai === false, "no proposal yet, the Storybook address, and no Claude key are reported");
  check(r.json.github && r.json.github.repo === REPO && r.json.github.branch === "main", "the console is told which repository proposals go to");
  check(r.json.me && r.json.me.email === "local-dev" && r.json.me.role === "admin", `the console is told who is signed in, and their role: ${JSON.stringify(r.json.me)}`);
  const draft = r.json.draft;
  const commits = github.log().length;

  draft.shape.radius += 1;
  r = await call("PUT", "/api/draft", { draft }, {});
  check(r.status === 403, "a change with no Origin header is refused (403)");
  r = await call("PUT", "/api/draft", { draft }, { origin: "https://evil.example" });
  check(r.status === 403, "a change from another site is refused (403)");
  r = await call("PUT", "/api/draft", { draft });
  check(r.status === 200 && r.json.ok, "PUT /api/draft from the console saves the edits");
  check(github.log().length === commits, "saving edits does not commit to GitHub");

  const font = Buffer.from(Uint8Array.from({ length: 2.5 * 1024 * 1024 }, (_, i) => (i * 31 + (i >> 9)) % 256));
  r = await call("POST", "/api/fonts", { family: "Worker Sans", weight: 400, style: "normal", fileName: "w.woff2", data: font.toString("base64") });
  check(r.status === 200 && r.json.file === "fonts/worker-sans-400.woff2", `POST /api/fonts saves a 2.5 MB font (${r.status} ${r.json && (r.json.file || r.json.error)})`);
  const served = await fetch(w.base + "/fonts/worker-sans-400.woff2");
  check(served.status === 200 && Buffer.compare(Buffer.from(await served.arrayBuffer()), font) === 0 && served.headers.get("content-type") === "font/woff2", "the font is served back byte for byte from the Durable Object");

  draft.fontLib = { ...(draft.fontLib || {}), files: { "Worker Sans": [{ file: "fonts/worker-sans-400.woff2", weight: 400, style: "normal" }] } };
  await call("PUT", "/api/draft", { draft });
  // The Durable Object restarts with the Worker. The edits must still be there.
  await w.stop();
  w = await startWorker(DEV);
  r = await call("GET", "/api/state");
  check(r.json && r.json.draft.shape.radius === draft.shape.radius && r.json.draft.fontLib.files["Worker Sans"], "after a restart, the edits are still there");

  // Two people's pages, both loaded on the same version of the edits, each save one change.
  let st = (await call("GET", "/api/state")).json;
  const pageA = JSON.parse(JSON.stringify(st.draft)), pageB = JSON.parse(JSON.stringify(st.draft));
  pageA.type.lineHeight = 1.6; pageB.comp.button.weight = 700;
  const sa = await call("PUT", "/api/draft", { draft: pageA, base: st.draftRev });
  const sb = await call("PUT", "/api/draft", { draft: pageB, base: st.draftRev });
  check(sa.status === 200 && !sa.json.merged && sb.status === 200 && sb.json.merged === true, "two pages saving on the same version: the second is combined with the first");
  st = (await call("GET", "/api/state")).json;
  check(st.draft.type.lineHeight === 1.6 && st.draft.comp.button.weight === 700 && st.draftRev === sb.json.rev, "both changes are in the edits, and the page gets the newest version back");
  r = await call("PUT", "/api/draft", { draft: pageA, base: "0123456789abcdef" });
  check(r.status === 409 && /Reload the page/.test(r.json.error), "a save on a version the server no longer knows is refused (409)");

  // Live: two pages connected at once see each other, and each other's saves, without reloading.
  const wsBase = w.base.replace(/^http/, "ws") + "/api/live?page=";
  const openLive = (page, headers = { origin: w.base }) => new Promise((ok, bad) => {
    const ws = new WebSocket(wsBase + page, { headers });
    const got = [];
    ws.addEventListener("message", (e) => got.push(JSON.parse(e.data)));
    ws.addEventListener("open", () => ok({ ws, got, wait: async (fn, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { const m = got.find(fn); if (m) return m; await new Promise((x) => setTimeout(x, 50)); } return null; } }));
    ws.addEventListener("error", () => bad(new Error("did not connect")));
  });
  const liveA = await openLive("page-a"), liveB = await openLive("page-b");
  const seen = await liveB.wait((m) => m.type === "presence" && m.people.length === 2);
  check(!!seen && seen.people.every((p) => p.email === "local-dev"), "two pages connected live see each other");
  liveA.ws.send(JSON.stringify({ type: "here", sec: "color", brand: "northfield" }));
  check(!!(await liveB.wait((m) => m.type === "presence" && m.people.some((p) => p.page === "page-a" && p.sec === "color"))), "a page moving to Color shows up for the other");
  st = (await call("GET", "/api/state")).json;
  const pageEdit = JSON.parse(JSON.stringify(st.draft)); pageEdit.shape.shadow = pageEdit.shape.shadow === "strong" ? "soft" : "strong";
  await call("PUT", "/api/draft", { draft: pageEdit, base: st.draftRev, page: "page-a" });
  const arrived = await liveB.wait((m) => m.type === "edits");
  check(!!arrived && arrived.draft.shape.shadow === pageEdit.shape.shadow && arrived.by === "Local development", "page A's save reaches page B within seconds, without a reload");
  check(!liveA.got.some((m) => m.type === "edits"), "and is not sent back to page A");
  const refused = await openLive("page-c", { origin: "https://evil.example" }).then(() => "connected", () => "refused");
  check(refused === "refused", "a live connection from another site is refused");

  r = await call("POST", "/api/proposal/add", { note: "Rounder corners, in Worker Sans", page: "page-a" });
  check(!!(await liveB.wait((m) => m.type === "refresh" && /added a change/.test(m.what))), "adding to the proposal tells the other page to refresh");
  liveA.ws.close(); 
  check(!!(await liveB.wait((m) => m.type === "presence" && m.people.length === 1)), "a page that closes leaves the presence list");
  liveB.ws.close();
  const p1 = r.json && r.json.proposal;
  check(r.status === 200 && p1 && p1.number === 1 && p1.state === "draft" && p1.changes.length === 1, `the first change opens draft pull request #1 (${r.status} ${r.json && (r.json.error || p1.branch)})`);
  check(p1 && p1.changes[0].who === "local-dev", "the change is credited to the signed-in person");
  const onBranch = p1 ? github.files(p1.branch) : {};
  check(Buffer.compare(Buffer.from(onBranch["fonts/worker-sans-400.woff2"] || []), font) === 0, "the font reached the proposal's branch byte for byte");
  check(Object.keys(onBranch).some((f) => /^\.changeset\/console-/.test(f)), "the change has its changeset");
  check(github.log().length === commits, "main still has no new commit");
  r = await call("POST", "/api/proposal/add", { note: "again" });
  check(r.status === 409 && /no edits/.test(r.json.error), "adding with no new edits is refused (409)");

  const d2 = r.json ? (await call("GET", "/api/state")).json.draft : draft;
  d2.type.scale = 1.333;
  await call("PUT", "/api/draft", { draft: d2 });
  r = await call("POST", "/api/proposal/add", { note: "A bigger type scale", bump: "minor" });
  check(r.status === 200 && r.json.proposal.changes.length === 2 && github.pulls().length === 1, "the second change goes on the same pull request");
  r = await call("POST", "/api/proposal/submit");
  check(r.status === 200 && r.json.proposal.state === "in review" && github.pull(1).draft === false, "submit marks the pull request ready for review");

  // A reviewer lands it. The Release workflow makes 1.1.0, the biggest bump.
  const landed = await (await fetch(`${ghUrl}/_local/pulls/1/merge`, { method: "POST" })).json();
  check(landed.version === "1.1.0", `the local stand-in lands it as ${landed.version}`);
  r = await call("GET", "/api/state");
  check(r.json.proposal === null && r.json.notice && r.json.notice.kind === "landed" && r.json.notice.number === 1, "the console knows the proposal landed");
  check(r.json.published.version === "1.1.0" && r.json.published.type.scale === 1.333, "live is the new version");
  check(local.E.diff(r.json.published, r.json.draft).length === 0, "and no edits are left over");

  r = await call("POST", "/api/rollback", { version: "0.4.0" });
  check(r.status === 200 && r.json.published.version === "1.1.0" && local.E.diff(r.json.published, r.json.draft).length > 0, "a rollback becomes edits, and releases nothing on its own");
  r = await call("POST", "/api/ask", { turns: [{ role: "user", content: "hi" }] });
  check(r.status === 503 && /wrangler secret put ANTHROPIC_API_KEY/.test(r.json.error), "with no Claude key, the guide says how to add one");
  for (const bad of ["/dist/theme.css", "/fonts/%2e%2e/%2e%2e/wrangler.jsonc", "/fonts/../package.json"]) {
    const res = await fetch(w.base + bad);
    check(res.status === 404, `${bad} is not found (${res.status})`);
  }
  r = await call("GET", "/api/nope");
  check(r.status === 404, "an unknown API route is 404");
} finally {
  await w.stop();
}

// A Worker with no Cloudflare Access settings, and no local switch, serves nothing.
w = await startWorker({ GITHUB_REPO: REPO, GITHUB_TOKEN: FAKE_TOKEN, GITHUB_API: ghUrl });
try {
  const page = await fetch(w.base + "/"), api = await fetch(w.base + "/api/state");
  check(page.status === 403 && api.status === 403 && /not set up for sign-in/.test((await api.json()).error), "with Access not set up, the console page and the API are refused (403)");
} finally {
  await w.stop();
  await fake.close();
  fs.rmSync(state, { recursive: true, force: true });
  console.log(`\n${results.filter((r) => r.startsWith("ok")).length} of ${results.length} checks passed.`);
  if (process.exitCode) console.log("\nwrangler output:\n" + w.log().slice(-3000));
}

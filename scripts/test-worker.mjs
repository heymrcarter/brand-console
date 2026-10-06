// Runs the real Worker in wrangler dev (Cloudflare's workerd runtime) against a stand-in for GitHub, and checks the
// console's whole flow: sign-in, the API, a big font in the Durable Object, a publish that becomes one commit,
// a restart that keeps unpublished changes, and a Worker with Cloudflare Access missing refusing everything.
// Run with:  npm run test:worker
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createGitHubMock } from "../test/github-mock.mjs";
import { createDiskStorage } from "../server/storage/disk.mjs";
import { createStore } from "../server/store.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "acme/design-system";
const results = [];
const check = (ok, what) => { results.push(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) process.exitCode = 1; };

// The stand-in for GitHub, holding this project's design system files, served over HTTP for the Worker to reach.
const disk = createDiskStorage(root), files = {};
for (const p of [...await disk.list("tokens"), ...await disk.list("releases"), ...await disk.list("dist"), ...await disk.list("build/draft"), "CHANGELOG.md"]) files[p] = await disk.readBytes(p);
const github = createGitHubMock({ repo: REPO, files });
const ghServer = http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const r = await github.fetch(`http://${req.headers.host}${req.url}`, { method: req.method, headers: { authorization: req.headers.authorization || "" }, body: chunks.length ? Buffer.concat(chunks).toString() : undefined });
  res.writeHead(r.status, { "content-type": "application/json" }); res.end(Buffer.from(await r.arrayBuffer()));
});
await new Promise((ok) => ghServer.listen(0, "127.0.0.1", ok));
const ghUrl = `http://127.0.0.1:${ghServer.address().port}`;

execFileSync(process.execPath, [path.join(root, "scripts/build-worker-assets.mjs"), "--no-storybook"], { cwd: root, stdio: "ignore" });
const state = fs.mkdtempSync(path.join(os.tmpdir(), "bc-worker-"));
const freePort = () => new Promise((ok) => { const s = http.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });

async function startWorker(vars) {
  const port = await freePort();
  const args = ["wrangler", "dev", "--ip", "127.0.0.1", "--port", String(port), "--persist-to", state, "--log-level", "warn", "--show-interactive-dev-session=false", "--inspector-port", String(await freePort())];
  for (const [k, v] of Object.entries(vars)) args.push("--var", `${k}:${v}`);
  const kid = spawn("npx", args, { cwd: root, env: { ...process.env, WRANGLER_SEND_METRICS: "false" }, stdio: ["ignore", "pipe", "pipe"] });
  let log = ""; kid.stdout.on("data", (d) => (log += d)); kid.stderr.on("data", (d) => (log += d));
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 150; i++) {
    try { const r = await fetch(base + "/api/health"); if (r.status) break; } catch { /* Not up yet. */ }
    await new Promise((ok) => setTimeout(ok, 200));
  }
  return { base, log: () => log, stop: () => new Promise((ok) => { kid.once("exit", ok); kid.kill("SIGINT"); }) };
}
const DEV = { GITHUB_REPO: REPO, GITHUB_BRANCH: "main", GITHUB_TOKEN: "test-token", GITHUB_API: ghUrl, ACCESS_LOCAL_DEV: "allow" };

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
  check(r.status === 200 && /javascript/.test(r.type), "its engine module is served as JavaScript");

  r = await call("GET", "/api/state");
  const local = createStore(createDiskStorage(root));
  check(r.status === 200 && JSON.stringify(r.json.draft) === JSON.stringify(await local.draft()), "GET /api/state: the draft read from GitHub matches the project's");
  check(r.json.history.length === 3 && r.json.storybook === "/storybook" && r.json.shared === true && r.json.ai === false, "the history, the Storybook address, and no Claude key are reported");
  check(r.json.github && r.json.github.repo === REPO && r.json.github.branch === "main", "the console is told which repository and branch publishes go to, for its banner");
  const draft = r.json.draft;

  draft.shape.radius += 1;
  r = await call("PUT", "/api/draft", { draft }, {});
  check(r.status === 403, "a change with no Origin header is refused (403)");
  r = await call("PUT", "/api/draft", { draft }, { origin: "https://evil.example" });
  check(r.status === 403, "a change from another site is refused (403)");
  r = await call("PUT", "/api/draft", { draft });
  check(r.status === 200 && r.json.ok, "PUT /api/draft from the console saves");
  check(github.log().length === 1, "a draft save does not commit to GitHub");

  const font = Buffer.from(Uint8Array.from({ length: 2.5 * 1024 * 1024 }, (_, i) => (i * 31 + (i >> 9)) % 256));
  r = await call("POST", "/api/fonts", { family: "Worker Sans", weight: 400, style: "normal", fileName: "w.woff2", data: font.toString("base64") });
  check(r.status === 200 && r.json.file === "fonts/worker-sans-400.woff2", `POST /api/fonts saves a 2.5 MB font (${r.status} ${r.json && (r.json.file || r.json.error)})`);
  const served = await fetch(w.base + "/fonts/worker-sans-400.woff2");
  check(served.status === 200 && Buffer.compare(Buffer.from(await served.arrayBuffer()), font) === 0 && served.headers.get("content-type") === "font/woff2", "the font is served back byte for byte from the Durable Object, before it is published");

  draft.fontLib = { ...(draft.fontLib || {}), files: { "Worker Sans": [{ file: "fonts/worker-sans-400.woff2", weight: 400, style: "normal" }] } };
  await call("PUT", "/api/draft", { draft });
  // The Durable Object restarts with the Worker. Unpublished changes must still be there.
  await w.stop();
  w = await startWorker(DEV);
  r = await call("GET", "/api/state");
  check(r.json && r.json.draft.shape.radius === draft.shape.radius && r.json.draft.fontLib.files["Worker Sans"], "after a restart, the unpublished draft is still there");

  r = await call("POST", "/api/publish", { note: "From the Worker.", who: "Brand team", bump: "patch" });
  const v = r.json && r.json.version;
  check(r.status === 200 && v === "1.4.1", `POST /api/publish -> ${v || r.json?.error}`);
  check(github.log()[0] === `Publish design system v${v}: From the Worker.` && github.log().length === 2, "the publish is one commit on GitHub");
  check(r.json.history[0].who === "Brand team · local-dev", `the version is credited to the team and the signed-in person: "${r.json.history[0].who}"`);
  const after = github.files();
  check(Buffer.compare(Buffer.from(after[`releases/v${v}/fonts/worker-sans-400.woff2`] || []), font) === 0 && Buffer.compare(Buffer.from(after["fonts/worker-sans-400.woff2"] || []), font) === 0, "the font reached GitHub byte for byte, in fonts/ and the release");
  check(new TextDecoder().decode(after["dist/theme.css"]).includes(v), "dist/theme.css on GitHub has the new version");
  const css = await call("GET", "/dist/theme.css");
  check(css.status === 200 && css.text.includes(v) && /text\/css/.test(css.type), "/dist/theme.css is served with the new version");
  r = await call("POST", "/api/publish", { note: "again" });
  check(r.status === 409 && /no changes/.test(r.json.error), "publishing again with no changes is refused (409)");
  r = await call("POST", "/api/flag", { version: v });
  check(r.status === 200 && r.json.flag === true, "POST /api/flag");
  r = await call("POST", "/api/rollback", { version: "1.4.0", who: "Admin team" });
  check(r.status === 200 && r.json.version === "1.5.0" && github.log()[0].startsWith("Publish design system v1.5.0: Rolled back"), "POST /api/rollback is a commit too");
  r = await call("POST", "/api/ask", { turns: [{ role: "user", content: "hi" }] });
  check(r.status === 503 && /wrangler secret put ANTHROPIC_API_KEY/.test(r.json.error), "with no Claude key, the guide says how to add one");
  for (const bad of ["/dist/../.dev.vars", "/fonts/%2e%2e/%2e%2e/wrangler.jsonc", "/build/x/../../../package.json"]) {
    const res = await fetch(w.base + bad);
    check(res.status === 404, `${bad} is not found (${res.status})`);
  }
  r = await call("GET", "/api/nope");
  check(r.status === 404, "an unknown API route is 404");
} finally {
  await w.stop();
}

// A Worker with no Cloudflare Access settings, and no local switch, serves nothing.
w = await startWorker({ GITHUB_REPO: REPO, GITHUB_TOKEN: "test-token", GITHUB_API: ghUrl });
try {
  const page = await fetch(w.base + "/"), api = await fetch(w.base + "/api/state");
  check(page.status === 403 && api.status === 403 && /not set up for sign-in/.test((await api.json()).error), "with Access not set up, the console page and the API are refused (403)");
} finally {
  await w.stop();
  ghServer.close();
  fs.rmSync(state, { recursive: true, force: true });
  console.log(results.join("\n"));
  if (process.exitCode) console.log("\nwrangler output:\n" + w.log().slice(-3000));
}

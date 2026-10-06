// The local Brand Console server. Serves the console and a small API.
// Start it with:  npm start   (also starts Storybook)   or   npm run console
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStore } from "./store.mjs";
import { createFigma } from "./figma.mjs";
import { readableStaticFile, isConsoleFile } from "./static.mjs";
import { hostingConfig, refuseMessage, createAuth } from "./auth.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = readEnv(path.join(root, ".env"));
// On this computer only (the default), nothing changes. Shared with other computers, it needs an access code.
const hosting = hostingConfig({ fromEnv: process.env, fromFile: env });
if (hosting.error) { console.error(refuseMessage(hosting)); process.exit(1); }
const auth = createAuth(hosting);
const PORT = Number(process.env.PORT || env.PORT || 5173);
const STORYBOOK = process.env.STORYBOOK_URL || env.STORYBOOK_URL || "http://127.0.0.1:6006";
const KEY = process.env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY || "";
const MODEL = process.env.ANTHROPIC_MODEL || env.ANTHROPIC_MODEL || "claude-sonnet-5";
const store = createStore(root);
store.buildAll();
const figma = createFigma({ root, store });

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf" };

function readEnv(f) {
  if (!fs.existsSync(f)) return {};
  return Object.fromEntries(fs.readFileSync(f, "utf8").split(/\r?\n/).filter((l) => /^\s*[A-Z_]+\s*=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; }));
}
function send(res, code, body, type = "application/json", headers = {}) {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store", ...headers });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function body(req) {
  return new Promise((ok, bad) => { let d = ""; req.on("data", (c) => { d += c; if (d.length > 20e6) req.destroy(); }); req.on("end", () => { try { ok(d ? JSON.parse(d) : {}); } catch { bad(Object.assign(new Error("The request was not valid JSON."), { status: 400 })); } }); });
}
function state() {
  return { draft: store.draft(), published: store.published(), history: store.index().versions, ai: !!KEY, model: KEY ? MODEL : null, storybook: STORYBOOK, figma: figma.status(), shared: auth.shared };
}
async function ask(turns) {
  if (!KEY) { const e = new Error("No Claude API key is set. Add ANTHROPIC_API_KEY to the .env file."); e.status = 503; throw e; }
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1200, messages: turns }),
  });
  const j = await r.json();
  if (!r.ok) { const e = new Error(j?.error?.message || `Claude returned an error (${r.status}).`); e.status = 502; throw e; }
  return (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
}

const routes = {
  "GET /api/state": async () => state(),
  "PUT /api/draft": async (req) => { const b = await body(req); return store.saveDraft(b.draft); },
  "POST /api/publish": async (req) => { const b = await body(req); const v = store.publish(b); return { version: v, ...state() }; },
  "POST /api/rollback": async (req) => { const b = await body(req); const v = store.rollback(b); return { version: v, ...state() }; },
  "POST /api/flag": async (req) => { const b = await body(req); return { flag: store.flag(b.version), history: store.index().versions }; },
  "POST /api/ask": async (req) => { const b = await body(req); return { text: await ask(b.turns || []) }; },
  "GET /api/health": async () => ({ ok: true }),
  "POST /api/fonts": async (req) => { const b = await body(req); return store.saveFont(b); },
  "GET /api/figma": async () => figma.status(),
  "POST /api/figma/connect": async (req) => figma.connect(await body(req)),
  "POST /api/figma/link": async (req) => figma.setLink(await body(req)),
  "POST /api/figma/disconnect": async (req) => figma.disconnect(await body(req)),
  "POST /api/figma/compare": async (req) => figma.compare(await body(req)),
  "POST /api/figma/apply": async (req) => { const r = await figma.apply(await body(req)); return { ...r, ...state() }; },
  "GET /api/figma/files": async () => figma.exportFiles(),
  "POST /api/figma/files/compare": async (req) => figma.compareFiles(await body(req)),
  "POST /api/figma/files/apply": async (req) => { const r = figma.applyFiles(await body(req)); return { ...r, ...state() }; },
};

async function handle(req, res) {
  let url;
  try { url = new URL(req.url, "http://localhost"); } catch { return send(res, 400, "Bad request", "text/plain"); }
  const route = routes[`${req.method} ${url.pathname}`];
  // Only the console itself may change things. Other web pages cannot send changes to this computer.
  if ((route || url.pathname === "/api/login" || url.pathname === "/api/logout") && req.method !== "GET" && !auth.originAllowed(req)) {
    return send(res, 403, { error: "Only the Brand Console can make changes here." });
  }
  // Shared with other computers: everything except the console's own page needs the access code (see server/auth.mjs).
  if (req.method === "POST" && url.pathname === "/api/login") {
    try { const b = await body(req); const r = await auth.login(req, b.code); return send(res, 200, { ok: true, shared: auth.shared }, "application/json", r.cookie ? { "Set-Cookie": r.cookie } : {}); }
    catch (e) { return send(res, e.status || 500, { error: e.message }); }
  }
  if (req.method === "POST" && url.pathname === "/api/logout") return send(res, 200, { ok: true }, "application/json", auth.shared ? { "Set-Cookie": auth.logout(req).cookie } : {});
  if (auth.needsCode(url.pathname) && !auth.signedIn(req)) {
    return url.pathname.startsWith("/api/") ? send(res, 401, { error: "Sign in with your team's access code first.", signIn: true }) : send(res, 401, "Sign in first.", "text/plain");
  }
  if (route) {
    try { send(res, 200, await route(req)); }
    catch (e) { send(res, e.status || 500, { error: e.message || "Something went wrong." }); if (!e.status) console.error(e); }
    return;
  }
  if (url.pathname.startsWith("/api/")) return send(res, 404, { error: "Not found." });
  // Static files: the console, plus read-only access to dist, draft outputs, and fonts.
  // readableStaticFile keeps every path inside its own folder (see server/static.mjs).
  const file = readableStaticFile(root, url.pathname);
  if (!file) return send(res, 404, "Not found", "text/plain");
  // A second lock: on a shared server, only the console's own files go out without the code, however the path was written.
  if (auth.shared && !isConsoleFile(root, file) && !auth.signedIn(req)) return send(res, 401, "Sign in first.", "text/plain");
  send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)] || "application/octet-stream");
}

http.createServer((req, res) => {
  // One bad request must never stop the server for everyone.
  handle(req, res).catch((e) => {
    console.error(e);
    if (!res.headersSent) send(res, 500, { error: "Something went wrong." }); else res.end();
  });
}).on("error", (e) => {
  if (e.code === "EADDRINUSE") console.error(`\n  Port ${PORT} is already used by another program. Close it, or start with: npm start (it picks a free port for you).\n`);
  else console.error(e);
  process.exit(1);
}).listen(PORT, hosting.host, () => {
  const shown = hosting.host.includes(":") ? `[${hosting.host}]` : hosting.host;
  console.log(`\n  Brand Console is running at http://${shown}:${PORT}`);
  if (auth.shared) console.log("  It is shared with other computers. People need the access code (AUTH_BEARER_TOKEN) to use it.");
  console.log(`  The guide is ${KEY ? "connected to Claude (" + MODEL + ")" : "using sample answers. Add ANTHROPIC_API_KEY to .env to connect it."}\n`);
});

// The Brand Console as a plain Node server, for running it on one computer with no Cloudflare parts: no wrangler, no
// Durable Object, no Cloudflare Access. scripts/local.mjs starts it (npm run local); docs/local-node.md says how.
//
// It runs the same console as the Worker (server/console.mjs and server/http.mjs). What differs:
//   the edits     wait in a SQLite file on this computer (dataDir), not in a Durable Object
//   sign-in       none. It only answers on this computer (127.0.0.1), and everyone is the one person in user
//   static files  served from assetsDir (npm run worker:assets makes them), not by Workers static assets
//   /api/live     WebSockets from the ws package, not Durable Object hibernation WebSockets
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { WebSocketServer } from "ws";
import { createConsole } from "./console.mjs";
import { handleRequest } from "./http.mjs";
import { createRoom } from "./live.mjs";
import { openSqliteFile } from "./storage/sqlite-file.mjs";

const LOCAL = new Set(["localhost", "127.0.0.1", "[::1]"]);
const TYPES = { html: "text/html; charset=utf-8", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", mjs: "text/javascript; charset=utf-8", json: "application/json", map: "application/json", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", ico: "image/x-icon", txt: "text/plain; charset=utf-8", md: "text/markdown; charset=utf-8", woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf" };
const refuse = (status, message) => Object.assign(new Error(message), { status });

/** Static files from dir, the way Workers static assets serves them (html_handling: auto-trailing-slash). */
export function serveStatic(dir) {
  const root = path.resolve(dir);
  const fileAt = (p) => { try { return fs.statSync(p); } catch { return null; } };
  const send = (file) => new Response(fs.readFileSync(file), { headers: { "content-type": TYPES[path.extname(file).slice(1)] || "application/octet-stream" } });
  return (request) => {
    const { pathname } = new URL(request.url);
    let rel;
    try { rel = decodeURIComponent(pathname); } catch { return new Response("Not found", { status: 404 }); }
    const at = path.resolve(root, "." + rel);
    if (at !== root && !at.startsWith(root + path.sep)) return new Response("Not found", { status: 404 });
    const s = fileAt(at);
    if (s && s.isFile()) return send(at);
    if (s && s.isDirectory()) {
      if (!pathname.endsWith("/")) return new Response(null, { status: 307, headers: { location: pathname + "/" } });
      if (fileAt(path.join(at, "index.html"))) return send(path.join(at, "index.html"));
    }
    if (fileAt(at + ".html")) return send(at + ".html");
    return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  };
}

/** A Node request as a web Request, so server/http.mjs can handle it. */
function webRequest(req) {
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) for (const x of [v].flat()) headers.append(k, x);
  const hasBody = !["GET", "HEAD"].includes(req.method);
  return new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers, ...(hasBody ? { body: Readable.toWeb(req), duplex: "half" } : {}) });
}

/**
 * Starts the server. Resolves with { url, close() }.
 *   env        the settings, like the Worker's (GITHUB_REPO, GITHUB_TOKEN, ANTHROPIC_API_KEY, ...)
 *   assetsDir  the console's static files and Storybook
 *   dataDir    where the SQLite file with the edits goes. There is one file per repository and branch.
 *   user       { email, name }, who every change is credited to
 *   port       0 picks a free one
 */
export async function startNodeServer({ env, assetsDir, dataDir, user, host = "127.0.0.1", port = 0 }) {
  const name = `${env.GITHUB_REPO || "unset"}#${env.GITHUB_BRANCH || "main"}`.replace(/[^\w.#-]+/g, "_");
  const sql = await openSqliteFile(path.join(dataDir, `${name}.sqlite`));

  // Everyone with the console open. What the room keeps about each page lives as long as its WebSocket.
  const sockets = new Set(), infos = new Map();
  const room = createRoom({ all: () => [...sockets].filter((ws) => ws.readyState === ws.OPEN), send: (ws, text) => ws.send(text), info: (ws) => infos.get(ws), setInfo: (ws, info) => infos.set(ws, info) });
  const designSystem = createConsole({
    env, sql, live: { edits: (m) => room.edits(m), refresh: (m) => room.refresh(m) },
    setupHelp: "See docs/local-node.md.", secretHelp: "Add it to .env and start the console again.",
  });
  const assets = serveStatic(assetsDir);
  const identify = async (request) => {
    // Only this computer. A web page elsewhere cannot reach in by pointing its own domain name at 127.0.0.1.
    if (!LOCAL.has(new URL(request.url).hostname)) throw refuse(403, "This console only answers on this computer (localhost).");
    return user;
  };

  const wss = new WebSocketServer({ noServer: true });
  const server = http.createServer(async (req, res) => {
    try {
      const r = await handleRequest(webRequest(req), { identify, designSystem, assets });
      res.writeHead(r.status, Object.fromEntries(r.headers));
      res.end(req.method === "HEAD" || !r.body ? undefined : Buffer.from(await r.arrayBuffer()));
    } catch (e) {
      console.error(e);
      if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end("Something went wrong.");
    }
  });
  // The live connection. The checks in server/http.mjs run first; live() is only called if they pass.
  server.on("upgrade", async (req, socket, head) => {
    let joined = null;
    let r;
    try {
      r = await handleRequest(webRequest(req), { identify, designSystem, assets, live: (request, who) => { joined = { page: new URL(request.url).searchParams.get("page"), user: who }; return null; } });
    } catch { r = new Response(null, { status: 400 }); }
    if (!joined) {
      const body = r ? await r.text() : "";
      socket.end(`HTTP/1.1 ${r.status} ${http.STATUS_CODES[r.status] || ""}\r\ncontent-type: application/json\r\ncontent-length: ${Buffer.byteLength(body)}\r\nconnection: close\r\n\r\n${body}`);
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      sockets.add(ws);
      ws.on("message", (data) => room.message(ws, data.toString()));
      const gone = () => { if (!sockets.delete(ws)) return; infos.delete(ws); room.leave(ws); };
      ws.on("close", gone);
      ws.on("error", gone);
      room.join(ws, joined);
    });
  });

  await new Promise((ok, fail) => { server.once("error", fail); server.listen(port, host, ok); });
  const url = `http://${host.includes(":") ? `[${host}]` : host}:${server.address().port}`;
  return {
    url,
    async close() {
      for (const ws of sockets) ws.terminate();
      await new Promise((ok) => server.close(ok));
      sql.close();
    },
  };
}

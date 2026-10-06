// Starts a real Brand Console server on a copy of the project, for tests.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import net from "node:net";
import { fileURLToPath } from "node:url";

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function copyProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bc-srv-"));
  for (const d of ["console", "server", "tokens", "releases", "scripts"]) fs.cpSync(path.join(here, d), path.join(root, d), { recursive: true });
  fs.copyFileSync(path.join(here, "package.json"), path.join(root, "package.json"));
  return root;
}
export function freePort() {
  return new Promise((ok) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });
}
/** Starts server/index.mjs. Resolves with { port, stop, log } once it listens, or { code, log } if it exits first. */
export async function startServer(root, env = {}) {
  const port = env.PORT ? Number(env.PORT) : await freePort();
  const kid = spawn(process.execPath, ["server/index.mjs"], { cwd: root, env: { ...process.env, ANTHROPIC_API_KEY: "", FIGMA_TOKEN: "", ...env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  kid.stdout.on("data", (d) => (log += d));
  kid.stderr.on("data", (d) => (log += d));
  return new Promise((ok) => {
    const t = setInterval(() => { if (/is running at/.test(log)) { clearInterval(t); ok({ port, log: () => log, stop: () => new Promise((d) => { kid.once("exit", d); kid.kill(); }) }); } }, 50);
    kid.once("exit", (code) => { clearInterval(t); ok({ code, log: () => log }); });
  });
}
/** A raw GET or POST that sends the path exactly as written (no dot-segment cleanup). */
export function request(port, rawPath, { method = "GET", headers = {}, body } = {}) {
  return new Promise((ok, bad) => {
    const req = http.request({ host: "127.0.0.1", port, path: rawPath, method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...headers } }, (res) => {
      let d = ""; res.on("data", (c) => (d += c)); res.on("end", () => ok({ status: res.statusCode, body: d }));
    });
    req.on("error", bad);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

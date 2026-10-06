// Starts the Worker in wrangler dev (Cloudflare's workerd runtime) and stops it cleanly. Used by npm start and
// npm run test:worker.
//
// wrangler runs in its own process group, so stopping it stops workerd too. Sending a signal to `npx` is not enough:
// on Linux, npx does not pass it on, and the Worker test once waited forever for a Worker that never stopped.
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";

export const freePort = () => new Promise((ok) => { const s = http.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });

/**
 * vars: settings for the Worker (wrangler dev --var). persistTo: where the Durable Object keeps its data.
 * echo: show wrangler's own output as it runs. Resolves with { base, log, stop } once the Worker answers.
 */
export async function startWranglerDev({ root, vars, persistTo, port, echo = false }) {
  port = port || await freePort();
  const args = [path.join(root, "node_modules/wrangler/bin/wrangler.js"), "dev", "--ip", "127.0.0.1", "--port", String(port), "--log-level", echo ? "info" : "warn", "--show-interactive-dev-session=false", "--inspector-port", String(await freePort())];
  if (persistTo) args.push("--persist-to", persistTo);
  for (const [k, v] of Object.entries(vars)) args.push("--var", `${k}:${v}`);
  const kid = spawn(process.execPath, args, { cwd: root, detached: true, env: { ...process.env, WRANGLER_SEND_METRICS: "false" }, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  const keep = (d) => { log += d; if (log.length > 200e3) log = log.slice(-100e3); if (echo) process.stdout.write(d); };
  kid.stdout.on("data", keep); kid.stderr.on("data", keep);
  const stop = () => new Promise((ok) => {
    if (kid.exitCode !== null || kid.signalCode !== null) return ok();
    const force = setTimeout(() => { try { process.kill(-kid.pid, "SIGKILL"); } catch { /* Already gone. */ } }, 5000);
    kid.once("exit", () => { clearTimeout(force); ok(); });
    try { process.kill(-kid.pid, "SIGTERM"); } catch { clearTimeout(force); ok(); }
  });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; ; i++) {
    try { const r = await fetch(base + "/api/health"); if (r.status) break; } catch { /* Not up yet. */ }
    if (i >= 300 || kid.exitCode !== null) { await stop(); throw new Error(`wrangler dev did not start within a minute.\n${log.slice(-3000)}`); }
    await new Promise((ok) => setTimeout(ok, 200));
  }
  return { base, log: () => log, stop };
}

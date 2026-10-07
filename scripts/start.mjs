// Runs the Brand Console on your computer the way Cloudflare runs it.
//   - The real Worker, in wrangler dev (Cloudflare's workerd runtime).
//   - A stand-in for GitHub (scripts/fake-github.mjs) holding the sample design system in fixtures/sample, so you
//     need no GitHub account, no Cloudflare account, and no internet. Saves and publishes stay until you stop it.
//   - Storybook at /storybook, from the @heymrcarter/design-system-storybook package, like on Cloudflare.
// It finds a free port on its own, prints the link, and opens the console in your browser.
// To run against a real GitHub repository instead, use npm run worker:dev with settings in .dev.vars.
import { execFileSync } from "node:child_process";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { startFakeGitHub, FAKE_REPO, FAKE_TOKEN } from "./fake-github.mjs";
import { startWranglerDev } from "./wrangler-dev.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function canUse(port, host) {
  return new Promise((ok) => {
    const s = net.createServer();
    s.once("error", (e) => ok(e.code === "EADDRNOTAVAIL" || e.code === "EAFNOSUPPORT")); // no IPv6 here is fine
    s.listen(port, host, () => s.close(() => ok(true)));
  });
}
async function freePort(start, avoid = []) {
  for (let p = start; p < start + 50; p++) {
    if (avoid.includes(p)) continue;
    if ((await canUse(p, "127.0.0.1")) && (await canUse(p, "::1"))) return p;
  }
  throw new Error(`No free port found near ${start}.`);
}
function openBrowser(url) {
  try {
    if (process.platform === "darwin") execFileSync("open", [url]);
    else if (process.platform === "win32") execFileSync("cmd", ["/c", "start", "", url]);
    else execFileSync("xdg-open", [url], { stdio: "ignore" });
  } catch { /* the link is printed below, so people can open it by hand */ }
}

// 0. If the project got new parts since the last setup, set them up now (the same as running npm install).
{
  const lock = path.join(root, "package-lock.json"), done = path.join(root, "node_modules", ".package-lock.json");
  const stale = fs.existsSync(lock) && (!fs.existsSync(done) || fs.statSync(lock).mtimeMs > fs.statSync(done).mtimeMs);
  if (stale) {
    console.log("\n  The project has new parts. Setting them up. This takes a minute.\n");
    execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["install"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
    const now = new Date(); fs.utimesSync(done, now, now);
  }
}

// 1. Gather the console's files for the Worker, with the packaged Storybook.
execFileSync(process.execPath, [path.join(root, "scripts", "build-worker-assets.mjs")], { stdio: "ignore", cwd: root });

// 2. Pick a port, start the stand-in for GitHub, and the Worker.
const consolePort = await freePort(Number(process.env.PORT || 5173));
if (consolePort !== 5173) console.log("\n  Another program was using the usual port, so this link uses a different number.");

const state = fs.mkdtempSync(path.join(os.tmpdir(), "brand-console-"));
const fake = await startFakeGitHub(path.join(root, "fixtures", "sample"), { onWrite: (msg) => console.log(`  Published to the stand-in for GitHub: ${msg.split("\n")[0]}`) });
const worker = await startWranglerDev({
  root, port: consolePort, persistTo: state,
  vars: { GITHUB_REPO: FAKE_REPO, GITHUB_TOKEN: FAKE_TOKEN, GITHUB_API: fake.url, ACCESS_LOCAL_DEV: "allow",
    // The guide uses Claude when the key is in the environment: ANTHROPIC_API_KEY=... npm start
    ...(process.env.ANTHROPIC_API_KEY ? { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY } : {}) },
});
let stopping = false;
async function stopAll(code = 0) {
  if (stopping) return; stopping = true;
  await worker.stop(); await fake.close();
  fs.rmSync(state, { recursive: true, force: true });
  process.exit(code);
}
process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

console.log(`
  Brand Console:  ${worker.base}
  Storybook:      ${worker.base}/storybook/

  Saves and publishes last until you stop. To stop, press Ctrl + C.
`);
openBrowser(worker.base);

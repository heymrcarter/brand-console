// Runs the Brand Console on your computer the way Cloudflare runs it, with Storybook next to it.
//   - The real Worker, in wrangler dev (Cloudflare's workerd runtime).
//   - A stand-in for GitHub (scripts/fake-github.mjs) holding this project's design system, so you need no GitHub
//     account, no Cloudflare account, and no internet. Saves and publishes stay until you stop it.
//   - Storybook, whose "Real component" preview follows your edits: the draft's theme files are copied into
//     build/draft/ a moment after each change, and Storybook reloads from there.
// It finds free ports on its own, prints the links, and opens the console in your browser.
// To run against a real GitHub repository instead, use npm run worker:dev with settings in .dev.vars.
import { spawn, execFileSync } from "node:child_process";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { startFakeGitHub, FAKE_REPO, FAKE_TOKEN } from "./fake-github.mjs";
import { startWranglerDev } from "./wrangler-dev.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = (n) => path.join(root, "node_modules", ".bin", process.platform === "win32" ? n + ".cmd" : n);

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

// 1. Build the theme files from the token files, and the console's files for the Worker.
execFileSync(process.execPath, [path.join(root, "scripts", "build.mjs")], { stdio: "inherit", cwd: root });
execFileSync(process.execPath, [path.join(root, "scripts", "build-worker-assets.mjs"), "--no-storybook"], { stdio: "ignore", cwd: root });

// 2. Pick ports, start the stand-in for GitHub, and the Worker.
const consolePort = await freePort(Number(process.env.PORT || 5173));
const sbPort = await freePort(6006, [consolePort]);
const sbUrl = `http://127.0.0.1:${sbPort}`;
if (consolePort !== 5173 || sbPort !== 6006) console.log("\n  Another program was using the usual ports, so these links use different numbers.");

const state = fs.mkdtempSync(path.join(os.tmpdir(), "brand-console-"));
const fake = await startFakeGitHub(root, { onWrite: (msg) => console.log(`  Published to the stand-in for GitHub: ${msg.split("\n")[0]}`) });
const worker = await startWranglerDev({
  root, port: consolePort, persistTo: state,
  vars: { GITHUB_REPO: FAKE_REPO, GITHUB_TOKEN: FAKE_TOKEN, GITHUB_API: fake.url, ACCESS_LOCAL_DEV: "allow", STORYBOOK_URL: sbUrl,
    // The guide uses Claude when the key is in the environment: ANTHROPIC_API_KEY=... npm start
    ...(process.env.ANTHROPIC_API_KEY ? { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY } : {}) },
});
const kids = [];
let stopping = false, sync = null;
async function stopAll(code = 0) {
  if (stopping) return; stopping = true;
  clearInterval(sync);
  kids.forEach((k) => { try { k.kill(); } catch { /* Already gone. */ } });
  await worker.stop(); await fake.close();
  fs.rmSync(state, { recursive: true, force: true });
  process.exit(code);
}
process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

// 3. Keep build/draft/ in step with the draft, so Storybook shows each change.
const DRAFT_FILES = ["theme.css", "settings.json", "components.manifest.json", "tokens.resolved.json"];
sync = setInterval(async () => {
  for (const f of DRAFT_FILES) {
    try {
      const r = await fetch(`${worker.base}/build/draft/${f}`);
      if (!r.ok) continue;
      const text = await r.text(), file = path.join(root, "build", "draft", f);
      if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== text) fs.writeFileSync(file, text);
    } catch { /* The Worker is restarting, or stopping. The next round catches up. */ }
  }
}, 1000);

console.log(`  ┌───────────────────────────────────────────────┐`);
console.log(`  │  Brand Console:  ${worker.base.padEnd(29)}│`);
console.log(`  │  Storybook:      ${sbUrl.padEnd(29)}│`);
console.log(`  │  Storybook takes about 20 seconds to start.   │`);
console.log(`  │  Saves and publishes last until you stop.     │`);
console.log(`  └───────────────────────────────────────────────┘\n`);
openBrowser(worker.base);

// 4. Start Storybook. If it fails, the console keeps running.
if (fs.existsSync(bin("storybook"))) {
  const sb = spawn(bin("storybook"), ["dev", "-p", String(sbPort), "--host", "127.0.0.1", "--no-open", "--ci", "--quiet"], { cwd: root, stdio: ["ignore", "inherit", "inherit"], shell: process.platform === "win32" });
  kids.push(sb);
  sb.on("exit", (code) => { if (code && !stopping) console.log("\n  Storybook stopped because of an error. The console still works."); });
} else {
  console.log("\n  Storybook is not installed yet. Run npm install, then start again.");
}

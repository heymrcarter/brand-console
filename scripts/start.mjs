// Starts the Brand Console and Storybook together.
// It finds free ports on its own, so other projects on your computer do not get in the way,
// prints the working links, and opens the console in your browser.
import { spawn, execFileSync } from "node:child_process";
import net from "node:net";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

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
    try {
      execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["install"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
      const now = new Date(); fs.utimesSync(done, now, now);
    } catch { console.log("\n  Setup did not finish. The console still starts, but Storybook may not. Copy the red lines above and paste them to Claude.\n"); }
  }
}

// 1. Build the theme files from the token files.
execFileSync(process.execPath, [path.join(root, "scripts", "build.mjs")], { stdio: "inherit", cwd: root });

// 2. Pick ports.
const consolePort = await freePort(Number(process.env.PORT || 5173));
const sbPort = await freePort(6006, [consolePort]);
const consoleUrl = `http://127.0.0.1:${consolePort}`;
const sbUrl = `http://127.0.0.1:${sbPort}`;
if (consolePort !== 5173 || sbPort !== 6006) console.log("\n  Another program was using the usual ports, so these links use different numbers.");

const kids = [];
const stopAll = () => { kids.forEach((k) => { try { k.kill(); } catch {} }); };
process.on("SIGINT", () => { stopAll(); process.exit(0); });
process.on("SIGTERM", () => { stopAll(); process.exit(0); });

// 3. Start the console.
const con = spawn(process.execPath, [path.join(root, "server", "index.mjs")], { cwd: root, stdio: ["ignore", "pipe", "inherit"], env: { ...process.env, PORT: String(consolePort), STORYBOOK_URL: sbUrl } });
kids.push(con);
let opened = false;
con.stdout.on("data", (d) => {
  process.stdout.write(d);
  if (!opened && /is running at/.test(String(d))) {
    opened = true;
    console.log(`  ┌───────────────────────────────────────────────┐`);
    console.log(`  │  Brand Console:  ${consoleUrl.padEnd(29)}│`);
    console.log(`  │  Storybook:      ${sbUrl.padEnd(29)}│`);
    console.log(`  │  Storybook takes about 20 seconds to start.   │`);
    console.log(`  │  Keep this window open while you work.        │`);
    console.log(`  └───────────────────────────────────────────────┘\n`);
    openBrowser(consoleUrl);
  }
});
con.on("exit", (code) => { if (code) { console.log("\n  The console stopped because of an error. Copy the lines above and paste them to Claude."); stopAll(); process.exit(code); } });

// 4. Start Storybook. If it fails, the console keeps running.
if (fs.existsSync(bin("storybook"))) {
  const sb = spawn(bin("storybook"), ["dev", "-p", String(sbPort), "--host", "127.0.0.1", "--no-open", "--ci", "--quiet"], { cwd: root, stdio: ["ignore", "inherit", "inherit"], shell: process.platform === "win32" });
  kids.push(sb);
  sb.on("exit", (code) => { if (code) console.log("\n  Storybook stopped because of an error. The console still works. Copy the lines above and paste them to Claude if you need Storybook."); });
} else {
  console.log("\n  Storybook is not installed yet. Run npm install, then start again.");
}

// Runs the Brand Console on your computer as a plain Node process: no wrangler, no Cloudflare account, no Cloudflare
// Access sign-in. See docs/local-node.md.
//   npm run local            against the real design system repository, with the settings in .env
//   npm run local:sample     against a stand-in for GitHub holding the sample design system (no GitHub needed)
// The edits wait in .local-data/ between runs (with --sample, in a temporary folder that is removed on stop).
// Set PORT to pick the port (5173 by default) and NO_OPEN=1 to keep the browser closed.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startNodeServer } from "../server/node-server.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sample = process.argv.includes("--sample");

// Settings from .env, like .dev.vars for wrangler dev. Settings already in the environment win.
if (fs.existsSync(path.join(root, ".env"))) process.loadEnvFile(path.join(root, ".env"));
const env = { ...process.env };

function gitConfig(key) {
  try { return execFileSync("git", ["config", key], { cwd: root, encoding: "utf8" }).trim(); } catch { return ""; }
}
// There is no sign-in, so changes are credited to you: CONSOLE_USER_EMAIL and CONSOLE_USER_NAME, or your Git name.
const user = { email: env.CONSOLE_USER_EMAIL || gitConfig("user.email") || "local-dev", name: env.CONSOLE_USER_NAME || gitConfig("user.name") || "Local development" };

let fake = null, dataDir = path.join(root, ".local-data");
if (sample) {
  const { startFakeGitHub, FAKE_REPO, FAKE_TOKEN } = await import("./fake-github.mjs");
  fake = await startFakeGitHub(path.join(root, "fixtures", "sample"));
  Object.assign(env, { GITHUB_REPO: FAKE_REPO, GITHUB_BRANCH: "main", GITHUB_TOKEN: FAKE_TOKEN, GITHUB_API: fake.url, REVIEWERS: "local-reviewer" });
  for (const k of ["GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY", "GITHUB_APP_INSTALLATION_ID"]) delete env[k];
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "brand-console-"));
} else if (!env.GITHUB_REPO || !(env.GITHUB_TOKEN || env.GITHUB_APP_ID)) {
  console.log("\n  GITHUB_REPO and a GITHUB_TOKEN (or GitHub App) are not set, so the console will say it cannot reach GitHub.\n  Copy .env.example to .env and fill it in, or run npm run local:sample to try it with the sample design system.");
}

// The console's files and Storybook, the same ones the Worker serves.
execFileSync(process.execPath, [path.join(root, "scripts", "build-worker-assets.mjs")], { stdio: "ignore", cwd: root });

let server;
try {
  server = await startNodeServer({ env, user, dataDir, assetsDir: path.join(root, ".worker-assets"), port: Number(env.PORT || 5173) });
} catch (e) {
  if (e.code === "EADDRINUSE") { console.error(`\n  Port ${env.PORT || 5173} is in use. Pick another one: PORT=5174 npm run local\n`); process.exit(1); }
  throw e;
}

let stopping = false;
async function stop() {
  if (stopping) return; stopping = true;
  await server.close();
  if (fake) { await fake.close(); fs.rmSync(dataDir, { recursive: true, force: true }); }
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

console.log(`
  Brand Console:  ${server.url}
  Storybook:      ${server.url}/storybook/
  Design system:  ${env.GITHUB_REPO || "(not set)"} (${env.GITHUB_BRANCH || "main"})
  Signed in as:   ${user.name} <${user.email}>
${fake ? `
  This is the sample design system. Edits and proposals last until you stop. To land or withdraw a proposal:
    curl -X POST ${fake.url}/_local/pulls/1/merge
    curl -X POST ${fake.url}/_local/pulls/1/close
` : ""}
  To stop, press Ctrl + C.
`);
if (!env.NO_OPEN) {
  try { execFileSync(process.platform === "darwin" ? "open" : "xdg-open", [server.url], { stdio: "ignore" }); } catch { /* The link is printed above. */ }
}

// Deploys the Worker from GitHub Actions (.github/workflows/deploy-worker.yml). See docs/cloudflare.md.
//
// The settings live in the repository's Actions variables and secrets, not in wrangler.jsonc, so a deploy from
// someone's computer cannot ship settings that differ from what the team agreed on. This script:
//   1. checks every setting, and lists everything that is wrong at once
//   2. sends the settings with the deploy (wrangler deploy --var), and the secrets in a file that is deleted after
//   3. checks that the deployed address sends people to Cloudflare Access to sign in
//
// Actions variables cannot start with GITHUB_, so the names differ from the Worker's:
//   REPO -> GITHUB_REPO   BRANCH -> GITHUB_BRANCH   GH_APP_ID -> GITHUB_APP_ID   GH_APP_INSTALLATION_ID -> GITHUB_APP_INSTALLATION_ID
//   STORYBOOK_PREVIEW_URL (optional) -> STORYBOOK_PREVIEW_URL   REVIEWERS (optional) -> REVIEWERS
//   TEAM_DOMAIN and POLICY_AUD keep their names. Secrets: GH_APP_PRIVATE_KEY -> GITHUB_APP_PRIVATE_KEY, ANTHROPIC_API_KEY.
//
// Usage (in GitHub Actions):  node scripts/deploy-worker.mjs
//        node scripts/deploy-worker.mjs --check     only check the settings, Cloudflare token too (the workflow's first step)
//        node scripts/deploy-worker.mjs --dry-run   check, and build the deploy without uploading it. Needs no token.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createAccess } from "../worker/access.mjs";
import { importAppKey } from "../server/storage/github-app.mjs";

/** Checks the settings in env. Returns { vars, secrets, problems, notes }. vars and secrets use the Worker's names. */
export async function checkSettings(env, { needCloudflare = true } = {}) {
  const problems = [], notes = [];
  const get = (k) => String(env[k] ?? "").trim();
  const vars = { GITHUB_REPO: get("REPO"), GITHUB_BRANCH: get("BRANCH") || "main", TEAM_DOMAIN: get("TEAM_DOMAIN"), POLICY_AUD: get("POLICY_AUD") };
  const reviewers = get("REVIEWERS");
  if (reviewers) {
    const logins = reviewers.split(",").map((x) => x.trim()).filter(Boolean);
    const bad = logins.filter((l) => !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(l));
    if (bad.length) problems.push(`REVIEWERS must be GitHub logins separated by commas, like "sam,lee". These are not: ${bad.join(", ")}.`);
    else vars.REVIEWERS = logins.join(",");
  }
  const preview = get("STORYBOOK_PREVIEW_URL");
  if (preview) {
    if (!/^https:\/\/\S*\{number\}\S*$/.test(preview)) problems.push(`STORYBOOK_PREVIEW_URL must be an https address with {number} where the pull request number goes. It is ${JSON.stringify(preview)}.`);
    else vars.STORYBOOK_PREVIEW_URL = preview;
  }

  if (!/^[\w.-]+\/[\w.-]+$/.test(vars.GITHUB_REPO)) problems.push(`REPO must be the design system repository that proposals go to, like "acme/design-system". It is ${JSON.stringify(vars.GITHUB_REPO)}.`);
  if (/\s/.test(vars.GITHUB_BRANCH)) problems.push(`BRANCH cannot have spaces. It is ${JSON.stringify(vars.GITHUB_BRANCH)}.`);
  // Access can only be turned on for a Worker that exists, so the first deploy has neither. The Worker then refuses
  // every request, which is safe. One without the other is a mistake.
  if (!vars.TEAM_DOMAIN && !vars.POLICY_AUD) notes.push("TEAM_DOMAIN and POLICY_AUD are not set, so the Worker refuses every request until Cloudflare Access is set up. See docs/cloudflare.md, step 5.");
  else if (!vars.TEAM_DOMAIN || !vars.POLICY_AUD) problems.push("TEAM_DOMAIN and POLICY_AUD go together: set both, from the Cloudflare Access application, or neither.");
  else {
    try { createAccess({ teamDomain: vars.TEAM_DOMAIN, aud: vars.POLICY_AUD }); }
    catch (e) { problems.push(`${e.message}. It is ${JSON.stringify(vars.TEAM_DOMAIN)}.`); }
    if (!/^[0-9a-f]{64}$/.test(vars.POLICY_AUD)) problems.push("POLICY_AUD must be the Access application's AUD tag: 64 letters and digits, 0-9 and a-f.");
  }

  const appId = get("GH_APP_ID"), install = get("GH_APP_INSTALLATION_ID"), key = String(env.GH_APP_PRIVATE_KEY ?? "");
  if (appId || install) {
    if (!/^\d+$/.test(appId)) problems.push(`GH_APP_ID must be the GitHub App's number. It is ${JSON.stringify(appId)}.`);
    if (!/^\d+$/.test(install)) problems.push(`GH_APP_INSTALLATION_ID must be the number at the end of the app's installation page address. It is ${JSON.stringify(install)}.`);
    vars.GITHUB_APP_ID = appId; vars.GITHUB_APP_INSTALLATION_ID = install;
    if (key.trim()) { try { await importAppKey(key); } catch (e) { problems.push(`GH_APP_PRIVATE_KEY: ${e.message}`); } }
    else notes.push("GH_APP_PRIVATE_KEY is not a repository secret, so the Worker keeps the key already stored in Cloudflare.");
  } else {
    notes.push("No GitHub App is set (GH_APP_ID), so the Worker needs a GITHUB_TOKEN secret already stored in Cloudflare.");
  }

  const secrets = {};
  if (key.trim()) secrets.GITHUB_APP_PRIVATE_KEY = key;
  if (String(env.ANTHROPIC_API_KEY ?? "").trim()) secrets.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
  if (needCloudflare && !get("CLOUDFLARE_API_TOKEN")) problems.push("CLOUDFLARE_API_TOKEN is needed to deploy. Make one in the Cloudflare dashboard with the \"Edit Cloudflare Workers\" template, and add it as a repository secret.");
  return { vars, secrets, problems, notes };
}

/** Runs wrangler, sending its output through and keeping it. */
function wrangler(args) {
  return new Promise((ok, bad) => {
    const kid = spawn("npx", ["wrangler", ...args], { stdio: ["ignore", "pipe", "inherit"], env: { ...process.env, WRANGLER_SEND_METRICS: "false" } });
    let out = ""; kid.stdout.on("data", (d) => { out += d; process.stdout.write(d); });
    kid.on("exit", (code) => (code === 0 ? ok(out) : bad(new Error(`wrangler ${args[0]} stopped with code ${code}.`))));
  });
}

/**
 * After a deploy, the address must send people to Access to sign in. Anything else means the console is open or broken.
 * Before Access is set up (accessSet false), the Worker itself must refuse the request instead.
 */
export async function checkSignInWall(url, fetchFn = fetch, { accessSet = true } = {}) {
  const r = await fetchFn(url, { redirect: "manual" });
  const to = r.headers.get("location") || "";
  if (!accessSet) {
    if (r.status === 403 || (r.status === 302 && /\.cloudflareaccess\.com\//i.test(to))) return `${url} is closed until Cloudflare Access is set up (${r.status}).`;
    throw new Error(`${url} should refuse every request until Cloudflare Access is set up, but answered ${r.status}.`);
  }
  if (r.status === 302 && /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com\//i.test(to)) return `${url} sends people to Cloudflare Access to sign in.`;
  throw new Error(`${url} should send people to Cloudflare Access to sign in, but answered ${r.status}${to ? ` (to ${to})` : ""}. Check that Access is turned on for the Worker.`);
}

async function main() {
  const args = process.argv.slice(2), checkOnly = args.includes("--check"), dryRun = args.includes("--dry-run");
  if (!checkOnly && !dryRun && process.env.GITHUB_ACTIONS !== "true") {
    console.error("Deploys run from GitHub Actions, with the settings stored in the repository. Push to main, or run the \"Deploy Worker\" workflow from the Actions tab. See docs/cloudflare.md.");
    process.exit(1);
  }
  // --check runs first in the workflow, so a missing token fails there, not after the long build.
  const { vars, secrets, problems, notes } = await checkSettings(process.env, { needCloudflare: !dryRun });
  for (const n of notes) console.log(`Note: ${n}`);
  if (problems.length) {
    console.error(`The deploy settings have ${problems.length} problem${problems.length > 1 ? "s" : ""}. Fix them under Settings > Secrets and variables > Actions:`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`Settings look right: ${vars.GITHUB_REPO} (${vars.GITHUB_BRANCH}), ${vars.GITHUB_APP_ID ? "GitHub App " + vars.GITHUB_APP_ID : "GITHUB_TOKEN"}, Access ${vars.TEAM_DOMAIN || "not set up yet"}. Secrets sent with this deploy: ${Object.keys(secrets).join(", ") || "none"}.`);
  if (checkOnly) return;

  // The secrets file is readable only by this user, and is deleted however the deploy ends.
  const file = path.join(process.env.RUNNER_TEMP || os.tmpdir(), `worker-secrets-${process.pid}.json`);
  const deployArgs = ["deploy", ...Object.entries(vars).flatMap(([k, v]) => ["--var", `${k}:${v}`])];
  if (Object.keys(secrets).length) { fs.writeFileSync(file, JSON.stringify(secrets), { mode: 0o600 }); deployArgs.push("--secrets-file", file); }
  if (process.env.GITHUB_SHA) deployArgs.push("--message", `GitHub Actions: ${process.env.GITHUB_SHA.slice(0, 7)}`);
  if (dryRun) deployArgs.push("--dry-run");
  let out;
  try { out = await wrangler(deployArgs); } finally { fs.rmSync(file, { force: true }); }
  if (dryRun) return;
  const url = (out.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/i) || [])[0];
  if (!url) { console.log("Note: wrangler did not print a workers.dev address, so the sign-in check was skipped."); return; }
  console.log(await checkSignInWall(url, fetch, { accessSet: !!vars.TEAM_DOMAIN }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });

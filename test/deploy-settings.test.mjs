// The deploy script's checks (scripts/deploy-worker.mjs): the settings GitHub Actions sends with each deploy.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { checkSettings, checkSignInWall } from "../scripts/deploy-worker.mjs";

const good = {
  REPO: "heymrcarter/DSConsole", BRANCH: "main", GH_APP_ID: "5214657", GH_APP_INSTALLATION_ID: "168610785",
  TEAM_DOMAIN: "https://prism-carston-ai.cloudflareaccess.com", POLICY_AUD: "82e73e22158909057939e1f68e328d14087729ba4aa6e73deb87d7c38978fa84",
  CLOUDFLARE_API_TOKEN: "cf-token", ANTHROPIC_API_KEY: "sk-test",
};
const KEY = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs1", format: "pem" });

test("good settings pass, and map to the Worker's names", async () => {
  const r = await checkSettings({ ...good, GH_APP_PRIVATE_KEY: KEY });
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.vars, { GITHUB_REPO: "heymrcarter/DSConsole", GITHUB_BRANCH: "main", TEAM_DOMAIN: good.TEAM_DOMAIN, POLICY_AUD: good.POLICY_AUD, GITHUB_APP_ID: "5214657", GITHUB_APP_INSTALLATION_ID: "168610785" });
  assert.deepEqual(Object.keys(r.secrets).sort(), ["ANTHROPIC_API_KEY", "GITHUB_APP_PRIVATE_KEY"]);
});

test("a space in TEAM_DOMAIN, like https: //, is caught before deploying", async () => {
  const r = await checkSettings({ ...good, TEAM_DOMAIN: "https: //prism-carston-ai.cloudflareaccess.com" });
  assert.equal(r.problems.length, 1);
  assert.match(r.problems[0], /TEAM_DOMAIN must look like.*"https: \/\/prism-carston-ai/);
});

test("every problem is listed at once", async () => {
  const r = await checkSettings({ REPO: "not a repo", BRANCH: "my branch", GH_APP_ID: "abc", GH_APP_INSTALLATION_ID: "", TEAM_DOMAIN: "https://x.cloudflareaccess.com", POLICY_AUD: "short", GH_APP_PRIVATE_KEY: "not a key" });
  for (const re of [/REPO must be/, /BRANCH cannot have spaces/, /POLICY_AUD must be/, /GH_APP_ID must be/, /GH_APP_INSTALLATION_ID must be/, /GH_APP_PRIVATE_KEY: .*not a private key/, /CLOUDFLARE_API_TOKEN is needed/]) assert.ok(r.problems.some((p) => re.test(p)), `${re} in ${r.problems.join(" | ")}`);
  const half = await checkSettings({ ...good, POLICY_AUD: "" });
  assert.match(half.problems.join(" "), /TEAM_DOMAIN and POLICY_AUD go together/);
});

test("secrets that are not in the repository are left to Cloudflare, with a note", async () => {
  const r = await checkSettings({ ...good, ANTHROPIC_API_KEY: "" });
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.secrets, {}, "nothing is sent, so the secrets already in Cloudflare stay");
  assert.match(r.notes.join(" "), /keeps the key already stored in Cloudflare/);
  const noApp = await checkSettings({ ...good, GH_APP_ID: "", GH_APP_INSTALLATION_ID: "" });
  assert.ok(!("GITHUB_APP_ID" in noApp.vars) && /GITHUB_TOKEN secret/.test(noApp.notes.join(" ")));
  assert.deepEqual((await checkSettings({ ...good, CLOUDFLARE_API_TOKEN: "" }, { needCloudflare: false })).problems, [], "--check and --dry-run need no Cloudflare token");
});

test("the first deploy may come before Access is set up, because Access needs a Worker to protect", async () => {
  const r = await checkSettings({ ...good, TEAM_DOMAIN: "", POLICY_AUD: "" });
  assert.deepEqual(r.problems, []);
  assert.match(r.notes.join(" "), /refuses every request until Cloudflare Access is set up/);
  const answer = (status) => async () => new Response("This console is not set up for sign-in yet.", { status });
  assert.match(await checkSignInWall("https://bc.example.workers.dev", answer(403), { accessSet: false }), /closed until Cloudflare Access is set up/);
  await assert.rejects(checkSignInWall("https://bc.example.workers.dev", answer(200), { accessSet: false }), /should refuse every request/);
});

test("after a deploy, the address must send people to Cloudflare Access", async () => {
  const answer = (status, location) => async () => new Response(null, { status, headers: location ? { location } : {} });
  assert.match(await checkSignInWall("https://bc.example.workers.dev", answer(302, "https://acme.cloudflareaccess.com/cdn-cgi/access/login/bc")), /sends people to Cloudflare Access/);
  await assert.rejects(checkSignInWall("https://bc.example.workers.dev", answer(200)), /answered 200/);
  await assert.rejects(checkSignInWall("https://bc.example.workers.dev", answer(302, "https://evil.example/login")), /answered 302 \(to https:\/\/evil/);
  await assert.rejects(checkSignInWall("https://bc.example.workers.dev", answer(403)), /Check that Access is turned on/);
});

test("a Storybook preview address is optional, and must say where the pull request number goes", async () => {
  const none = await checkSettings({ ...good, GH_APP_PRIVATE_KEY: KEY });
  assert.equal(none.vars.STORYBOOK_PREVIEW_URL, undefined);
  const ok = await checkSettings({ ...good, GH_APP_PRIVATE_KEY: KEY, STORYBOOK_PREVIEW_URL: "https://pr-{number}-design-system-storybook.acme.workers.dev" });
  assert.equal(ok.vars.STORYBOOK_PREVIEW_URL, "https://pr-{number}-design-system-storybook.acme.workers.dev");
  const bad = await checkSettings({ ...good, GH_APP_PRIVATE_KEY: KEY, STORYBOOK_PREVIEW_URL: "https://pr-design-system-storybook.acme.workers.dev" });
  assert.ok(bad.problems.some((p) => /\{number\}/.test(p)));
});

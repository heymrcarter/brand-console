// One design system's server side, as a Durable Object. There is one per GitHub repository and branch.
//
// Every save and proposal for that design system runs here, one at a time, which is what a Durable Object is for:
// a single place that orders the writes, however many copies of the Worker are running. The edits wait in this
// object's SQLite database, on top of the repository's main branch, so they last if the object restarts. They go to
// GitHub only as changes on a proposal's branch (server/proposals.mjs), never straight to main.
import { DurableObject } from "cloudflare:workers";
import { createStore } from "../server/store.mjs";
import { createFigma } from "../server/figma.mjs";
import { createApi } from "../server/api.mjs";
import { createProposals } from "../server/proposals.mjs";
import { createGitHubClient } from "../server/github-client.mjs";
import { createMemoryStorage } from "../server/storage/memory.mjs";
import { createAsk } from "../server/ask.mjs";
import { createGitHubStorage } from "../server/storage/github.mjs";
import { createGitHubAppToken } from "../server/storage/github-app.mjs";
import { storageKey } from "../server/storage/storage.mjs";
import { createDurableStorage, createDurableSecrets, createDurableKV } from "./durable-storage.mjs";

const plainErr = (status, message) => Object.assign(new Error(message), { status });

/** The GitHub token: a GitHub App when GITHUB_APP_ID is set (recommended), otherwise a token in GITHUB_TOKEN. */
function githubToken(env) {
  if (env.GITHUB_APP_ID) return createGitHubAppToken({ appId: env.GITHUB_APP_ID, privateKey: env.GITHUB_APP_PRIVATE_KEY, installationId: env.GITHUB_APP_INSTALLATION_ID, apiBase: env.GITHUB_API });
  if (env.GITHUB_TOKEN) return env.GITHUB_TOKEN;
  throw plainErr(503, "The console cannot reach GitHub yet. Set up a GitHub App (GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_INSTALLATION_ID) or a GITHUB_TOKEN. See docs/cloudflare.md.");
}

export class DesignSystem extends DurableObject {
  // Made on first use, so a setting that is missing shows up as a clear error in the console, not a crash.
  #parts = null;
  parts() {
    if (this.#parts) return this.#parts;
    const env = this.env;
    if (!env.GITHUB_REPO) throw plainErr(503, 'Set GITHUB_REPO to the repository that holds the design system, like "acme/design-system".');
    const sql = this.ctx.storage.sql;
    const token = githubToken(env), branch = env.GITHUB_BRANCH || "main", apiBase = env.GITHUB_API || undefined;
    // storage: main with the edits on top. live: main alone, what has landed.
    const storage = createGitHubStorage({ repo: env.GITHUB_REPO, branch, token, pending: createDurableStorage(sql), apiBase });
    const live = createGitHubStorage({ repo: env.GITHUB_REPO, branch, token, pending: createMemoryStorage(), apiBase });
    // The Worker has 10 ms of CPU per request on the free plan, so the engine's results are not copied. See server/engine.mjs.
    const store = createStore(storage, { live, copyEngineResults: false });
    const github = createGitHubClient({ repo: env.GITHUB_REPO, token, apiBase });
    const proposals = createProposals({ github, store, edits: storage, kv: createDurableKV(sql), base: branch, previewUrl: env.STORYBOOK_PREVIEW_URL || "", reviewers: String(env.REVIEWERS || "").split(",").map((x) => x.trim()).filter(Boolean), onLanded: () => { storage.refresh(); live.refresh(); } });
    const figma = createFigma({ storage, secrets: createDurableSecrets(sql, env), store, apiBase: env.FIGMA_API || undefined });
    const model = env.ANTHROPIC_MODEL || "claude-sonnet-5";
    const api = createApi({
      store, proposals, figma,
      ask: createAsk({ key: env.ANTHROPIC_API_KEY, model, missingKeyHelp: "Set it with: npx wrangler secret put ANTHROPIC_API_KEY" }),
      info: () => ({ ai: !!env.ANTHROPIC_API_KEY, model, storybook: env.STORYBOOK_URL || "/storybook", github: { repo: env.GITHUB_REPO, branch } }),
      // Everyone is an admin for now. Later: map Microsoft Entra ID groups to "viewer", "editor", and "admin" here.
      roleOf: () => "admin",
    });
    this.#parts = { storage, api };
    return this.#parts;
  }

  /** Runs one API route. Errors come back as { status, body } because an error's own fields do not survive RPC. */
  async api(method, path, body, user) {
    try {
      const { api } = this.parts();
      if (!api.has(method, path)) return { status: 404, body: { error: "Not found." } };
      return { status: 200, body: await api.call(method, path, body, user) };
    } catch (e) {
      if (!e.status) console.error(e);
      return { status: e.status || 500, body: { error: e.message || "Something went wrong." } };
    }
  }

  /** An uploaded font file, as bytes, or null. The page loads them for its previews. */
  async file(path) {
    let key;
    try { key = storageKey(path); } catch { return null; }
    if (!/^fonts\//.test(key)) return null;
    return this.parts().storage.readBytes(key);
  }
}

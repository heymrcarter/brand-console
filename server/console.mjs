// One design system's console: the store, proposals, Figma, and the API, put together from the settings. Both ways of
// running the console use it:
//   - the Cloudflare Worker's Durable Object (worker/design-system.mjs), with the edits in its SQLite
//   - the Node server (server/node-server.mjs), with the edits in a SQLite file on this computer
// They differ only in where the edits wait and how pages connect, so those come in from outside.
//
// env: the settings (GITHUB_REPO, GITHUB_BRANCH, GITHUB_TOKEN or a GitHub App, ANTHROPIC_API_KEY, ...). See
// .dev.vars.example for the full list.
// sql: a SQLite database with exec(query, ...bindings).toArray(), for the edits, secrets, and proposal record.
// live: { edits(m), refresh(m) }, the live room, so other pages see changes.
import { createStore } from "./store.mjs";
import { createFigma } from "./figma.mjs";
import { createApi } from "./api.mjs";
import { createProposals } from "./proposals.mjs";
import { createGitHubClient } from "./github-client.mjs";
import { createMemoryStorage } from "./storage/memory.mjs";
import { createAsk } from "./ask.mjs";
import { createGitHubStorage } from "./storage/github.mjs";
import { createGitHubAppToken } from "./storage/github-app.mjs";
import { storageKey } from "./storage/storage.mjs";
import { createSqlStorage, createSqlSecrets, createSqlKV } from "./storage/sql.mjs";

const plainErr = (status, message) => Object.assign(new Error(message), { status });

/** The GitHub token: a GitHub App when GITHUB_APP_ID is set (recommended), otherwise a token in GITHUB_TOKEN. */
function githubToken(env, setupHelp) {
  if (env.GITHUB_APP_ID) return createGitHubAppToken({ appId: env.GITHUB_APP_ID, privateKey: env.GITHUB_APP_PRIVATE_KEY, installationId: env.GITHUB_APP_INSTALLATION_ID, apiBase: env.GITHUB_API });
  if (env.GITHUB_TOKEN) return env.GITHUB_TOKEN;
  throw plainErr(503, `The console cannot reach GitHub yet. Set up a GitHub App (GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_INSTALLATION_ID) or a GITHUB_TOKEN. ${setupHelp}`);
}

/**
 * setupHelp: where to read about settings, added to errors about missing ones.
 * secretHelp: how to set the Claude key, for the guide's error when it is missing.
 * Returns { api(method, path, body, user), file(path) }. The parts are made on first use, so a missing setting shows
 * up as a clear error in the console, not a crash.
 */
export function createConsole({ env, sql, live, setupHelp = "", secretHelp }) {
  let parts = null;
  function made() {
    if (parts) return parts;
    if (!env.GITHUB_REPO) throw plainErr(503, 'Set GITHUB_REPO to the repository that holds the design system, like "acme/design-system".');
    const token = githubToken(env, setupHelp), branch = env.GITHUB_BRANCH || "main", apiBase = env.GITHUB_API || undefined;
    // storage: main with the edits on top. live: main alone, what has landed.
    const storage = createGitHubStorage({ repo: env.GITHUB_REPO, branch, token, pending: createSqlStorage(sql), apiBase });
    const landed = createGitHubStorage({ repo: env.GITHUB_REPO, branch, token, pending: createMemoryStorage(), apiBase });
    // The Worker has 10 ms of CPU per request on the free plan, so the engine's results are not copied. See server/engine.mjs.
    const store = createStore(storage, { live: landed, copyEngineResults: false });
    const github = createGitHubClient({ repo: env.GITHUB_REPO, token, apiBase });
    const proposals = createProposals({ github, store, edits: storage, kv: createSqlKV(sql), base: branch, previewUrl: env.STORYBOOK_PREVIEW_URL || "",
      // A preview of a console pull request has its own edits and Figma connection, and must not open real proposals.
      disabled: env.PREVIEW ? `This is a preview of the console (${env.PREVIEW}). It cannot make proposals. Use the real console for that.` : "", reviewers: String(env.REVIEWERS || "").split(",").map((x) => x.trim()).filter(Boolean), onLanded: () => { storage.refresh(); landed.refresh(); } });
    const figma = createFigma({ storage, secrets: createSqlSecrets(sql, env), store, apiBase: env.FIGMA_API || undefined });
    const model = env.ANTHROPIC_MODEL || "claude-sonnet-5";
    const api = createApi({
      store, proposals, figma, live,
      ask: createAsk({ key: env.ANTHROPIC_API_KEY, model, ...(secretHelp ? { missingKeyHelp: secretHelp } : {}) }),
      // GUIDE=off hides the design guide, for places where it cannot reach Claude yet.
      info: () => ({ ai: !!env.ANTHROPIC_API_KEY, guide: String(env.GUIDE || "").toLowerCase() !== "off", model, storybook: env.STORYBOOK_URL || "/storybook", github: { repo: env.GITHUB_REPO, branch }, preview: env.PREVIEW || null }),
      // Everyone is an admin for now. Later: map Microsoft Entra ID groups to "viewer", "editor", and "admin" here.
      roleOf: () => "admin",
    });
    parts = { storage, api };
    return parts;
  }

  return {
    /** Runs one API route. Errors come back as { status, body }, because an error's own fields do not survive RPC. */
    async api(method, path, body, user) {
      try {
        const { api } = made();
        if (!api.has(method, path)) return { status: 404, body: { error: "Not found." } };
        return { status: 200, body: await api.call(method, path, body, user) };
      } catch (e) {
        if (!e.status) console.error(e);
        return { status: e.status || 500, body: { error: e.message || "Something went wrong." } };
      }
    },
    /** An uploaded font file, as bytes, or null. The page loads them for its previews. */
    async file(path) {
      let key;
      try { key = storageKey(path); } catch { return null; }
      if (!/^fonts\//.test(key)) return null;
      return made().storage.readBytes(key);
    },
  };
}

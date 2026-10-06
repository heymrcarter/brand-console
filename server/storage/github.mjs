// Storage in a GitHub repository. See storage.mjs for the interface.
//
// Files are read from a branch. Writes do not go to GitHub one by one: the console saves the draft every half second,
// and each of those cannot be a commit. They wait in a "pending" storage instead (memory in tests, later a Durable
// Object in the Cloudflare Worker), and reads see them there. commit(message) then sends everything pending as one
// commit, the way a publish is one Git commit on this computer.
//
// It only uses fetch, so it runs in Node and in a Cloudflare Worker. A Worker request on the free plan can make
// at most 50 outgoing requests, so it keeps the count low:
// - Text files go inside the one request that makes the commit's tree. Only binary files (fonts) are uploaded first.
// - Files read from GitHub are kept by their Git hash. A Git object never changes, so they never go out of date.
// - The branch's latest commit is checked at most every headMaxAgeMs, so reading a draft's dozen files costs one check.
import { storageKey, storagePrefix, underPrefix } from "./storage.mjs";

// Pending deletions are marked in the pending storage under this folder. Nothing else may use it.
const RESERVED = ".github-storage";
const DELETED = `${RESERVED}/deleted/`;

const plainErr = (status, message) => Object.assign(new Error(message), { status });
const bytesToBase64 = (bytes) => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const base64ToBytes = (b64) => Uint8Array.from(atob(String(b64).replace(/\s+/g, "")), (c) => c.charCodeAt(0));
const sameData = (a, b) => (typeof a === "string" || typeof b === "string") ? a === b : a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * repo: "owner/name". branch: the branch to read from and commit to.
 * token: a GitHub token, or an async function that returns one (for short-lived GitHub App tokens).
 * pending: a storage that holds writes until the next commit, and that lasts between requests.
 * author: optional { name, email } for commits. Without it, GitHub uses the token's account.
 */
export function createGitHubStorage({ repo, branch = "main", token, pending, author, apiBase = "https://api.github.com", fetch: fetchFn = globalThis.fetch, headMaxAgeMs = 5000, now = () => Date.now() }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(String(repo || ""))) throw new Error('repo must look like "owner/name".');
  if (!pending) throw new Error("GitHub storage needs a pending storage to hold changes until they are committed.");
  const api = apiBase.replace(/\/$/, "") + "/repos/" + repo;
  const refPath = "heads/" + branch.split("/").map(encodeURIComponent).join("/");
  const blobs = new Map(), trees = new Map();
  let head = null; // { commit, tree, at }

  async function gh(method, path, body) {
    const t = typeof token === "function" ? await token() : token;
    if (!t) throw plainErr(503, "GitHub is not set up yet. The server needs a GitHub token.");
    let r;
    try {
      r = await fetchFn(api + path, { method, headers: { authorization: `Bearer ${t}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "brand-console", ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    } catch { throw plainErr(502, "The server could not reach GitHub. Try again in a moment."); }
    const text = await r.text(); let j = {};
    try { j = text ? JSON.parse(text) : {}; } catch { j = { message: text }; }
    if (r.ok) return j;
    const e = plainErr(r.status, `GitHub returned an error (${r.status}): ${j.message || "no details"}`);
    if (r.status === 401) e.message = "GitHub did not accept the token. It may have expired or been revoked.";
    else if (r.status === 403 && r.headers.get("x-ratelimit-remaining") === "0") e.message = "GitHub's rate limit was reached. Try again in a few minutes.";
    else if (r.status === 403) e.message = `GitHub did not let the server do this. Check that the token can read and write ${repo}.`;
    else if (r.status === 404) e.message = `GitHub could not find ${repo}, or its ${branch} branch. Check both, and that the token can see the repository.`;
    e.github = { status: r.status, message: j.message };
    throw e;
  }

  // The branch's latest commit and its files: { commit, tree, at }, where tree maps each path to { sha, mode }.
  async function latest(fresh = false) {
    if (!fresh && head && now() - head.at < headMaxAgeMs) return head;
    const commit = (await gh("GET", `/git/ref/${refPath}`)).object.sha;
    if (head && head.commit === commit) { head.at = now(); return head; }
    const tree = (await gh("GET", `/git/commits/${commit}`)).tree.sha;
    head = { commit, tree, at: now() };
    return head;
  }
  async function files(treeSha) {
    if (trees.has(treeSha)) return trees.get(treeSha);
    const t = await gh("GET", `/git/trees/${treeSha}?recursive=1`);
    if (t.truncated) throw plainErr(507, "The repository has too many files for GitHub to list at once. Keep the design system in a smaller repository.");
    const map = new Map(t.tree.filter((x) => x.type === "blob").map((x) => [x.path, { sha: x.sha, mode: x.mode }]));
    trees.set(treeSha, map);
    return map;
  }
  async function blob(sha) {
    if (!blobs.has(sha)) blobs.set(sha, base64ToBytes((await gh("GET", `/git/blobs/${sha}`)).content));
    return blobs.get(sha);
  }
  async function fromGitHub(p) {
    const entry = (await files((await latest()).tree)).get(p);
    return entry ? blob(entry.sha) : null;
  }

  const ownKey = (p) => { const k = storageKey(p); if (k === RESERVED || k.startsWith(RESERVED + "/")) throw plainErr(400, `${RESERVED}/ is kept for the GitHub storage's own use.`); return k; };
  const isDeleted = async (p) => (await pending.read(DELETED + p)) !== null;
  // What is waiting for the next commit: { writes: [paths], deletes: [paths] }.
  async function waiting() {
    const all = await pending.list("");
    return { writes: all.filter((p) => !underPrefix(p, RESERVED)), deletes: all.filter((p) => p.startsWith(DELETED)).map((p) => p.slice(DELETED.length)) };
  }

  async function readBytes(p) {
    const k = ownKey(p);
    if (await isDeleted(k)) return null;
    const mine = await pending.readBytes(k);
    return mine !== null ? mine : fromGitHub(k);
  }

  async function commit(message) {
    const { writes, deletes } = await waiting();
    if (!writes.length && !deletes.length) return;
    const data = new Map(await Promise.all(writes.map(async (p) => [p, await pending.readBytes(p)])));
    // Binary files go up as blobs first. Text goes inside the tree request.
    const text = new Map(), binary = new Map();
    for (const [p, bytes] of data) {
      let s = null;
      try { s = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { /* Not text. */ }
      if (s !== null && !s.includes("\0")) text.set(p, s); else binary.set(p, bytes);
    }
    const uploaded = new Map(await Promise.all([...binary].map(async ([p, bytes]) => [p, (await gh("POST", "/git/blobs", { content: bytesToBase64(bytes), encoding: "base64" })).sha])));

    // If someone else moves the branch while this runs, GitHub refuses the update. Build the commit again on top of theirs.
    for (let attempt = 1; ; attempt++) {
      const base = await latest(attempt > 1), have = await files(base.tree);
      const mode = (p) => (have.get(p) || {}).mode || "100644";
      const tree = [
        ...[...text].map(([path, content]) => ({ path, mode: mode(path), type: "blob", content })),
        ...[...uploaded].map(([path, sha]) => ({ path, mode: mode(path), type: "blob", sha })),
        ...deletes.filter((p) => have.has(p) && !data.has(p)).map((path) => ({ path, mode: mode(path), type: "blob", sha: null })),
      ];
      const newTree = (await gh("POST", "/git/trees", { base_tree: base.tree, tree })).sha;
      if (newTree === base.tree) break; // Everything pending was already on GitHub.
      const c = (await gh("POST", "/git/commits", { message, tree: newTree, parents: [base.commit], ...(author ? { author } : {}) })).sha;
      try {
        await gh("PATCH", `/git/refs/${refPath}`, { sha: c, force: false });
        head = { commit: c, tree: newTree, at: now() };
        break;
      } catch (e) {
        if (e.status !== 422 || attempt >= 3) throw e.status === 422 ? plainErr(409, "Someone else changed the repository at the same moment, three times in a row. Try publishing again.") : e;
      }
    }
    // Clear what was committed. Leave anything that changed while the commit ran, so it goes in the next one.
    await Promise.all([
      ...[...data].map(async ([p, sent]) => { const nowData = await pending.readBytes(p); if (nowData !== null && sameData(nowData, sent)) await pending.remove(p); }),
      ...deletes.map((p) => pending.remove(DELETED + p)),
    ]);
  }

  return {
    async read(p) { const b = await readBytes(p); return b === null ? null : new TextDecoder().decode(b); },
    readBytes,
    async write(p, v) {
      const k = ownKey(p);
      if (typeof v !== "string" && !(v instanceof Uint8Array)) throw new TypeError("Storage only saves text or a Uint8Array.");
      await pending.write(k, v);
      await pending.remove(DELETED + k);
    },
    async list(prefix = "") {
      const pre = storagePrefix(prefix);
      if (pre) ownKey(pre);
      const { writes, deletes } = await waiting(), gone = new Set(deletes);
      const fromRepo = [...(await files((await latest()).tree)).keys()];
      return [...new Set([...fromRepo, ...writes])].filter((p) => underPrefix(p, pre) && !gone.has(p) && !underPrefix(p, RESERVED)).sort();
    },
    async remove(p) {
      const k = ownKey(p);
      await pending.remove(k);
      await pending.write(DELETED + k, "");
    },
    commit,
    /** What the next commit will send, for the console to show. */
    waiting,
  };
}

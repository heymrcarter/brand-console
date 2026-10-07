// The parts of GitHub's API that proposals use, beyond the file storage in storage/github.mjs: branches, pull
// requests, releases, and building a commit from a set of files. It only uses fetch, so it runs in a Worker too.
// Errors come back with a status and a message a person can act on.
const plainErr = (status, message) => Object.assign(new Error(message), { status });
const bytesToBase64 = (bytes) => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const base64ToBytes = (b64) => Uint8Array.from(atob(String(b64).replace(/\s+/g, "")), (c) => c.charCodeAt(0));
const encodeRef = (name) => name.split("/").map(encodeURIComponent).join("/");

/** token: a GitHub token, or an async function that returns one. */
export function createGitHubClient({ repo, token, apiBase = "https://api.github.com", fetch: fetchFn = globalThis.fetch }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(String(repo || ""))) throw new Error('repo must look like "owner/name".');
  const root = apiBase.replace(/\/$/, ""), api = `${root}/repos/${repo}`;
  const blobs = new Map(), trees = new Map();

  async function call(method, url, body, { allow = [] } = {}) {
    const t = typeof token === "function" ? await token() : token;
    if (!t) throw plainErr(503, "GitHub is not set up yet. The server needs a GitHub token.");
    let r;
    try {
      r = await fetchFn(url, { method, headers: { authorization: `Bearer ${t}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "brand-console", ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    } catch { throw plainErr(502, "The server could not reach GitHub. Try again in a moment."); }
    const text = await r.text(); let j = {};
    try { j = text ? JSON.parse(text) : {}; } catch { j = { message: text }; }
    if (r.ok || allow.includes(r.status)) return { status: r.status, body: j };
    const e = plainErr(r.status, `GitHub returned an error (${r.status}): ${j.message || "no details"}`);
    if (r.status === 401) e.message = "GitHub did not accept the token. It may have expired or been revoked.";
    else if (r.status === 403 && r.headers.get("x-ratelimit-remaining") === "0") e.message = "GitHub's rate limit was reached. Try again in a few minutes.";
    else if (r.status === 403) e.message = `GitHub did not let the console do this in ${repo}. The GitHub App needs Contents and Pull requests set to Read and write, and access to ${repo}.`;
    e.github = { status: r.status, message: j.message || "", errors: j.errors };
    throw e;
  }
  const gh = async (method, path, body, opts) => (await call(method, api + path, body, opts)).body;

  /** A branch's or tag's commit, or null when there is none. ref: "heads/main" or "tags/v1.0.0". */
  async function refSha(ref) {
    const r = await call("GET", `${api}/git/ref/${encodeRef(ref)}`, undefined, { allow: [404] });
    if (r.status === 404) return null;
    // An annotated tag points at a tag object, which points at the commit.
    if (r.body.object.type === "tag") return (await gh("GET", `/git/tags/${r.body.object.sha}`)).object.sha;
    return r.body.object.sha;
  }
  async function treeOf(commitSha) { return (await gh("GET", `/git/commits/${commitSha}`)).tree.sha; }
  /** Every file in a tree, as a Map of path -> { sha, mode }. */
  async function files(treeSha) {
    if (trees.has(treeSha)) return trees.get(treeSha);
    const t = await gh("GET", `/git/trees/${treeSha}?recursive=1`);
    if (t.truncated) throw plainErr(507, "The repository has too many files for GitHub to list at once.");
    const map = new Map(t.tree.filter((x) => x.type === "blob").map((x) => [x.path, { sha: x.sha, mode: x.mode }]));
    trees.set(treeSha, map);
    return map;
  }
  async function blob(sha) {
    if (!blobs.has(sha)) blobs.set(sha, base64ToBytes((await gh("GET", `/git/blobs/${sha}`)).content));
    return blobs.get(sha);
  }
  const text = async (sha) => new TextDecoder().decode(await blob(sha));

  return {
    repo,
    refSha,
    treeOf,
    files,
    blob,
    text,
    async uploadBlob(bytes) { return (await gh("POST", "/git/blobs", { content: bytesToBase64(bytes), encoding: "base64" })).sha; },
    /** entries: [{ path, content }] for text, [{ path, sha }] for an uploaded blob, [{ path, sha: null }] to delete. */
    async makeTree(baseTree, entries) { return (await gh("POST", "/git/trees", { base_tree: baseTree, tree: entries.map((e) => ({ mode: "100644", type: "blob", ...e })) })).sha; },
    async makeCommit({ message, tree, parents, author }) { return (await gh("POST", "/git/commits", { message, tree, parents, ...(author ? { author } : {}) })).sha; },
    async createBranch(name, sha) { await gh("POST", "/git/refs", { ref: `refs/heads/${name}`, sha }); },
    async moveBranch(name, sha) { await gh("PATCH", `/git/refs/heads/${encodeRef(name)}`, { sha, force: false }); },
    async deleteBranch(name) { await call("DELETE", `${api}/git/refs/heads/${encodeRef(name)}`, undefined, { allow: [404, 422] }); },
    /** How many commits head is missing from base. 0 means head already has everything base has. */
    async behindBy(base, head) { return (await gh("GET", `/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`)).behind_by; },
    /**
     * Opens a pull request. With draft: true, GitHub may refuse because the repository's plan has no draft pull
     * requests: then this returns null, and the caller keeps the proposal in the console until it is submitted.
     */
    async openPull({ title, head, base, body, draft }) {
      const r = await call("POST", `${api}/pulls`, { title, head, base, body, draft: !!draft }, { allow: draft ? [422] : [] });
      if (r.status === 422) {
        if (/draft/i.test(JSON.stringify(r.body))) return null;
        throw plainErr(422, `GitHub did not open the pull request: ${r.body.message || "no details"}`);
      }
      return r.body;
    },
    async pull(number) { return gh("GET", `/pulls/${number}`); },
    async updatePull(number, fields) { return gh("PATCH", `/pulls/${number}`, fields); },
    /** Marks a draft pull request ready for review. GitHub only has this in its GraphQL API. */
    async readyForReview(nodeId) {
      const r = await call("POST", `${root}/graphql`, { query: "mutation($id: ID!) { markPullRequestReadyForReview(input: { pullRequestId: $id }) { pullRequest { isDraft } } }", variables: { id: nodeId } });
      if (r.body.errors && r.body.errors.length) throw plainErr(502, `GitHub did not mark the pull request ready: ${r.body.errors[0].message}`);
    },
    /** The newest releases, as [{ version, date, note, url }]. */
    async releases(limit = 30) {
      const list = await gh("GET", `/releases?per_page=${limit}`);
      return list.filter((r) => !r.draft && /^v\d+\.\d+\.\d+$/.test(r.tag_name)).map((r) => ({ version: r.tag_name.slice(1), date: String(r.published_at || r.created_at || "").slice(0, 10), note: r.body || "", url: r.html_url }));
    },
  };
}

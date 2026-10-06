// A stand-in for the parts of GitHub's Git Data API that server/storage/github.mjs uses. It is a fetch function,
// so tests need no network. It is strict where GitHub is: it wants a token, refuses a branch update that is not a
// fast forward, and refuses to delete a path that is not there.
import { createHash } from "node:crypto";

const sha1 = (s) => createHash("sha1").update(s).digest("hex");
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** files: the first commit's files, as { path: text or Uint8Array }. */
export function createGitHubMock({ repo = "acme/design-system", branch = "main", token = "test-token", files = {} } = {}) {
  const blobs = new Map(), trees = new Map(), commits = new Map(), refs = new Map(), calls = [];
  const toBytes = (v) => (typeof v === "string" ? new TextEncoder().encode(v) : new Uint8Array(v));
  function putBlob(bytes) { const sha = sha1(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), Buffer.from(bytes)])); blobs.set(sha, bytes); return sha; }
  // A tree here is flat: path -> { sha, mode }. The API answer adds the folders, like GitHub's recursive listing does.
  function putTree(map) { const sha = sha1("tree " + JSON.stringify([...map].sort())); trees.set(sha, map); return sha; }
  function putCommit(tree, parents, message, author) { const sha = sha1(JSON.stringify({ tree, parents, message, n: commits.size })); commits.set(sha, { tree, parents, message, author }); return sha; }
  const treeOf = (filesObj) => new Map(Object.entries(filesObj).map(([p, v]) => [p, { sha: putBlob(toBytes(v)), mode: "100644" }]));
  refs.set(branch, putCommit(putTree(treeOf(files)), [], "Start", null));

  const isAncestor = (anc, c) => { const seen = [c]; while (seen.length) { const x = seen.pop(); if (x === anc) return true; seen.push(...(commits.get(x)?.parents || [])); } return false; };

  async function fetchMock(url, init = {}) {
    const method = (init.method || "GET").toUpperCase();
    const u = new URL(url);
    calls.push(`${method} ${u.pathname}`);
    const auth = (init.headers || {}).authorization || "";
    if (auth !== `Bearer ${token}`) return json(401, { message: "Bad credentials" });
    const base = `/repos/${repo}/git/`;
    if (!u.pathname.startsWith(base)) return json(404, { message: "Not Found" });
    const rest = decodeURIComponent(u.pathname.slice(base.length));
    const body = init.body ? JSON.parse(init.body) : {};

    if (method === "GET" && rest.startsWith("ref/heads/")) {
      const b = rest.slice("ref/heads/".length);
      return refs.has(b) ? json(200, { ref: `refs/heads/${b}`, object: { sha: refs.get(b), type: "commit" } }) : json(404, { message: "Not Found" });
    }
    if (method === "PATCH" && rest.startsWith("refs/heads/")) {
      const b = rest.slice("refs/heads/".length);
      if (!refs.has(b)) return json(422, { message: "Reference does not exist" });
      if (!commits.has(body.sha)) return json(422, { message: "Object does not exist" });
      if (!body.force && !isAncestor(refs.get(b), body.sha)) return json(422, { message: "Update is not a fast forward" });
      refs.set(b, body.sha);
      return json(200, { ref: `refs/heads/${b}`, object: { sha: body.sha, type: "commit" } });
    }
    if (method === "GET" && rest.startsWith("commits/")) {
      const c = commits.get(rest.slice("commits/".length));
      return c ? json(200, { sha: rest.slice(8), tree: { sha: c.tree }, parents: c.parents.map((sha) => ({ sha })), message: c.message }) : json(404, { message: "Not Found" });
    }
    if (method === "GET" && rest.startsWith("trees/")) {
      const t = trees.get(rest.slice("trees/".length));
      if (!t) return json(404, { message: "Not Found" });
      const dirs = new Set([...t.keys()].flatMap((p) => p.split("/").slice(0, -1).map((_, i, a) => a.slice(0, i + 1).join("/"))));
      return json(200, { sha: rest.slice(6), truncated: false, tree: [...[...dirs].map((path) => ({ path, mode: "040000", type: "tree", sha: sha1(path) })), ...[...t].map(([path, e]) => ({ path, mode: e.mode, type: "blob", sha: e.sha, size: blobs.get(e.sha).length }))] });
    }
    if (method === "GET" && rest.startsWith("blobs/")) {
      const b = blobs.get(rest.slice("blobs/".length));
      // GitHub wraps base64 at 60 characters.
      return b ? json(200, { sha: rest.slice(6), encoding: "base64", size: b.length, content: Buffer.from(b).toString("base64").replace(/.{60}/g, "$&\n") }) : json(404, { message: "Not Found" });
    }
    if (method === "POST" && rest === "blobs") {
      if (body.encoding !== "base64") return json(422, { message: "this stand-in only takes base64 blobs" });
      return json(201, { sha: putBlob(new Uint8Array(Buffer.from(body.content, "base64"))) });
    }
    if (method === "POST" && rest === "trees") {
      const map = new Map(body.base_tree ? trees.get(body.base_tree) || [] : []);
      if (body.base_tree && !trees.has(body.base_tree)) return json(422, { message: "base_tree is not a tree" });
      for (const e of body.tree) {
        if (e.sha === null) { if (!map.has(e.path)) return json(422, { message: `GitHub cannot delete ${e.path}: it is not in the tree` }); map.delete(e.path); continue; }
        if (e.content !== undefined && e.sha !== undefined) return json(422, { message: "use content or sha, not both" });
        const sha = e.content !== undefined ? putBlob(toBytes(e.content)) : e.sha;
        if (!blobs.has(sha)) return json(422, { message: `blob ${sha} does not exist` });
        map.set(e.path, { sha, mode: e.mode });
      }
      return json(201, { sha: putTree(map) });
    }
    if (method === "POST" && rest === "commits") {
      if (!trees.has(body.tree) || !body.parents.every((p) => commits.has(p))) return json(422, { message: "tree or parent does not exist" });
      return json(201, { sha: putCommit(body.tree, body.parents, body.message, body.author || null) });
    }
    return json(404, { message: "Not Found" });
  }

  return {
    fetch: fetchMock,
    calls,
    /** The files on a branch, as { path: Uint8Array }. */
    files(b = branch) { return Object.fromEntries([...trees.get(commits.get(refs.get(b)).tree)].map(([p, e]) => [p, blobs.get(e.sha)])); },
    text(p, b = branch) { const f = this.files(b)[p]; return f ? new TextDecoder().decode(f) : null; },
    /** Commit messages on a branch, newest first. */
    log(b = branch) { const out = []; for (let c = refs.get(b); c; c = commits.get(c).parents[0]) out.push(commits.get(c).message); return out; },
    commit(sha) { return commits.get(sha); },
    head(b = branch) { return refs.get(b); },
    /** Someone else pushes a commit, like a teammate or another copy of the console. */
    push(changes, message = "Someone else's change", b = branch) {
      const map = new Map(trees.get(commits.get(refs.get(b)).tree));
      for (const [p, v] of Object.entries(changes)) { if (v === null) map.delete(p); else map.set(p, { sha: putBlob(toBytes(v)), mode: "100644" }); }
      refs.set(b, putCommit(putTree(map), [refs.get(b)], message, null));
    },
  };
}

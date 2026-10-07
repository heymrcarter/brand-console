// A stand-in for the parts of GitHub's API that the console uses: the Git Data API (server/storage/github.mjs),
// and branches, tags, pull requests, and releases (server/github-client.mjs). It is a fetch function, so tests need
// no network. It is strict where GitHub is: it wants a token, refuses a branch update that is not a fast forward,
// refuses to delete a path that is not there, and, with draftPRs: false, refuses draft pull requests the way GitHub
// does on a private repository without a paid plan.
import { createHash } from "node:crypto";

const sha1 = (s) => createHash("sha1").update(s).digest("hex");
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/**
 * files: main's files, as { path: text or Uint8Array }. history: optional earlier commits, oldest first, as
 * [{ files, message, tag, release: { name, body, date } }]. A commit with a tag gets one, and with release, a release.
 */
export function createGitHubMock({ repo = "acme/design-system", branch = "main", token = "test-token", files = {}, draftPRs = true, releases: firstReleases = [], history = [], mainTag = null, mainRelease = null } = {}) {
  const blobs = new Map(), trees = new Map(), commits = new Map(), refs = new Map(), tags = new Map(), calls = [];
  const pulls = new Map(), releases = [...firstReleases];
  const toBytes = (v) => (typeof v === "string" ? new TextEncoder().encode(v) : new Uint8Array(v));
  function putBlob(bytes) { const sha = sha1(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), Buffer.from(bytes)])); blobs.set(sha, bytes); return sha; }
  // A tree here is flat: path -> { sha, mode }. The API answer adds the folders, like GitHub's recursive listing does.
  function putTree(map) { const sha = sha1("tree " + JSON.stringify([...map].sort())); trees.set(sha, map); return sha; }
  function putCommit(tree, parents, message, author) { const sha = sha1(JSON.stringify({ tree, parents, message, n: commits.size })); commits.set(sha, { tree, parents, message, author }); return sha; }
  const treeOf = (filesObj) => new Map(Object.entries(filesObj).map(([p, v]) => [p, { sha: putBlob(toBytes(v)), mode: "100644" }]));
  let parent = null;
  const addRelease = (tag, r) => releases.push({ tag_name: tag, name: tag, body: r.body || "", draft: false, published_at: `${r.date || "2026-10-01"}T12:00:00Z`, html_url: `https://github.com/${repo}/releases/tag/${tag}` });
  for (const h of [...history, { files, message: "Start", tag: mainTag, release: mainRelease }]) {
    parent = putCommit(putTree(treeOf(h.files)), parent ? [parent] : [], h.message || "Start", null);
    if (h.tag) tags.set(h.tag, parent);
    if (h.tag && h.release) addRelease(h.tag, h.release);
  }
  refs.set(branch, parent);

  const isAncestor = (anc, c) => { const seen = [c]; while (seen.length) { const x = seen.pop(); if (x === anc) return true; seen.push(...(commits.get(x)?.parents || [])); } return false; };

  async function fetchMock(url, init = {}) {
    const method = (init.method || "GET").toUpperCase();
    const u = new URL(url);
    calls.push(`${method} ${u.pathname}`);
    const auth = (init.headers || {}).authorization || "";
    if (auth !== `Bearer ${token}`) return json(401, { message: "Bad credentials" });
    const body = init.body ? JSON.parse(init.body) : {};
    const top = `/repos/${repo}/`;
    if (method === "POST" && u.pathname === "/graphql") {
      const pr = [...pulls.values()].find((x) => x.node_id === (body.variables || {}).id);
      if (!pr) return json(200, { errors: [{ message: "Could not resolve to a node" }] });
      pr.draft = false;
      return json(200, { data: { markPullRequestReadyForReview: { pullRequest: { isDraft: false } } } });
    }
    if (u.pathname.startsWith(top) && !u.pathname.startsWith(top + "git/")) {
      const r = decodeURIComponent(u.pathname.slice(top.length));
      if (method === "GET" && r.startsWith("compare/")) {
        const [b0, h0] = r.slice(8).split("...");
        const sha = (x) => refs.get(x) || x;
        const bs = sha(b0), hs = sha(h0);
        if (!commits.has(bs) || !commits.has(hs)) return json(404, { message: "Not Found" });
        const reach = (c) => { const seen = new Set(), st = [c]; while (st.length) { const x = st.pop(); if (seen.has(x)) continue; seen.add(x); st.push(...commits.get(x).parents); } return seen; };
        const fromHead = reach(hs), fromBase = reach(bs);
        return json(200, { behind_by: [...fromBase].filter((x) => !fromHead.has(x)).length, ahead_by: [...fromHead].filter((x) => !fromBase.has(x)).length });
      }
      if (method === "POST" && r === "pulls") {
        if (!refs.has(body.head)) return json(422, { message: "Validation Failed", errors: [{ field: "head", code: "invalid" }] });
        if ([...pulls.values()].some((x) => x.head.ref === body.head && x.state === "open")) return json(422, { message: "A pull request already exists" });
        if (body.draft && !draftPRs) return json(422, { message: "Validation Failed", errors: [{ resource: "PullRequest", code: "custom", message: "Draft pull requests are not supported in this repository." }] });
        const number = pulls.size + 1;
        const pr = { number, node_id: `PR_${number}`, title: body.title, body: body.body || "", draft: !!body.draft, state: "open", merged: false, head: { ref: body.head }, base: { ref: body.base }, html_url: `https://github.com/${repo}/pull/${number}` };
        pulls.set(number, pr);
        return json(201, pr);
      }
      const pm = r.match(/^pulls\/(\d+)$/);
      if (pm && pulls.has(+pm[1])) {
        const pr = pulls.get(+pm[1]);
        if (method === "GET") return json(200, pr);
        if (method === "PATCH") { for (const k of ["title", "body", "state"]) if (body[k] !== undefined) pr[k] = body[k]; return json(200, pr); }
      }
      if (method === "GET" && r === "releases") return json(200, [...releases].reverse());
      return json(404, { message: "Not Found" });
    }
    const base = `/repos/${repo}/git/`;
    if (!u.pathname.startsWith(base)) return json(404, { message: "Not Found" });
    const rest = decodeURIComponent(u.pathname.slice(base.length));
    if (method === "GET" && rest.startsWith("ref/tags/")) {
      const t = rest.slice("ref/tags/".length);
      return tags.has(t) ? json(200, { ref: `refs/tags/${t}`, object: { sha: tags.get(t), type: "commit" } }) : json(404, { message: "Not Found" });
    }
    if (method === "POST" && rest === "refs") {
      const name = String(body.ref || "").replace(/^refs\/heads\//, "");
      if (refs.has(name)) return json(422, { message: "Reference already exists" });
      if (!commits.has(body.sha)) return json(422, { message: "Object does not exist" });
      refs.set(name, body.sha);
      return json(201, { ref: `refs/heads/${name}`, object: { sha: body.sha, type: "commit" } });
    }
    if (method === "DELETE" && rest.startsWith("refs/heads/")) {
      const b1 = rest.slice("refs/heads/".length);
      if (!refs.has(b1)) return json(422, { message: "Reference does not exist" });
      refs.delete(b1);
      return new Response(null, { status: 204 });
    }

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
    pull(number) { return pulls.get(number); },
    pulls() { return [...pulls.values()]; },
    branches() { return [...refs.keys()]; },
    /** Tags a commit, like a release does: tag("v1.4.0"). */
    tag(name, sha = refs.get(branch)) { tags.set(name, sha); },
    /**
     * A reviewer merges a pull request (squash): main gets one commit with the branch's files. With release, the
     * design system's Release workflow then runs: it sets package.json's version, tags it, and makes a release.
     */
    merge(number, { release } = {}) {
      const pr = pulls.get(number);
      const tree = commits.get(refs.get(pr.head.ref)).tree;
      refs.set(branch, putCommit(tree, [refs.get(branch)], `${pr.title} (#${number})`, null));
      Object.assign(pr, { state: "closed", merged: true });
      refs.delete(pr.head.ref);
      if (release) {
        const pkg = JSON.parse(this.text("package.json") || "{}");
        this.push({ "package.json": JSON.stringify({ ...pkg, version: release }, null, 2) + "\n" }, `Release v${release}`);
        tags.set(`v${release}`, refs.get(branch));
        releases.push({ tag_name: `v${release}`, name: `v${release}`, body: pr.title, draft: false, published_at: "2026-10-07T12:00:00Z", html_url: `https://github.com/${repo}/releases/tag/v${release}` });
      }
    },
    /** A reviewer closes a pull request without merging it. */
    close(number) { pulls.get(number).state = "closed"; },
    /** Someone else pushes a commit, like a teammate or another copy of the console. */
    push(changes, message = "Someone else's change", b = branch) {
      const map = new Map(trees.get(commits.get(refs.get(b)).tree));
      for (const [p, v] of Object.entries(changes)) { if (v === null) map.delete(p); else map.set(p, { sha: putBlob(toBytes(v)), mode: "100644" }); }
      refs.set(b, putCommit(putTree(map), [refs.get(b)], message, null));
    },
  };
}

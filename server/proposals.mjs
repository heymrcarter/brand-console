// Proposals: how edits in the console become a version of the design system. The words the console uses:
//
//   Edits       what people do in the console. They are saved in the console (the store's draft), never on GitHub.
//   Change      "Add to proposal" with a short note. It turns the current edits into one commit on the proposal's
//               branch, with a changeset file that records its bump (fix, new things, or a big change) and the note.
//   Proposal    one pull request to the design system repository. One is open at a time.
//   Draft       the proposal is still being put together. On GitHub it is a draft pull request. If the repository's
//               plan has no draft pull requests, it is a branch with no pull request yet: the console keeps it.
//   Submit      the proposal goes to review: the pull request is marked ready (or opened). Changes can still be added.
//   Landed      the pull request was merged. The design system repository releases a new version on its own.
//   Withdrawn   the pull request was closed without merging. The edits stay in the console.
//
// Each change is built on the repository's newest main, plus the proposal's earlier commits, plus the edits, so it
// never has merge conflicts: for the files the console writes, the console's version wins. History is never
// rewritten: undoing a change is a new change that puts the values back.
import { gitBlobSha } from "./storage/github.mjs";
import { ENGINE_VERSION, engineBehind } from "./engine.mjs";

const plainErr = (status, message) => Object.assign(new Error(message), { status });
const KINDS = { patch: "fix", minor: "new things", major: "a big change" };
const slug = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "change";
const isChangeset = (p) => /^\.changeset\/[^/]+\.md$/.test(p) && !/\/readme\.md$/i.test(p);
const fontFiles = (st) => Object.values((st && st.fontLib && st.fontLib.files) || {}).flat().map((x) => x && x.file).filter((f) => typeof f === "string" && /^fonts\/[a-z0-9._-]+$/i.test(f));

/**
 * github: a client from github-client.mjs. store: the console's store (its draft is the edits).
 * edits: the store's storage, where uploaded font files wait. kv: { get(key), set(key, value) } that lasts.
 * previewUrl: optional "https://pr-{number}-...workers.dev", where each pull request's Storybook is.
 * onLanded: called when a proposal has landed, so storages that keep main's commit for a while read it again.
 * reviewers: GitHub logins to ask for a review when a proposal is submitted. Anyone can also be asked on GitHub.
 * disabled: a reason, when this console must not make proposals (a preview of a console pull request). It still
 *   reads the design system and shows the open proposal, but cannot add, submit, or withdraw.
 * engineVersion: the design system version whose engine the console runs. While the live version is a newer minor
 *   or major version, no change can be added: the console updates itself on each release, in a few minutes.
 */
export function createProposals({ github, store, edits, kv, base = "main", previewUrl = "", onLanded = () => {}, reviewers = [], disabled = "", engineVersion = ENGINE_VERSION, now = () => new Date() }) {
  const E = store.E;
  const states = new Map(); // commit sha -> state. A commit never changes, so neither does its state.
  let releases = null; // { at, list }: the release list, kept for a minute.

  const load = async (key) => { const t = await kv.get(key); return t ? JSON.parse(t) : null; };
  const keep = (key, v) => kv.set(key, v ? JSON.stringify(v) : "");

  /** The design system as it is at a commit: its tokens, and the version in its package.json. */
  async function stateAt(commitSha) {
    if (states.has(commitSha)) return E.clone(states.get(commitSha));
    const all = await github.files(await github.treeOf(commitSha));
    const tokenPaths = [...all.keys()].filter((p) => p.startsWith("tokens/") && p.endsWith(".json"));
    const texts = await Promise.all(tokenPaths.map((p) => github.text(all.get(p).sha)));
    const st = E.filesToState(Object.fromEntries(tokenPaths.map((p, i) => [p, JSON.parse(texts[i])])));
    const pkg = all.get("package.json");
    st.version = pkg ? JSON.parse(await github.text(pkg.sha)).version || "0.0.0" : "0.0.0";
    states.set(commitSha, st);
    return E.clone(st);
  }
  /** A released version's design system, from its tag, like v1.2.0. */
  async function stateOfVersion(version) {
    const sha = await github.refSha(`tags/v${version}`);
    if (!sha) throw plainErr(404, `Version ${version} has no tag in ${github.repo}.`);
    return stateAt(sha);
  }

  // Checks the pull request on GitHub, so the console knows when a proposal has landed or been withdrawn.
  async function refresh() {
    const rec = await load("proposal");
    if (!rec) return null;
    let gone = null;
    if (rec.number) {
      const pr = await github.pull(rec.number);
      if (pr.merged) gone = "landed";
      else if (pr.state === "closed") gone = "withdrawn";
      else { rec.draft = !!pr.draft; rec.url = pr.html_url; rec.nodeId = pr.node_id; }
    }
    const head = await github.refSha(`heads/${rec.branch}`);
    if (!gone && !head) gone = "withdrawn"; // Someone deleted the branch.
    if (gone) {
      if (gone === "landed") { releases = null; await onLanded(); } // A new version is on its way.
      await keep("notice", { kind: gone, number: rec.number || null, url: rec.url || null, title: rec.title, at: now().toISOString() });
      await keep("proposal", null);
      if (gone === "withdrawn" && head) await github.deleteBranch(rec.branch);
      return null;
    }
    if (head !== rec.head) { rec.head = head; }
    await keep("proposal", rec);
    return rec;
  }

  function view(rec) {
    if (!rec) return null;
    const bump = rec.changes.reduce((b, c) => (["patch", "minor", "major"].indexOf(c.bump) > ["patch", "minor", "major"].indexOf(b) ? c.bump : b), "patch");
    return {
      branch: rec.branch, title: rec.title, number: rec.number || null, url: rec.url || null,
      state: rec.number && !rec.draft ? "in review" : "draft",
      submitted: !!rec.submitted, bump, changes: rec.changes,
      preview: rec.number && previewUrl ? previewUrl.replace("{number}", rec.number) : null,
      reviewers,
    };
  }

  const REVIEW_STATE = { APPROVED: "approved", CHANGES_REQUESTED: "changes requested", COMMENTED: "commented", DISMISSED: "dismissed" };
  /**
   * Where the approvals stand, from the pull request's reviews on GitHub: { pending, people, warning, error }.
   * pending: who has been asked and has not answered ([{ login } or { team }]). people: everyone else who
   * reviewed, with their newest answer, and current: false when they answered before the newest change.
   */
  async function reviewOf(rec) {
    if (!rec.number) return null;
    try {
      const [pending, reviews] = await Promise.all([github.requestedReviewers(rec.number), github.reviews(rec.number)]);
      const newest = new Map();
      // A comment does not replace an approval or a request for changes. Anything else does.
      for (const r of reviews) if (r.state !== "COMMENTED" || !newest.has(r.login)) newest.set(r.login, r);
      const waiting = new Set(pending.map((p) => p.login).filter(Boolean));
      const people = [...newest.values()].filter((r) => !waiting.has(r.login)).map((r) => ({ login: r.login, state: REVIEW_STATE[r.state] || r.state.toLowerCase(), current: r.commit === rec.head, at: r.at, url: r.url }));
      return { pending, people, warning: rec.reviewWarning || null };
    } catch (e) {
      return { pending: [], people: [], warning: rec.reviewWarning || null, error: `The console could not read the reviews: ${e.message}` };
    }
  }

  /** { proposal, base, notice }. base is the design system at the proposal's newest commit, or null with no proposal. */
  async function status() {
    const rec = await refresh();
    const proposal = view(rec);
    if (proposal) proposal.review = await reviewOf(rec);
    return { proposal, base: rec ? await stateAt(rec.head) : null, notice: await load("notice") };
  }

  function body(rec, liveVersion) {
    const lines = rec.changes.map((c, i) => `${i + 1}. ${c.note} _(${KINDS[c.bump]}, ${c.who})_`);
    const bump = view(rec).bump;
    return `Proposed in the Brand Console.\n\n**Changes**\n\n${lines.join("\n")}\n\nWhen this lands, it releases version ${E.nextVer(liveVersion, bump)} (${KINDS[bump]}).\n\nEach change is one commit, with a changeset in \`.changeset/\`. Add more in the console.`;
  }

  // The files the console writes for the edits, on top of baseFiles: every token file, a deleted brand's file,
  // and any uploaded font the tokens use.
  async function editFiles(draft, baseFiles) {
    const out = [];
    const tokens = E.stateToFiles(draft), keepTokens = new Set();
    for (const [p, v] of Object.entries(tokens)) { if (!p.startsWith("tokens/")) continue; keepTokens.add(p); out.push({ path: p, content: JSON.stringify(v, null, 2) + "\n" }); }
    for (const p of baseFiles.keys()) if (p.startsWith("tokens/brands/") && p.endsWith(".json") && !keepTokens.has(p)) out.push({ path: p, sha: null });
    for (const f of fontFiles(draft)) {
      const bytes = await edits.readBytes(f);
      if (!bytes) continue;
      const sha = await gitBlobSha(bytes);
      if ((baseFiles.get(f) || {}).sha === sha) continue;
      if ((await github.uploadBlob(bytes)) !== sha) throw plainErr(502, "GitHub saved a font under a different name than Git would.");
      out.push({ path: f, sha });
    }
    return out;
  }

  /** Turns the edits into one change: a commit with a note and a bump. The first change opens the proposal. */
  async function add({ note, bump, who = {} }) {
    note = String(note || "").trim().replace(/\s+/g, " ");
    if (!note) throw plainErr(400, "Write a short note that says what this change does.");
    if (note.length > 300) throw plainErr(400, "Keep the note under 300 characters. The pull request can say more.");
    const rec = await refresh(), live = await store.published(), draft = E.withDefaults(E.clone(await store.draft()));
    if (engineBehind(live.version, engineVersion)) throw plainErr(409, `The design system is at version ${live.version}, and the console is still updating to it (it runs ${engineVersion}). Your edits are saved. Try again in a few minutes.`);
    const before = rec ? await stateAt(rec.head) : live;
    const edited = E.diff(before, draft);
    if (!edited.length) throw plainErr(409, rec ? "There are no edits to add. Everything is in the proposal already." : "There are no edits to add yet.");
    const blocking = E.runChecks(draft).filter((x) => x.level === "block");
    if (blocking.length) throw plainErr(409, `${blocking.length} check${blocking.length > 1 ? "s" : ""} must be fixed first: ${blocking.map((b) => b.title).join(" ")}`);
    bump = bump === undefined || bump === null || bump === "" ? E.bumpFor(before, draft).bump : bump;
    if (!KINDS[bump]) throw plainErr(400, 'The bump must be "patch", "minor", or "major".');

    const mainSha = await github.refSha(`heads/${base}`);
    if (!mainSha) throw plainErr(404, `${github.repo} has no ${base} branch.`);
    const mainFiles = await github.files(await github.treeOf(mainSha));
    let baseTree, parents, overlay = [], start = rec ? rec.start : mainSha;
    if (!rec) { baseTree = await github.treeOf(mainSha); parents = [mainSha]; }
    else if ((await github.behindBy(mainSha, rec.head)) === 0) { baseTree = await github.treeOf(rec.head); parents = [rec.head]; }
    else {
      // main moved on. Start from the new main, and bring along what the proposal's branch changed since it began.
      baseTree = await github.treeOf(mainSha); parents = [rec.head, mainSha]; start = mainSha;
      const [branchFiles, startFiles] = await Promise.all([github.files(await github.treeOf(rec.head)), github.files(await github.treeOf(rec.start))]);
      for (const [p, e] of branchFiles) if ((startFiles.get(p) || {}).sha !== e.sha) overlay.push({ path: p, sha: e.sha });
      for (const p of startFiles.keys()) if (!branchFiles.has(p) && mainFiles.has(p)) overlay.push({ path: p, sha: null });
    }
    const baseFiles = await github.files(baseTree);
    const n = (rec ? rec.changes.length : 0) + 1;
    const changeset = { path: `.changeset/console-${slug(note)}-${now().getTime().toString(36)}.md`, content: `---\n"@heymrcarter/design-system": ${bump}\n---\n\n${note}\n` };
    const mine = [...await editFiles(draft, baseFiles), changeset];
    const minePaths = new Set(mine.map((e) => e.path));
    const has = (p) => baseFiles.has(p) || overlay.some((e) => e.path === p && e.sha !== null);
    const entries = [...overlay.filter((e) => !minePaths.has(e.path)), ...mine].filter((e) => e.sha !== null || has(e.path));
    const tree = await github.makeTree(baseTree, entries);
    const author = who.email ? { name: who.name || who.email, email: who.email, date: now().toISOString() } : undefined;
    const commit = await github.makeCommit({ message: `${note}\n\nChange ${n} of the proposal, ${KINDS[bump]}. Made in the Brand Console.`, tree, parents, author });

    const change = { sha: commit, note, bump, who: who.email || "Brand team", at: now().toISOString(), edits: edited.map((c) => ({ path: c.path, before: E.getP(before, c.path) ?? null, label: E.labelFor(c.path, draft) })) };
    // For the brand order, "before" is the order of the brands both sides have.
    for (const e of change.edits) if (e.path === "brandOrder") e.before = Object.keys(before.brands || {});
    let next;
    if (rec) {
      await github.moveBranch(rec.branch, commit);
      next = { ...rec, head: commit, start, changes: [...rec.changes, change] };
      if (next.number) await github.updatePull(next.number, { body: body(next, live.version) });
    } else {
      let branch = `proposal/${now().toISOString().slice(0, 10)}-${slug(note)}`;
      for (let k = 2; await github.refSha(`heads/${branch}`); k++) branch = branch.replace(/(-\d+)?$/, `-${k}`);
      await github.createBranch(branch, commit);
      next = { branch, title: note.length > 72 ? note.slice(0, 71) + "…" : note, start: mainSha, head: commit, changes: [change], submitted: false, number: null, draft: true };
      const pr = await github.openPull({ title: next.title, head: branch, base, body: body(next, live.version), draft: true });
      if (pr) Object.assign(next, { number: pr.number, url: pr.html_url, nodeId: pr.node_id, draft: !!pr.draft });
    }
    states.delete(commit);
    await keep("proposal", next);
    await keep("notice", null);
    return status();
  }

  /** Sends the proposal for review. Changes can still be added afterwards. */
  async function submit() {
    const rec = await refresh();
    if (!rec) throw plainErr(409, "There is no proposal to submit. Add a change first.");
    if (!rec.number) {
      const live = await store.published();
      const pr = await github.openPull({ title: rec.title, head: rec.branch, base, body: body(rec, live.version), draft: false });
      Object.assign(rec, { number: pr.number, url: pr.html_url, nodeId: pr.node_id, draft: false });
    } else if (rec.draft) {
      await github.readyForReview(rec.nodeId);
      rec.draft = false;
    }
    rec.submitted = true;
    // Ask the usual reviewers. If GitHub will not ask someone, like a login with no access to the repository, the
    // proposal is still submitted, and the console says who could not be asked.
    // One at a time, so one person GitHub will not ask (like an invitation not yet accepted) does not stop the rest.
    const missed = [];
    for (const login of reviewers) {
      try { await github.requestReviewers(rec.number, [login]); }
      catch (e) { missed.push({ login, why: (e.github && e.github.message) || e.message }); }
    }
    rec.reviewWarning = missed.length ? `GitHub did not ask ${missed.map((m) => m.login).join(", ")} to review: ${missed[0].why} Ask them on the pull request once they can see the repository.` : null;
    await keep("proposal", rec);
    return status();
  }

  /** Closes the proposal without landing it. The edits stay in the console. */
  async function withdraw() {
    const rec = await refresh();
    if (!rec) throw plainErr(409, "There is no proposal to withdraw.");
    if (rec.number) await github.updatePull(rec.number, { state: "closed" });
    await github.deleteBranch(rec.branch);
    await keep("proposal", null);
    await keep("notice", { kind: "withdrawn", number: rec.number || null, url: rec.url || null, title: rec.title, at: now().toISOString() });
    return status();
  }

  async function dismiss() { await keep("notice", null); return status(); }

  // One at a time, like the store: two changes added at once would race for the branch.
  let queue = Promise.resolve();
  const oneAtATime = (fn) => (...a) => { const run = queue.then(() => fn(...a)); queue = run.catch(() => {}); return run; };
  // Releases change only when a proposal lands, so the list is kept for a minute.
  async function releaseList() {
    if (!releases || now().getTime() - releases.at > 60000) releases = { at: now().getTime(), list: await github.releases() };
    return releases.list;
  }
  const off = (fn) => (disabled ? async () => { throw plainErr(409, disabled); } : fn);
  return { status: oneAtATime(status), add: off(oneAtATime(add)), submit: off(oneAtATime(submit)), withdraw: off(oneAtATime(withdraw)), dismiss: oneAtATime(dismiss), stateOfVersion, releases: releaseList };
}

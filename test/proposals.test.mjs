// Proposals: edits in the console become changes on a pull request to the design system repository, and the
// console knows when the proposal lands or is withdrawn. Against a GitHub stand-in, so no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../server/store.mjs";
import { createProposals } from "../server/proposals.mjs";
import { createGitHubClient } from "../server/github-client.mjs";
import { createGitHubStorage } from "../server/storage/github.mjs";
import { createMemoryStorage, createMemoryKV } from "../server/storage/memory.mjs";
import { sampleRepo } from "./helpers/sample-repo.mjs";
import { engineBehind, ENGINE_VERSION } from "../server/engine.mjs";

const REPO = "acme/design-system", TOKEN = "test-token", MAYA = { email: "maya@example.com", name: "Maya R." };

function setup({ engineVersion, reviewers, ...opts } = {}) {
  const mock = sampleRepo({ repo: REPO, token: TOKEN, ...opts });
  let clock = Date.parse("2026-10-07T10:00:00Z");
  const now = () => new Date((clock += 1000));
  const gh = (pending) => createGitHubStorage({ repo: REPO, token: TOKEN, pending, fetch: mock.fetch, headMaxAgeMs: 0 });
  const storage = gh(createMemoryStorage()), live = gh(createMemoryStorage());
  const store = createStore(storage, { live });
  const github = createGitHubClient({ repo: REPO, token: TOKEN, fetch: mock.fetch });
  const proposals = createProposals({ github, store, edits: storage, kv: createMemoryKV(), previewUrl: "https://pr-{number}-sb.example.workers.dev", now, engineVersion: engineVersion || "1.0.0", reviewers: reviewers || [] });
  const edit = async (fn) => { const d = await store.draft(); fn(d); await store.saveDraft(d); };
  const changesets = (branch) => Object.keys(mock.files(branch)).filter((p) => /^\.changeset\/console-/.test(p)).map((p) => mock.text(p, branch));
  return { mock, store, proposals, edit, changesets, E: store.E };
}

test("live is main: its tokens and its package.json version. Edits are saved in the console, never on main", async () => {
  const { mock, store, edit } = setup();
  const live = await store.published();
  assert.equal(live.version, "1.0.0");
  assert.ok(live.brands.northfield.palette, "main has the color sets");
  const before = mock.head();
  await edit((d) => { d.shape.radius += 2; });
  assert.equal((await store.draft()).shape.radius, live.shape.radius + 2);
  assert.equal((await store.published()).shape.radius, live.shape.radius);
  assert.equal(mock.head(), before, "saving edits makes no commit");
});

test("the first change opens a draft pull request, with one commit and a changeset that holds the bump and note", async () => {
  const { mock, store, proposals, edit, changesets, E } = setup();
  await assert.rejects(proposals.add({ note: "Nothing", who: MAYA }), /no edits to add/);
  await edit((d) => { d.shape.radius += 2; });
  await assert.rejects(proposals.add({ note: "  ", who: MAYA }), /short note/);
  const s = await proposals.add({ note: "Rounder corners", who: MAYA });
  assert.equal(s.proposal.number, 1);
  assert.equal(s.proposal.state, "draft");
  assert.equal(s.proposal.preview, "https://pr-1-sb.example.workers.dev");
  assert.equal(s.proposal.changes.length, 1);
  assert.equal(s.proposal.changes[0].bump, "patch", "a value change is a fix");
  assert.equal(s.proposal.changes[0].who, "maya@example.com");
  const pr = mock.pull(1);
  assert.equal(pr.draft, true);
  assert.equal(pr.title, "Rounder corners");
  assert.match(pr.body, /1\. Rounder corners _\(fix, maya@example\.com\)_/);
  assert.match(pr.body, /releases version 1\.0\.1/);
  const branch = s.proposal.branch;
  assert.match(branch, /^proposal\/2026-10-07-rounder-corners$/);
  assert.deepEqual(changesets(branch), ['---\n"@heymrcarter/design-system": patch\n---\n\nRounder corners\n']);
  const onBranch = JSON.parse(mock.text("tokens/foundations.tokens.json", branch));
  assert.ok(JSON.stringify(onBranch).includes(String((await store.draft()).shape.radius)));
  assert.equal(mock.commit(mock.head(branch)).author.email, "maya@example.com", "the commit is credited to the person");
  assert.equal(E.diff(s.base, await store.draft()).length, 0, "the edits are all in the proposal now");
  assert.equal((await store.published()).shape.radius + 2, s.base.shape.radius, "main has not changed");
});

test("more changes go on the same pull request, each its own commit; the biggest bump is the proposal's", async () => {
  const { mock, proposals, edit, changesets } = setup();
  await edit((d) => { d.shape.radius += 2; });
  await proposals.add({ note: "Rounder corners", who: MAYA });
  await edit((d) => { d.brands.harbor = { ...d.brands.crestline, name: "Harbor", palette: undefined }; });
  const s = await proposals.add({ note: "Add the Harbor brand", who: MAYA });
  assert.equal(s.proposal.changes.length, 2);
  assert.equal(s.proposal.changes[1].bump, "minor", "a new brand is new things");
  assert.equal(s.proposal.bump, "minor");
  assert.equal(mock.pulls().length, 1);
  assert.match(mock.pull(1).body, /2\. Add the Harbor brand _\(new things/);
  assert.match(mock.pull(1).body, /releases version 1\.1\.0/);
  assert.equal(changesets(s.proposal.branch).length, 2);
  assert.ok(mock.text("tokens/brands/harbor.tokens.json", s.proposal.branch));
  assert.deepEqual(mock.log(s.proposal.branch).slice(0, 2).map((m) => m.split("\n")[0]), ["Add the Harbor brand", "Rounder corners"]);
});

test("a change cannot be added while a check blocks it, and a bump the person picks is kept", async () => {
  const { proposals, edit } = setup();
  await edit((d) => { d.brands.northfield.primary = "#88BC40"; d.brands.northfield.onPrimary = "white"; });
  await assert.rejects(proposals.add({ note: "Lighter green", who: MAYA }), /must be fixed first/);
  await edit((d) => { d.brands.northfield.onPrimary = "dark"; });
  await assert.rejects(proposals.add({ note: "x", bump: "huge", who: MAYA }), /must be "patch", "minor", or "major"/);
  const s = await proposals.add({ note: "Lighter green", bump: "major", who: MAYA });
  assert.equal(s.proposal.changes[0].bump, "major");
});

test("submit marks the pull request ready for review; changes can still be added after it", async () => {
  const { mock, proposals, edit } = setup();
  await edit((d) => { d.shape.radius += 2; });
  await proposals.add({ note: "Rounder corners", who: MAYA });
  const s = await proposals.submit();
  assert.equal(s.proposal.state, "in review");
  assert.equal(mock.pull(1).draft, false);
  await edit((d) => { d.shape.radius += 1; });
  const s2 = await proposals.add({ note: "A bit rounder still, from review", who: MAYA });
  assert.equal(s2.proposal.state, "in review");
  assert.equal(s2.proposal.changes.length, 2);
});

test("without draft pull requests, the proposal is a branch until it is submitted, then a pull request ready for review", async () => {
  const { mock, proposals, edit } = setup({ draftPRs: false });
  await edit((d) => { d.shape.radius += 2; });
  const s = await proposals.add({ note: "Rounder corners", who: MAYA });
  assert.equal(s.proposal.number, null);
  assert.equal(s.proposal.state, "draft");
  assert.equal(s.proposal.preview, null);
  assert.ok(mock.branches().includes(s.proposal.branch));
  assert.equal(mock.pulls().length, 0);
  const s2 = await proposals.submit();
  assert.equal(s2.proposal.number, 1);
  assert.equal(s2.proposal.state, "in review");
  assert.equal(mock.pull(1).draft, false);
  assert.match(mock.pull(1).body, /Rounder corners/);
});

test("when main moves on, the next change builds on it, with no conflicts, and the console's tokens win", async () => {
  const { mock, store, proposals, edit } = setup();
  await edit((d) => { d.shape.radius += 2; });
  const first = await proposals.add({ note: "Rounder corners", who: MAYA });
  // An engineer lands a change to main: a new doc, and a token file the console also writes.
  const fnd = JSON.parse(mock.text("tokens/foundations.tokens.json"));
  fnd.$description = "Changed on main.";
  mock.push({ "docs/new.md": "From main.", "tokens/foundations.tokens.json": JSON.stringify(fnd) }, "An engineer's change");
  await edit((d) => { d.shape.shadow = d.shape.shadow === "strong" ? "soft" : "strong"; });
  const s = await proposals.add({ note: "Stronger shadow", who: MAYA });
  const branch = s.proposal.branch, files = mock.files(branch);
  assert.ok(files["docs/new.md"], "the branch has main's new file");
  assert.equal(mock.commit(mock.head(branch)).parents.length, 2, "it is a merge of main into the proposal");
  assert.equal(mock.commit(mock.head(branch)).parents[0], first.proposal.changes[0].sha, "on top of the first change");
  const onBranch = await store.E.filesToState({ "tokens/foundations.tokens.json": JSON.parse(mock.text("tokens/foundations.tokens.json", branch)) });
  assert.equal(onBranch.shape.radius, (await store.draft()).shape.radius, "the console's version of the file wins");
  assert.equal(Object.keys(files).filter((p) => /^\.changeset\/console-/.test(p)).length, 2, "both changes' changesets are there");
  // And a third change, with main where it was, is a plain commit again.
  await edit((d) => { d.shape.radius += 1; });
  const s3 = await proposals.add({ note: "Rounder still", who: MAYA });
  assert.equal(mock.commit(mock.head(s3.proposal.branch)).parents.length, 1);
  assert.ok(mock.files(s3.proposal.branch)["docs/new.md"]);
});

test("a proposal that lands: the console says so, live moves to the new version, and no edits are left over", async () => {
  const { mock, store, proposals, edit, E } = setup();
  await edit((d) => { d.shape.radius += 2; });
  await proposals.add({ note: "Rounder corners", who: MAYA });
  await proposals.submit();
  assert.equal((await proposals.releases()).at(0).version, "1.0.0");
  mock.merge(1, { release: "1.0.1" });
  const s = await proposals.status();
  assert.equal(s.proposal, null);
  assert.deepEqual({ kind: s.notice.kind, number: s.notice.number, title: s.notice.title }, { kind: "landed", number: 1, title: "Rounder corners" });
  const live = await store.published();
  assert.equal(live.version, "1.0.1");
  assert.equal(E.diff(live, await store.draft()).length, 0);
  assert.equal((await proposals.dismiss()).notice, null);
  assert.equal((await proposals.releases()).at(0).version, "1.0.1", "seeing it land refreshes the release list");
});

test("a proposal that is withdrawn, on GitHub or in the console: its branch goes, and the edits stay", async () => {
  const { mock, store, proposals, edit, E } = setup();
  await edit((d) => { d.shape.radius += 2; });
  await proposals.add({ note: "Rounder corners", who: MAYA });
  mock.close(1);
  const s = await proposals.status();
  assert.equal(s.proposal, null);
  assert.equal(s.notice.kind, "withdrawn");
  assert.ok(!mock.branches().some((b) => b.startsWith("proposal/")), "its branch is deleted");
  assert.deepEqual(E.diff(await store.published(), await store.draft()).map((c) => c.path), ["shape.radius"], "the edits are still there");
  const again = await proposals.add({ note: "Rounder corners, again", who: MAYA });
  assert.equal(again.proposal.number, 2, "the next change opens a new proposal");
  const w = await proposals.withdraw();
  assert.equal(w.proposal, null);
  assert.equal(mock.pull(2).state, "closed");
  assert.equal(w.notice.kind, "withdrawn");
});

test("removing a brand deletes its file on the branch, and an uploaded font goes with the change", async () => {
  const { mock, store, proposals, edit } = setup();
  const { file } = await store.saveFont({ family: "Avenir Next", weight: 400, style: "normal", fileName: "a.woff2", data: Buffer.alloc(400, 7).toString("base64") });
  await edit((d) => { delete d.brands.crestline; d.fontLib = { files: { "Avenir Next": [{ file, weight: 400, style: "normal" }] }, added: [], removed: [] }; d.type.body = "Avenir Next"; });
  const s = await proposals.add({ note: "Only Northfield, in Avenir Next", who: MAYA });
  const files = mock.files(s.proposal.branch);
  assert.ok(!files["tokens/brands/crestline.tokens.json"], "the removed brand's file is gone");
  assert.deepEqual(Buffer.from(files["fonts/avenir-next-400.woff2"]), Buffer.alloc(400, 7));
  assert.equal(s.proposal.changes[0].bump, "major", "removing a brand is a big change");
  assert.ok(mock.files()["tokens/brands/crestline.tokens.json"], "main still has it");
});

test("each change remembers the values before it, so it can be undone with a change that puts them back", async () => {
  const { store, proposals, edit, E } = setup();
  const live = await store.published();
  await edit((d) => { d.shape.radius += 2; d.brands.northfield.primary = "#4A7200"; });
  const s = await proposals.add({ note: "Rounder corners and a deeper green", who: MAYA });
  const change = s.proposal.changes[0];
  assert.deepEqual(change.edits.map((e) => e.path).sort(), ["brands.northfield.primary", "shape.radius"]);
  assert.equal(change.edits.find((e) => e.path === "shape.radius").before, live.shape.radius);
  assert.equal(change.edits.find((e) => e.path === "brands.northfield.primary").label, "Northfield main color");
  // Undo: the console puts the values back as edits, and adds them as a new change.
  await edit((d) => { for (const e of change.edits) E.setP(d, e.path, e.before); });
  const u = await proposals.add({ note: "Undo: Rounder corners and a deeper green", who: MAYA });
  assert.equal(u.proposal.changes.length, 2);
  assert.equal(E.diff(live, u.base).length, 0, "the proposal now changes nothing");
});

test("rolling back makes the edits an earlier version, keeping edits made since", async () => {
  const { store, proposals, edit } = setup();
  await edit((d) => { d.type.scale = 1.333; });
  const v13 = await proposals.stateOfVersion("0.3.0");
  const d = await store.restore(v13);
  assert.equal(d.brands.northfield.primary, v13.brands.northfield.primary);
  assert.equal(d.type.scale, 1.333, "the edit made on top of live stays");
  await assert.rejects(proposals.stateOfVersion("9.9.9"), /has no tag/);
  assert.deepEqual((await proposals.releases()).map((r) => r.version), ["1.0.0", "0.4.0", "0.3.0", "0.2.0"]);
});

test("while the console's engine is a minor or major version behind live, no change can be added; a patch behind is fine", async () => {
  assert.equal(engineBehind("1.1.0", "1.0.4"), true, "a newer minor");
  assert.equal(engineBehind("2.0.0", "1.9.9"), true, "a newer major");
  assert.equal(engineBehind("1.0.7", "1.0.2"), false, "a newer patch only changes values");
  assert.equal(engineBehind("1.0.0", "1.2.0"), false, "an engine ahead of live is fine");
  assert.match(ENGINE_VERSION, /^\d+\.\d+\.\d+$/, "the console knows its engine's version");
  const behind = setup({ engineVersion: "0.4.0" });
  await behind.edit((d) => { d.shape.radius += 2; });
  await assert.rejects(behind.proposals.add({ note: "Rounder corners", who: MAYA }), (e) => e.status === 409 && /still updating to it \(it runs 0\.4\.0\)/.test(e.message));
  assert.equal(behind.mock.pulls().length, 0);
  const patchBehind = setup({ engineVersion: "1.0.0" });
  await patchBehind.edit((d) => { d.shape.radius += 2; });
  assert.equal((await patchBehind.proposals.add({ note: "Rounder corners", who: MAYA })).proposal.number, 1);
});

test("submitting asks the usual reviewers, and the console shows whose approval is still pending", async () => {
  const { mock, proposals, edit } = setup({ reviewers: ["sam", "lee"], collaborators: ["sam", "lee", "pat"] });
  await edit((d) => { d.shape.radius += 2; });
  const draft = await proposals.add({ note: "Rounder corners", who: MAYA });
  assert.deepEqual(draft.proposal.reviewers, ["sam", "lee"], "a draft says who will be asked");
  assert.deepEqual(draft.proposal.review, { pending: [], people: [], warning: null });
  let s = await proposals.submit();
  assert.deepEqual(s.proposal.review.pending.map((p) => p.login), ["sam", "lee"], "both are asked when it is submitted");
  mock.review(1, "sam", "APPROVED");
  mock.review(1, "lee", "CHANGES_REQUESTED");
  mock.requestReview(1, "pat"); // Someone asked on GitHub shows up too.
  s = await proposals.status();
  assert.deepEqual(s.proposal.review.pending.map((p) => p.login), ["pat"]);
  assert.deepEqual(s.proposal.review.people.map((p) => [p.login, p.state, p.current]), [["sam", "approved", true], ["lee", "changes requested", true]]);
  // A comment does not replace an approval. A change added after it makes the approval one for an earlier version.
  mock.review(1, "sam", "COMMENTED");
  await edit((d) => { d.shape.radius += 1; });
  s = await proposals.add({ note: "A bit rounder, from review", who: MAYA });
  const sam = s.proposal.review.people.find((p) => p.login === "sam");
  assert.deepEqual([sam.state, sam.current], ["approved", false]);
  mock.review(1, "lee", "APPROVED");
  s = await proposals.status();
  assert.equal(s.proposal.review.people.find((p) => p.login === "lee").state, "approved", "a newer answer replaces an older one");
});

test("if GitHub will not ask a reviewer, the proposal is still submitted, and the console says why", async () => {
  const { mock, proposals, edit } = setup({ reviewers: ["someone-else"], collaborators: ["sam"] });
  await edit((d) => { d.shape.radius += 2; });
  await proposals.add({ note: "Rounder corners", who: MAYA });
  const s = await proposals.submit();
  assert.equal(s.proposal.state, "in review");
  assert.equal(mock.pull(1).draft, false);
  assert.match(s.proposal.review.warning, /did not ask someone-else to review: Reviews may only be requested from collaborators/);
});

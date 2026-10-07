// The sample design system (fixtures/sample) as a design system repository on GitHub: main holds tokens/ and a
// package.json at the newest version, and each earlier version in history/ is a tagged commit with a release.
// The tests and `npm start` both use it, through the GitHub stand-in in test/github-mock.mjs.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGitHubMock } from "../github-mock.mjs";

export const SAMPLE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures/sample");
export const PACKAGE = "@heymrcarter/design-system";

function readDir(dir, prefix) {
  const out = {};
  const walk = (d, rel) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name), r = rel ? `${rel}/${f.name}` : f.name; if (f.isDirectory()) walk(p, r); else out[`${prefix}/${r}`] = fs.readFileSync(p, "utf8"); } };
  walk(dir, "");
  return out;
}
const packageJson = (version) => JSON.stringify({ name: PACKAGE, version }, null, 2) + "\n";
const CHANGESET_README = "# Changesets\n\nEach change adds a file here with its bump and a note.\n";

/** The sample's versions, oldest first: [{ version, date, note }]. */
export function sampleReleases(dir = SAMPLE) { return JSON.parse(fs.readFileSync(path.join(dir, "releases.json"), "utf8")); }

/** main's files: { path: text }. */
export function sampleFiles(dir = SAMPLE) {
  const versions = sampleReleases(dir);
  return { ...readDir(path.join(dir, "tokens"), "tokens"), "package.json": packageJson(versions.at(-1).version), ".changeset/README.md": CHANGESET_README };
}

/** The sample as a GitHub stand-in. Options go to createGitHubMock, like { repo, token, draftPRs }. */
export function sampleRepo(opts = {}, dir = SAMPLE) {
  const versions = sampleReleases(dir), newest = versions.at(-1);
  const history = versions.slice(0, -1).map((v) => ({
    files: { ...readDir(path.join(dir, "history", `v${v.version}`), "tokens"), "package.json": packageJson(v.version), ".changeset/README.md": CHANGESET_README },
    message: `Release v${v.version}`, tag: `v${v.version}`, release: { body: v.note, date: v.date },
  }));
  return createGitHubMock({ ...opts, files: sampleFiles(dir), history, mainTag: `v${newest.version}`, mainRelease: { body: newest.note, date: newest.date } });
}

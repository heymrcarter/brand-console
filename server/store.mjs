// Reads and writes the design system on disk.
//   tokens/      the draft (what the console edits). W3C design token files.
//   releases/    one folder per published version, plus index.json.
//   dist/        the live version's outputs (theme.css and friends).
//   build/draft/ the draft's outputs, rebuilt on every save (Storybook uses these).
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { loadEngine } from "./engine.mjs";

export function createStore(root) {
  const E = loadEngine(root);
  const P = (...a) => path.join(root, ...a);
  const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
  const writeFile = (f, data) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, typeof data === "string" ? data : JSON.stringify(data, null, 2) + "\n"); };

  function readTokenDir(dir) {
    const out = {};
    const walk = (d, rel) => {
      if (!fs.existsSync(d)) return;
      for (const name of fs.readdirSync(d)) {
        const full = path.join(d, name), r = rel ? rel + "/" + name : name;
        if (fs.statSync(full).isDirectory()) walk(full, r);
        else if (name.endsWith(".json")) out["tokens/" + r] = readJson(full);
      }
    };
    walk(dir, "");
    return out;
  }
  function writeTokenDir(dir, files) {
    for (const [k, v] of Object.entries(files)) if (k.startsWith("tokens/")) writeFile(path.join(dir, k.slice(7)), v);
  }
  function writeOutputs(dir, st, version) {
    const f = E.files(st, version);
    for (const [k, v] of Object.entries(f)) if (!k.startsWith("tokens/")) writeFile(path.join(dir, k), v);
    copyFonts(dir, st);
  }
  // The company's own font files go next to theme.css, so its @font-face rules find them.
  function fontFiles(st) {
    const files = (st && st.fontLib && st.fontLib.files) || {};
    return Object.values(files).flat().map((x) => x && x.file).filter((f) => typeof f === "string" && /^fonts\/[a-z0-9._-]+$/i.test(f));
  }
  function copyFonts(dir, st) {
    for (const f of fontFiles(st)) {
      const from = P(f), to = path.join(dir, f);
      if (fs.existsSync(from) && path.resolve(from) !== path.resolve(to)) { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); }
    }
  }
  // Saves an uploaded font file into the fonts folder. Returns its path, like fonts/avenir-next-400.woff2.
  function saveFont({ family, weight, style, fileName, data }) {
    const ext = String(fileName || "").split(".").pop().toLowerCase();
    if (!["woff2", "woff", "ttf", "otf"].includes(ext)) { const e = new Error("Pick a font file that ends in .woff2, .woff, .ttf, or .otf."); e.status = 400; throw e; }
    const buf = Buffer.from(String(data || ""), "base64");
    if (buf.length < 100) { const e = new Error("That font file looks empty."); e.status = 400; throw e; }
    if (buf.length > 8e6) { const e = new Error("That font file is bigger than 8 MB. Use a .woff2 file, which is much smaller."); e.status = 400; throw e; }
    const slug = String(family || "font").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "font";
    const name = `${slug}-${Number(weight) || 400}${style === "italic" ? "-italic" : ""}.${ext}`;
    writeFile(P("fonts", name), buf);
    return { file: "fonts/" + name };
  }

  const index = () => fs.existsSync(P("releases", "index.json")) ? readJson(P("releases", "index.json")) : { versions: [] };
  const saveIndex = (ix) => writeFile(P("releases", "index.json"), ix);
  const latest = () => index().versions[0];

  function stateOfRelease(version) {
    const st = E.filesToState(readTokenDir(P("releases", "v" + version, "tokens")));
    st.version = version;
    return st;
  }
  function draft() {
    const st = E.filesToState(readTokenDir(P("tokens")));
    const l = latest(); st.version = l ? l.version : "0.0.0";
    return st;
  }
  function published() { const l = latest(); return l ? stateOfRelease(l.version) : draft(); }

  function clean(st) {
    if (!st || typeof st !== "object" || !st.brands || !st.type || !st.comp) throw new Error("The design system data is missing parts.");
    return E.withDefaults(E.clone(st));
  }
  function saveDraft(st) {
    st = clean(st);
    writeTokenDir(P("tokens"), E.stateToFiles(st));
    const l = latest();
    writeOutputs(P("build", "draft"), st, (l ? l.version : "0.0.0") + "-draft");
    return { ok: true, savedAt: new Date().toISOString() };
  }
  function buildAll() {
    const d = draft(), l = latest();
    writeOutputs(P("build", "draft"), d, (l ? l.version : "0.0.0") + "-draft");
    if (l) writeOutputs(P("dist"), stateOfRelease(l.version), l.version);
  }
  function release(st, version, meta) {
    st = clean(st); st.version = version;
    const dir = P("releases", "v" + version);
    writeTokenDir(path.join(dir, "tokens"), E.stateToFiles(st));
    writeOutputs(dir, st, version);
    writeOutputs(P("dist"), st, version);
    const ix = index();
    ix.versions.unshift({ version, date: meta.date || new Date().toISOString().slice(0, 10), who: meta.who || "Brand team", note: meta.note || "Updated the design system.", ...(meta.rollbackOf ? { rollbackOf: meta.rollbackOf } : {}) });
    saveIndex(ix);
    const cl = P("CHANGELOG.md");
    const prev = fs.existsSync(cl) ? fs.readFileSync(cl, "utf8").replace(/^# Changelog\n+/, "") : "";
    writeFile(cl, `# Changelog\n\n## ${version} (${ix.versions[0].date})\n\n${ix.versions[0].note}\n\n_${ix.versions[0].who}_\n\n${prev}`);
    gitCommit(`Publish design system v${version}: ${ix.versions[0].note.slice(0, 60)}`);
    return version;
  }
  // bump: "patch", "minor", or "major". Without one, it is "minor", like before.
  function publish({ note, who, bump }) {
    const d = draft(), l = latest();
    const blocking = E.runChecks(d).filter((x) => x.level === "block");
    if (blocking.length) { const e = new Error(`${blocking.length} check${blocking.length > 1 ? "s" : ""} must be fixed first: ${blocking.map((b) => b.title).join(" ")}`); e.status = 409; throw e; }
    if (l && E.diff(published(), d).length === 0) { const e = new Error("Your draft has no changes to publish."); e.status = 409; throw e; }
    if (bump !== undefined && !["patch", "minor", "major"].includes(bump)) { const e = new Error('The version bump must be "patch", "minor", or "major".'); e.status = 400; throw e; }
    const v = l ? E.nextVer(l.version, bump || "minor") : "1.0.0";
    release(d, v, { note, who });
    return v;
  }
  function rollback({ version, who }) {
    const target = stateOfRelease(version), pub = published(), d = draft(), l = latest();
    const pending = E.diff(pub, d);
    // A rollback is always a minor version, so apps can tell it apart from a fix.
    const v = E.nextVer(l.version, "minor");
    release(target, v, { note: `Rolled back to version ${version}.`, who, rollbackOf: version });
    // Keep the person's unpublished changes on top of the rolled-back version.
    let nd = E.clone(target);
    for (const c of pending) { if (c.path.endsWith(".palette")) E.setP(nd, c.path, E.getP(d, c.path)); else E.setP(nd, c.path, c.to); }
    saveDraft(nd);
    return v;
  }
  function flag(version) {
    const ix = index(); const x = ix.versions.find((v) => v.version === version);
    if (!x) { const e = new Error("That version does not exist."); e.status = 404; throw e; }
    x.flag = !x.flag; saveIndex(ix); return x.flag;
  }
  function gitCommit(msg) {
    if (!fs.existsSync(P(".git"))) return;
    execFile("git", ["add", "tokens", "releases", "dist", "fonts", "CHANGELOG.md"], { cwd: root }, (err) => {
      if (!err) execFile("git", ["commit", "-m", msg], { cwd: root }, () => {});
    });
  }
  return { E, draft, published, index, saveDraft, publish, rollback, flag, buildAll, release, readTokenDir, writeTokenDir, stateOfRelease, saveFont };
}

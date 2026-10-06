// Reads and writes the design system through a storage (see server/storage/storage.mjs).
//   tokens/      the draft (what the console edits). W3C design token files.
//   releases/    one folder per published version, plus index.json.
//   dist/        the live version's outputs (theme.css and friends).
//   build/draft/ the draft's outputs, rebuilt on every save (Storybook uses these).
//   fonts/       font files the brand team uploaded.
// This file never touches the disk itself, so the same code can run in a Cloudflare Worker with another storage.
// Every method is async, and they run one at a time, so a save can never land in the middle of a publish.
import { loadEngine } from "./engine.mjs";

export function createStore(storage) {
  const E = loadEngine();
  const readJson = async (p) => { const t = await storage.read(p); return t === null ? null : JSON.parse(t); };
  const writeFile = (p, data) => storage.write(p, typeof data === "string" || data instanceof Uint8Array ? data : JSON.stringify(data, null, 2) + "\n");
  const err = (status, message) => Object.assign(new Error(message), { status });

  // The token files under dir, keyed like "tokens/brands/northfield.tokens.json", whatever dir is.
  async function readTokenDir(dir) {
    const keys = (await storage.list(dir)).filter((k) => k.endsWith(".json"));
    const skip = dir ? dir.replace(/\/$/, "").length + 1 : 0;
    const values = await Promise.all(keys.map(readJson));
    return Object.fromEntries(keys.map((k, i) => ["tokens/" + k.slice(skip), values[i]]));
  }
  async function writeTokenDir(dir, files) {
    await Promise.all(Object.entries(files).filter(([k]) => k.startsWith("tokens/")).map(([k, v]) => writeFile(`${dir}/${k.slice(7)}`, v)));
  }
  async function writeOutputs(dir, st, version) {
    const f = E.files(st, version);
    await Promise.all(Object.entries(f).filter(([k]) => !k.startsWith("tokens/")).map(([k, v]) => writeFile(`${dir}/${k}`, v)));
    await copyFonts(dir, st);
  }
  // The company's own font files go next to theme.css, so its @font-face rules find them.
  function fontFiles(st) {
    const files = (st && st.fontLib && st.fontLib.files) || {};
    return Object.values(files).flat().map((x) => x && x.file).filter((f) => typeof f === "string" && /^fonts\/[a-z0-9._-]+$/i.test(f));
  }
  async function copyFonts(dir, st) {
    for (const f of fontFiles(st)) {
      const bytes = await storage.readBytes(f);
      if (bytes) await storage.write(`${dir}/${f}`, bytes);
    }
  }
  // Saves an uploaded font file into the fonts folder. Returns its path, like fonts/avenir-next-400.woff2.
  async function saveFont({ family, weight, style, fileName, data }) {
    const ext = String(fileName || "").split(".").pop().toLowerCase();
    if (!["woff2", "woff", "ttf", "otf"].includes(ext)) throw err(400, "Pick a font file that ends in .woff2, .woff, .ttf, or .otf.");
    let bytes;
    try { bytes = Uint8Array.from(atob(String(data || "")), (c) => c.charCodeAt(0)); } catch { bytes = new Uint8Array(0); }
    if (bytes.length < 100) throw err(400, "That font file looks empty.");
    if (bytes.length > 8e6) throw err(400, "That font file is bigger than 8 MB. Use a .woff2 file, which is much smaller.");
    const slug = String(family || "font").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "font";
    const name = `${slug}-${Number(weight) || 400}${style === "italic" ? "-italic" : ""}.${ext}`;
    await storage.write("fonts/" + name, bytes);
    return { file: "fonts/" + name };
  }

  const index = async () => (await readJson("releases/index.json")) || { versions: [] };
  const saveIndex = (ix) => writeFile("releases/index.json", ix);
  const latest = async () => (await index()).versions[0];

  async function stateOfRelease(version) {
    const st = E.filesToState(await readTokenDir(`releases/v${version}/tokens`));
    st.version = version;
    return st;
  }
  async function draft() {
    const st = E.filesToState(await readTokenDir("tokens"));
    const l = await latest(); st.version = l ? l.version : "0.0.0";
    return st;
  }
  async function published() { const l = await latest(); return l ? stateOfRelease(l.version) : draft(); }

  function clean(st) {
    if (!st || typeof st !== "object" || !st.brands || !st.type || !st.comp) throw new Error("The design system data is missing parts.");
    return E.withDefaults(E.clone(st));
  }
  async function saveDraft(st) {
    st = clean(st);
    await writeTokenDir("tokens", E.stateToFiles(st));
    const l = await latest();
    await writeOutputs("build/draft", st, (l ? l.version : "0.0.0") + "-draft");
    return { ok: true, savedAt: new Date().toISOString() };
  }
  async function buildAll() {
    const d = await draft(), l = await latest();
    await writeOutputs("build/draft", d, (l ? l.version : "0.0.0") + "-draft");
    if (l) await writeOutputs("dist", await stateOfRelease(l.version), l.version);
  }
  async function release(st, version, meta) {
    st = clean(st); st.version = version;
    const dir = `releases/v${version}`;
    await writeTokenDir(`${dir}/tokens`, E.stateToFiles(st));
    await writeOutputs(dir, st, version);
    await writeOutputs("dist", st, version);
    const ix = await index();
    ix.versions.unshift({ version, date: meta.date || new Date().toISOString().slice(0, 10), who: meta.who || "Brand team", note: meta.note || "Updated the design system.", ...(meta.rollbackOf ? { rollbackOf: meta.rollbackOf } : {}) });
    await saveIndex(ix);
    const prev = ((await storage.read("CHANGELOG.md")) || "").replace(/^# Changelog\n+/, "");
    await writeFile("CHANGELOG.md", `# Changelog\n\n## ${version} (${ix.versions[0].date})\n\n${ix.versions[0].note}\n\n_${ix.versions[0].who}_\n\n${prev}`);
    await storage.commit(`Publish design system v${version}: ${ix.versions[0].note.slice(0, 60)}`);
    return version;
  }
  // bump: "patch", "minor", or "major". Without one, it is "minor", like before.
  async function publish({ note, who, bump }) {
    const d = await draft(), l = await latest();
    const blocking = E.runChecks(d).filter((x) => x.level === "block");
    if (blocking.length) throw err(409, `${blocking.length} check${blocking.length > 1 ? "s" : ""} must be fixed first: ${blocking.map((b) => b.title).join(" ")}`);
    if (l && E.diff(await published(), d).length === 0) throw err(409, "Your draft has no changes to publish.");
    if (bump !== undefined && !["patch", "minor", "major"].includes(bump)) throw err(400, 'The version bump must be "patch", "minor", or "major".');
    const v = l ? E.nextVer(l.version, bump || "minor") : "1.0.0";
    await release(d, v, { note, who });
    return v;
  }
  async function rollback({ version, who }) {
    const target = await stateOfRelease(version), pub = await published(), d = await draft(), l = await latest();
    const pending = E.diff(pub, d);
    // A rollback is always a minor version, so apps can tell it apart from a fix.
    const v = E.nextVer(l.version, "minor");
    await release(target, v, { note: `Rolled back to version ${version}.`, who, rollbackOf: version });
    // Keep the person's unpublished changes on top of the rolled-back version.
    let nd = E.clone(target);
    for (const c of pending) { if (c.path.endsWith(".palette")) E.setP(nd, c.path, E.getP(d, c.path)); else E.setP(nd, c.path, c.to); }
    await saveDraft(nd);
    return v;
  }
  async function flag(version) {
    const ix = await index(); const x = ix.versions.find((v) => v.version === version);
    if (!x) throw err(404, "That version does not exist.");
    x.flag = !x.flag; await saveIndex(ix); return x.flag;
  }

  // One at a time: each call waits for the one before it to finish, even if that one failed.
  let queue = Promise.resolve();
  const oneAtATime = (fn) => (...a) => { const run = queue.then(() => fn(...a)); queue = run.catch(() => {}); return run; };
  const api = { draft, published, index, saveDraft, publish, rollback, flag, buildAll, release, readTokenDir, stateOfRelease, saveFont };
  return { E, ...Object.fromEntries(Object.entries(api).map(([k, f]) => [k, oneAtATime(f)])) };
}

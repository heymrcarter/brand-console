// Reads and writes the design system through a storage (see server/storage/storage.mjs). The storage holds the
// design system repository's files, as the console sees them:
//   tokens/        W3C design token files. With the edits on top, they are the draft.
//   fonts/         font files the brand team uploaded.
//   package.json   the live version's number.
// live is the same repository without the edits: what has landed. On GitHub, storage is the main branch plus the
// edits waiting in the Durable Object, and live is the main branch alone. Edits never go to main from here: they
// go to a proposal (server/proposals.mjs), and land when its pull request is merged.
// This file never touches the disk itself, so the same code can run in a Cloudflare Worker with another storage.
// Every method is async, and they run one at a time, so two saves never mix.
import { loadEngine } from "./engine.mjs";
import { mergeEdits } from "./merge.mjs";

// copyEngineResults: false skips the engine's defensive copies (see server/engine.mjs), for the Worker. The store
// never changes what the engine hands back, so its results are the same either way.
export function createStore(storage, { live = storage, copyEngineResults = true } = {}) {
  const E = loadEngine(undefined, { copy: copyEngineResults });
  const readJson = async (s, p) => { const t = await s.read(p); return t === null ? null : JSON.parse(t); };
  const writeFile = (p, data) => storage.write(p, typeof data === "string" || data instanceof Uint8Array ? data : JSON.stringify(data, null, 2) + "\n");
  const err = (status, message) => Object.assign(new Error(message), { status });

  // The token files under dir, keyed like "tokens/brands/brand.tokens.json", whatever dir is.
  async function readTokenDir(dir, from = storage) {
    const keys = (await from.list(dir)).filter((k) => k.endsWith(".json"));
    const skip = dir ? dir.replace(/\/$/, "").length + 1 : 0;
    const values = await Promise.all(keys.map((k) => readJson(from, k)));
    return Object.fromEntries(keys.map((k, i) => ["tokens/" + k.slice(skip), values[i]]));
  }
  // A token file the state no longer has, like a removed brand's, is deleted. The engine reads every brand file it finds.
  async function writeTokenDir(dir, files) {
    const keep = new Set(Object.keys(files).filter((k) => k.startsWith("tokens/")).map((k) => `${dir}/${k.slice(7)}`));
    const gone = (await storage.list(`${dir}/brands`)).filter((p) => p.endsWith(".json") && !keep.has(p));
    await Promise.all([...[...keep].map((p) => writeFile(p, files["tokens/" + p.slice(dir.length + 1)])), ...gone.map((p) => storage.remove(p))]);
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

  /** The live version's number, from the repository's package.json. */
  async function version() { const pkg = await readJson(live, "package.json"); return (pkg && pkg.version) || "0.0.0"; }
  /** What has landed: the repository without the edits. */
  async function published() { const st = E.filesToState(await readTokenDir("tokens", live)); st.version = await version(); return st; }
  /** The edits: the repository with them on top. */
  async function draft() { const st = E.filesToState(await readTokenDir("tokens")); st.version = await version(); return st; }

  function clean(st) {
    if (!st || typeof st !== "object" || !st.brands || !st.type || !st.comp) throw err(400, "The design system data is missing parts.");
    return E.withDefaults(E.clone(st));
  }
  // Versions of the edits. Each is named by a hash of its contents (its "rev"). The newest 50 are kept, so a save
  // made on an older one can be combined with what others saved since (server/merge.mjs).
  const revs = new Map();
  async function revOf(st) {
    const text = JSON.stringify(st);
    const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
    revs.delete(hash); revs.set(hash, text);
    while (revs.size > 50) revs.delete(revs.keys().next().value);
    return hash;
  }
  /**
   * Saves the edits. base is the rev of the edits this save was made on. When others have saved since, only what
   * this save changed is applied on top of theirs, and the combined edits come back as draft. Without a base (the
   * server's own changes, like a Figma sync), the edits are replaced. A base the store no longer knows is refused
   * (409), so nobody's work is overwritten without them knowing.
   */
  async function saveDraft(st, { base } = {}) {
    clean(st); // Refuses broken data before anything else.
    let merged = false;
    if (base) {
      const cur = await draft(), curRev = await revOf(cur);
      if (base !== curRev) {
        const was = revs.get(base);
        if (!was) throw err(409, "Someone else changed the edits while this page was open, and the console could not combine them with yours. Reload the page to see the newest edits.");
        st = mergeEdits(JSON.parse(was), st, cur);
        merged = true;
      }
    }
    await writeTokenDir("tokens", E.stateToFiles(clean(st)));
    const now = await draft();
    // current is for the server (the live room sends it to everyone else). The API does not send it back.
    return { ok: true, savedAt: new Date().toISOString(), rev: await revOf(now), current: now, ...(merged ? { merged: true, draft: now } : {}) };
  }
  /**
   * Makes the edits an earlier version, keeping the edits made on top of the live one. The person then adds it
   * to the proposal like any other change. target is that version's design system.
   */
  async function restore(target) {
    const pub = await published(), d = await draft();
    const nd = E.clone(target);
    for (const c of E.diff(pub, d)) {
      if (c.path === "brandOrder") continue;
      const v = E.getP(d, c.path);
      // Walked here, not with E.getP: the engine may hand back a copy (copyEngineResults), and this must change nd itself.
      if (v === undefined) { const ks = c.path.split("."); const parent = ks.slice(0, -1).reduce((o, k) => (o == null ? o : o[k]), nd); if (parent) delete parent[ks.at(-1)]; }
      else E.setP(nd, c.path, E.clone(v));
    }
    await saveDraft(nd);
    return draft();
  }

  // One at a time: each call waits for the one before it to finish, even if that one failed.
  let queue = Promise.resolve();
  const oneAtATime = (fn) => (...a) => { const run = queue.then(() => fn(...a)); queue = run.catch(() => {}); return run; };
  const api = { draft, published, saveDraft, restore, readTokenDir, saveFont };
  return { E, storage, revOf, ...Object.fromEntries(Object.entries(api).map(([k, f]) => [k, oneAtATime(f)])) };
}

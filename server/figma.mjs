// Figma sync for the server. Talks to the Figma REST API with a personal access token.
// The token is the FIGMA_TOKEN secret (kept in the Durable Object) and never goes to the browser.
// The file link lives in figma.json. What both sides agreed on at the last sync lives in .figma-sync.json.
// Files and secrets go through the storage and secrets interfaces (see server/storage/storage.mjs), never the disk.

const plainErr = (status, message) => Object.assign(new Error(message), { status });

export function parseFigmaKey(link) {
  const s = String(link || "").trim();
  const m = s.match(/figma\.com\/(?:design|file|board|proto|slides)\/([A-Za-z0-9]{10,})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9]{10,}$/.test(s)) return s;
  return null;
}

export function createFigma({ storage, secrets, store, apiBase }) {
  const E = store.E;
  const API = (apiBase || "https://api.figma.com").replace(/\/$/, "");
  const CFG = "figma.json", SYNC = ".figma-sync.json";
  const readJson = async (p, d) => { try { const t = await storage.read(p); return t === null ? d : JSON.parse(t); } catch { return d; } };
  const cfg = () => readJson(CFG, {});
  const saveCfg = (c) => storage.write(CFG, JSON.stringify(c, null, 2) + "\n");
  const token = async () => (await secrets.get("FIGMA_TOKEN")) || "";
  const saveToken = (t) => secrets.set("FIGMA_TOKEN", t);
  const saveSync = (b) => storage.write(SYNC, JSON.stringify(b, null, 1) + "\n");
  const base = async () => { const s = await readJson(SYNC, null); return s && s.fileKey === ((await cfg()).fileKey || "files") ? s : null; };

  async function call(method, p, body, tok) {
    const t = tok || await token();
    if (!t) throw plainErr(503, "Figma is not connected yet. Add a Figma access token on the Figma page.");
    for (let tries = 0; ; tries++) {
      let r;
      try {
        r = await fetch(API + p, { method, headers: { "X-Figma-Token": t, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
      } catch (e) {
        throw plainErr(502, "The console could not reach Figma. Check your internet connection, then try again.");
      }
      if (r.status === 429 && tries < 3) { const wait = Math.min(20, Number(r.headers.get("retry-after")) || 2 * (tries + 1)); await new Promise((ok) => setTimeout(ok, wait * 1000)); continue; }
      const text = await r.text(); let j = {};
      try { j = text ? JSON.parse(text) : {}; } catch { j = { message: text }; }
      if (!r.ok) { const e = plainErr(r.status, j.message || j.err || j.error || `Figma returned an error (${r.status}).`); e.figma = true; throw e; }
      return j;
    }
  }
  const explain = (e, what) => {
    if (e.status === 403 && what.startsWith("change")) return plainErr(403, "Figma did not let the console change this file's variables. Check that your token has Variables: read and write, and that you can edit this file. Variables also need Figma's Enterprise plan and a full seat.");
    if (e.status === 403) return plainErr(403, `Figma did not let the console ${what}. Check that your token can read this file. Variables also need Figma's Enterprise plan and a full seat.`);
    if (e.status === 404) return plainErr(404, "Figma could not find that file. Check the link, and check that your account can open the file.");
    if (e.status === 400) return plainErr(400, `Figma did not accept the change: ${e.message}`);
    return e;
  };

  async function status() {
    const c = await cfg(), b = await base(), t = await token();
    return { connected: !!(t && c.fileKey), hasToken: !!t, fileUrl: c.fileUrl || "", fileKey: c.fileKey || "", fileName: c.fileName || "",
      varsBlocked: !!c.varsBlocked, lastSync: b ? b.lastSync : null, lastSource: b ? b.source : null };
  }

  async function connect({ fileUrl, token: newToken }) {
    const key = parseFigmaKey(fileUrl);
    if (!key) throw plainErr(400, "That does not look like a Figma file link. Copy the link from Figma's Share button. It looks like https://www.figma.com/design/ABC123/Your-library.");
    const t = String(newToken || "").trim() || await token();
    if (!t) throw plainErr(400, "Paste a Figma access token too. The steps to make one are on this page.");
    let file;
    try { file = await call("GET", `/v1/files/${key}?depth=1`, null, t); } catch (e) { throw explain(e, "open this file"); }
    let varsBlocked = false;
    try { await call("GET", `/v1/files/${key}/variables/local`, null, t); } catch (e) { if (e.status === 403 || e.status === 400) varsBlocked = true; else throw explain(e, "read the file's variables"); }
    if (newToken) await saveToken(t);
    await saveCfg({ fileUrl: String(fileUrl).trim(), fileKey: key, fileName: file.name || "Figma file", varsBlocked, connectedAt: new Date().toISOString() });
    return status();
  }
  async function disconnect({ forgetToken } = {}) {
    const old = await storage.read(CFG);
    if (old !== null) { await storage.write(CFG + ".old", old); await storage.remove(CFG); }
    if (forgetToken) await saveToken("");
    return status();
  }
  async function setLink({ fileUrl }) {
    const key = parseFigmaKey(fileUrl);
    if (!key) throw plainErr(400, "That does not look like a Figma file link. Copy the link from Figma's Share button.");
    await saveCfg({ ...(await cfg()), fileUrl: String(fileUrl).trim(), fileKey: key });
    return status();
  }

  // Colors and fonts from the file's styles. Only read, so the brand team can add them to the console.
  async function readStyles(key) {
    const out = { colors: [], fonts: [] };
    try {
      let list = ((await call("GET", `/v1/files/${key}/styles`)).meta || {}).styles || [];
      if (!list.length) { const f = await call("GET", `/v1/files/${key}?depth=2`); list = Object.entries(f.styles || {}).map(([node_id, s]) => ({ node_id, style_type: s.styleType, name: s.name })); }
      list = list.filter((s) => s.style_type === "FILL" || s.style_type === "TEXT").slice(0, 400);
      for (let i = 0; i < list.length; i += 80) {
        const ids = list.slice(i, i + 80).map((s) => s.node_id).join(",");
        const nodes = (await call("GET", `/v1/files/${key}/nodes?ids=${encodeURIComponent(ids)}`)).nodes || {};
        for (const s of list.slice(i, i + 80)) {
          const d = nodes[s.node_id] && nodes[s.node_id].document; if (!d) continue;
          if (s.style_type === "FILL") { const p = (d.fills || []).find((f) => f.type === "SOLID" && f.visible !== false); if (p && p.color) out.colors.push({ name: s.name, hex: rgbHex(p.color) }); }
          if (s.style_type === "TEXT" && d.style && d.style.fontFamily && !out.fonts.includes(d.style.fontFamily)) out.fonts.push(d.style.fontFamily);
        }
      }
    } catch (e) { /* Styles are extra. Missing styles never stop a sync. */ }
    return out;
  }
  const rgbHex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase();

  async function readRemote() {
    const c = await cfg();
    if (!c.fileKey) throw plainErr(409, "Add your Figma file link first.");
    let meta;
    try { meta = (await call("GET", `/v1/files/${c.fileKey}/variables/local`)).meta || {}; }
    catch (e) {
      if (e.status === 403) { await saveCfg({ ...c, varsBlocked: true }); throw plainErr(403, "Figma did not let the console read variables. Figma only allows this on the Enterprise plan, with a full seat and a token that can read and write variables. You can still sync with files. The steps are on this page."); }
      throw explain(e, "read the file's variables");
    }
    if (c.varsBlocked) await saveCfg({ ...c, varsBlocked: false });
    return { vars: E.figFromRest(meta), key: c.fileKey };
  }

  // Extra things in the file's styles that the console does not have yet.
  function extrasFor(st, styles) {
    const have = new Set(Object.values(st.brands).flatMap((br) => (br.palette ? br.palette.groups.flatMap((g) => g.colors.map((x) => x.hex)) : [br.primary, br.secondary, br.accent])));
    const fontsKnown = new Set(E.fontsShown(st));
    return { colors: styles.colors.filter((x) => !have.has(x.hex)).slice(0, 60), fonts: styles.fonts.filter((f) => !fontsKnown.has(f)).slice(0, 30) };
  }

  async function compare({ role } = {}) {
    const st = await store.draft(), { vars, key } = await readRemote();
    const rows = E.figCompare(st, vars, await base(), { role });
    const styles = await readStyles(key);
    return { rows, summary: E.figSummary(rows), extras: extrasFor(st, styles), otherVariables: vars.extra, status: await status() };
  }

  function addColors(st, list) {
    for (const x of list || []) {
      if (!Object.hasOwn(st.brands, String(x.brand))) continue;
      const br = st.brands[x.brand]; if (!br || !/^#[0-9A-F]{6}$/i.test(x.hex || "")) continue;
      br.palette = br.palette || { groups: [] };
      let g = br.palette.groups.find((y) => y.id === "from-figma");
      if (!g) { g = { id: "from-figma", name: "From Figma", note: "Colors added from the Figma library's color styles.", colors: [] }; br.palette.groups.push(g); }
      let name = String(x.name || x.hex).split("/").pop().trim().slice(0, 40) || x.hex, n = 2; const b0 = name;
      const key = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      while (g.colors.some((c) => key(c.name) === key(name))) name = `${b0} ${n++}`;
      g.colors.push({ name, hex: x.hex.toUpperCase(), share: 2 });
    }
    return st;
  }

  // seen: {rowKey: [console value, Figma value]} for every difference the person reviewed.
  function sameAsReviewed(rows, seen) {
    if (!seen) return true;
    const now = rows.filter((r) => r.status !== "same");
    return now.every((r) => seen[r.rk] && String(seen[r.rk][0] ?? "") === String(r.c ?? "") && String(seen[r.rk][1] ?? "") === String(r.f ?? ""));
  }
  async function apply({ picks: rawPicks = {}, role, addColors: colors = [], seen } = {}) {
    const draft = await store.draft(), { vars, key } = await readRemote();
    const rows = E.figCompare(draft, vars, await base(), { role });
    if (!sameAsReviewed(rows, seen)) throw plainErr(409, "Something changed in Figma or in your draft while you were looking. Check for changes again, then sync.");
    const picks = E.figCleanPicks(rows, rawPicks);
    const open = rows.filter((r) => r.status !== "same" && (picks[r.rk] === undefined ? r.pick : picks[r.rk]) === null);
    if (open.length) throw plainErr(409, `Pick which one to keep for ${open.length} thing${open.length > 1 ? "s" : ""} that changed in both places.`);
    const { state: next0, errors } = E.figApply(draft, rows, picks);
    const next = E.withDefaults(addColors(next0, colors));
    const body = E.figPushBody(next, vars, rows, picks);
    const counts = { values: (body.variableModeValues || []).length, created: (body.variables || []).filter((v) => v.action === "CREATE").length, removed: (body.variables || []).filter((v) => v.action === "DELETE").length, collections: (body.variableCollections || []).length };
    if (Object.keys(body).length) { try { await call("POST", `/v1/files/${key}/variables`, body); } catch (e) { throw explain(e, "change the file's variables"); } }
    const changedHere = E.diff(draft, next).length;
    if (changedHere) await store.saveDraft(next);
    const b = E.figBaseAfter(next, rows, picks);
    await saveSync({ fileKey: key, lastSync: new Date().toISOString(), source: "api", ...b });
    return { ok: true, sentToFigma: counts, changedHere, errors, status: await status() };
  }

  // Sync with files when the plan does not allow the variables API.
  async function exportFiles() { return { files: E.figFiles(await store.draft()) }; }
  // The draft's brands give the modes a file name can match, like "Crestline dark".
  function readFiles(files, st) {
    return (files || []).map((f) => { let json; try { json = typeof f.json === "object" ? f.json : JSON.parse(f.text || "{}"); } catch { throw plainErr(400, `${f.name} is not a token file. Pick the .json files you exported from Figma.`); }
      const g = E.figGuessFile(f.name, json, st); return { name: f.name, json, coll: f.coll || g.coll, mode: f.mode || g.mode }; });
  }
  async function compareFiles({ files, role } = {}) {
    const st = await store.draft(), list = readFiles(files, st);
    const vars = E.figFromFiles(list);
    const seen = new Set(list.filter((f) => f.coll).map((f) => f.coll));
    const rows = E.figCompare(st, vars, await base(), { role }).filter((r) => seen.has(r.coll) && (r.f !== undefined || r.status === "deleted"));
    return { rows, summary: E.figSummary(rows), files: list.map(({ name, coll, mode }) => ({ name, coll, mode })) };
  }
  async function applyFiles({ files, picks: rawPicks = {}, role } = {}) {
    const draft = await store.draft(), list = readFiles(files, draft), vars = E.figFromFiles(list);
    const seen = new Set(list.filter((f) => f.coll).map((f) => f.coll));
    const rows = E.figCompare(draft, vars, await base(), { role }).filter((r) => seen.has(r.coll) && (r.f !== undefined || r.status === "deleted"));
    const picks = E.figCleanPicks(rows, rawPicks);
    const open = rows.filter((r) => r.status !== "same" && (picks[r.rk] === undefined ? r.pick : picks[r.rk]) === null);
    if (open.length) throw plainErr(409, `Pick which one to keep for ${open.length} thing${open.length > 1 ? "s" : ""} that changed in both places.`);
    const { state: next, errors } = E.figApply(draft, rows, picks);
    const changedHere = E.diff(draft, next).length;
    if (changedHere) await store.saveDraft(next);
    // Only what both sides are known to share counts as agreed. Values going to Figma count after the next upload shows them.
    const b = E.figBaseAfterFiles(await base(), next, rows, picks);
    await saveSync({ fileKey: (await cfg()).fileKey || "files", lastSync: new Date().toISOString(), source: "files", ...b });
    return { ok: true, changedHere, errors, files: E.figFiles(next), status: await status() };
  }

  return { status, connect, disconnect, setLink, compare, apply, exportFiles, compareFiles, applyFiles, call };
}

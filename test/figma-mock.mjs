// A stand-in for the Figma REST API, used by the tests. It follows Figma's documented rules for
// GET /v1/files/:key, /styles, /nodes, /variables/local and POST /variables (atomic, temp ids, unique names, fixed types).
import http from "node:http";

export function startFigmaMock({ token = "test-token", plan = "enterprise", fileKey = "ABCDEFGHIJ1234", name = "Brand library" } = {}) {
  const db = { name, collections: {}, variables: {}, styles: [], nodes: {}, n: 1, posts: [] };
  const id = (p) => `${p}:${db.n++}`;
  const api = {
    db, plan, fileKey,
    // Helpers for tests: make the file look like one a team already has.
    addCollection(nm, modes) { const cid = id("VariableCollectionId"); const ms = modes.map((m) => ({ modeId: id("m"), name: m })); db.collections[cid] = { id: cid, name: nm, key: cid, modes: ms, defaultModeId: ms[0].modeId, remote: false, hiddenFromPublishing: false, variableIds: [] }; return db.collections[cid]; },
    addVariable(cid, nm, type, valuesByModeName) { const c = db.collections[cid]; const vid = id("VariableID"); const valuesByMode = {}; c.modes.forEach((m) => { if (valuesByModeName[m.name] !== undefined) valuesByMode[m.modeId] = valuesByModeName[m.name]; }); db.variables[vid] = { id: vid, name: nm, key: vid, variableCollectionId: cid, resolvedType: type, valuesByMode, remote: false, description: "", hiddenFromPublishing: false, scopes: ["ALL_SCOPES"], codeSyntax: {} }; c.variableIds.push(vid); return db.variables[vid]; },
    addStyle(type, nm, doc) { const nid = id("S"); db.styles.push({ key: nid, node_id: nid, style_type: type, name: nm }); db.nodes[nid] = { document: { id: nid, name: nm, ...doc } }; },
    find(collName, varName) { const c = Object.values(db.collections).find((x) => x.name === collName); if (!c) return null; const v = Object.values(db.variables).find((x) => x.variableCollectionId === c.id && x.name === varName); return v ? { c, v, byMode: Object.fromEntries(c.modes.map((m) => [m.name, v.valuesByMode[m.modeId]])) } : null; },
    setValue(collName, varName, modeName, value) { const f = api.find(collName, varName); const m = f.c.modes.find((x) => x.name === modeName); f.v.valuesByMode[m.modeId] = value; },
  };
  const send = (res, code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
  const bad = (res, msg) => send(res, 400, { status: 400, error: true, message: msg });
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    if (req.headers["x-figma-token"] !== token) return send(res, 403, { status: 403, err: "Invalid token" });
    const m = u.pathname.match(/^\/v1\/files\/([^/]+)(\/.*)?$/);
    if (!m) return send(res, 404, { status: 404, err: "Not found" });
    if (m[1] !== fileKey) return send(res, 404, { status: 404, err: "Not found" });
    const sub = m[2] || "";
    if (req.method === "GET" && sub === "") return send(res, 200, { name: db.name, lastModified: new Date().toISOString(), document: { id: "0:0", name: "Document", type: "DOCUMENT", children: [] }, styles: Object.fromEntries(db.styles.map((s) => [s.node_id, { key: s.key, name: s.name, styleType: s.style_type, remote: false, description: "" }])) });
    if (req.method === "GET" && sub === "/styles") return send(res, 200, { status: 200, error: false, meta: { styles: db.styles.map((s) => ({ ...s, file_key: fileKey })) } });
    if (req.method === "GET" && sub === "/nodes") { const ids = (u.searchParams.get("ids") || "").split(","); return send(res, 200, { name: db.name, nodes: Object.fromEntries(ids.filter((i) => db.nodes[i]).map((i) => [i, db.nodes[i]])) }); }
    if (sub.startsWith("/variables") && api.plan !== "enterprise") return send(res, 403, { status: 403, error: true, message: "Limited by Figma plan" });
    if (req.method === "GET" && sub === "/variables/local") return send(res, 200, { status: 200, error: false, meta: { variables: db.variables, variableCollections: db.collections } });
    if (req.method === "POST" && sub === "/variables") {
      let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => {
        let b; try { b = JSON.parse(d); } catch { return bad(res, "Invalid JSON"); }
        if (d.length > 4 * 1024 * 1024) return bad(res, "Request too large");
        const work = JSON.parse(JSON.stringify({ collections: db.collections, variables: db.variables })), tmp = {};
        const real = (x) => tmp[x] || x;
        try {
          for (const c of b.variableCollections || []) {
            if (c.action === "CREATE") { if (!c.name) throw new Error("Collection name required"); const cid = id("VariableCollectionId"); const mid = id("m"); if (c.id) tmp[c.id] = cid; if (c.initialModeId) tmp[c.initialModeId] = mid; work.collections[cid] = { id: cid, name: c.name, key: cid, modes: [{ modeId: mid, name: "Mode 1" }], defaultModeId: mid, remote: false, hiddenFromPublishing: false, variableIds: [] }; }
            else if (c.action === "UPDATE") { const x = work.collections[real(c.id)]; if (!x) throw new Error("Collection not found: " + c.id); if (c.name) x.name = c.name; }
            else if (c.action === "DELETE") { delete work.collections[real(c.id)]; }
            else throw new Error("Bad action");
          }
          for (const md of b.variableModes || []) {
            const c = work.collections[real(md.variableCollectionId)]; if (!c) throw new Error("Collection not found for mode: " + md.variableCollectionId);
            if (md.action === "CREATE") { if (!md.name || md.name.length > 40) throw new Error("Bad mode name"); if (c.modes.length >= 40) throw new Error("Too many modes"); if (c.modes.some((x) => x.name === md.name)) throw new Error("Duplicate mode name " + md.name); const mid = id("m"); if (md.id) tmp[md.id] = mid; c.modes.push({ modeId: mid, name: md.name }); }
            else if (md.action === "UPDATE") { const x = c.modes.find((y) => y.modeId === real(md.id)); if (!x) throw new Error("Mode not found: " + md.id); if (md.name) { if (c.modes.some((y) => y !== x && y.name === md.name)) throw new Error("Duplicate mode name"); x.name = md.name; } }
            else if (md.action === "DELETE") { c.modes = c.modes.filter((y) => y.modeId !== real(md.id)); }
          }
          for (const v of b.variables || []) {
            if (v.action === "CREATE") {
              const cid = real(v.variableCollectionId), c = work.collections[cid]; if (!c) throw new Error("Collection not found for variable " + v.name);
              if (!v.name || /[.{}]/.test(v.name)) throw new Error("Invalid variable name: " + v.name);
              if (!["BOOLEAN", "FLOAT", "STRING", "COLOR"].includes(v.resolvedType)) throw new Error("Bad type");
              if (Object.values(work.variables).some((x) => x.variableCollectionId === cid && x.name === v.name)) throw new Error("Duplicate variable name " + v.name);
              const vid = id("VariableID"); if (v.id) tmp[v.id] = vid;
              work.variables[vid] = { id: vid, name: v.name, key: vid, variableCollectionId: cid, resolvedType: v.resolvedType, valuesByMode: {}, remote: false, description: v.description || "", hiddenFromPublishing: false, scopes: v.scopes || ["ALL_SCOPES"], codeSyntax: v.codeSyntax || {} };
              c.variableIds.push(vid);
            } else if (v.action === "UPDATE") { const x = work.variables[real(v.id)]; if (!x) throw new Error("Variable not found"); if (v.resolvedType && v.resolvedType !== x.resolvedType) throw new Error("Cannot change type"); if (v.name) x.name = v.name; if (v.description !== undefined) x.description = v.description; }
            else if (v.action === "DELETE") { const x = work.variables[real(v.id)]; if (!x) throw new Error("Variable not found: " + v.id); delete work.variables[x.id]; Object.values(work.collections).forEach((c) => (c.variableIds = c.variableIds.filter((i) => i !== x.id))); }
          }
          for (const mv of b.variableModeValues || []) {
            const x = work.variables[real(mv.variableId)]; if (!x) throw new Error("Variable not found for value: " + mv.variableId);
            const c = work.collections[x.variableCollectionId], mid = real(mv.modeId); if (!c.modes.some((y) => y.modeId === mid)) throw new Error("Mode not found for value: " + mv.modeId);
            const val = mv.value, t = x.resolvedType;
            const ok = val && typeof val === "object" && val.type === "VARIABLE_ALIAS" ? true : t === "COLOR" ? val && ["r", "g", "b"].every((k) => typeof val[k] === "number" && val[k] >= 0 && val[k] <= 1) : t === "FLOAT" ? typeof val === "number" : t === "STRING" ? typeof val === "string" : typeof val === "boolean";
            if (!ok) throw new Error(`Value does not match type ${t} for ${x.name}`);
            x.valuesByMode[mid] = val;
          }
        } catch (e) { return bad(res, e.message); }
        db.collections = work.collections; db.variables = work.variables; db.posts.push(b);
        send(res, 200, { status: 200, error: false, meta: { tempIdToRealId: tmp } });
      });
      return;
    }
    send(res, 404, { status: 404, err: "Not found" });
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => { api.url = `http://127.0.0.1:${server.address().port}`; api.close = () => new Promise((d) => server.close(d)); ok(api); }));
}

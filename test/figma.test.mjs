// Tests for the Figma sync and the font library, against a stand-in for the Figma REST API.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStore } from "../server/store.mjs";
import { createFigma, parseFigmaKey } from "../server/figma.mjs";
import { startFigmaMock } from "./figma-mock.mjs";

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let root, store, figma, mock, E;
const KEY = "ABCDEFGHIJ1234", LINK = `https://www.figma.com/design/${KEY}/Brand-library?node-id=0-1`;

before(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "bc-figma-"));
  for (const d of ["console", "tokens", "releases"]) fs.cpSync(path.join(here, d), path.join(root, d), { recursive: true });
  mock = await startFigmaMock({ fileKey: KEY });
  // The team's existing library: a Brand colors collection with a different Northfield main color, plus styles.
  const c = mock.addCollection("Brand colors", ["Northfield", "Crestline"]);
  mock.addVariable(c.id, "Main color", "COLOR", { Northfield: { r: 0.25, g: 0.4, b: 0.1, a: 1 }, Crestline: { r: 0.1, g: 0.24, b: 0.64, a: 1 } });
  const o = mock.addCollection("Their own tokens", ["Default"]);
  mock.addVariable(o.id, "space/xl", "FLOAT", { Default: 32 });
  mock.addStyle("FILL", "Brand/Sunset orange", { fills: [{ type: "SOLID", color: { r: 0.95, g: 0.45, b: 0.2, a: 1 } }] });
  mock.addStyle("TEXT", "Heading/H1", { style: { fontFamily: "Inter", fontWeight: 700, fontSize: 32 } });
  store = createStore(root); E = store.E;
  figma = createFigma({ root, store, apiBase: mock.url });
});
after(async () => { await mock.close(); fs.rmSync(root, { recursive: true, force: true }); });

const rowOf = (rows, rk) => rows.find((r) => r.rk === rk);
const sameAll = async () => { const r = await figma.compare({ role: "brand" }); return r.rows.filter((x) => x.status !== "same"); };

test("reads Figma file links", () => {
  assert.equal(parseFigmaKey(LINK), KEY);
  assert.equal(parseFigmaKey("https://www.figma.com/file/ZZZZZZZZZZ99/x"), "ZZZZZZZZZZ99");
  assert.equal(parseFigmaKey("not a link"), null);
});

test("connect explains a bad token, then saves a good one in .env", async () => {
  await assert.rejects(figma.connect({ fileUrl: LINK, token: "wrong" }), /did not let the console/);
  const s = await figma.connect({ fileUrl: LINK, token: "test-token" });
  assert.equal(s.connected, true); assert.equal(s.fileName, "Brand library"); assert.equal(s.varsBlocked, false);
  assert.match(fs.readFileSync(path.join(root, ".env"), "utf8"), /^FIGMA_TOKEN=test-token$/m);
});

test("first sync reads the existing file, keeps its values, and adds what is missing", async () => {
  const r = await figma.compare({ role: "brand" });
  const main = rowOf(r.rows, "brand::Main color@@Northfield");
  assert.equal(main.status, "both"); assert.equal(main.pick, "figma"); assert.equal(main.f, "#40661A");
  assert.ok(r.rows.filter((x) => x.status === "new").length > 200, "most things are new to Figma");
  assert.deepEqual(r.extras.colors.map((x) => x.name), ["Brand/Sunset orange"]);
  assert.deepEqual(r.extras.fonts, ["Inter"]);
  assert.equal(r.otherVariables, 1);
  const res = await figma.apply({ role: "brand", addColors: [{ brand: "northfield", name: "Brand/Sunset orange", hex: "#F27333" }] });
  assert.equal(res.ok, true); assert.ok(res.sentToFigma.created > 150); assert.equal(res.sentToFigma.collections, 4);
  const d = store.draft();
  assert.equal(d.brands.northfield.primary, "#40661A");
  assert.ok(d.brands.northfield.palette.groups.find((g) => g.id === "from-figma").colors.some((c) => c.name === "Sunset orange"));
  assert.deepEqual(await sameAll(), [], "after the sync, both sides match");
  const theme = Object.values(mock.db.collections).find((c) => c.name === "Theme colors");
  assert.deepEqual(theme.modes.map((m) => m.name), ["Northfield light", "Northfield dark", "Crestline light", "Crestline dark"]);
  assert.ok(Object.values(mock.db.collections).some((c) => c.name === "Their own tokens"), "the team's own collections are left alone");
});

test("a change in Figma comes into the console, and colors made from it follow in Figma", async () => {
  mock.setValue("Brand colors", "Main color", "Northfield", { r: 0.42, g: 0.18, b: 0.51, a: 1 });
  const r = await figma.compare({ role: "brand" });
  const main = rowOf(r.rows, "brand::Main color@@Northfield");
  assert.equal(main.status, "figma"); assert.equal(main.pick, "figma");
  await figma.apply({ role: "brand" });
  assert.equal(store.draft().brands.northfield.primary, "#6B2E82");
  assert.deepEqual(await sameAll(), []);
});

test("a change in the console goes to Figma", async () => {
  const d = store.draft(); d.shape.radius = 12; store.saveDraft(d);
  const r = await figma.compare({ role: "brand" });
  assert.equal(rowOf(r.rows, "found::Corners/Base radius@@Value").status, "console");
  await figma.apply({ role: "brand" });
  assert.equal(mock.find("Foundations", "Corners/Base radius").byMode.Value, 12);
});

test("a change on both sides waits for a person to pick", async () => {
  const d = store.draft(); d.shape.radius = 6; store.saveDraft(d);
  mock.setValue("Foundations", "Corners/Base radius", "Value", 10);
  const r = await figma.compare({ role: "brand" });
  const row = rowOf(r.rows, "found::Corners/Base radius@@Value");
  assert.equal(row.status, "both"); assert.equal(row.pick, null);
  await assert.rejects(figma.apply({ role: "brand" }), /Pick which one to keep/);
  await figma.apply({ role: "brand", picks: { [row.rk]: "figma" } });
  assert.equal(store.draft().shape.radius, 10);
  assert.deepEqual(await sameAll(), []);
});

test("values that do not fit the console are sent back", async () => {
  mock.setValue("Foundations", "Font/Body", "Value", "Comic Neue");
  mock.setValue("Theme colors", "primary-edge", "Northfield light", { r: 1, g: 0, b: 0, a: 1 });
  const r = await figma.compare({ role: "brand" });
  const font = rowOf(r.rows, "found::Font/Body@@Value"), edge = rowOf(r.rows, "theme::primary-edge@@Northfield light");
  assert.equal(font.status, "bad"); assert.equal(font.canFigma, false); assert.match(font.why, /not in the font library/);
  assert.equal(edge.status, "fixed"); assert.equal(edge.pick, "console");
  await figma.apply({ role: "brand" });
  assert.equal(mock.find("Foundations", "Font/Body").byMode.Value, store.draft().type.body);
  assert.deepEqual(await sameAll(), []);
});

test("only the admin team takes spacing from Figma", async () => {
  mock.setValue("Foundations", "Size/Consumer/Control height", "Value", 52);
  let r = await figma.compare({ role: "brand" });
  let row = rowOf(r.rows, "found::Size/Consumer/Control height@@Value");
  assert.equal(row.canFigma, false); assert.equal(row.pick, "skip");
  r = await figma.compare({ role: "admin" });
  row = rowOf(r.rows, "found::Size/Consumer/Control height@@Value");
  assert.equal(row.pick, "figma");
  await figma.apply({ role: "admin" });
  assert.equal(store.draft().density.consumer.control, 52);
});

test("color set colors can be added and removed from either side", async () => {
  const sets = Object.values(mock.db.collections).find((c) => c.name === "Color sets");
  mock.addVariable(sets.id, "Northfield/Accent colors/Mint", "COLOR", { Value: { r: 0.4, g: 0.85, b: 0.7, a: 1 } });
  const coral = mock.find("Color sets", "Northfield/Accent colors/Coral"); delete mock.db.variables[coral.v.id];
  const r = await figma.compare({ role: "brand" });
  const mint = rowOf(r.rows, "sets::Northfield/Accent colors/Mint@@Value"), gone = rowOf(r.rows, "sets::Northfield/Accent colors/Coral@@Value");
  assert.equal(mint.status, "extra"); assert.equal(mint.pick, "figma");
  assert.equal(gone.status, "gone"); assert.equal(gone.pick, "figma");
  await figma.apply({ role: "brand" });
  const acc = store.draft().brands.northfield.palette.groups.find((g) => g.name === "Accent colors").colors.map((c) => c.name);
  assert.ok(acc.includes("Mint")); assert.ok(!acc.includes("Coral"));
  assert.deepEqual(await sameAll(), []);
  // Removed in the console: picked for removal in Figma too.
  const d = store.draft(); const g = d.brands.northfield.palette.groups.find((x) => x.name === "Accent colors"); g.colors = g.colors.filter((c) => c.name !== "Mint"); store.saveDraft(d);
  const r2 = await figma.compare({ role: "brand" });
  const del = rowOf(r2.rows, "sets::Northfield/Accent colors/Mint@@Value");
  assert.equal(del.status, "deleted"); assert.equal(del.pick, "console");
  await figma.apply({ role: "brand" });
  assert.equal(mock.find("Color sets", "Northfield/Accent colors/Mint"), null);
});

test("a variable with the wrong kind is skipped, and the rest still syncs", async () => {
  const f = mock.find("Foundations", "Shadow/Default"); f.v.resolvedType = "FLOAT"; f.v.valuesByMode = { [f.c.modes[0].modeId]: 3 };
  const d = store.draft(); d.shape.radius = 9; store.saveDraft(d);
  const r = await figma.compare({ role: "brand" });
  assert.equal(rowOf(r.rows, "found::Shadow/Default@@Value").status, "type");
  await figma.apply({ role: "brand" });
  assert.equal(mock.find("Foundations", "Corners/Base radius").byMode.Value, 9);
});

test("safeguards: conflicts on removed colors, extra modes, long names, see-through colors, and aliases", async () => {
  const sets = Object.values(mock.db.collections).find((c) => c.name === "Color sets");
  // A designer adds a Print mode, a color with a longer name, and a see-through color.
  sets.modes.push({ modeId: "print-1", name: "Print" });
  Object.values(mock.db.variables).filter((v) => v.variableCollectionId === sets.id).forEach((v) => (v.valuesByMode["print-1"] = { r: 0, g: 0, b: 0, a: 1 }));
  mock.addVariable(sets.id, "Northfield/Accent colors/Reds/Light red", "COLOR", { Value: { r: 1, g: 0.6, b: 0.6, a: 1 } });
  mock.addVariable(sets.id, "Northfield/Accent colors/Fog", "COLOR", { Value: { r: 0.9, g: 0.9, b: 0.9, a: 0.5 } });
  // The console removes Navy, while a designer changes Navy in Figma.
  const d = store.draft(); const g = d.brands.northfield.palette.groups.find((x) => x.name === "Accent colors"); g.colors = g.colors.filter((c) => c.name !== "Navy"); store.saveDraft(d);
  mock.setValue("Color sets", "Northfield/Accent colors/Navy", "Value", { r: 0.1, g: 0.2, b: 0.5, a: 1 });
  // Aliases: one that points nowhere, and one that points to their own token.
  const own = Object.values(mock.db.collections).find((c) => c.name === "Their own tokens");
  const xl = Object.values(mock.db.variables).find((v) => v.variableCollectionId === own.id);
  const found = mock.find("Foundations", "Corners/Base radius"); found.v.valuesByMode[found.c.modes[0].modeId] = { type: "VARIABLE_ALIAS", id: xl.id };
  const shadowless = mock.find("Brand colors", "Accent color"); shadowless.v.valuesByMode[shadowless.c.modes[0].modeId] = { type: "VARIABLE_ALIAS", id: "VariableID:nope" };
  const r = await figma.compare({ role: "brand" });
  assert.ok(!r.rows.some((x) => x.mode === "Print"), "modes the console does not have are left alone");
  assert.ok(!r.rows.some((x) => x.name.includes("Light red")), "longer names are left alone");
  const fog = rowOf(r.rows, "sets::Northfield/Accent colors/Fog@@Value"); assert.equal(fog.status, "bad"); assert.equal(fog.pick, "skip");
  const navy = rowOf(r.rows, "sets::Northfield/Accent colors/Navy@@Value"); assert.equal(navy.status, "deleted"); assert.equal(navy.pick, null);
  const radius = rowOf(r.rows, "found::Corners/Base radius@@Value"); assert.equal(radius.f, 32); assert.equal(radius.canConsole, false);
  const accent = rowOf(r.rows, "brand::Accent color@@Northfield"); assert.equal(accent.status, "alias"); assert.equal(accent.pick, "skip");
  // A review that went stale is refused.
  const seen = Object.fromEntries(r.rows.filter((x) => x.status !== "same").map((x) => [x.rk, [x.c ?? null, x.f ?? null]]));
  mock.setValue("Foundations", "Type/Scale", "Value", 1.333);
  await assert.rejects(figma.apply({ role: "brand", picks: { [navy.rk]: "figma" }, seen }), /changed in Figma or in your draft/);
  // A pick the review did not offer is ignored.
  mock.setValue("Foundations", "Size/Employee/Space between items", "Value", 20);
  const r2 = await figma.compare({ role: "brand" });
  const before = store.draft().density.employee.gap;
  await figma.apply({ role: "brand", picks: { [navy.rk]: "figma", [radius.rk]: "console", "found::Size/Employee/Space between items@@Value": "figma" } });
  assert.equal(store.draft().density.employee.gap, before);
  assert.ok(store.draft().brands.northfield.palette.groups.find((x) => x.name === "Accent colors").colors.some((c) => c.name === "Navy"), "Navy came back with Figma's color");
  const f = mock.find("Foundations", "Corners/Base radius"); assert.deepEqual(f.byMode.Value, { type: "VARIABLE_ALIAS", id: xl.id }, "the alias was not replaced");
  assert.equal(mock.find("Brand colors", "Accent color").byMode.Northfield.id, "VariableID:nope");
  assert.ok(mock.find("Color sets", "Northfield/Accent colors/Fog"), "the see-through color stays in Figma");
  // Put things back for the next tests.
  delete sets.modes.splice(sets.modes.findIndex((m) => m.name === "Print"), 1);
  found.v.valuesByMode[found.c.modes[0].modeId] = 9; shadowless.v.valuesByMode[shadowless.c.modes[0].modeId] = { r: 0.06, g: 0.18, b: 0.33, a: 1 };
  assert.ok(r2.rows.length > 0);
});

test("collections that extend another collection are not used", () => {
  const meta = { variableCollections: { a: { id: "a", name: "Brand colors", isExtension: true, modes: [{ modeId: "1", name: "Northfield" }], defaultModeId: "1" } },
    variables: { v: { id: "v", name: "Main color", variableCollectionId: "a", resolvedType: "COLOR", valuesByMode: { 1: { type: "VARIABLE_ALIAS", id: "missing" } } } } };
  const out = E.figFromRest(meta);
  assert.deepEqual(out.colls, {}); assert.equal(out.extra, 1);
});

test("when the plan blocks variables, files work instead", async () => {
  mock.plan = "organization";
  await assert.rejects(figma.compare({ role: "brand" }), /Enterprise plan/);
  assert.equal(figma.status().varsBlocked, true);
  const { files } = figma.exportFiles();
  assert.equal(files.length, 9);
  assert.ok(files.every((f) => f.json.$extensions["org.brand-console"].mode));
  // Same files back: nothing to change.
  const same = figma.compareFiles({ files: files.map((f) => ({ name: f.name, text: JSON.stringify(f.json) })), role: "brand" });
  assert.equal(same.rows.filter((x) => x.status !== "same").length, 0);
  // A designer changes the gray in Figma and exports again.
  const found = files.find((f) => f.name.startsWith("Foundations")); found.json.Colors["Gray style"].$value = "cool";
  const r = figma.compareFiles({ files: [{ name: found.name, text: JSON.stringify(found.json) }], role: "brand" });
  const row = r.rows.find((x) => x.rk === "found::Colors/Gray style@@Value");
  assert.equal(row.f, "cool");
  const out = figma.applyFiles({ files: [{ name: found.name, text: JSON.stringify(found.json) }], picks: { [row.rk]: "figma" }, role: "brand" });
  assert.equal(store.draft().gray, "cool"); assert.equal(out.files.length, 9);
  // The console changes the corners, then someone uploads the old Foundations file again.
  const d = store.draft(); d.shape.radius = 15; store.saveDraft(d);
  const again = figma.compareFiles({ files: [{ name: found.name, text: JSON.stringify(found.json) }], role: "brand" });
  const rad = again.rows.find((x) => x.rk === "found::Corners/Base radius@@Value");
  assert.equal(rad.status, "console"); assert.equal(rad.pick, "console");
  mock.plan = "enterprise";
});

test("file names and Figma's color formats are understood", () => {
  assert.deepEqual(E.figGuessFile("Theme colors - Crestline dark.tokens.json", {}), { coll: "theme", mode: "Crestline dark" });
  assert.deepEqual(E.figGuessFile("Foundations.json", {}), { coll: "found", mode: "Value" });
  const v = E.figFromFiles([{ name: "x", coll: "brand", mode: "Northfield", json: { "Main color": { $type: "color", $value: { colorSpace: "srgb", components: [1, 0.5, 0], alpha: 1 } } } }]);
  assert.equal(v.vals["brand::Main color@@Northfield"], "#FF8000");
});

test("uploaded fonts reach theme.css, settings.json, and the outputs folder", () => {
  const saved = store.saveFont({ family: "Avenir Next", weight: 400, style: "normal", fileName: "AvenirNext-Regular.woff2", data: Buffer.alloc(400, 7).toString("base64") });
  assert.equal(saved.file, "fonts/avenir-next-400.woff2");
  assert.deepEqual(fs.readFileSync(path.join(root, saved.file)), Buffer.alloc(400, 7), "the font file is saved as it was sent, not as text");
  assert.throws(() => store.saveFont({ family: "X", fileName: "x.exe", data: "AAAA" }), /\.woff2/);
  const d = store.draft();
  d.fontLib = { files: { "Avenir Next": [{ file: saved.file, weight: 400, style: "normal" }] }, added: [{ name: "Nunito", cat: "sans", role: "best", source: "google", axes: "wght@400;700" }], removed: ["Merriweather"] };
  d.type.body = "Avenir Next"; d.type.heading = "Nunito";
  store.saveDraft(d);
  const back = store.draft();
  assert.deepEqual(back.fontLib.removed, ["Merriweather"]);
  const css = fs.readFileSync(path.join(root, "build/draft/theme.css"), "utf8");
  assert.match(css, /@font-face \{ font-family: 'Avenir Next'; src: url\("\.\/fonts\/avenir-next-400\.woff2"\) format\("woff2"\)/);
  assert.ok(fs.existsSync(path.join(root, "build/draft/fonts/avenir-next-400.woff2")));
  const settings = JSON.parse(fs.readFileSync(path.join(root, "build/draft/settings.json"), "utf8"));
  assert.deepEqual(settings.fonts.needLicense, []);
  assert.match(settings.fonts.href, /family=Nunito:wght@400;700/);
  assert.equal(settings.fonts.files[0].file, "fonts/avenir-next-400.woff2");
  assert.ok(!/Nunito Sans/.test(css.match(/--font-body:[^;]*/)[0]), "no free look-alike once the real files are added");
});

// Consistency check: makes sure every color is the same everywhere it shows up.
// Token files -> engine -> theme.css -> console preview -> React components in Storybook -> hex labels in the console.
// Run: node scripts/consistency-audit.mjs   (set STORYBOOK=http://127.0.0.1:6006 to also check Storybook)
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { pathToFileURL, fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { loadEngine } from "../server/engine.mjs";
import { createStore } from "../server/store.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const E = loadEngine(root), store = createStore(root);
const draft = store.draft(), published = store.published();
const problems = [];
const bad = (where, what) => problems.push(`${where}: ${what}`);
const H = (x) => { let s = String(x || "").trim().toUpperCase(); if (/^#[0-9A-F]{3}$/.test(s)) s = "#" + s.slice(1).split("").map((c) => c + c).join(""); return s; };
const hexOk = (x) => /^#[0-9A-F]{6}$/.test(H(x));

// 1. Token files: every color's hex matches its numbers, and files load back to the same draft.
function walk(o, p, f) { if (o && typeof o === "object") { if (o.$value && o.$value.colorSpace) f(p, o.$value); for (const k in o) if (!k.startsWith("$")) walk(o[k], p ? p + "." + k : k, f); } }
for (const f of fs.readdirSync(path.join(root, "tokens"), { recursive: true }).filter((x) => String(x).endsWith(".json"))) {
  const doc = JSON.parse(fs.readFileSync(path.join(root, "tokens", f), "utf8"));
  walk(doc, "", (p, v) => {
    const fromNums = "#" + v.components.map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
    if (!hexOk(v.hex)) bad(`tokens/${f} ${p}`, `hex "${v.hex}" is not a 6-digit color`);
    else if (H(v.hex) !== fromNums) bad(`tokens/${f} ${p}`, `hex ${H(v.hex)} does not match its numbers ${fromNums}`);
  });
}
const back = E.filesToState(E.stateToFiles(draft));
const flat = (o, p = "", out = {}) => { for (const k in o) { const v = o[k], q = p ? p + "." + k : k; if (v && typeof v === "object") flat(v, q, out); else out[q] = v; } return out; };
const fa = flat(draft), fb = flat(back);
for (const k of new Set([...Object.keys(fa), ...Object.keys(fb)])) if (k !== "version" && String(fa[k]) !== String(fb[k])) bad("Token files", `${k} is ${fa[k]} in the draft but ${fb[k]} after saving and loading`);

// 2. theme.css on disk matches the engine for the draft and the live version.
for (const [label, st, file] of [["Draft", draft, "build/draft/theme.css"], ["Live", published, "dist/theme.css"]]) {
  const css = fs.readFileSync(path.join(root, file), "utf8");
  const want = E.themeCss(st, st.version || "draft").replace(/^\/\* Generated.*\n/, "");
  if (css.replace(/^\/\* Generated.*\n/, "") !== want) bad(file, `${label} theme.css is out of date. Run npm run build.`);
}

// 3-5. Browser checks.
const protoFile = path.join(tmpdir(), "brand-console-consistency.html");
execFileSync(process.execPath, [path.join(root, "scripts/build-prototype.mjs"), protoFile], { stdio: "ignore" });
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
await page.goto(pathToFileURL(protoFile).href);
await page.waitForFunction(() => typeof S !== "undefined" && S.draft);
for (const brand of ["northfield", "crestline"]) for (const mode of ["light", "dark"]) {
  const r = await page.evaluate(({ brand, mode }) => {
    S.ui.brand = brand; S.ui.mode = mode; S.sec = "color"; S.ui.src = "sample"; render();
    const cv = document.createElement("canvas"); cv.width = cv.height = 1; const g = cv.getContext("2d", { willReadFrequently: true });
    const hex = (s) => { g.clearRect(0, 0, 1, 1); g.fillStyle = "#000"; g.fillStyle = s; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return d[3] < 255 ? "rgba" : "#" + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase(); };
    const out = [];
    // The preview's variables are exactly the engine's.
    const pv = document.querySelector(".ba-r .pv") || document.querySelector(".pv");
    const want = varsColor(S.draft, brand, mode);
    for (const [k, v] of Object.entries(want)) { const got = getComputedStyle(pv).getPropertyValue(k).trim(); if (/^#/.test(v) && got.toUpperCase() !== v.toUpperCase()) out.push(`preview variable ${k} is ${got}, engine says ${v}`); }
    // Real elements in the preview use those colors.
    const c = colorsFor(S.draft, brand, mode);
    const el = (sel) => pv.querySelector(sel);
    const expect = (sel, prop, v, name) => { const e = el(sel); if (!e) return; const got = hex(getComputedStyle(e)[prop]); if (got !== "rgba" && got !== v.toUpperCase()) out.push(`${name} (${sel} ${prop}) is ${got}, should be ${v}`); };
    expect(".pv-btn.primary:not(.hover)", "backgroundColor", c.btnBg, "Main button color");
    expect(".pv-btn.primary:not(.hover)", "color", c.btnFg, "Main button words");
    expect(".pv-badge.brand", "backgroundColor", c.P, "Brand badge color");
    expect(".pv-badge.brand", "color", c.onP, "Brand badge words");
    expect(".lnk", "color", c.link, "Link color");
    expect(".pv-in", "borderTopColor", c.input, "Field border");
    expect(".pv-help", "color", c.mutedFg, "Help text");
    const pvBg = hex(getComputedStyle(pv).backgroundColor); if (pvBg !== "rgba" && pvBg !== c.background.toUpperCase()) out.push(`Page background is ${pvBg}, should be ${c.background}`);
    // Hex labels in the console match their swatches.
    document.querySelectorAll(".crow").forEach((row) => {
      const sw = row.querySelector(".swbig, input[type=color]"), label = row.querySelector(".hexro, input.hex"); if (!sw || !label) return;
      const a = sw.tagName === "INPUT" ? sw.value.toUpperCase() : hex(getComputedStyle(sw).backgroundColor), t = (label.value || label.textContent).trim().toUpperCase();
      if (a !== "rgba" && /^#[0-9A-F]{6}$/.test(t) && a !== t) out.push(`Console swatch shows ${a} but its label says ${t} (${row.querySelector("b")?.textContent})`);
    });
    document.querySelectorAll("[data-a=pickStep],[data-a=pickRole],[data-a=pairPick]").forEach((b) => { const a = hex(getComputedStyle(b).backgroundColor); if (b.dataset.v && a !== "rgba" && a !== b.dataset.v.toUpperCase()) out.push(`Color button ${b.getAttribute("aria-label")} shows ${a} but picks ${b.dataset.v}`); });
    document.querySelectorAll("table.t td").forEach((td) => { const sw = td.querySelector(".sw"); if (!sw) return; const t = td.textContent.trim().toUpperCase(); const a = hex(getComputedStyle(sw).backgroundColor); if (/^#[0-9A-F]{6}$/.test(t) && a !== t) out.push(`Token table swatch shows ${a} but says ${t}`); });
    return out;
  }, { brand, mode });
  r.forEach((x) => bad(`Console ${brand} ${mode}`, x));
}
// Token values listed on a component page match the swatches next to them.
for (const id of ["button", "checkbox", "card", "badge"]) {
  const r = await page.evaluate((id) => { S.sec = id; render(); const out = []; const cv = document.createElement("canvas"); cv.width = cv.height = 1; const g = cv.getContext("2d");
    const hex = (s) => { g.clearRect(0, 0, 1, 1); g.fillStyle = s; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return "#" + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase(); };
    document.querySelectorAll("table.t td").forEach((td) => { const sw = td.querySelector(".sw"); if (!sw) return; const t = td.textContent.trim().toUpperCase(); if (/^#[0-9A-F]{6}$/.test(t) && hex(getComputedStyle(sw).backgroundColor) !== t) out.push(`${id}: token swatch ${hex(getComputedStyle(sw).backgroundColor)} labeled ${t}`); });
    return out; }, id);
  r.forEach((x) => bad("Console component page", x));
}

// Storybook: the real React components get the same colors as the engine.
if (process.env.STORYBOOK) {
  const sp = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  for (const brand of ["northfield", "crestline"]) for (const mode of ["light", "dark"]) {
    await sp.goto(`${process.env.STORYBOOK}/iframe.html?id=components-button--all&viewMode=story&globals=brand:${brand};mode:${mode}`);
    await sp.waitForSelector("#storybook-root button"); await sp.waitForTimeout(300);
    const want = await page.evaluate(({ brand, mode }) => { const c = colorsFor(S.draft, brand, mode); return { vars: varsColor(S.draft, brand, mode), btnBg: c.btnBg, btnFg: c.btnFg }; }, { brand, mode });
    const got = await sp.evaluate((keys) => { const cs = getComputedStyle(document.documentElement); const b = document.querySelector("#storybook-root button"); const bc = getComputedStyle(b);
      const cv = document.createElement("canvas"); cv.width = cv.height = 1; const g = cv.getContext("2d"); const hex = (s) => { g.clearRect(0, 0, 1, 1); g.fillStyle = s; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return "#" + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase(); };
      return { vars: Object.fromEntries(keys.map((k) => [k, cs.getPropertyValue(k).trim()])), btnBg: hex(bc.backgroundColor), btnFg: hex(bc.color) }; }, Object.keys(want.vars));
    for (const [k, v] of Object.entries(want.vars)) if (/^#/.test(v) && H(got.vars[k]) !== H(v)) bad(`Storybook ${brand} ${mode}`, `${k} is ${got.vars[k]}, engine says ${v}`);
    if (got.btnBg !== want.btnBg.toUpperCase()) bad(`Storybook ${brand} ${mode}`, `React button color is ${got.btnBg}, should be ${want.btnBg}`);
    if (got.btnFg !== want.btnFg.toUpperCase()) bad(`Storybook ${brand} ${mode}`, `React button words are ${got.btnFg}, should be ${want.btnFg}`);
  }
}
await browser.close();
problems.forEach((p) => console.log("PROBLEM", p));
console.log(`Consistency check done. Problems: ${problems.length}.`);
process.exit(problems.length ? 1 : 0);

// Checks every Storybook story in both brands and both modes:
//   - readable text (the same contrast check the console audit uses), and
//   - axe (WCAG 2.2 AA rules), the same engine as Storybook's Accessibility panel.
// Run: npm run audit:storybook
//   It builds Storybook into a temporary folder and serves it. To check a Storybook that is already running, set
//   STORYBOOK=http://127.0.0.1:6006. Needs Playwright, like the other audits: npm install --no-save playwright
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "scripts/audit-contrast.mjs"), "utf8");
const checker = src.slice(src.indexOf("      const cv = document.createElement"), src.indexOf("      return out;"));
const axeSource = fs.readFileSync(path.join(root, "node_modules/axe-core/axe.min.js"), "utf8");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png" };

let base = process.env.STORYBOOK, server = null, out = null;
if (!base) {
  out = fs.mkdtempSync(path.join(os.tmpdir(), "bc-storybook-"));
  console.log("Building Storybook. This takes a minute or two.");
  execFileSync(process.execPath, [path.join(root, "scripts/build.mjs")], { cwd: root, stdio: "ignore" });
  execFileSync(path.join(root, "node_modules/.bin/storybook"), ["build", "-o", out, "--quiet"], { cwd: root, stdio: "ignore" });
  server = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const f = path.resolve(out, "." + (u === "/" ? "/index.html" : u));
    if (!f.startsWith(out + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  base = `http://127.0.0.1:${server.address().port}`;
}

const index = await (await fetch(`${base}/index.json`)).json();
const ids = Object.values(index.entries).filter((e) => e.type === "story").map((e) => e.id);
const only = process.env.ONLY ? ids.filter((i) => i.includes(process.env.ONLY)) : ids;
const combos = [["northfield", "light"], ["northfield", "dark"], ["crestline", "light"], ["crestline", "dark"]];
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const res = { errors: new Map(), contrast: new Map(), axe: new Map(), empty: [] };
let cur = "";
page.on("pageerror", (e) => res.errors.set(cur, String(e).slice(0, 200)));
for (const id of only) for (const [brand, mode] of combos) {
  cur = `${id} (${brand}, ${mode})`;
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story&globals=brand:${brand};mode:${mode}`);
  await page.waitForSelector("#storybook-root > *", { timeout: 15000 }).catch(() => res.empty.push(cur));
  await page.waitForTimeout(300);
  const found = await page.evaluate(`(function(){${checker.replaceAll('document.getElementById("app")', 'document.getElementById("storybook-root")')}\nreturn out;})()`);
  for (const f of found) { const k = [id, f.path, f.fg, f.bg].join("|"); if (!res.contrast.has(k)) res.contrast.set(k, { ...f, at: cur }); }
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: axeSource });
  // Storybook's Accessibility panel may be running axe on the same story. Wait for it to finish, then run.
  const v = await page.evaluate(async () => {
    const opts = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, rules: { "color-contrast": { enabled: false }, region: { enabled: false } } };
    for (let i = 0; ; i++) {
      try { return (await window.axe.run(document.getElementById("storybook-root"), opts)).violations.map((x) => ({ id: x.id, impact: x.impact, help: x.help, n: x.nodes.length, target: x.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" ; ") })); }
      catch (e) { if (i > 40 || !/already running/i.test(String(e))) throw e; await new Promise((r) => setTimeout(r, 250)); }
    }
  });
  for (const x of v) if (!res.axe.has(id + "|" + x.id)) res.axe.set(id + "|" + x.id, { ...x, at: cur });
}
await browser.close();
if (server) server.close();
if (out) fs.rmSync(out, { recursive: true, force: true });
for (const [k, e] of res.errors) console.log("SCRIPT ERROR", k, e);
res.empty.forEach((e) => console.log("EMPTY STORY", e));
for (const c of res.contrast.values()) console.log(`TEXT ${c.ratio} : 1 (needs ${c.need}) "${c.text}" ${c.fg} on ${c.bg} | ${c.path} | ${c.at}`);
for (const a of res.axe.values()) console.log(`AXE ${a.impact} ${a.id}: ${a.help} x${a.n} | ${a.target} | ${a.at}`);
const total = res.errors.size + res.empty.length + res.contrast.size + res.axe.size;
console.log(`Stories: ${only.length}, each in 2 brands and 2 modes. Text problems: ${res.contrast.size}. Axe problems: ${res.axe.size}. Script errors: ${res.errors.size}. Empty stories: ${res.empty.length}.`);
process.exit(total ? 1 : 0);

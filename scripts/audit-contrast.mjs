// Contrast audit: opens the console, visits every page for every brand, mode,
// screen type, and console theme, and checks every piece of visible text
// against the color it actually sits on.
// Run: node scripts/audit-contrast.mjs [path-to-built-console.html]
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

// With no file given, build a one-file copy of the console from the current draft and check that.
let file = process.argv[2];
if (!file) { file = join(tmpdir(), "brand-console-audit.html"); execFileSync(process.execPath, ["scripts/build-prototype.mjs", file], { stdio: "ignore" }); }
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
const errs = [];
page.on("pageerror", e => errs.push(String(e)));
await page.goto(pathToFileURL(file).href);
await page.waitForFunction(() => typeof S !== "undefined" && S.draft);

const secs = await page.evaluate(() => ["color", "type", "space", "shape", "library", "checks", "proposal", "brands", "history", "export", "figma", ...REG_ORDER]);
const combos = [];
for (const chrome of ["light"]) for (const brand of ["northfield", "crestline"]) for (const mode of ["light", "dark"]) for (const ctx of ["consumer", "employee"]) combos.push({ chrome, brand, mode, ctx });

const all = new Map();
for (const c of combos) {
  for (const sec of secs) {
    const found = await page.evaluate(({ c, sec }) => {
      S.ui.chrome = c.chrome; S.ui.brand = c.brand; S.ui.mode = c.mode; S.ui.ctx = c.ctx; S.sec = sec;
      S.ui.asst = true; CATS.forEach(([k]) => S.ui.openCats[k] = true);
      applyChrome(); render();
      const cv = document.createElement("canvas"); cv.width = cv.height = 1; const g = cv.getContext("2d", { willReadFrequently: true });
      const rgba = s => { g.clearRect(0, 0, 1, 1); g.fillStyle = "#000"; g.fillStyle = s; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
      const over = (top, bot) => { const a = top[3]; return [top[0] * a + bot[0] * (1 - a), top[1] * a + bot[1] * (1 - a), top[2] * a + bot[2] * (1 - a), 1]; };
      const lum = ([r, gg, b]) => { const f = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(gg) + .0722 * f(b); };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
      const colorsIn = s => (s.match(/(rgba?|oklch|oklab|color|hsla?)\([^)]*\)|#[0-9a-f]{3,8}\b/gi) || []);
      // Returns a list of possible backgrounds (more than one when a gradient is involved).
      function bgs(el) {
        const layers = [];
        for (let e = el; e; e = e.parentElement) {
          const cs = getComputedStyle(e);
          if (cs.backgroundImage && cs.backgroundImage !== "none" && /gradient/.test(cs.backgroundImage)) layers.push({ grad: colorsIn(cs.backgroundImage).map(rgba) });
          const bc = rgba(cs.backgroundColor);
          if (bc[3] > 0) layers.push({ c: bc });
          if (bc[3] >= 1) break;
        }
        let bases = [[255, 255, 255, 1]];
        for (let i = layers.length - 1; i >= 0; i--) {
          const L = layers[i];
          if (L.c) bases = bases.map(b => over(L.c, b));
          else if (L.grad.length) { const nb = []; bases.forEach(b => L.grad.forEach(gc => nb.push(over(gc, b)))); bases = nb; }
        }
        return bases;
      }
      function hidden(el) { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden" || e.hidden) return true; } return false; }
      function disabled(el) { return !!el.closest("[disabled],[aria-disabled=true],.disabled,.is-disabled,[data-disabled]"); }
      function op(el) { let o = 1; for (let e = el; e; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; }
      const out = [];
      const test = (el, text, colorStr) => {
        if (hidden(el) || disabled(el)) return;
        // Color samples show a pair on purpose, next to its score in words. The checks judge the real pair.
        if (el.closest("[data-sample]")) return;
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
        const cs = getComputedStyle(el);
        const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
        const need = (size >= 24 || (bold && size >= 18.66)) ? 3 : 4.5;
        const tc0 = rgba(colorStr || cs.color); const o = op(el);
        let worst = 99, worstBg = null;
        for (const bg of bgs(el)) { const tc = over([tc0[0], tc0[1], tc0[2], tc0[3] * o], bg); const q = ratio(tc, bg); if (q < worst) { worst = q; worstBg = bg; } }
        if (worst < need) {
          const inPv = !!el.closest(".pvbody,#pvbody,.pv");
          const hex = a => "#" + a.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
          const path = []; for (let e = el; e && path.length < 4 && e.id !== "app"; e = e.parentElement) path.unshift(e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/).slice(0, 2).join(".") : ""));
          out.push({ where: inPv ? "preview" : "console", text: text.trim().slice(0, 40), ratio: +worst.toFixed(2), need, fg: hex(tc0), bg: hex(worstBg), path: path.join(" > ") });
        }
      };
      const w = document.createTreeWalker(document.getElementById("app"), NodeFilter.SHOW_TEXT);
      const seen = new Set();
      for (let n; (n = w.nextNode());) { if (!n.textContent.trim()) continue; const el = n.parentElement; if (seen.has(el)) continue; seen.add(el); if (el.closest("svg") && el.tagName !== "text") continue; test(el, n.textContent); }
      document.querySelectorAll("#app input:not([type=range]):not([type=color]):not([type=checkbox]):not([type=radio]), #app textarea, #app select").forEach(el => {
        if (el.value) test(el, el.value);
        if (el.placeholder && !el.value) { const ph = getComputedStyle(el, "::placeholder").color; test(el, "[placeholder] " + el.placeholder, ph); }
      });
      return out;
    }, { c, sec });
    for (const f of found) {
      const key = [f.where, f.path, f.fg, f.bg, f.text].join("|");
      if (!all.has(key)) all.set(key, { ...f, seen: [] });
      const e = all.get(key); if (e.seen.length < 4) e.seen.push(`${sec}/${c.brand}/${c.mode}/${c.ctx}/chrome-${c.chrome}`);
    }
  }
}
await browser.close();
const list = [...all.values()].sort((a, b) => a.ratio - b.ratio);
writeFileSync(process.env.OUT || join(tmpdir(), "contrast-audit.json"), JSON.stringify(list, null, 1));
list.slice(0, 30).forEach(x => console.log(`${x.ratio} : 1 (needs ${x.need})  ${x.where}  "${x.text}"  ${x.fg} on ${x.bg}  ${x.seen[0]}`));
console.log(`Pages checked: ${secs.length * combos.length}. Problems: ${list.length} (console ${list.filter(x => x.where === "console").length}, preview ${list.filter(x => x.where === "preview").length}). Script errors: ${errs.length}`);
errs.slice(0, 5).forEach(e => console.log("ERR", e));
process.exit(list.length ? 1 : 0);

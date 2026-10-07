// Stress test: makes many random brand setups, lets the console fix anything its checks catch,
// then looks at every page in both brands and both modes. Any text that is still too hard to read
// is a real bug, because the checks should have caught it.
// Run: node scripts/stress-audit.mjs [number of setups, default 8]
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const N = Number(process.argv[2] || 8);
const file = process.env.FILE || join(tmpdir(), "brand-console-stress.html");
if (!process.env.FILE) execFileSync(process.execPath, ["scripts/build-prototype.mjs", file], { stdio: "ignore" });
// Reuse the exact text check from the contrast audit.
const src = readFileSync(new URL("./audit-contrast.mjs", import.meta.url), "utf8");
const checker = src.slice(src.indexOf("      const cv = document.createElement"), src.indexOf("      return out;"));

const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 300)));
await page.goto(pathToFileURL(file).href);
await page.waitForFunction(() => typeof S !== "undefined" && S.draft);
const base = await page.evaluate(() => JSON.stringify(S.draft));

const bugs = new Map(); let skipped = 0;
for (let i = 0; i < N; i++) {
  const setup = await page.evaluate(({ i, base }) => {
    let seed = 9301 + i * 7919; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pick = (a) => a[Math.floor(r() * a.length)];
    const st = JSON.parse(base);
    const randHex = () => "#" + [0, 0, 0].map(() => Math.floor(r() * 256).toString(16).padStart(2, "0")).join("").toUpperCase();
    const shadeOf = (h) => { const sc = scaleOf(h); return sc[pick(STEPS)[0]]; };
    for (const b of ["northfield", "crestline"]) {
      const br = st.brands[b], pal = br.palette ? br.palette.groups.flatMap((g) => g.colors.map((c) => c.hex)) : [];
      const choose = () => (pal.length && r() < 0.5 ? shadeOf(pick(pal)) : randHex());
      br.primary = choose(); br.secondary = choose(); br.accent = choose();
      br.onPrimary = pick(["auto", "white", "dark"]);
      if (r() < 0.5) br.wordGoal = "best"; else delete br.wordGoal;
      delete br.pairs; delete br.bg;
      br.look = {};
      for (const md of ["light", "dark"]) {
        const kind = pick(["solid", "solid", "gradient"]);
        br.look[md] = { kind, glass: pick([1, 1, 0.9, 0.75]), blur: pick([0, 8]) };
        if (kind === "gradient") { const sc = scaleOf(br.secondary); br.look[md].to = md === "light" ? sc[pick([50, 100, 200])] : sc[pick([800, 900, 950])]; br.look[md].angle = pick(["down", "diag", "glow"]); }
      }
    }
    st.gray = pick(["warm", "neutral", "cool", "brand"]);
    for (const id of REG_ORDER) { const R = REG[id]; st.comp[id] = st.comp[id] || {}; (R.slots || []).forEach((sl) => { if (sl.opts && sl.opts.length) st.comp[id][sl.k] = pick(sl.opts)[0]; }); }
    // Let the console fix what its checks catch, the way the brand team would.
    for (let round = 0; round < 6; round++) {
      const blocks = runChecks(st).filter((c) => c.level === "block");
      if (!blocks.length) break;
      let changed = false;
      for (const c of blocks) { if (!c.fix) continue; const ch = fixChanges(st, c.fix); ch.forEach((x) => setP(st, x.path, x.value)); if (ch.length) changed = true; }
      if (!changed) break;
    }
    const left = runChecks(st).filter((c) => c.level === "block").map((c) => c.id);
    S.draft = st;
    return { left, summary: ["northfield", "crestline"].map((b) => `${b}: main ${st.brands[b].primary} words ${st.brands[b].onPrimary} second ${st.brands[b].secondary} button ${st.comp.button.bg}`).join("; ") + `; gray ${st.gray}` };
  }, { i, base });
  if (setup.left.length) { skipped++; console.log(`Setup ${i + 1}: skipped, checks still block (${setup.left.join(", ")}). ${setup.summary}`); continue; }
  console.log(`Setup ${i + 1}: ${setup.summary}`);
  const secs = await page.evaluate(() => ["color", "type", "space", "shape", "library", "checks", "proposal", "brands", ...REG_ORDER]);
  for (const brand of ["northfield", "crestline"]) for (const mode of ["light", "dark"]) for (const sec of secs) {
    const ctx = (secs.indexOf(sec) + i) % 2 ? "employee" : "consumer";
    const found = await page.evaluate(new Function("c", `S.ui.brand=c.brand;S.ui.mode=c.mode;S.ui.ctx=c.ctx;S.sec=c.sec;S.ui.asst=true;render();\n${checker}\nreturn out;`), { brand, mode, sec, ctx });
    for (const f of found) {
      const key = [f.where, f.path.split(" > ").slice(-2).join(" > "), f.text.slice(0, 20)].join("|");
      if (!bugs.has(key)) bugs.set(key, { ...f, at: `setup ${i + 1}: ${sec}/${brand}/${mode}/${ctx}`, setup: setup.summary, n: 0 });
      bugs.get(key).n++;
    }
  }
}
await browser.close();
const list = [...bugs.values()].sort((a, b) => a.ratio - b.ratio);
writeFileSync(process.env.OUT || join(tmpdir(), "stress-audit.json"), JSON.stringify(list, null, 1));
list.forEach((x) => console.log(`BUG ${x.ratio} : 1 (needs ${x.need}) x${x.n} ${x.where} "${x.text}" ${x.fg} on ${x.bg} | ${x.path} | ${x.at}`));
console.log(`Setups: ${N}, checked ${N - skipped}, skipped ${skipped}. Bugs: ${list.length}. Script errors: ${errs.length}`);
[...new Set(errs)].slice(0, 5).forEach((e) => console.log("ERR", e));
process.exit(list.length || errs.length ? 1 : 0);

// Bug sweep: opens every page of the console, clicks every button and switch on it, and watches for
// script errors. It also looks for layout breaks: parts of the preview that spill outside their frame
// on a computer and on a phone, and pages that scroll sideways.
// Run: node scripts/bug-sweep.mjs [built console file]
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

let file = process.argv[2];
if (!file) { file = join(tmpdir(), "brand-console-sweep.html"); execFileSync(process.execPath, ["scripts/build-prototype.mjs", file], { stdio: "ignore" }); }
const browser = await browser0();
async function browser0() { return chromium.launch({ executablePath: process.env.CHROME || undefined }); }
const errors = new Map(); let where = "";
const note = (m) => { const k = m.slice(0, 160); if (!errors.has(k)) errors.set(k, where); };
// Each page gets a fresh tab, so a download started by one click cannot get in the way of the next page.
let page = null, vw = { width: 1500, height: 1000 };
const load = async () => {
  if (page) await page.close().catch(() => {});
  page = await browser.newPage({ viewport: vw, acceptDownloads: true });
  page.on("pageerror", (e) => note("Script error: " + String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|ERR_|net::|fonts\.g|favicon/i.test(m.text())) note("Console error: " + m.text()); });
  page.on("dialog", (d) => d.dismiss());
  await page.goto(pathToFileURL(file).href); await page.waitForFunction(() => typeof S !== "undefined" && S.draft);
};
await load();
const secs = await page.evaluate(() => ["color", "type", "space", "shape", "icons", "library", "checks", "publish", "history", "export", "figma", ...REG_ORDER]);
const layout = new Map();
const SKIP = /^(voiceStart|voiceStop|asstOpenTalk|chrome|figDownload|figDownloadOut)$/;
let clicks = 0;
for (const sec of secs) {
  where = sec; await load();
  // Layout: the preview stays inside its frame, on a computer and on a phone.
  for (const vp of ["desktop", "phone"]) for (const brand of ["northfield", "crestline"]) {
    const out = await page.evaluate(({ sec, vp, brand }) => {
      S.sec = sec; S.ui.vp = vp; S.ui.brand = brand; render();
      const res = []; const pv = document.querySelector(".ba-r .pv, .pvframe .pv"); if (!pv) return res;
      const frame = pv.getBoundingClientRect();
      const scrolls = (e) => { for (let x = e.parentElement; x && x !== pv; x = x.parentElement) { const o = getComputedStyle(x).overflowX; if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true; } return false; };
      pv.querySelectorAll("*").forEach((e) => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return; const cs = getComputedStyle(e); if (cs.position === "fixed" || cs.position === "absolute" && e.closest(".pv-skip")) return;
        if (r.right > frame.right + 2 && !scrolls(e)) res.push(`${vp} ${brand}: ${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]} "${(e.textContent || "").trim().slice(0, 30)}" spills ${Math.round(r.right - frame.right)}px past the preview edge`); });
      return res.slice(0, 3);
    }, { sec, vp, brand });
    out.forEach((o) => { if (!layout.has(sec + o)) layout.set(sec + o, `${sec}: ${o}`); });
  }
  // Before and after: with the line all the way left, only "after" may show. Nothing from "before" may paint on top.
  const leak = await page.evaluate(() => {
    S.ui.vp = "desktop"; S.ui.baPos = 0; render();
    const r = document.querySelector(".ba-r"); if (!r) return null; const box = r.getBoundingClientRect();
    for (let y = box.top + 4; y < Math.min(box.bottom, innerHeight) - 4; y += 12) for (let x = box.left + 8; x < box.right - 4; x += 12) {
      const e = document.elementFromPoint(x, y); if (e && e.closest(".ba-l")) return `${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]} "${(e.textContent || "").trim().slice(0, 30)}"`;
    }
    return null;
  });
  if (leak) layout.set(sec + "leak", `${sec}: a part of the "before" side shows on top of "after": ${leak}`);
  await page.evaluate(() => { S.ui.vp = "desktop"; S.ui.baPos = 50; render(); });
  // Click every button and switch on the page once.
  const targets = await page.evaluate(() => [...document.querySelectorAll("#app [data-a], #app [data-seg]")].map((e, i) => { e.setAttribute("data-sweep", i); return { i, a: e.dataset.a || "seg:" + e.dataset.seg, v: e.dataset.v || "" }; }));
  for (const t of targets) {
    if (SKIP.test(t.a)) continue;
    const ok = await page.evaluate((i) => { const e = document.querySelector(`[data-sweep="${i}"]`); if (!e || e.disabled || e.closest("[disabled]")) return false; e.click(); return true; }, t.i).catch(() => false);
    if (ok) { clicks++; await page.waitForTimeout(15); }
    // After a click the page may have re-drawn. Mark the buttons again so the rest can still be found.
    await page.evaluate((list) => { const now = [...document.querySelectorAll("#app [data-a], #app [data-seg]")]; now.forEach((e) => { if (e.hasAttribute("data-sweep")) return; const m = list.find((t) => (e.dataset.a || "seg:" + e.dataset.seg) === t.a && (e.dataset.v || "") === t.v); if (m) e.setAttribute("data-sweep", m.i); }); }, targets);
    if (await page.evaluate(() => S.sec) !== sec) await page.evaluate((s) => { S.sec = s; render(); }, sec);
  }
}
// The console itself on a phone-sized screen.
vw = { width: 390, height: 844 }; await load();
for (const sec of ["color", "type", "icons", "library", "checks", "figma", "button", "data-table"]) {
  where = "phone " + sec;
  const w = await page.evaluate((s) => { S.sec = s; render(); return [document.documentElement.scrollWidth, document.documentElement.clientWidth]; }, sec);
  if (w[0] > w[1] + 2) layout.set("phone-console-" + sec, `Console on a phone, ${sec}: the page scrolls sideways (${w[0]}px wide on a ${w[1]}px screen)`);
}
await browser.close();
for (const [m, w] of errors) console.log(`ERROR on ${w}: ${m}`);
for (const l of layout.values()) console.log("LAYOUT " + l);
console.log(`Pages: ${secs.length}. Buttons and switches clicked: ${clicks}. Errors: ${errors.size}. Layout problems: ${layout.size}.`);
process.exit(errors.size || layout.size ? 1 : 0);

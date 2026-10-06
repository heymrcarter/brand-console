// Builds a single-file version of the console that runs without the server,
// using the sample data in releases/ and tokens/. Changes stay in the page.
// Usage: node scripts/build-prototype.mjs out.html
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStore } from "../server/store.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] || path.join(root, "brand-console-prototype.html");
const store = createStore(root);
const ix = store.index().versions;
const embed = { draft: store.draft(), published: store.published(), history: ix, snaps: Object.fromEntries(ix.map((v) => [v.version, store.stateOfRelease(v.version)])) };
const js = (f) => fs.readFileSync(path.join(root, "console", f), "utf8");
const html = fs.readFileSync(path.join(root, "console", "index.html"), "utf8");
const head = html.slice(html.indexOf("<head>") + 6, html.indexOf("</head>")).replace(/<meta[^>]*>\n?/g, "");
const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
const page = `${head.trim()}
<div id="app"></div>
<script>window.__EMBED__=${JSON.stringify(embed).replace(/</g, "\\u003c")};</script>
<script>${safe(js("engine.js"))}</script>
<script>${safe(js("icons.js"))}</script>
<script>${safe(js("registry.js"))}</script>
<script>${safe(js("figma.js"))}</script>
<script>${safe(js("app.js"))}</script>
`;
fs.writeFileSync(out, page);
console.log("Wrote", out, Math.round(page.length / 1024) + " KB");

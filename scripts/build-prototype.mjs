// Builds a single-file version of the console that runs without the server, using the sample design system in
// fixtures/sample. Edits and proposals stay in the page.
// Usage: node scripts/build-prototype.mjs out.html
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { createStore } from "../server/store.mjs";
import { createMemoryStorage } from "../server/storage/memory.mjs";
import { createGitHubClient } from "../server/github-client.mjs";
import { createProposals } from "../server/proposals.mjs";
import { createMemoryKV } from "../server/storage/memory.mjs";
import { sampleFiles, sampleRepo } from "../test/helpers/sample-repo.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] || path.join(root, "brand-console-prototype.html");
const store = createStore(createMemoryStorage(sampleFiles()));
const mock = sampleRepo({ repo: "local/design-system", token: "t" });
const proposals = createProposals({ github: createGitHubClient({ repo: "local/design-system", token: "t", fetch: mock.fetch }), store, edits: createMemoryStorage(), kv: createMemoryKV() });
const history = await proposals.releases();
const embed = { draft: await store.draft(), published: await store.published(), history, snaps: Object.fromEntries(await Promise.all(history.map(async (v) => [v.version, await proposals.stateOfVersion(v.version)]))) };
const js = (f) => fs.readFileSync(path.join(root, "console", f), "utf8");
const html = fs.readFileSync(path.join(root, "console", "index.html"), "utf8");
const head = html.slice(html.indexOf("<head>") + 6, html.indexOf("</head>")).replace(/<meta[^>]*>\n?/g, "");
const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
// The engine files are ES modules, and a script inside the page cannot import other files.
// So they are bundled into one plain script, which puts the engine's names on the page like console/engine-globals.js does.
const bundled = await build({
  configFile: false, logLevel: "warn", publicDir: false,
  build: { write: false, minify: false, lib: { entry: path.join(root, "console", "engine-globals.js"), formats: ["iife"], name: "brandConsoleEngine" } },
});
const engineJs = [bundled].flat()[0].output[0].code;
const page = `${head.trim()}
<div id="app"></div>
<script>window.__EMBED__=${JSON.stringify(embed).replace(/</g, "\\u003c")};</script>
<script>${safe(engineJs)}</script>
<script>${safe(js("app.js"))}</script>
`;
fs.writeFileSync(out, page);
console.log("Wrote", out, Math.round(page.length / 1024) + " KB");

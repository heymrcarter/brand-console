// Restores the sample design system: three past versions and a draft with
// the official color sets. Run with:  npm run reset-sample-data
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStore } from "../server/store.mjs";
import { createDiskStorage } from "../server/storage/disk.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// The sample design system: three past versions and a draft. Tests and npm start use it.
const sample = path.join(root, "fixtures/sample");
for (const d of ["tokens", "releases", "dist", "build"]) fs.rmSync(path.join(sample, d), { recursive: true, force: true });
fs.rmSync(path.join(sample, "CHANGELOG.md"), { force: true });

// Sample versions are not real publishes, so they stay out of Git history.
const store = createStore({ ...createDiskStorage(sample), commit: async () => {} });
const { E } = store;
const base = E.withDefaults(E.BASE);
const v12 = E.clone(base); v12.brands.northfield.primary = "#7A3F92"; v12.type.scale = 1.2; v12.shape.radius = 6; v12.comp.card.shadow = "none";
const v13 = E.clone(base); v13.brands.northfield.primary = "#7A3F92"; v13.type.scale = 1.2;

await store.release(v12, "1.2.0", { date: "2026-08-04", who: "Design system team", note: "Added the employee screen size. Employee screens now fit more rows on one page." });
await store.release(v13, "1.3.0", { date: "2026-08-29", who: "Maya R. · Brand team", note: "Changed the Northfield main color to a deeper plum so white button words are easier to read." });
await store.release(base, "1.4.0", { date: "2026-09-18", who: "Maya R. · Brand team", note: "Made the card shadow softer and raised the type scale so headings stand out more on consumer screens." });

// The draft: the official color sets for both brands, and a new body font.
const d = E.clone(base);
d.brands.crestline.palette = E.clone(E.PALETTES.crestline);
Object.assign(d.brands.crestline, { primary: "#1A3DA3", secondary: "#4AA1CC", accent: "#8ABC3F" });
d.brands.northfield.palette = E.clone(E.PALETTES.northfield);
Object.assign(d.brands.northfield, { primary: "#6A9835", secondary: "#88BC40", accent: "#0F2F55", onPrimary: "dark" });
d.type.body = "Atkinson Hyperlegible";
d.type.ui = "Public Sans";
Object.assign(d.comp.button, { track: "wide", pad: "roomy" });
await store.saveDraft(d);
await store.buildAll();
console.log("Sample data restored: versions 1.2.0, 1.3.0, 1.4.0 and a draft with 2 color sets.");

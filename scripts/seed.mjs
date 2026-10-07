// Remakes the sample design system in fixtures/sample, shaped like the design system repository:
//   history/v0.2.0/ ... v0.4.0/   the tokens of each earlier version (tagged releases on the GitHub stand-in)
//   tokens/                       main, at the newest version, 1.0.0, with the official color sets
//   releases.json                 each version's date and note
// The tests, npm start, and the prototype use it. Run with:  npm run reset-sample-data
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEngine } from "../server/engine.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sample = path.join(root, "fixtures/sample");
for (const d of ["tokens", "history"]) fs.rmSync(path.join(sample, d), { recursive: true, force: true });
const E = loadEngine(root);
function writeTokens(dir, st) {
  for (const [p, v] of Object.entries(E.stateToFiles(E.withDefaults(E.clone(st))))) {
    if (!p.startsWith("tokens/")) continue;
    const to = path.join(dir, p.slice(7));
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, JSON.stringify(v, null, 2) + "\n");
  }
}
// The sample has two made-up brands. The engine's own defaults have one starter brand, so they are set here.
const BRANDS = {
  northfield: { name: "Northfield", division: "Consumer division", primary: "#6B2E83", secondary: "#2F5D8A", accent: "#D9653B", onPrimary: "white" },
  crestline: { name: "Crestline", division: "Partner division", primary: "#1F4E8C", secondary: "#0F7B6C", accent: "#E0A526", onPrimary: "white" },
};
// Their official color sets, taken from the brand color wheels. Order and share keep the brand's hierarchy.
const PALETTES={
  crestline:{groups:[
    {id:"signature",name:"Signature color combination",note:"These three colors together are what people should know as Crestline.",colors:[
      {name:"Royal blue",hex:"#1A3DA3",share:30},{name:"Sky blue",hex:"#4AA1CC",shade:"#4193B8",share:17},{name:"Leaf green",hex:"#8ABC3F",shade:"#6A9835",share:12}]},
    {id:"base",name:"Base",note:"The main background. It gives the other colors room to stand out.",colors:[{name:"White",hex:"#FFFFFF",share:20}]},
    {id:"accent",name:"Accent colors",note:"Use these in small amounts, like in charts, icons, and highlights.",colors:[
      {name:"Light gray",hex:"#E6E7E9",share:6},{name:"Dark gray",hex:"#555759",share:6},{name:"Navy",hex:"#0F2F55",share:4},{name:"Pale blue",hex:"#EBEFF9",share:2},{name:"Berry",hex:"#A12061",share:2}]}]},
  northfield:{groups:[
    {id:"signature",name:"Signature color",note:"These greens are what people should know as Northfield. The medium green leads, and the light green supports it.",colors:[{name:"Signature green",hex:"#6A9835",share:18},{name:"Light green",hex:"#88BC40",share:12}]},
    {id:"greens",name:"Spectrum of greens",note:"A deeper green that goes with the signature greens.",colors:[{name:"Forest green",hex:"#234924",share:12}]},
    {id:"base",name:"Base",note:"The main background. It gives the other colors room to stand out.",colors:[{name:"White",hex:"#FFFFFF",share:20}]},
    {id:"accent",name:"Accent colors",note:"Use these in small amounts, like in charts, icons, and highlights.",colors:[
      {name:"Navy",hex:"#0F2F55",share:6},{name:"Purple",hex:"#592563",share:6},{name:"Deep teal",hex:"#2F737E",share:6},{name:"Charcoal",hex:"#3A3B3D",share:6},{name:"Berry",hex:"#A12061",share:6},
      {name:"Light teal",hex:"#7AB8C3",share:2},{name:"Light gray",hex:"#C8C8C8",share:2},{name:"Coral",hex:"#E95F76",share:2},{name:"Yellow",hex:"#F7C844",share:2}]}]}};

/* =====================================================================
   TOKEN RESOLUTION: brand x context x size -> values
   ===================================================================== */
const base = E.withDefaults({ ...E.clone(E.BASE), brands: E.clone(BRANDS) });
const v12 = E.clone(base); v12.brands.northfield.primary = "#7A3F92"; v12.type.scale = 1.2; v12.shape.radius = 6; v12.comp.card.shadow = "none";
const v13 = E.clone(base); v13.brands.northfield.primary = "#7A3F92"; v13.type.scale = 1.2;

writeTokens(path.join(sample, "history/v0.2.0"), v12);
writeTokens(path.join(sample, "history/v0.3.0"), v13);
writeTokens(path.join(sample, "history/v0.4.0"), base);

// Main, 1.0.0: the official color sets for both brands, a new body font, and roomier buttons.
const d = E.clone(base);
d.brands.crestline.palette = E.clone(PALETTES.crestline);
Object.assign(d.brands.crestline, { primary: "#1A3DA3", secondary: "#4AA1CC", accent: "#8ABC3F" });
d.brands.northfield.palette = E.clone(PALETTES.northfield);
Object.assign(d.brands.northfield, { primary: "#6A9835", secondary: "#88BC40", accent: "#0F2F55", onPrimary: "dark" });
d.type.body = "Atkinson Hyperlegible";
d.type.ui = "Public Sans";
Object.assign(d.comp.button, { track: "wide", pad: "roomy" });
writeTokens(path.join(sample, "tokens"), d);
fs.writeFileSync(path.join(sample, "releases.json"), JSON.stringify([
  { version: "0.2.0", date: "2026-08-04", note: "Added the employee screen size. Employee screens now fit more rows on one page." },
  { version: "0.3.0", date: "2026-08-29", note: "Changed the Northfield main color to a deeper plum so white button words are easier to read." },
  { version: "0.4.0", date: "2026-09-18", note: "Made the card shadow softer and raised the type scale so headings stand out more on consumer screens." },
  { version: "1.0.0", date: "2026-10-02", note: "Added the official color sets for both brands, a body font that is easier to read, and roomier buttons." },
], null, 2).replace(/\n    /g, " ").replace(/\n  \}/g, " }") + "\n");
console.log("Sample data remade: versions 0.2.0, 0.3.0, 0.4.0, and main at 1.0.0 with 2 color sets.");

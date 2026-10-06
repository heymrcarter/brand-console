// Loads the same engine the console uses (console/engine.js, icons.js, registry.js, and figma.js)
// so checks and outputs are identical in the browser, the server, the build, and CI.
//
// Why a VM: the browser loads these files as plain <script> tags. They share top-level names instead of using
// import and export, and the audits read those names from the page. Node runs them the same way here, in a VM.
// Every top-level name they define (functions, constants, and lists) is found on its own and handed back, so there is
// no export list to keep up to date. This is a step on the way: the long-term fix is to turn these files into
// ES modules that the browser and Node both import. Until then, this keeps one copy of the code.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

export const ENGINE_FILES = ["engine.js", "icons.js", "registry.js", "figma.js"];

// Words that can never be variable names. These come from the JavaScript language, not from our code.
const KEYWORDS = new Set(("break case catch class const continue debugger default delete do else enum export extends false finally for " +
  "function if import in instanceof new null return super switch this throw true try typeof var void while with yield let static " +
  "await implements package protected interface private public arguments").split(" "));

// Objects made inside the VM are copied into Node's own objects, so Node code and tests can compare them normally.
// Values that hold functions (like the component registry) cannot be copied, so they are passed through as they are.
function own(v) {
  if (v === null || typeof v !== "object") return v;
  try { structuredClone(v); } catch { return v; }
  return JSON.parse(JSON.stringify(v));
}

/** Every top-level name the console scripts define, found by trying each word in the code. */
function topLevelNames(code, ctx, before) {
  const words = [...new Set(code.match(/[A-Za-z_$][\w$]*/g))].filter((w) => !KEYWORDS.has(w) && w !== "__found");
  const probe = `(function () { const __found = {};\n${words.map((n) => `try { if (typeof ${n} !== "undefined") __found[${JSON.stringify(n)}] = ${n}; } catch (e) {}`).join("\n")}\nreturn __found; })()`;
  const found = vm.runInContext(probe, ctx, { filename: "engine-names" });
  // Leave out JavaScript's own names, like Math, JSON, and toString, unless the scripts replaced them.
  return Object.entries(found).filter(([n, v]) => !before.has(n) || !Object.is(before.get(n), v));
}

export function loadEngine(root) {
  const code = ENGINE_FILES.map((f) => fs.readFileSync(path.join(root, "console", f), "utf8")).join("\n");
  const ctx = vm.createContext({});
  const g = vm.runInContext("globalThis", ctx);
  const before = new Map();
  for (let o = g; o; o = Object.getPrototypeOf(o)) for (const n of Object.getOwnPropertyNames(o)) if (!before.has(n)) before.set(n, g[n]);
  vm.runInContext(code, ctx, { filename: "engine" });
  const E = {};
  for (const [name, v] of topLevelNames(code, ctx, before)) {
    E[name] = typeof v === "function" ? (...a) => own(v(...a)) : own(v);
  }
  return E;
}

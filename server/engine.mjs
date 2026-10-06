// Loads the same engine the console uses (console/engine.js, icons.js, registry.js, and figma.js)
// so checks and outputs are identical in the browser, the server, the build, and CI.
//
// The four files are ES modules. The browser loads them through console/engine-globals.js, and Node imports them here.
// Every name they export is handed back on one object, E, so there is no list to keep up to date here.
import * as engine from "../console/engine.js";
import * as icons from "../console/icons.js";
import * as registry from "../console/registry.js";
import * as figma from "../console/figma.js";

export const ENGINE_MODULES = { engine, icons, registry, figma };

// Node code gets its own copies of the engine's objects, so changing one can never change the engine itself.
// Values that hold functions (like the component registry) cannot be copied, so they are passed through as they are.
function own(v) {
  if (v === null || typeof v !== "object") return v;
  try { structuredClone(v); } catch { return v; }
  return JSON.parse(JSON.stringify(v));
}

// root is kept so callers do not change. The engine always comes from this project's console folder.
export function loadEngine(root) {
  const E = {};
  for (const mod of Object.values(ENGINE_MODULES)) {
    for (const [name, v] of Object.entries(mod)) E[name] = typeof v === "function" ? (...a) => own(v(...a)) : own(v);
  }
  return E;
}

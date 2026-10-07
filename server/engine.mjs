// Loads the design system's engine (@heymrcarter/design-system/engine) for the server code and the Worker, so the
// console's checks and outputs are the same as the design system's own build.
// Every name it exports is handed back on one object, E, so there is no list to keep up to date here.
import * as engine from "@heymrcarter/design-system/engine";

export const ENGINE_MODULES = { engine };

// Node code gets its own copies of the engine's objects, so changing one can never change the engine itself.
// Values that hold functions (like the component registry) cannot be copied, so they are passed through as they are.
function own(v) {
  if (v === null || typeof v !== "object") return v;
  try { structuredClone(v); } catch { return v; }
  return JSON.parse(JSON.stringify(v));
}

// root is kept so callers do not change. The engine always comes from the design system package.
// copy: false hands back the engine's own functions and objects, with no copies. Copying every result costs most
// of the CPU time a save or publish takes, which matters in a Cloudflare Worker. Code that uses copy: false must
// never change what the engine hands back.
export function loadEngine(root, { copy = true } = {}) {
  const E = {};
  for (const mod of Object.values(ENGINE_MODULES)) {
    for (const [name, v] of Object.entries(mod)) E[name] = !copy ? v : typeof v === "function" ? (...a) => own(v(...a)) : own(v);
  }
  return E;
}

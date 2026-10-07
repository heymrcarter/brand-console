// Loads the design system's engine (@heymrcarter/design-system/engine) for the server code and the Worker, so the
// console's checks and outputs are the same as the design system's own build.
// Every name it exports is handed back on one object, E, so there is no list to keep up to date here.
import * as engine from "@heymrcarter/design-system/engine";
import pkg from "@heymrcarter/design-system/package.json" with { type: "json" };

export const ENGINE_MODULES = { engine };
/** The design system version whose engine the console runs. Each release updates it (see follow-design-system.yml). */
export const ENGINE_VERSION = pkg.version;

/**
 * True when the design system's live version has new things the console's engine does not know yet: a newer minor
 * or major version. A newer patch only changes values, which the engine reads from the tokens, so it is not behind.
 */
export function engineBehind(live, engine = ENGINE_VERSION) {
  const p = (v) => String(v || "0.0.0").split(".").map((n) => parseInt(n, 10) || 0);
  const [lm, ln] = p(live), [em, en] = p(engine);
  return lm > em || (lm === em && ln > en);
}

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

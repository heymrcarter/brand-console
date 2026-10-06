/* app.js is still a plain script that uses the engine's names as globals, and the audits read them from the page.
   This module loads the engine and puts every name it exports on the page, before app.js runs.
   index.html loads app.js with defer, so it runs after this module, in the order the page lists them.
   When app.js becomes a module that imports what it needs, this file can go. */
import * as engine from "./engine.js";
import * as icons from "./icons.js";
import * as registry from "./registry.js";
import * as figma from "./figma.js";

Object.assign(globalThis, engine, icons, registry, figma);

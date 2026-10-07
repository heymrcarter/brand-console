/* app.js is still a plain script that uses the engine's names as globals, and the audits read them from the page.
   This module puts every name the engine exports on the page, before app.js runs.
   The engine comes from the design system package. The asset build and the prototype build bundle this file,
   because a browser cannot import a package by name.
   index.html loads app.js with defer, so it runs after this module, in the order the page lists them.
   When app.js becomes a module that imports what it needs, this file can go. */
import * as engine from "@heymrcarter/design-system/engine";

Object.assign(globalThis, engine);

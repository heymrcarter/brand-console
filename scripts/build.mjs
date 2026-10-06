// Rebuilds theme.css, settings.json, and the component manifest
// for the draft (build/draft) and the live version (dist).
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStore } from "../server/store.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
createStore(root).buildAll();
console.log("Built build/draft and dist.");

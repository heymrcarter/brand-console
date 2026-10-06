// Rebuilds theme.css, settings.json, and the component manifest
// for the draft (build/draft) and the live version (dist).
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStore } from "../server/store.mjs";
import { createDiskStorage } from "../server/storage/disk.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await createStore(createDiskStorage(root)).buildAll();
console.log("Built build/draft and dist.");

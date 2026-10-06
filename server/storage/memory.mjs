// A storage that keeps every file in memory. For tests, and as the simplest example of the interface in storage.mjs.
// commit() keeps a list of commits with the files each one changed, so tests can check what a publish recorded.
import { storageKey, storagePrefix, underPrefix } from "./storage.mjs";

/** files: optional starting files, as { path: text or Uint8Array }. */
export function createMemoryStorage(files = {}) {
  const data = new Map(), pending = new Set(), commits = [];
  const put = (p, v) => data.set(storageKey(p), typeof v === "string" ? v : new Uint8Array(v));
  for (const [p, v] of Object.entries(files)) put(p, v);
  return {
    async read(p) { const v = data.get(storageKey(p)); return v === undefined ? null : typeof v === "string" ? v : new TextDecoder().decode(v); },
    async readBytes(p) { const v = data.get(storageKey(p)); return v === undefined ? null : typeof v === "string" ? new TextEncoder().encode(v) : new Uint8Array(v); },
    async write(p, v) {
      if (typeof v !== "string" && !(v instanceof Uint8Array)) throw new TypeError("Storage only saves text or a Uint8Array.");
      put(p, v); pending.add(p);
    },
    async list(prefix = "") { const pre = storagePrefix(prefix); return [...data.keys()].filter((p) => underPrefix(p, pre)).sort(); },
    async remove(p) { if (data.delete(storageKey(p))) pending.add(p); },
    async commit(message) { commits.push({ message, files: [...pending].sort() }); pending.clear(); },
    commits,
  };
}

/** Secrets kept in memory, for tests. */
export function createMemorySecrets(values = {}) {
  const data = { ...values };
  return {
    async get(name) { return data[name] || ""; },
    async set(name, value) { if (value) data[name] = value; else delete data[name]; },
  };
}

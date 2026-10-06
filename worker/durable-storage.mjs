// Storage and secrets inside a Durable Object's SQLite database. See server/storage/storage.mjs for the interface.
// The Worker uses this as the pending storage that holds changes until a publish commits them to GitHub.
//
// It uses the SQL API, not the key-value API, because listing keys there also loads every value, and a font can be
// 8 MB. A row can hold at most 2 MB, so files over 1 MB are split into 1 MB chunks. A smaller file is one row.
import { storageKey, storagePrefix } from "../server/storage/storage.mjs";

const INLINE = 1024 * 1024, CHUNK = 1024 * 1024;
const asBytes = (v) => (v == null ? null : v instanceof Uint8Array ? v : new Uint8Array(v));

/** sql: a Durable Object's ctx.storage.sql, or anything with the same exec(query, ...bindings).toArray(). */
export function createDurableStorage(sql) {
  sql.exec("CREATE TABLE IF NOT EXISTS files (path TEXT PRIMARY KEY, kind TEXT NOT NULL, size INTEGER NOT NULL, chunks INTEGER NOT NULL, data BLOB)");
  sql.exec("CREATE TABLE IF NOT EXISTS chunks (path TEXT NOT NULL, i INTEGER NOT NULL, data BLOB NOT NULL, PRIMARY KEY (path, i))");
  const row = (p) => sql.exec("SELECT kind, chunks, data FROM files WHERE path = ?", p).toArray()[0];

  function bytesOf(p) {
    const r = row(p);
    if (!r) return null;
    if (!r.chunks) return { kind: r.kind, bytes: asBytes(r.data) };
    const parts = sql.exec("SELECT data FROM chunks WHERE path = ? ORDER BY i", p).toArray().map((x) => asBytes(x.data));
    const all = new Uint8Array(parts.reduce((n, x) => n + x.length, 0));
    let at = 0; for (const x of parts) { all.set(x, at); at += x.length; }
    return { kind: r.kind, bytes: all };
  }

  return {
    async read(p) { const f = bytesOf(storageKey(p)); return f && new TextDecoder().decode(f.bytes); },
    async readBytes(p) { const f = bytesOf(storageKey(p)); return f && f.bytes; },
    // Every statement here runs before the next await, so the Durable Object writes them together or not at all.
    async write(p, v) {
      const k = storageKey(p);
      if (typeof v !== "string" && !(v instanceof Uint8Array)) throw new TypeError("Storage only saves text or a Uint8Array.");
      const bytes = typeof v === "string" ? new TextEncoder().encode(v) : v, kind = typeof v === "string" ? "text" : "bytes";
      const had = row(k);
      if (had && had.chunks) sql.exec("DELETE FROM chunks WHERE path = ?", k);
      if (bytes.length <= INLINE) {
        sql.exec("INSERT OR REPLACE INTO files (path, kind, size, chunks, data) VALUES (?, ?, ?, 0, ?)", k, kind, bytes.length, bytes);
      } else {
        const n = Math.ceil(bytes.length / CHUNK);
        sql.exec("INSERT OR REPLACE INTO files (path, kind, size, chunks, data) VALUES (?, ?, ?, ?, NULL)", k, kind, bytes.length, n);
        for (let i = 0; i < n; i++) sql.exec("INSERT INTO chunks (path, i, data) VALUES (?, ?, ?)", k, i, bytes.subarray(i * CHUNK, (i + 1) * CHUNK));
      }
    },
    async list(prefix = "") {
      const pre = storagePrefix(prefix);
      // Paths from "tokens/" up to "tokens0": "0" is the character after "/", so this is everything in the folder.
      const rows = pre ? sql.exec("SELECT path FROM files WHERE path >= ? AND path < ? ORDER BY path", pre + "/", pre + "0").toArray() : sql.exec("SELECT path FROM files ORDER BY path").toArray();
      return rows.map((r) => r.path);
    },
    async remove(p) {
      const k = storageKey(p), had = row(k);
      if (!had) return;
      if (had.chunks) sql.exec("DELETE FROM chunks WHERE path = ?", k);
      sql.exec("DELETE FROM files WHERE path = ?", k);
    },
    // The pending storage has no history of its own. GitHub storage makes the commit.
    async commit() {},
  };
}

/**
 * Secrets that people set in the console, like the Figma token, kept in the Durable Object. Worker secrets
 * (wrangler secret put) cannot change while the Worker runs, so they are only the fallback here.
 */
export function createDurableSecrets(sql, env = {}) {
  sql.exec("CREATE TABLE IF NOT EXISTS secrets (name TEXT PRIMARY KEY, value TEXT NOT NULL)");
  const named = (name) => { if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) throw new Error(`That is not a valid secret name: ${name}`); return name; };
  return {
    async get(name) { const r = sql.exec("SELECT value FROM secrets WHERE name = ?", named(name)).toArray()[0]; return (r && r.value) || env[name] || ""; },
    async set(name, value) {
      if (value) sql.exec("INSERT OR REPLACE INTO secrets (name, value) VALUES (?, ?)", named(name), String(value));
      else sql.exec("DELETE FROM secrets WHERE name = ?", named(name));
    },
  };
}

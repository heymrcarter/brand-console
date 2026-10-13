// A SQLite database in a file, with Node's own SQLite (node:sqlite), shaped like a Durable Object's ctx.storage.sql:
// exec(query, ...bindings).toArray(). The Node server keeps the edits, secrets, and proposal record in one, through
// sql.mjs, the same code the Worker runs on its Durable Object.
import fs from "node:fs";
import path from "node:path";

/** Opens (or makes) the database at file. Throws with a clear message on a Node without node:sqlite. */
export async function openSqliteFile(file) {
  let DatabaseSync;
  try { ({ DatabaseSync } = await import("node:sqlite")); }
  catch { throw new Error(`This Node (${process.version}) has no built-in SQLite. Use Node 22.13 or newer.`); }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL");
  return {
    exec(query, ...bindings) {
      const st = db.prepare(query);
      const rows = /^\s*select/i.test(query) ? st.all(...bindings) : (st.run(...bindings), []);
      return { toArray: () => rows };
    },
    close: () => db.close(),
  };
}

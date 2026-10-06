// A stand-in for a Durable Object's ctx.storage.sql, on Node's own SQLite. Like a Durable Object, it hands back
// BLOBs as ArrayBuffers. rowsWritten counts changed rows, the way Cloudflare bills them.
import { DatabaseSync } from "node:sqlite";

export function fakeDurableSql() {
  const db = new DatabaseSync(":memory:");
  const out = (v) => (v instanceof Uint8Array ? v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) : v);
  const sql = {
    rowsWritten: 0, queries: [],
    exec(query, ...bindings) {
      sql.queries.push(query);
      const st = db.prepare(query);
      if (/^\s*select/i.test(query)) { const rows = st.all(...bindings).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, out(v)]))); return { toArray: () => rows }; }
      sql.rowsWritten += st.run(...bindings).changes;
      return { toArray: () => [] };
    },
  };
  return sql;
}

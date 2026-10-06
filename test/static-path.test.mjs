// The server only sends files from dist/, build/, fonts/, and console/. Paths that try to climb out get a 404.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { safeJoin, staticFile } from "../server/static.mjs";
import { copyProject, startServer, request } from "./helpers/server.mjs";

const root = path.resolve("/project");

test("safeJoin keeps paths inside the folder", () => {
  assert.equal(safeJoin("/project/dist", "theme.css"), path.resolve("/project/dist/theme.css"));
  assert.equal(safeJoin("/project/dist", "a/b.json"), path.resolve("/project/dist/a/b.json"));
  for (const bad of ["../package.json", "a/../../x", "..\\.env", "x/./y", "x\0y"]) assert.equal(safeJoin("/project/dist", bad), null, bad);
  // A sibling folder whose name starts the same way is outside.
  assert.equal(safeJoin("/project/dist", "/../dist-old/secret"), null);
});

test("staticFile maps each URL prefix to its own folder only", () => {
  assert.equal(staticFile(root, "/dist/theme.css"), path.join(root, "dist", "theme.css"));
  assert.equal(staticFile(root, "/build/draft/settings.json"), path.join(root, "build", "draft", "settings.json"));
  assert.equal(staticFile(root, "/fonts/avenir-next-400.woff2"), path.join(root, "fonts", "avenir-next-400.woff2"));
  assert.equal(staticFile(root, "/"), path.join(root, "console", "index.html"));
  assert.equal(staticFile(root, "/app.js"), path.join(root, "console", "app.js"));
  for (const bad of ["/dist/../package.json", "/dist/..%2fpackage.json", "/fonts/%2e%2e/.env.example", "/fonts/..%5c.env", "/%2e%2e/package.json", "/dist/%00theme.css", "/..%2fserver/index.mjs", "/%E0%A4%A"]) assert.equal(staticFile(root, bad), null, bad);
});

let proj, srv;
before(async () => { proj = copyProject(); fs.writeFileSync(path.join(proj, ".env.example"), "SECRET=1\n"); srv = await startServer(proj); });
after(async () => { if (srv.stop) await srv.stop(); fs.rmSync(proj, { recursive: true, force: true }); });

test("the running server refuses to climb out of its folders", async () => {
  assert.ok(srv.port, srv.log && srv.log());
  for (const p of ["/dist/../package.json", "/fonts/../.env.example", "/dist/..%2fpackage.json", "/build/..%2f..%2fpackage.json", "/fonts/%2e%2e/.env.example", "/..%2fserver/index.mjs"]) {
    const r = await request(srv.port, p);
    assert.ok([403, 404].includes(r.status), `${p} gave ${r.status}`);
    assert.ok(!r.body.includes("SECRET=1") && !r.body.includes('"name": "brand-console"'), `${p} leaked a file`);
  }
  assert.equal((await request(srv.port, "/dist/theme.css")).status, 200);
  assert.equal((await request(srv.port, "/build/draft/settings.json")).status, 200);
  assert.equal((await request(srv.port, "/")).status, 200);
  assert.equal((await request(srv.port, "/app.js")).status, 200);
});

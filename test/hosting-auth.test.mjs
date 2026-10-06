// A console shared with other computers must not start without an access code, and must ask for it.
// On this computer only (the default), nothing changes.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import { isLoopback, hostingConfig } from "../server/auth.mjs";
import { copyProject, startServer, request } from "./helpers/server.mjs";

const CODE = "k3Jx9-pQ2rT7vW1yZ5aB8cD4eF6gH0iL"; // 32 characters, test only

test("only this computer's own addresses count as private", () => {
  for (const h of ["127.0.0.1", "127.0.1.1", "localhost", "::1", "[::1]"]) assert.ok(isLoopback(h), h);
  for (const h of ["0.0.0.0", "::", "192.168.1.20", "design.example.internal", ""]) assert.ok(!isLoopback(h), h);
});

test("hosting settings: private by default, shared needs a long code", () => {
  assert.deepEqual(hostingConfig({}).shared, false);
  assert.equal(hostingConfig({}).host, "127.0.0.1");
  assert.equal(hostingConfig({}).error, null);
  // Some Mac shells set HOST to the computer's name. That must not make the console shared.
  assert.equal(hostingConfig({ fromEnv: { HOST: "heaths-mac.local" } }).shared, false);
  // HOST in the project's .env file does count.
  assert.match(hostingConfig({ fromFile: { HOST: "0.0.0.0" } }).error, /AUTH_BEARER_TOKEN is not set/);
  assert.match(hostingConfig({ fromEnv: { CONSOLE_HOST: "0.0.0.0" } }).error, /not set/);
  assert.match(hostingConfig({ fromEnv: { ALLOW_REMOTE: "1", AUTH_BEARER_TOKEN: "short" } }).error, /too short/);
  assert.match(hostingConfig({ fromEnv: { ALLOW_REMOTE: "1", AUTH_BEARER_TOKEN: "a".repeat(40) } }).error, /too simple/);
  const ok = hostingConfig({ fromEnv: { CONSOLE_HOST: "0.0.0.0", AUTH_BEARER_TOKEN: CODE } });
  assert.equal(ok.shared, true);
  assert.equal(ok.error, null);
});

let proj, open, shared;
before(async () => {
  proj = copyProject();
  open = await startServer(proj);
  shared = await startServer(proj, { ALLOW_REMOTE: "1", AUTH_BEARER_TOKEN: CODE });
});
after(async () => {
  for (const s of [open, shared]) if (s && s.stop) await s.stop();
  fs.rmSync(proj, { recursive: true, force: true });
});

test("a shared server will not start without a code", async () => {
  const r = await startServer(proj, { CONSOLE_HOST: "0.0.0.0", AUTH_BEARER_TOKEN: "" });
  assert.equal(r.code, 1, r.log());
  assert.match(r.log(), /will not start/);
  assert.match(r.log(), /AUTH_BEARER_TOKEN/);
});

test("on this computer only, nothing asks for a code", async () => {
  assert.ok(open.port, open.log && open.log());
  assert.equal((await request(open.port, "/api/state")).status, 200);
  assert.equal((await request(open.port, "/dist/theme.css")).status, 200);
  const login = await request(open.port, "/api/login", { method: "POST", body: { code: "anything" } });
  assert.equal(login.status, 200);
});

test("a shared server asks for the code everywhere but the console page", async () => {
  assert.ok(shared.port, shared.log && shared.log());
  const p = shared.port;
  assert.equal((await request(p, "/")).status, 200, "the console page itself loads, so people can sign in");
  assert.equal((await request(p, "/api/health")).status, 200);
  const st = await request(p, "/api/state");
  assert.equal(st.status, 401);
  assert.equal(JSON.parse(st.body).signIn, true);
  for (const path of ["/dist/theme.css", "/build/draft/settings.json", "/fonts/x.woff2"]) assert.equal((await request(p, path)).status, 401, path);
  assert.equal((await request(p, "/api/draft", { method: "PUT", body: { draft: {} } })).status, 401);
  assert.equal((await request(p, "/api/publish", { method: "POST", body: {} })).status, 401);
  assert.equal((await request(p, "/api/state", { headers: { authorization: "Bearer wrong-code" } })).status, 401);
});

test("scripts can use the code as a Bearer header", async () => {
  const r = await request(shared.port, "/api/state", { headers: { authorization: `Bearer ${CODE}` } });
  assert.equal(r.status, 200);
  assert.equal(JSON.parse(r.body).shared, true);
  assert.equal((await request(shared.port, "/dist/theme.css", { headers: { authorization: `Bearer ${CODE}` } })).status, 200);
});

test("people sign in with the code and get a private cookie", async () => {
  const p = shared.port;
  const wrong = await request(p, "/api/login", { method: "POST", body: { code: "not it" } });
  assert.equal(wrong.status, 401);
  assert.match(JSON.parse(wrong.body).error, /not right/);
  const res = await new Promise((ok, bad) => {
    import("node:http").then(({ default: http }) => {
      const req = http.request({ host: "127.0.0.1", port: p, path: "/api/login", method: "POST", headers: { "content-type": "application/json" } }, (r) => { r.resume(); r.on("end", () => ok(r)); });
      req.on("error", bad); req.end(JSON.stringify({ code: CODE }));
    });
  });
  assert.equal(res.statusCode, 200);
  const cookie = String(res.headers["set-cookie"]);
  assert.match(cookie, /bc_session=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.ok(!cookie.includes(CODE), "the cookie does not hold the code itself");
  const jar = cookie.split(";")[0];
  assert.equal((await request(p, "/api/state", { headers: { cookie: jar } })).status, 200);
  assert.equal((await request(p, "/dist/theme.css", { headers: { cookie: jar } })).status, 200);
  // Another web site cannot use the cookie to make changes.
  assert.equal((await request(p, "/api/draft", { method: "PUT", body: { draft: {} }, headers: { cookie: jar, origin: "https://evil.example" } })).status, 403);
  // The console's own address is fine.
  const own = await request(p, "/api/flag", { method: "POST", body: { version: "0.0.0" }, headers: { cookie: jar, origin: `http://127.0.0.1:${p}`, host: `127.0.0.1:${p}` } });
  assert.notEqual(own.status, 403);
  assert.notEqual(own.status, 401);
  const out = await request(p, "/api/logout", { method: "POST" });
  assert.equal(out.status, 200);
});

test("a shared server cannot be tricked by how a path is written", async () => {
  const p = shared.port;
  for (const path of ["/%64ist/theme.css", "/dist%2Ftheme.css", "/build%2Fdraft%2Fsettings.json", "/%62uild/draft/settings.json", "/%66onts/x.woff2", "/api%2Fstate", "/%E0%A4%A"]) {
    const r = await request(p, path);
    assert.ok([400, 401, 404].includes(r.status), `${path} gave ${r.status}`);
    assert.ok(!r.body.includes("--primary") && !r.body.includes('"components"'), `${path} leaked a file`);
  }
});

test("bad requests and bad cookies do not stop the server", async () => {
  const p = shared.port;
  assert.equal((await request(p, "/api/state", { headers: { cookie: "bc_session=%E0%A4%A" } })).status, 401);
  await new Promise((ok) => {
    const s = net.connect(p, "127.0.0.1", () => s.end("GET http://[/ HTTP/1.1\r\nHost: x\r\n\r\n"));
    s.on("data", () => {}); s.on("close", ok); s.on("error", ok);
  });
  assert.equal((await request(p, "/api/health")).status, 200);
  assert.equal((await request(open.port, "/api/state", { headers: { cookie: "a=%E0%A4%A" } })).status, 200);
});

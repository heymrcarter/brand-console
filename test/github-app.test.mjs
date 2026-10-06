// GitHub App tokens (server/storage/github-app.mjs). The stand-in for GitHub checks each signature with Node's own
// crypto, not the WebCrypto code under test, and checks the claims GitHub checks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import { createGitHubAppToken, importAppKey, pkcs1ToPkcs8 } from "../server/storage/github-app.mjs";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const PKCS1 = privateKey.export({ type: "pkcs1", format: "pem" }), PKCS8 = privateKey.export({ type: "pkcs8", format: "pem" });
const APP_ID = "123456", INSTALL = "987654";

function githubStandIn({ key = publicKey, now = () => Date.now() } = {}) {
  const calls = [];
  let n = 0;
  const fetch = async (url, init) => {
    calls.push(url);
    const m = new URL(url).pathname.match(/^\/app\/installations\/(\d+)\/access_tokens$/);
    if (init.method !== "POST" || !m) return Response.json({ message: "Not Found" }, { status: 404 });
    if (m[1] !== INSTALL) return Response.json({ message: "Not Found" }, { status: 404 });
    const [h, b, s] = (init.headers.authorization || "").replace(/^Bearer /, "").split(".");
    const ok = s && verify("RSA-SHA256", Buffer.from(`${h}.${b}`), key, Buffer.from(s, "base64url"));
    const head = ok && JSON.parse(Buffer.from(h, "base64url")), claims = ok && JSON.parse(Buffer.from(b, "base64url"));
    const t = Math.floor(now() / 1000);
    if (!ok || head.alg !== "RS256" || claims.iss !== APP_ID || claims.exp - claims.iat > 600 || claims.exp < t || claims.iat > t) return Response.json({ message: "A JSON web token could not be decoded" }, { status: 401 });
    return Response.json({ token: `ghs_token_${++n}`, expires_at: new Date(now() + 3600e3).toISOString() }, { status: 201 });
  };
  return { fetch, calls };
}

test("a GitHub App key works as GitHub gives it (PKCS#1), as PKCS#8, and pasted with \\n instead of line breaks", async () => {
  for (const [name, pem] of [["PKCS#1", PKCS1], ["PKCS#8", PKCS8], ["one line", PKCS1.replace(/\n/g, "\\n")]]) {
    const gh = githubStandIn();
    const token = createGitHubAppToken({ appId: APP_ID, privateKey: pem, installationId: INSTALL, fetch: gh.fetch });
    assert.equal(await token(), "ghs_token_1", name);
  }
});

test("the PKCS#1 to PKCS#8 wrapping matches what Node's own crypto makes", () => {
  const pkcs1 = privateKey.export({ type: "pkcs1", format: "der" });
  assert.deepEqual(Buffer.from(pkcs1ToPkcs8(new Uint8Array(pkcs1))), privateKey.export({ type: "pkcs8", format: "der" }));
});

test("the token is kept until 5 minutes before it expires, and requests at the same moment share one", async () => {
  let t = Date.parse("2026-10-06T12:00:00Z");
  const gh = githubStandIn({ now: () => t });
  const token = createGitHubAppToken({ appId: APP_ID, privateKey: PKCS1, installationId: INSTALL, fetch: gh.fetch, now: () => t });
  assert.deepEqual(await Promise.all([token(), token(), token()]), ["ghs_token_1", "ghs_token_1", "ghs_token_1"]);
  assert.equal(gh.calls.length, 1);
  t += 54 * 60e3;
  assert.equal(await token(), "ghs_token_1", "54 minutes in, it is still good");
  t += 2 * 60e3;
  assert.equal(await token(), "ghs_token_2", "56 minutes in, it gets a new one");
  assert.equal(gh.calls.length, 2);
});

test("clear errors for a wrong key, a wrong installation, and missing settings", async () => {
  const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const gh = githubStandIn({ key: other.publicKey });
  await assert.rejects(createGitHubAppToken({ appId: APP_ID, privateKey: PKCS1, installationId: INSTALL, fetch: gh.fetch })(), /did not accept the app's key/);
  await assert.rejects(createGitHubAppToken({ appId: APP_ID, privateKey: PKCS1, installationId: "111", fetch: githubStandIn().fetch })(), /could not find the app's installation/);
  await assert.rejects(importAppKey("not a key"), /not a private key/);
  await assert.rejects(importAppKey("-----BEGIN RSA PRIVATE KEY-----\nAAAA\n-----END RSA PRIVATE KEY-----"), /could not be read/);
  assert.throws(() => createGitHubAppToken({ appId: APP_ID, privateKey: PKCS1 }), /GITHUB_APP_INSTALLATION_ID/);
  assert.throws(() => createGitHubAppToken({ appId: APP_ID, privateKey: PKCS1, installationId: "abc" }), /is a number/);
});

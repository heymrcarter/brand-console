// Cloudflare Access checks in the Worker (worker/access.mjs), with real signed tokens.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from "jose";
import { createAccess } from "../worker/access.mjs";

const TEAM = "https://acme.cloudflareaccess.com", AUD = "4714c1358e65fe4b408ad6d432a5f878f08194bdb4752441fd56faefa9b2b6f2";
const { publicKey, privateKey } = await generateKeyPair("RS256");
const other = await generateKeyPair("RS256");
const jwks = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256" }] });
const sign = (claims = {}, { key = privateKey, kid = "k1", exp = "5m" } = {}) =>
  new SignJWT({ email: "maya@acme.com", name: "Maya R.", ...claims }).setProtectedHeader({ alg: "RS256", kid }).setIssuer(claims.iss || TEAM).setAudience(claims.aud || [AUD]).setIssuedAt().setExpirationTime(exp).sign(key);
const req = (token, url = "https://console.acme.com/api/state") => new Request(url, { headers: token ? { "cf-access-jwt-assertion": token } : {} });
const refused = (p, re) => assert.rejects(p, (e) => e.status === 403 && re.test(e.message));

test("a token from the team's Access application gives the signed-in person", async () => {
  const access = createAccess({ teamDomain: TEAM, aud: AUD, jwks });
  assert.deepEqual(await access.identify(req(await sign())), { email: "maya@acme.com", name: "Maya R." });
});

test("anything else is refused: no token, another application, another team, expired, signed by another key, no email", async () => {
  const access = createAccess({ teamDomain: TEAM, aud: AUD, jwks });
  await refused(access.identify(req(null)), /Sign in through Cloudflare Access/);
  await refused(access.identify(req("not.a.token")), /could not be checked/);
  await refused(access.identify(req(await sign({ aud: ["another-application"] }))), /could not be checked/);
  await refused(access.identify(req(await sign({ iss: "https://other.cloudflareaccess.com" }))), /could not be checked/);
  await refused(access.identify(req(await sign({}, { exp: Math.floor(Date.now() / 1000) - 120 }))), /could not be checked/);
  await refused(access.identify(req(await sign({}, { key: other.privateKey }))), /could not be checked/);
  await refused(access.identify(req(await sign({ email: undefined }))), /did not include an email/);
  // A token with "none" for its algorithm must never pass.
  const [, body] = (await sign()).split(".");
  await refused(access.identify(req(`${Buffer.from('{"alg":"none"}').toString("base64url")}.${body}.`)), /could not be checked/);
});

test("with Access not set up, every request is refused, except localhost when local development is allowed", async () => {
  const off = createAccess({});
  assert.equal(off.configured, false);
  await refused(off.identify(req(await sign())), /not set up for sign-in/);
  const dev = createAccess({ localDev: "allow" });
  assert.deepEqual(await dev.identify(req(null, "http://localhost:8787/api/state")), { email: "local-dev", name: "Local development" });
  assert.equal((await dev.identify(req(null, "http://127.0.0.1:8787/"))).email, "local-dev");
  await refused(dev.identify(req(null, "https://console.acme.com/api/state")), /not set up for sign-in/);
  await refused(dev.identify(req(null, "https://localhost.acme.com/")), /not set up for sign-in/);
  await refused(createAccess({ localDev: "true" }).identify(req(null, "http://localhost:8787/")), /not set up/, "only the exact value allow turns it on");
  // Once Access is set up, the local switch does nothing.
  await refused(createAccess({ teamDomain: TEAM, aud: AUD, jwks, localDev: "allow" }).identify(req(null, "http://localhost:8787/")), /Sign in through/);
});

test("TEAM_DOMAIN must be a Cloudflare Access team address", () => {
  assert.throws(() => createAccess({ teamDomain: "https://evil.example.com", aud: AUD }), /cloudflareaccess\.com/);
  assert.throws(() => createAccess({ teamDomain: "acme.cloudflareaccess.com", aud: AUD }), /cloudflareaccess\.com/);
});

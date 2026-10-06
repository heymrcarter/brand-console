// Checks that a request came through Cloudflare Access, and who it is.
//
// Access signs people in with the company's identity provider before a request reaches the Worker, and adds a signed
// token (Cf-Access-Jwt-Assertion). Checking that token here as well means a request that found another way in, like a
// route Access does not cover, is still refused. This follows Cloudflare's guide, with the same setting names:
//   TEAM_DOMAIN   https://<your-team-name>.cloudflareaccess.com
//   POLICY_AUD    the Access application's AUD tag
//
// It fails closed: if either setting is missing, every request is refused. For `wrangler dev` on your own computer,
// ACCESS_LOCAL_DEV=allow lets requests to localhost through as "local-dev". It never lets any other host through.
import { jwtVerify, createRemoteJWKSet } from "jose";

const refuse = (message) => Object.assign(new Error(message), { status: 403 });
const LOCAL = new Set(["localhost", "127.0.0.1", "[::1]"]);
const keySets = new Map();

/** jwks: optional key set, for tests. By default the team's keys are fetched from Access and kept. */
export function createAccess({ teamDomain, aud, localDev, jwks } = {}) {
  const team = String(teamDomain || "").replace(/\/$/, "");
  const configured = !!(team && aud);
  if (configured && !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/i.test(team)) throw new Error("TEAM_DOMAIN must look like https://your-team.cloudflareaccess.com");
  const keys = () => jwks || keySets.get(team) || keySets.set(team, createRemoteJWKSet(new URL(`${team}/cdn-cgi/access/certs`))).get(team);

  return {
    configured,
    /** The signed-in person, as { email, name }. Throws a 403 error when the request did not come through Access. */
    async identify(request) {
      if (!configured) {
        if (localDev === "allow" && LOCAL.has(new URL(request.url).hostname)) return { email: "local-dev", name: "Local development" };
        throw refuse("This console is not set up for sign-in yet. Set TEAM_DOMAIN and POLICY_AUD for Cloudflare Access.");
      }
      const token = request.headers.get("cf-access-jwt-assertion");
      if (!token) throw refuse("Sign in through Cloudflare Access to use this console.");
      let payload;
      try { ({ payload } = await jwtVerify(token, keys(), { issuer: team, audience: aud, algorithms: ["RS256"] })); }
      catch { throw refuse("Your sign-in could not be checked. Reload the page to sign in again."); }
      if (!payload.email) throw refuse("Your sign-in did not include an email address. Sign in as a person, not a service token.");
      return { email: String(payload.email), name: payload.name ? String(payload.name) : "" };
    },
  };
}

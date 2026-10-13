// The Brand Console on Cloudflare Workers. See docs/cloudflare.md to set it up.
//
// Every request comes here first, including the console's own files (run_worker_first in wrangler.jsonc), so nothing
// is served without a Cloudflare Access sign-in. The routes are in server/http.mjs, shared with the Node server. Here:
//   the sign-in                 Cloudflare Access (access.mjs)
//   the API, fonts, /api/live   the design system's Durable Object (design-system.mjs)
//   static files                Workers static assets
import { createAccess } from "./access.mjs";
import { handleRequest } from "../server/http.mjs";

export { DesignSystem } from "./design-system.mjs";

export default {
  async fetch(request, env) {
    const designSystem = env.DESIGN_SYSTEM.getByName(`${env.GITHUB_REPO || "unset"}#${env.GITHUB_BRANCH || "main"}`);
    return handleRequest(request, {
      identify: (r) => createAccess({ teamDomain: env.TEAM_DOMAIN, aud: env.POLICY_AUD, localDev: env.ACCESS_LOCAL_DEV }).identify(r),
      designSystem,
      assets: (r) => env.ASSETS.fetch(r),
      // The Durable Object holds the WebSockets, and hears who it is from the Worker.
      live: (r, user) => {
        const headers = new Headers(r.headers);
        headers.set("x-console-user", JSON.stringify({ email: user.email, name: user.name || "" }));
        return designSystem.fetch(new Request(r, { headers }));
      },
    });
  },
};

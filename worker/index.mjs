// The Brand Console on Cloudflare Workers. See docs/cloudflare.md to set it up.
//
// Every request comes here first, including the console's own files (run_worker_first in wrangler.jsonc), so nothing
// is served without a Cloudflare Access sign-in. Then:
//   /api/*                      the console's API, run by the design system's Durable Object
//   /dist/ /build/ /fonts/      design system files, from GitHub and any changes not yet published
//   anything else               the console and Storybook, as static files
import { createAccess } from "./access.mjs";

export { DesignSystem } from "./design-system.mjs";

const TYPES = { css: "text/css; charset=utf-8", json: "application/json", js: "text/javascript; charset=utf-8", svg: "image/svg+xml", png: "image/png", woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf", md: "text/markdown; charset=utf-8" };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const MAX_BODY = 20e6; // The same as the Node server. A font upload is at most 8 MB, about 11 MB as text.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isApi = url.pathname.startsWith("/api/");
    let user;
    try {
      user = await createAccess({ teamDomain: env.TEAM_DOMAIN, aud: env.POLICY_AUD, localDev: env.ACCESS_LOCAL_DEV }).identify(request);
    } catch (e) {
      return isApi ? json(e.status || 403, { error: e.message }) : new Response(e.message, { status: e.status || 403, headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    // Only the console's own pages may change things. Another site cannot use a signed-in person's browser to.
    if (!["GET", "HEAD"].includes(request.method) && request.headers.get("origin") !== url.origin) {
      return json(403, { error: "Only the Brand Console can make changes here." });
    }
    const designSystem = env.DESIGN_SYSTEM.getByName(`${env.GITHUB_REPO || "unset"}#${env.GITHUB_BRANCH || "main"}`);

    if (isApi) {
      let body = {};
      if (!["GET", "HEAD"].includes(request.method)) {
        const text = await request.text();
        if (text.length > MAX_BODY) return json(413, { error: "That is too big to send. A font file can be at most 8 MB." });
        try { body = text ? JSON.parse(text) : {}; } catch { return json(400, { error: "The request was not valid JSON." }); }
      }
      const r = await designSystem.api(request.method, url.pathname, body, user);
      return json(r.status, r.body);
    }
    if (/^\/(dist|build|fonts)\//.test(url.pathname)) {
      let path;
      try { path = decodeURIComponent(url.pathname.slice(1)); } catch { return new Response("Not found", { status: 404 }); }
      const bytes = await designSystem.file(path);
      if (!bytes) return new Response("Not found", { status: 404 });
      return new Response(bytes, { headers: { "content-type": TYPES[path.split(".").pop()] || "application/octet-stream", "cache-control": "no-store" } });
    }
    return env.ASSETS.fetch(request);
  },
};

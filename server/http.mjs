// The console's web requests, for both ways of running it: the Cloudflare Worker (worker/index.mjs) and the Node
// server (server/node-server.mjs). Each one says who is signed in, where the design system's console is, and how
// static files are served; the rules here are the same for both:
//   /api/*                      the console's API
//   /api/live                   the live connection (a WebSocket), which each server opens its own way
//   /fonts/                     uploaded font files, from GitHub and the edits
//   anything else               the console and Storybook, as static files
// Uses only web standards (Request, Response), so a Worker can run it.

const TYPES = { css: "text/css; charset=utf-8", json: "application/json", js: "text/javascript; charset=utf-8", svg: "image/svg+xml", png: "image/png", woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf", md: "text/markdown; charset=utf-8" };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const MAX_BODY = 20e6; // A font upload is at most 8 MB, about 11 MB as text.

/**
 * identify(request): the signed-in person, as { email, name }. Throws an error with a status to refuse the request.
 * designSystem: { api(method, path, body, user) -> { status, body }, file(path) -> bytes or null }.
 * assets(request): a Response with a static file.
 * live(request, user): a Response for /api/live, after the checks here. Optional.
 */
export async function handleRequest(request, { identify, designSystem, assets, live }) {
  const url = new URL(request.url);
  const isApi = url.pathname.startsWith("/api/");
  let user;
  try {
    user = await identify(request);
  } catch (e) {
    return isApi ? json(e.status || 403, { error: e.message }) : new Response(e.message, { status: e.status || 403, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  // Only the console's own pages may change things. Another site cannot use a signed-in person's browser to.
  if (!["GET", "HEAD"].includes(request.method) && request.headers.get("origin") !== url.origin) {
    return json(403, { error: "Only the Brand Console can make changes here." });
  }

  // The live connection: others' edits and who is here, without reloading. A WebSocket is a GET, so it gets its own
  // address check: another site must not open one with a signed-in person's browser.
  if (url.pathname === "/api/live") {
    if (request.headers.get("upgrade") !== "websocket" || !live) return json(426, { error: "This address is for the console's live connection." });
    if (request.headers.get("origin") !== url.origin) return json(403, { error: "Only the Brand Console can open a live connection." });
    return live(request, user);
  }

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
  if (/^\/fonts\//.test(url.pathname)) {
    let path;
    try { path = decodeURIComponent(url.pathname.slice(1)); } catch { return new Response("Not found", { status: 404 }); }
    const bytes = await designSystem.file(path);
    if (!bytes) return new Response("Not found", { status: 404 });
    return new Response(bytes, { headers: { "content-type": TYPES[path.split(".").pop()] || "application/octet-stream", "cache-control": "no-store" } });
  }
  return assets(request);
}

// One design system's server side, as a Durable Object. There is one per GitHub repository and branch.
//
// Every save and proposal for that design system runs here, one at a time, which is what a Durable Object is for:
// a single place that orders the writes, however many copies of the Worker are running. The edits wait in this
// object's SQLite database, on top of the repository's main branch, so they last if the object restarts. They go to
// GitHub only as changes on a proposal's branch (server/proposals.mjs), never straight to main.
import { DurableObject } from "cloudflare:workers";
import { createRoom } from "../server/live.mjs";
import { createConsole } from "../server/console.mjs";

export class DesignSystem extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // Pages ping every so often to keep their connection open. Cloudflare answers that itself, without waking this
    // object, so an idle console costs nothing.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"type":"ping"}', '{"type":"pong"}'));
  }
  // Everyone with the console open, on hibernation WebSockets (server/live.mjs). What the room keeps about each
  // page is the WebSocket's attachment, which lasts while this object sleeps.
  #room = null;
  room() {
    if (!this.#room) this.#room = createRoom({ all: () => this.ctx.getWebSockets().filter((ws) => ws.readyState === WebSocket.OPEN), send: (ws, text) => ws.send(text), info: (ws) => ws.deserializeAttachment(), setInfo: (ws, info) => ws.serializeAttachment(info) });
    return this.#room;
  }
  // The store, proposals, Figma, and the API (server/console.mjs), with the edits in this object's SQLite.
  #console = null;
  parts() {
    if (!this.#console) this.#console = createConsole({
      env: this.env, sql: this.ctx.storage.sql,
      live: { edits: (m) => this.room().edits(m), refresh: (m) => this.room().refresh(m) },
      setupHelp: "See docs/cloudflare.md.", secretHelp: "Set it with: npx wrangler secret put ANTHROPIC_API_KEY",
    });
    return this.#console;
  }

  /** A page's live connection (/api/live), sent on by the Worker after it checked the sign-in and the address. */
  async fetch(request) {
    if (request.headers.get("upgrade") !== "websocket") return new Response("This address is for the console's live connection.", { status: 426 });
    let user = null;
    try { user = JSON.parse(request.headers.get("x-console-user") || "null"); } catch { /* Left as nobody. */ }
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    this.room().join(server, { page: new URL(request.url).searchParams.get("page"), user });
    return new Response(null, { status: 101, webSocket: client });
  }
  webSocketMessage(ws, message) { this.room().message(ws, message); }
  webSocketClose(ws) { this.#gone(ws); }
  webSocketError(ws) { this.#gone(ws); }
  #gone(ws) { ws.serializeAttachment(null); try { ws.close(1000, "Bye"); } catch { /* Already closed. */ } this.room().leave(ws); }

  /** Runs one API route, as { status, body }. The Worker calls it over RPC. */
  async api(method, path, body, user) { return this.parts().api(method, path, body, user); }

  /** An uploaded font file, as bytes, or null. */
  async file(path) { return this.parts().file(path); }
}

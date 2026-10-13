// The live room: everyone who has the console open, and what they see change. It sends
//   presence   who is here, on which page and brand, whenever someone comes, goes, or moves
//   edits      the newest edits, right after someone saves, to everyone else, so they see it in about a second
//   refresh    "something else changed" (a change added to the proposal, a Figma sync, a rollback), so pages reload
//              the console's state
// It does not know how the connections work. The Cloudflare Durable Object gives it WebSockets
// (worker/design-system.mjs), and the Node server gives it the ws package's (server/node-server.mjs).
//
// transport: { all(): connections, send(conn, text), info(conn), setInfo(conn, info) }. info is what the room keeps
// about a connection ({ page, email, name, sec, brand }). It must last as long as the connection, even if the
// server sleeps in between (a Durable Object's WebSocket attachment does).

const clip = (v, n = 80) => (typeof v === "string" ? v.slice(0, n) : null);

export function createRoom(transport) {
  const send = (conn, msg) => { try { transport.send(conn, JSON.stringify(msg)); } catch { /* A connection that just closed. */ } };
  const everyone = () => transport.all().filter((c) => transport.info(c));
  const people = () => everyone().map((c) => transport.info(c)).map(({ page, email, name, sec, brand }) => ({ page, email, name, sec, brand }));
  const broadcast = (msg, exceptPage) => { for (const c of everyone()) if (!exceptPage || transport.info(c).page !== exceptPage) send(c, msg); };
  const sendPresence = () => broadcast({ type: "presence", people: people() });

  return {
    /** A page connected. page is the id the page made for itself; user is the signed-in person. */
    join(conn, { page, user }) {
      transport.setInfo(conn, { page: clip(page, 40) || "page", email: (user && user.email) || "", name: (user && user.name) || "", sec: null, brand: null });
      sendPresence();
    },
    /** A message from a page: { type: "here", sec, brand } when it moves, or { type: "ping" }. */
    message(conn, text) {
      let m; try { m = JSON.parse(String(text)); } catch { return; }
      const info = transport.info(conn);
      if (!info || !m) return;
      if (m.type === "here") { transport.setInfo(conn, { ...info, sec: clip(m.sec, 40), brand: clip(m.brand, 40) }); sendPresence(); }
      else if (m.type === "ping") send(conn, { type: "pong" });
    },
    /** A page left. Call after the connection is gone from all(). */
    leave() { sendPresence(); },
    /** Someone saved edits. Everyone else gets them. */
    edits({ rev, draft, by, page }) { broadcast({ type: "edits", rev, draft, by: by || null }, page); },
    /** Something else changed. what is a few words, like "added a change to the proposal". */
    refresh({ by, what, page }) { broadcast({ type: "refresh", by: by || null, what: what || "" }, page); },
    people,
  };
}

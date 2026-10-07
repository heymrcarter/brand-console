// The live room (server/live.mjs): who is here, and others' edits arriving without a reload. With a stand-in for the
// connections, so it needs no WebSockets.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRoom } from "../server/live.mjs";

function setup() {
  const conns = [], inbox = new Map(), infos = new Map();
  const room = createRoom({ all: () => conns, send: (c, t) => inbox.get(c).push(JSON.parse(t)), info: (c) => infos.get(c), setInfo: (c, i) => infos.set(c, i) });
  const open = (page, email, name) => { const c = { page }; conns.push(c); inbox.set(c, []); room.join(c, { page, user: { email, name } }); return c; };
  const close = (c) => { conns.splice(conns.indexOf(c), 1); infos.delete(c); room.leave(c); };
  const last = (c, type) => inbox.get(c).filter((m) => m.type === type).at(-1);
  return { room, open, close, last, inbox };
}

test("everyone sees who is here, and where, as people come, move, and go", () => {
  const { room, open, close, last } = setup();
  const heath = open("p1", "heath@example.com", "Heath");
  const suzie = open("p2", "suzie@example.com", "Suzie");
  assert.deepEqual(last(heath, "presence").people.map((p) => p.email), ["heath@example.com", "suzie@example.com"]);
  room.message(heath, JSON.stringify({ type: "here", sec: "color", brand: "northfield" }));
  assert.deepEqual(last(suzie, "presence").people[0], { page: "p1", email: "heath@example.com", name: "Heath", sec: "color", brand: "northfield" });
  close(heath);
  assert.deepEqual(last(suzie, "presence").people.map((p) => p.email), ["suzie@example.com"]);
});

test("a save reaches everyone else, but not the page that saved it", () => {
  const { room, open, last } = setup();
  const heath = open("p1", "heath@example.com"), suzie = open("p2", "suzie@example.com"), tom = open("p3", "tom@example.com");
  room.edits({ rev: "abc", draft: { shape: { radius: 9 } }, by: "heath@example.com", page: "p1" });
  assert.equal(last(heath, "edits"), undefined);
  assert.deepEqual(last(suzie, "edits"), { type: "edits", rev: "abc", draft: { shape: { radius: 9 } }, by: "heath@example.com" });
  assert.equal(last(tom, "edits").rev, "abc");
  room.refresh({ by: "suzie@example.com", what: "synced with Figma", page: "p2" });
  assert.deepEqual(last(heath, "refresh"), { type: "refresh", by: "suzie@example.com", what: "synced with Figma" });
  assert.equal(last(suzie, "refresh"), undefined);
});

test("bad messages are ignored, long values are cut short, and a ping gets a pong", () => {
  const { room, open, last, inbox } = setup();
  const heath = open("p1", "heath@example.com");
  room.message(heath, "not json");
  room.message(heath, JSON.stringify({ type: "here", sec: "x".repeat(500), brand: 7 }));
  const me = last(heath, "presence").people[0];
  assert.equal(me.sec.length, 40);
  assert.equal(me.brand, null);
  room.message(heath, JSON.stringify({ type: "ping" }));
  assert.equal(inbox.get(heath).at(-1).type, "pong");
});

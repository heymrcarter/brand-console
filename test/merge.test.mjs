// Combining two people's edits (server/merge.mjs): what one person changed is applied on top of the newest edits.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeEdits, changesFrom } from "../server/merge.mjs";
import { createStore } from "../server/store.mjs";
import { createMemoryStorage } from "../server/storage/memory.mjs";
import { sampleFiles } from "./helpers/sample-repo.mjs";

const base = { shape: { radius: 6, shadow: "soft" }, type: { body: "Inter", scale: 1.2 }, brands: { a: { name: "A", primary: "#111111", palette: { groups: [{ id: "x", colors: [1, 2] }] } }, b: { name: "B", primary: "#222222" } }, comp: { card: {} } };
const clone = (o) => JSON.parse(JSON.stringify(o));

test("two people changing different settings both keep their change", () => {
  const heath = clone(base); heath.shape.radius = 10;
  const suzie = clone(base); suzie.type.body = "Lexend";
  const merged = mergeEdits(base, heath, suzie);
  assert.equal(merged.shape.radius, 10);
  assert.equal(merged.type.body, "Lexend");
  assert.deepEqual(changesFrom(base, heath), [{ path: ["shape", "radius"], value: 10 }]);
  assert.deepEqual(mergeEdits(base, base, suzie), suzie, "no changes of mine: theirs as it is");
  assert.deepEqual(base.shape.radius, 6, "the inputs are not changed");
});

test("on the same setting, the newest change wins; a list is one setting", () => {
  const heath = clone(base); heath.shape.radius = 10; heath.brands.a.palette.groups[0].colors = [1, 2, 3];
  const suzie = clone(base); suzie.shape.radius = 12; suzie.brands.a.palette.groups[0].colors = [9];
  const merged = mergeEdits(base, heath, suzie);
  assert.equal(merged.shape.radius, 10);
  assert.deepEqual(merged.brands.a.palette.groups[0].colors, [1, 2, 3]);
});

test("adding, removing, and reordering brands combine with others' edits", () => {
  const heath = clone(base); heath.brands.c = { name: "C", primary: "#333333" }; delete heath.brands.b;
  const suzie = clone(base); suzie.brands.a.primary = "#444444"; suzie.brands.d = { name: "D", primary: "#555555" };
  const merged = mergeEdits(base, heath, suzie);
  assert.deepEqual(Object.keys(merged.brands), ["a", "c", "d"], "Heath's order (with his new brand), then Suzie's new brand; Heath's removal holds");
  assert.equal(merged.brands.a.primary, "#444444");
  assert.equal(merged.brands.b, undefined, "the removed brand is gone completely, not left as an empty object");
  const moved = clone(base); moved.brands = { b: base.brands.b, a: base.brands.a };
  const other = clone(base); other.brands.e = { name: "E", primary: "#666666" };
  assert.deepEqual(Object.keys(mergeEdits(base, moved, other).brands), ["b", "a", "e"], "Heath's order, then a brand added since");
});

test("editing a brand someone else removed brings the whole brand back, not half of it", () => {
  const heath = clone(base); heath.brands.b.primary = "#999999";
  const suzie = clone(base); delete suzie.brands.b;
  const merged = mergeEdits(base, heath, suzie);
  assert.deepEqual(merged.brands.b, { name: "B", primary: "#999999" });
});

test("empty settings, removed settings, and a real design system combine cleanly", async () => {
  const heath = clone(base); delete heath.brands.a.palette;
  const suzie = clone(base); suzie.comp.card.shadow = "strong";
  const merged = mergeEdits(base, heath, suzie);
  assert.equal(merged.brands.a.palette, undefined);
  assert.equal(merged.comp.card.shadow, "strong");
  const store = createStore(createMemoryStorage(sampleFiles()));
  const d = await store.draft(), h = clone(d), s = clone(d);
  h.shape.radius += 2; h.brands.northfield.primary = "#4A7200";
  s.type.scale = 1.333; delete s.brands.crestline.palette;
  const m = mergeEdits(d, h, s);
  assert.deepEqual(store.E.diff(d, m).map((c) => c.path).sort(), ["brands.crestline.palette", "brands.northfield.primary", "shape.radius", "type.scale"]);
});

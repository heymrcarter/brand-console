// Every word color the engine makes must be easy to read on every background it can sit on,
// in light and dark mode, for any main color the brand team picks.
import test from "node:test";
import assert from "node:assert/strict";
import { loadEngine } from "../server/engine.mjs";

const E = loadEngine(process.cwd());
const hex = (n) => "#" + n.toString(16).padStart(6, "0").toUpperCase();
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

function pairs(c) {
  const text = [];
  const onAll = (name, fg, bgs) => bgs.forEach(([bn, bg]) => text.push([`${name} on ${bn}`, fg, bg]));
  const base = [["page", c.background], ["window", c.card], ["muted", c.muted], ["soft", c.secondary], ["tag", c.accent],
    ["error box", c.dangerSoft], ["success box", c.successSoft], ["warning box", c.warningSoft]];
  onAll("help text", c.mutedFg, base);
  onAll("link", c.link, base);
  onAll("error words", c.dangerText, [["page", c.background], ["window", c.card], ["error box", c.dangerSoft]]);
  onAll("success words", c.success, [["success box", c.successSoft]]);
  onAll("warning words", c.warning, [["warning box", c.warningSoft]]);
  text.push(["body text on page", c.foreground, c.background], ["body text on window", c.foreground, c.card],
    ["soft button words", c.secondaryFg, c.secondary], ["tag words", c.accentFg, c.accent], ["danger button words", c.dangerFg, c.danger]);
  const shapes = [["main color outline on page", c.edge, c.background], ["main color outline on window", c.edge, c.card],
    ["button outline on page", c.btnBorder, c.background], ["button outline on window", c.btnBorder, c.card],
    ["focus ring on page", c.ring, c.background], ["focus ring on window", c.ring, c.card]];
  return { text, shapes };
}

test("words and outlines pass in both modes for many brand colors", () => {
  const st = E.clone(E.BASE);
  const fails = [];
  for (let i = 0; i < 60; i++) {
    st.gray = ["warm", "neutral", "cool", "brand"][i % 4];
    for (const b of ["northfield", "crestline"]) {
      Object.assign(st.brands[b], { primary: hex(Math.floor(rnd() * 0xffffff)), secondary: hex(Math.floor(rnd() * 0xffffff)), onPrimary: "auto" });
      for (const md of ["light", "dark"]) {
        const c = E.colorsFor(st, b, md);
        const { text, shapes } = pairs(c);
        text.forEach(([n, f, g]) => { if (E.contrast(f, g) < 4.5) fails.push(`${b} ${md} ${st.brands[b].primary}: ${n} ${E.contrast(f, g).toFixed(2)}`); });
        shapes.forEach(([n, f, g]) => { if (E.contrast(f, g) < 3) fails.push(`${b} ${md} ${st.brands[b].primary}: ${n} ${E.contrast(f, g).toFixed(2)}`); });
      }
      // Some middle tones are too light for white words and too dark for dark words.
      // Those must be caught by the check that blocks publishing.
      const L0 = E.colorsFor(st, b, "light");
      if (E.contrast(L0.btnFg, L0.btnBg) < 4.5 && !E.runChecks(st).some((k) => k.id === "btn-" + b && k.level === "block")) fails.push(`${b}: unreadable button words not blocked`);
      const L = E.colorsFor(st, b, "light"), D = E.colorsFor(st, b, "dark");
      if (L.btnFg !== D.btnFg || L.btnBg !== D.btnBg) fails.push(`${b}: button changes between modes`);
    }
  }
  assert.deepEqual(fails.slice(0, 20), []);
});

test("gradients, pictures, and see-through windows are checked, and the fix makes them pass", () => {
  const problems = [];
  for (let i = 0; i < 80; i++) {
    const st = E.clone(E.BASE);
    const b = i % 2 ? "northfield" : "crestline", md = i % 4 < 2 ? "light" : "dark";
    const rc = () => hex(Math.floor(rnd() * 0xffffff));
    const kind = i % 3 === 0 ? "image" : "gradient";
    st.brands[b].look = { [md]: kind === "image"
      ? { kind, img: "data:image/jpeg;base64,AAAA", samples: [rc(), rc(), rc(), rc()], veil: 0.5 + rnd() * 0.3, glass: 0.6 + rnd() * 0.4, blur: 8 }
      : { kind, to: rc(), angle: "down", glass: 0.6 + rnd() * 0.4 } };
    const k = E.colorsFor(st, b, md), all = [k.background, k.card, ...k.pageSet, ...k.cardSet];
    const readable = (c) => all.every((x) => E.contrast(c.foreground, x) >= 4.5 && E.contrast(c.mutedFg, x) >= 4.5);
    const chk = E.runChecks(st).find((x) => x.id === `bg-${md}-${b}`);
    if (!readable(k) && chk.level !== "block") problems.push(`${b} ${md} ${kind}: hard-to-read words were not blocked`);
    if (chk.level === "block") {
      const fixed = E.applyCh(st, E.fixChanges(st, chk.fix));
      const k2 = E.colorsFor(fixed, b, md), all2 = [k2.background, k2.card, ...k2.pageSet, ...k2.cardSet];
      if (!all2.every((x) => E.contrast(k2.foreground, x) >= 4.5 && E.contrast(k2.mutedFg, x) >= 4.5)) problems.push(`${b} ${md} ${kind}: the fix did not make words readable`);
    }
  }
  assert.deepEqual(problems.slice(0, 10), []);
});

test("the page look is saved in the token files and theme.css", () => {
  const st = E.clone(E.BASE);
  st.brands.northfield.look = { light: { kind: "gradient", to: "#E8F3DA", angle: "diag", glass: 0.9, blur: 8 } };
  const back = E.filesToState(E.stateToFiles(st));
  assert.deepEqual(back.brands.northfield.look, st.brands.northfield.look);
  const doc = E.stateToFiles(st)["tokens/brands/northfield.tokens.json"];
  assert.equal(doc.color.surface.light["page-gradient"].$type, "gradient");
  const css = E.themeCss(st, "9.9.9");
  assert.match(css, /--page-fill: linear-gradient\(135deg/);
  assert.match(css, /--panel: rgba\(/);
});

test("every icon in the approved set exists in lucide-react", async () => {
  const { icons } = await import("lucide-react");
  const st = E.clone(E.BASE);
  const man = JSON.parse(JSON.stringify(E.files(st, "0.0.0")["components.manifest.json"] || {}));
  const names = (man.icons ? man.icons.groups : []).flatMap((g) => g.names);
  assert.ok(names.length > 200, "the icon list is in the manifest");
  const pascal = (n) => n.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");
  assert.deepEqual(names.filter((n) => !icons[pascal(n)]), []);
});

test("the three fonts and the heading style are saved, and licensed fonts are flagged", () => {
  const st = E.clone(E.BASE);
  Object.assign(st.type, { heading: "Cormorant Garamond", headingStyle: "italic", body: "Atkinson Hyperlegible", ui: "Avenir Next" });
  const back = E.filesToState(E.stateToFiles(st));
  assert.equal(back.type.ui, "Avenir Next");
  assert.equal(back.type.headingStyle, "italic");
  const f = E.files(st, "0.0.0");
  const settings = JSON.parse(JSON.stringify(f["settings.json"]));
  assert.deepEqual(settings.fonts.needLicense, ["Avenir Next"]);
  assert.match(settings.fonts.href, /Cormorant\+Garamond/);
  assert.match(settings.fonts.href, /Nunito\+Sans/);
  assert.match(E.themeCss(st, "1.0.0"), /--heading-style: italic/);
  assert.ok(E.runChecks(st).some((c) => c.id === "license"));
});

test("the 7 to 1 goal raises links, help text, and error words, and the button fix reaches 7", () => {
  const fails = [];
  for (let i = 0; i < 40; i++) {
    const st = E.clone(E.BASE);
    for (const b of ["northfield", "crestline"]) {
      Object.assign(st.brands[b], { primary: hex(Math.floor(rnd() * 0xffffff)), secondary: hex(Math.floor(rnd() * 0xffffff)), onPrimary: "auto", wordGoal: "best" });
      for (const md of ["light", "dark"]) {
        const c = E.colorsFor(st, b, md);
        [["link", c.link], ["help text", c.mutedFg], ["error words", c.dangerText]].forEach(([n, f]) => [c.background, c.card].forEach((bg) => { if (E.contrast(f, bg) < 7) fails.push(`${b} ${md} ${n} ${E.contrast(f, bg).toFixed(2)}`); }));
      }
      const L = E.colorsFor(st, b, "light");
      if (E.contrast(L.btnFg, L.btnBg) < 7) {
        const fixed = E.applyCh(st, E.fixChanges(st, { kind: "btn7", brand: b }));
        const F = E.colorsFor(fixed, b, "light");
        if (E.contrast(F.btnFg, F.btnBg) < 7) fails.push(`${b}: button fix did not reach 7`);
      }
    }
  }
  assert.deepEqual(fails.slice(0, 10), []);
});

test("hand-picked word and background colors are saved, used, and blocked when too low", () => {
  const st = E.clone(E.BASE);
  st.brands.northfield.pairs = { light: { link: "#1F3A05", softBg: "#EEF6E4" }, dark: { tag: "#123456" } };
  st.brands.northfield.onPrimary = "#FFFFFF";
  const back = E.filesToState(E.stateToFiles(st));
  assert.deepEqual(back.brands.northfield.pairs, st.brands.northfield.pairs);
  const L = E.colorsFor(st, "northfield", "light");
  assert.equal(L.link, "#1F3A05");
  assert.equal(L.secondary, "#EEF6E4");
  assert.ok(E.runChecks(st).some((c) => c.id === "pair-dark-northfield-tag" && c.level === "block"), "a too-dark tag word in dark mode blocks publishing");
});

test("field borders are checked for every brand, not only the first", () => {
  const st = E.withDefaults(E.BASE);
  st.comp.field.border = "action.primary"; // each brand's own main color
  st.brands.northfield.primary = "#1F3A5F"; // dark: easy to see on white
  st.brands.crestline.primary = "#E9EEF5"; // pale: too faint on white
  const checks = E.runChecks(st).filter((c) => c.id.startsWith("fieldborder"));
  const crest = checks.find((c) => c.id === "fieldborder-crestline"), north = checks.find((c) => c.id === "fieldborder-northfield");
  assert.ok(crest && north, `one check per brand: ${checks.map((c) => c.id).join(", ")}`);
  assert.equal(crest.level, "block");
  assert.match(crest.title, /^Crestline: /);
  assert.equal(north.level, "pass");
});

test("a field border that is too faint offers a fix, and the fix makes it easy to see", () => {
  const st = E.withDefaults(E.BASE);
  st.comp.field.border = "border.default"; // light gray: too faint for every brand
  const blocked = E.runChecks(st).filter((c) => c.id.startsWith("fieldborder") && c.level === "block");
  assert.equal(blocked.length, E.BRANDS.length);
  for (const c of blocked) assert.deepEqual(c.fix, { kind: "field" }, `${c.id} offers the Fix it button`);
  for (const ch of E.fixChanges(st, blocked[0].fix)) E.setP(st, ch.path, ch.value);
  assert.deepEqual(E.runChecks(st).filter((c) => c.id.startsWith("fieldborder") && c.level === "block"), []);
});

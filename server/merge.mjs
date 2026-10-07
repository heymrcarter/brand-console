// Combines two people's edits. Everyone in the console shares one set of edits. When someone saves edits they made
// on an older version, the console does not throw away what others saved since: it takes only what *this* person
// changed (mine compared with base, the version they started from) and applies it on top of the newest edits
// (theirs). Different settings never clash. If both changed the same setting, this person's change wins, because
// it is the newest.
//
// A "setting" is a leaf: a string, number, true or false, null, a list (a list is one setting, like a color set's
// group of colors), or an empty object. The order of the brands is a setting of its own, because the first brand
// is the default. Runs the same in the browser and on the server, so both can combine edits the same way.

const ORDER = "\u0000order";
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const keyOf = (path) => JSON.stringify(path);

/** Every setting in o, as a Map of JSON(path) -> JSON(value). */
export function settingsOf(o) {
  const out = new Map();
  const walk = (v, path) => {
    if (isObj(v) && Object.keys(v).length) {
      if (path.length === 1 && path[0] === "brands") out.set(keyOf([...path, ORDER]), JSON.stringify(Object.keys(v)));
      for (const [k, x] of Object.entries(v)) walk(x, [...path, k]);
    } else out.set(keyOf(path), JSON.stringify(v === undefined ? null : v));
  };
  walk(o, []);
  return out;
}

const getAt = (o, path) => path.reduce((a, k) => (a == null ? undefined : a[k]), o);
function setAt(o, path, v) {
  let a = o;
  for (const k of path.slice(0, -1)) { if (!isObj(a[k])) a[k] = {}; a = a[k]; }
  a[path.at(-1)] = v;
}

/** What mine changed, compared with base: [{ path, value }] for a setting set, [{ path, gone: true }] for one removed. */
export function changesFrom(base, mine) {
  const b = settingsOf(base), m = settingsOf(mine), out = [];
  for (const [k, v] of m) if (b.get(k) !== v) out.push({ path: JSON.parse(k), value: JSON.parse(v) });
  for (const k of b.keys()) if (!m.has(k)) out.push({ path: JSON.parse(k), gone: true });
  return out;
}

/** theirs, with what mine changed compared with base applied on top. None of the three is changed. */
export function mergeEdits(base, mine, theirs) {
  const out = JSON.parse(JSON.stringify(theirs));
  const changes = changesFrom(base, mine);
  let order = null;
  for (const c of changes) {
    if (c.path.at(-1) === ORDER) { if (!c.gone) order = c.value; continue; }
    if (c.gone) {
      // Remove the setting, and any object around it that mine no longer has at all, like a removed brand.
      let path = c.path;
      while (path.length > 1 && getAt(mine, path.slice(0, -1)) === undefined) path = path.slice(0, -1);
      const parent = getAt(out, path.slice(0, -1));
      if (isObj(parent)) delete parent[path.at(-1)];
    } else if (c.path.length) {
      // If someone else removed what this setting is in (like a brand), bring the whole thing back from mine,
      // not just this one setting: mine is the newest, and half a brand would not work.
      let top = null;
      for (let i = 1; i < c.path.length; i++) if (getAt(out, c.path.slice(0, i)) === undefined) { top = c.path.slice(0, i); break; }
      if (top && getAt(mine, top) !== undefined) setAt(out, top, JSON.parse(JSON.stringify(getAt(mine, top))));
      else setAt(out, c.path, c.value);
    }
  }
  if (order && isObj(out.brands)) {
    // Mine's order first, then any brand someone else added since.
    const keys = [...order.filter((k) => k in out.brands), ...Object.keys(out.brands).filter((k) => !order.includes(k))];
    out.brands = Object.fromEntries(keys.map((k) => [k, out.brands[k]]));
  }
  return out;
}

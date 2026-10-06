// Where the design system's files live. The store and the Figma sync only use this interface, never the disk,
// so the same code runs on this computer (disk.mjs), in tests (memory.mjs), and later in a Cloudflare Worker.
//
// Paths are relative and use forward slashes, laid out like the project folder:
//   tokens/foundations.tokens.json   releases/index.json   dist/theme.css   fonts/avenir-next-400.woff2
//
// A storage has these methods. All of them are async.
//   read(path)          the file as text, or null if there is none
//   readBytes(path)     the file as a Uint8Array, or null. For font files.
//   write(path, data)   saves text or a Uint8Array, making folders as needed
//   list(prefix)        every file path under prefix ("" for all), sorted
//   remove(path)        deletes the file, if there is one
//   commit(message)     records everything written since the last commit as one change, like a Git commit.
//                       A storage with no history can do nothing here.
//
// Secrets, like the Figma token, are not files. They use a smaller interface with get(name) and set(name, value),
// where an empty value removes the secret.

/** Checks a storage path and returns it. Throws on anything that could reach outside the storage. */
export function storageKey(p) {
  const s = String(p ?? "");
  const parts = s.split("/");
  if (!s || s.includes("\\") || s.includes("\0") || parts.some((x) => x === "" || x === "." || x === "..")) {
    throw Object.assign(new Error(`That is not a valid storage path: ${JSON.stringify(s)}`), { status: 400 });
  }
  return s;
}

/** Checks a list prefix. "" means everything. A trailing slash is fine. */
export function storagePrefix(p) {
  const s = String(p ?? "").replace(/\/$/, "");
  return s === "" ? "" : storageKey(s);
}

/** True when path is inside the folder prefix (or prefix is ""). "tokens" holds "tokens/a.json", not "tokens-old/a.json". */
export function underPrefix(path, prefix) {
  return prefix === "" || path.startsWith(prefix + "/");
}

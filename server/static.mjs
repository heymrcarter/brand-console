// Safe static file paths for the Brand Console server.
// A URL path can never reach outside the folder it is allowed to read:
//   /dist/*   -> dist/          (the live outputs)
//   /build/*  -> build/         (the draft outputs, in build/draft/)
//   /fonts/*  -> fonts/         (uploaded font files)
//   anything else -> console/   (the console itself)
import fs from "node:fs";
import path from "node:path";

export const STATIC_DIRS = [["/dist/", "dist"], ["/build/", "build"], ["/fonts/", "fonts"]];

/** Joins a URL-relative path onto baseDir. Returns null if the result would leave baseDir. */
export function safeJoin(baseDir, relPath) {
  if (typeof relPath !== "string" || relPath.includes("\0")) return null;
  const base = path.resolve(baseDir);
  const parts = relPath.split(/[\\/]+/).filter(Boolean);
  if (parts.some((p) => p === ".." || p === ".")) return null;
  const out = path.resolve(base, ...parts);
  return out === base || out.startsWith(base + path.sep) ? out : null;
}

/** Maps a request path (still URL-encoded) to a file the server may send, or null. */
export function staticFile(root, urlPath) {
  let rel;
  try { rel = decodeURIComponent(String(urlPath || "/")); } catch { return null; }
  if (rel.includes("\0")) return null;
  for (const [prefix, dir] of STATIC_DIRS) if (rel.startsWith(prefix)) return safeJoin(path.join(root, dir), rel.slice(prefix.length));
  return safeJoin(path.join(root, "console"), rel === "/" ? "index.html" : rel);
}

/** Like staticFile, but also checks the file exists, is a file, and is not a link that points outside its folder. */
export function readableStaticFile(root, urlPath) {
  const file = staticFile(root, urlPath);
  if (!file || !fs.existsSync(file)) return null;
  let real;
  try { real = fs.realpathSync(file); } catch { return null; }
  if (fs.statSync(real).isDirectory()) return null;
  const allowed = [...STATIC_DIRS.map(([, d]) => path.join(root, d)), path.join(root, "console")].map((d) => { try { return fs.realpathSync(d); } catch { return path.resolve(d); } });
  return allowed.some((d) => real === d || real.startsWith(d + path.sep)) ? real : null;
}

/** True when a file from readableStaticFile is part of the console itself (not dist/, build/, or fonts/). */
export function isConsoleFile(root, file) {
  let dir;
  try { dir = fs.realpathSync(path.join(root, "console")); } catch { dir = path.resolve(root, "console"); }
  return file.startsWith(dir + path.sep);
}

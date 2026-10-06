// Storage on this computer: the files live in the project folder, and each publish becomes a Git commit
// when the project uses Git (see "Keep a history in Git" in the README). See storage.mjs for the interface.
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { storageKey, storagePrefix } from "./storage.mjs";

const run = promisify(execFile);
// What a publish commits. The draft (tokens), every version (releases), the live outputs (dist), uploaded fonts, and the change log.
const COMMITTED = ["tokens", "releases", "dist", "fonts", "CHANGELOG.md"];

export function createDiskStorage(root) {
  const at = (p) => path.join(root, ...storageKey(p).split("/"));
  const missing = (e) => e && e.code === "ENOENT";
  return {
    async read(p) { try { return await fsp.readFile(at(p), "utf8"); } catch (e) { if (missing(e)) return null; throw e; } },
    async readBytes(p) { try { return new Uint8Array(await fsp.readFile(at(p))); } catch (e) { if (missing(e)) return null; throw e; } },
    async write(p, data) {
      if (typeof data !== "string" && !(data instanceof Uint8Array)) throw new TypeError("Storage only saves text or a Uint8Array.");
      const f = at(p);
      await fsp.mkdir(path.dirname(f), { recursive: true });
      await fsp.writeFile(f, data);
    },
    async list(prefix = "") {
      const pre = storagePrefix(prefix), dir = pre ? at(pre) : root;
      let entries;
      try { entries = await fsp.readdir(dir, { recursive: true, withFileTypes: true }); } catch (e) { if (missing(e) || e.code === "ENOTDIR") return []; throw e; }
      return entries.filter((d) => d.isFile()).map((d) => path.relative(root, path.join(d.parentPath, d.name)).split(path.sep).join("/")).sort();
    },
    async remove(p) { await fsp.rm(at(p), { force: true }); },
    // Git is optional. Without it, or if Git fails, the files are still saved, so a commit never stops a publish.
    async commit(message) {
      if (!fs.existsSync(path.join(root, ".git"))) return;
      // git add stops if any path is missing, so only name the ones this project has. A project with no uploaded fonts has no fonts folder.
      const paths = COMMITTED.filter((p) => fs.existsSync(path.join(root, p)));
      try { await run("git", ["add", ...paths], { cwd: root }); await run("git", ["commit", "-m", message], { cwd: root }); } catch { /* Nothing to commit, or Git is not set up. */ }
    },
  };
}

// Secrets on this computer live in the project's .env file, which Git ignores. A secret set in the environment
// is used when .env does not have it.
export function createEnvSecrets(root, env = process.env) {
  const file = path.join(root, ".env");
  const lines = () => (fs.existsSync(file) ? fs.readFileSync(file, "utf8").split(/\r?\n/) : []);
  const named = (name) => { if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) throw new Error(`That is not a valid secret name: ${name}`); return new RegExp(`^\\s*${name}\\s*=`); };
  return {
    async get(name) {
      const re = named(name);
      return (lines().find((l) => re.test(l)) || "").replace(new RegExp(re.source + "\\s*"), "").replace(/^["']|["']$/g, "").trim() || env[name] || "";
    },
    async set(name, value) {
      const re = named(name);
      const out = lines().filter((l) => !re.test(l));
      while (out.length && out[out.length - 1] === "") out.pop();
      if (value) out.push(`${name}=${value}`);
      fs.writeFileSync(file, out.join("\n") + "\n", { mode: 0o600 });
      try { fs.chmodSync(file, 0o600); } catch { /* Some file systems do not allow this. */ }
    },
  };
}

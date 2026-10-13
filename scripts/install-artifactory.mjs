// Installs the project's packages from an Artifactory npm registry instead of GitHub Packages, for computers that
// can only reach the company's Artifactory. See docs/local-node.md.
//   DESIGN_SYSTEM_REGISTRY   the registry with the design system packages (required)
//   NPM_REGISTRY             where every other package comes from (optional; npmjs.org when it is not set)
//   DESIGN_SYSTEM_PACKAGE    the design system's name in Artifactory, if it is not @heymrcarter/design-system
//   STORYBOOK_PACKAGE        Storybook's name in Artifactory, if it is not @heymrcarter/design-system-storybook
// All of them can be in .env. Your Artifactory sign-in goes in your own ~/.npmrc, never in this project.
//
// The code always imports the @heymrcarter names. When Artifactory has the packages under other names, they are
// installed as npm aliases (like "@heymrcarter/design-system": "npm:@acme/brand-tokens@1.8.0"), so node_modules
// still has them at node_modules/@heymrcarter/...
//
// package-lock.json names GitHub Packages download addresses for these packages, and npm would fetch those whatever
// registry is set. So this runs npm ci with copies of package.json and the lock that leave those addresses out. With
// the same names, npm still checks the packages against the lock's integrity hashes. With other names it cannot,
// because a renamed package is a different file. package.json and package-lock.json are put back afterwards,
// unchanged. Extra arguments go on to npm ci:
//   npm run install:artifactory -- --ignore-scripts
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (fs.existsSync(path.join(root, ".env"))) process.loadEnvFile(path.join(root, ".env"));
const env = process.env;
const fail = (message) => { console.error(`\n  ${message}\n`); process.exit(1); };
const scopeRegistry = env.DESIGN_SYSTEM_REGISTRY, registry = env.NPM_REGISTRY;
if (!scopeRegistry) fail("Set DESIGN_SYSTEM_REGISTRY (in .env or the environment) to the Artifactory npm registry that has the\n  design system packages, like https://artifactory.example.com/artifactory/api/npm/npm-virtual/");

// The name the code uses, and the name in Artifactory.
const PACKAGES = [
  ["@heymrcarter/design-system", env.DESIGN_SYSTEM_PACKAGE],
  ["@heymrcarter/design-system-storybook", env.STORYBOOK_PACKAGE],
].map(([name, as]) => ({ name, as: (as || "").trim() || name }));
const NAME = /^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/i;
for (const p of PACKAGES) if (!NAME.test(p.as)) fail(`${p.as} is not a package name.`);
// Each scope the packages are under gets the design system registry. A name with no scope comes from NPM_REGISTRY.
const scopes = new Set(["@heymrcarter", ...PACKAGES.map((p) => p.as.match(/^(@[^/]+)\//)?.[1]).filter(Boolean)]);
const unscoped = PACKAGES.filter((p) => !p.as.startsWith("@"));
if (unscoped.length && !registry) fail(`${unscoped.map((p) => p.as).join(" and ")} has no scope, so it comes from NPM_REGISTRY. Set NPM_REGISTRY to the registry that has it.`);

const files = ["package.json", "package-lock.json"].map((f) => path.join(root, f));
const originals = files.map((f) => fs.readFileSync(f, "utf8"));
const [pkg, lock] = originals.map((t) => JSON.parse(t));
for (const p of PACKAGES) {
  const entry = lock.packages?.[`node_modules/${p.name}`];
  if (!entry) fail(`package-lock.json has no ${p.name}. Run npm install where GitHub Packages works first.`);
  delete entry.resolved;
  if (p.as !== p.name) {
    const spec = `npm:${p.as}@${entry.version}`;
    entry.name = p.as;
    delete entry.integrity;
    for (const deps of [pkg.dependencies, lock.packages[""].dependencies]) if (deps && deps[p.name]) deps[p.name] = spec;
  }
}

const args = ["ci", ...[...scopes].map((s) => `--${s}:registry=${scopeRegistry}`), ...(registry ? [`--registry=${registry}`] : []), ...process.argv.slice(2)];
for (const p of PACKAGES) if (p.as !== p.name) console.log(`  ${p.name} comes from ${p.as}`);
console.log(`\n  npm ${args.join(" ")}\n`);
let status = 1;
try {
  fs.writeFileSync(files[0], JSON.stringify(pkg, null, 2) + "\n");
  fs.writeFileSync(files[1], JSON.stringify(lock, null, 2) + "\n");
  status = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" }).status ?? 1;
} finally {
  files.forEach((f, i) => fs.writeFileSync(f, originals[i]));
}
if (status !== 0) console.error("\n  The install failed. If npm says E401 or E403, check your Artifactory sign-in in ~/.npmrc. If it says\n  E404, check the package names and that this version is in Artifactory. If it says EINTEGRITY, Artifactory's\n  copy differs from the one in package-lock.json. See docs/local-node.md.\n");
process.exit(status);

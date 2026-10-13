# The Brand Console as a Node process

This note is for running the console on one computer, like a work laptop, as a plain Node process. It needs no Cloudflare parts: no wrangler, no Cloudflare account, no Durable Object, and no Cloudflare Access sign-in. It is one more way to run the console. The Cloudflare Worker (`docs/cloudflare.md`) is still how the team uses it online, and nothing about it changes.

## In short

- **The same console.** The Node server runs the same code as the Worker: the API, proposals, Figma, the live connection, and the request checks (`server/console.mjs` and `server/http.mjs`). Only three things differ:
  - **Edits** wait in a SQLite file in `.local-data/`, one per repository and branch, not in a Durable Object. They last when you stop and start again. Delete the folder to start over with what is on main.
  - **No sign-in.** The server answers only on this computer (`127.0.0.1`), and refuses requests addressed to any other host name. Every change is credited to you: your Git name and email, or `CONSOLE_USER_EMAIL` and `CONSOLE_USER_NAME`. Never put it where other people can reach it.
  - **Static files** (the console and Storybook) come from `.worker-assets/`, which `npm run local` builds each time it starts.
- **Packages from Artifactory.** `npm run install:artifactory` installs everything, including the private design system packages, from the company's Artifactory, not GitHub Packages, even when Artifactory has them under other names.
- **No design guide, for now.** `GUIDE=off` (in `.env.example`) hides the guide and refuses `/api/ask`, until the guide goes through the company's AI gateway. It works on the Worker too, but the Worker's deploy does not set it.

## What you need

- **Node.js 22.13 or newer.** The server uses Node's own SQLite. To check, type `node -v`.
- **Artifactory access** to an npm registry that has the design system and Storybook packages at the versions in `package.json`, and to one for public npm packages (often the same "virtual" registry).
- **A GitHub token or GitHub App** for the design system repository, like the Worker's. A fine-grained personal token needs **Contents** and **Pull requests: Read and write** on that repository only.

## 1. Sign in to Artifactory, once

Artifactory's **Set Me Up** page for the npm registry gives you the lines to add. Put them in your own `~/.npmrc`, never in this project's `.npmrc`. They look like this:

```
//artifactory.example.com/artifactory/api/npm/npm-virtual/:_authToken=YOUR-TOKEN
```

## 2. Fill in the settings

Copy `.env.example` to `.env` (Git ignores it) and fill it in. At least:

```
GITHUB_REPO=heymrcarter/design-system
GITHUB_TOKEN=github_pat_...
DESIGN_SYSTEM_REGISTRY=https://artifactory.example.com/artifactory/api/npm/npm-virtual/
NPM_REGISTRY=https://artifactory.example.com/artifactory/api/npm/npm-virtual/
```

Leave `NPM_REGISTRY` empty if this computer can reach npmjs.org. A GitHub App private key can go in `.env` on several lines, in double quotes.

If Artifactory has the packages under other names, add them:

```
DESIGN_SYSTEM_PACKAGE=@acme/brand-design-system
STORYBOOK_PACKAGE=@acme/brand-design-system-storybook
```

The code keeps importing the `@heymrcarter` names. The packages are installed as npm aliases at those names, so nothing else changes. Their scope (`@acme` here) gets `DESIGN_SYSTEM_REGISTRY`. A name with no scope comes from `NPM_REGISTRY` instead.

## 3. Install the packages

```
npm run install:artifactory
```

It runs `npm ci` with the design system packages coming from `DESIGN_SYSTEM_REGISTRY`, and everything else from `NPM_REGISTRY`. `package-lock.json` names GitHub Packages download addresses for the two design system packages, so the script hands npm copies of `package.json` and the lock without them (and with the aliases, if the names differ). npm then gets the same versions from Artifactory. With the same names, it still checks them against the lock's integrity hashes; renamed packages are different files, so it cannot. The committed files are put back unchanged, so `git status` stays clean.

Do not run a plain `npm install` on this computer. The project's `.npmrc` sends `@heymrcarter` packages to GitHub Packages, which is what CI and the Cloudflare deploy use. Extra arguments go on to `npm ci`, like `npm run install:artifactory -- --ignore-scripts`.

If npm says:
- **E401 or E403**: check the Artifactory lines in `~/.npmrc`.
- **E404** for a design system package: check `DESIGN_SYSTEM_PACKAGE` and `STORYBOOK_PACKAGE`, or that version is not in Artifactory yet. Each design system release goes to GitHub Packages first; ask whoever runs the Artifactory registry how it gets there.
- **EINTEGRITY** with the same names: Artifactory's copy is not the same file as the one in `package-lock.json`, so it was rebuilt, not copied. Ask for the same published package.

The install includes `wrangler` and `workerd`, because the Cloudflare tooling stays in the project. The Node server never uses them.

## 4. Run it

```
npm run local
```

The console opens at **http://127.0.0.1:5173**, with Storybook at **/storybook/**. To stop, press **Ctrl + C**. Set `PORT` in `.env` to use another port, and `NO_OPEN=1` to keep the browser closed.

To try it with no GitHub at all, `npm run local:sample` runs against the stand-in for GitHub with the sample design system, like `npm start` does for the Worker. Its edits and proposals are gone when you stop.

## On a company network

- **A proxy.** Node's `fetch`, which the console uses to reach GitHub, Figma, and Claude, ignores `HTTPS_PROXY` unless you also set `NODE_USE_ENV_PROXY=1` (Node 22.21, 24, or newer).
- **The company's own certificates.** If the network inspects HTTPS, point Node at the company's root certificate: `NODE_EXTRA_CA_CERTS=/path/to/company-root.pem`.
- **The guide.** It is off (`GUIDE=off`). With it on, `ANTHROPIC_API_KEY` connects it to `api.anthropic.com` directly; the company's AI gateway is not supported yet.

Set these in your shell, like `export NODE_USE_ENV_PROXY=1`, not in `.env`: Node reads them when it starts, before `.env` is loaded.

## How it fits together

| File | What it does |
|---|---|
| `scripts/local.mjs` | `npm run local`: reads `.env`, builds the static files, and starts the server. With `--sample`, starts the stand-in for GitHub first. |
| `server/node-server.mjs` | The Node server: HTTP, the live connection (with the `ws` package), static files, and the localhost-only check. |
| `server/console.mjs` | The store, proposals, Figma, and API, put together from the settings. The Worker's Durable Object uses it too. |
| `server/http.mjs` | The request rules both servers share: the origin check, body limits, `/api/*`, `/fonts/`, and `/api/live`. |
| `server/storage/sql.mjs` | The edits, secrets, and proposal record in SQLite, for the Durable Object and the Node server alike. |
| `server/storage/sqlite-file.mjs` | Node's SQLite in a file, shaped like a Durable Object's. |
| `scripts/install-artifactory.mjs` | `npm run install:artifactory`. |

`npm test` includes `test/node-server.test.mjs`, which runs the Node server against the stand-in for GitHub.

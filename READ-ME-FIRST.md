# Brand Console: what is in this zip (October 5, 2026)

The `brand-console` folder is the whole project for the Northfield and Crestline design system: the Brand Console (a small local web app), the React components, Storybook, the design token files, and every published version. It is for our own teams only.

Not included: `node_modules` (run `npm install`) and `.env` (it holds private keys; copy `.env.example` to `.env` if you want the AI guide or Figma sync).

## Start it

1. Use Node 22.12 or newer.
2. In the `brand-console` folder, run `npm install`, then `npm start`. The console opens at http://127.0.0.1:5173 and Storybook at http://127.0.0.1:6006.
3. On a Mac you can also double-click `Start Brand Console.command`.

## Check it

| Command | What it checks |
|---|---|
| `npm test` | Node tests (engine, server, publishing, Figma sync, sign-in) and React component tests (Vitest, Testing Library, axe). |
| `npm run check:types` | `src/index.d.ts` against a small TypeScript sample app in `test/types/`. |
| `npm run check:tokens` | The same checks that guard Publish, without the console. Exits 1 if one blocks. Good for CI. |
| `npm run check:all` | Everything, including the browser audits. These need `npm install --no-save playwright` and `npx playwright install chromium` first. |

## What changed in this round

We worked through an outside critique (14 prompts). In short:

- **Security:** fixed a path traversal in the static file server (`server/static.mjs`). Added a guard for sharing the server beyond one computer: it will not start without a long access code, and every data request needs it (`server/auth.mjs`, plan in `docs/hosting-auth.md`).
- **Packaging:** `package.json` has an `exports` map, a `#settings` import (no alias needed in apps), and types (`src/index.d.ts`).
- **Components:** `forwardRef` on Button, TextField, Select, Dialog, and Combobox. Select is now plain React (a listbox on desktop, the native select on touch devices). Combobox follows the WAI-ARIA combobox pattern fully.
- **Tests:** new React component tests with axe, plus server, loader, token-export, and sign-in tests.
- **Versions:** publishing picks patch, minor, or major (the console suggests one).
- **Tokens:** every build and publish writes `tokens.resolved.json` (final values per brand, mode, and size). `npm run export:tokens` writes it anywhere. It is a snapshot, not aliases.
- **Engine:** `server/engine.mjs` no longer needs a hand-kept export list.
- **Docs:** Guide pages in Storybook (`src/docs/`), `docs/component-rules.md`, `docs/hosting-auth.md`, `docs/radix-migration-plan.md`.

`dist/` and `build/draft/` gain `tokens.resolved.json` the first time you run `npm start` or `npm run build`.

## Good places to start a review

1. `server/auth.mjs` and `server/index.mjs` (shared-mode sign-in).
2. `server/engine.mjs` (how Node loads the browser engine files).
3. `src/components/ui/select.jsx` and `combobox.jsx`, with their tests in `test/components/`.

## Decisions and known follow-ups

- **Radix:** we are keeping the current mix. New components are plain React. Existing Radix components (25 files) move only when someone is already changing them. The plan is in `docs/radix-migration-plan.md`.
- **Hosting:** `docs/hosting-auth.md` ends with five open decisions about single sign-on and roles.
- **Known gaps:** the Combobox list can be cut off inside a dialog (it does not use a portal yet); TimePicker still uses Radix Select; clicking the Select's label opens its list.
- This folder has no Git history. `README.md` explains how to turn it on.

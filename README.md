# Brand Console — Phase 1

This is a working version of the design system console for Northfield and Crestline.
It runs on your own computer. Nothing is sent anywhere except questions to Claude,
and only if you add a Claude API key.

It has three parts that work together:

1. **The Brand Console** at http://127.0.0.1:5173. This is where the brand team changes colors, fonts, and component settings, checks them, and publishes new versions.
2. **Storybook** at http://127.0.0.1:6006. This shows the real React components that engineers use. It updates a moment after you change something in the console. The **Guide** pages at the top (Start here, Foundations, and Contributing) explain the basics in plain words for every team. To make a copy you can put on a shared drive or web server, run `npm run docs:build`. It writes Storybook, with the Guide pages, to `storybook-static/`.
3. **The design token files** in the `tokens` folder. These are the source of truth. They use the W3C design token format.

---

## What you need

- **Node.js, version 22.12 or newer.** Get it free at https://nodejs.org (pick the "LTS" version, 22 or 24).
  To check, open a terminal and type `node -v`. You should see a number like `v22.12.0` or `v24.11.0`. The console and Storybook still start on version 20.19, but the tests need 22.12 or newer, and version 20 stopped getting security fixes in April 2026.
- A web browser. Chrome, Edge, or Safari work best, because they can turn your voice into text.

## Start it the easy way (Mac)

1. Unzip the folder somewhere easy to find, like your Documents folder.
2. Double-click **Start Brand Console.command**.
   The first time, your Mac may say it cannot check the file. If it does, right-click the file, pick **Open**, and then click **Open** again.
3. The first time, it sets things up for a minute or two. Then the console opens in your browser.
   When the project gets new parts, like a new tool for Storybook, it sets those up on its own the next time you start it.

Keep the Terminal window open while you work. The links only work while it is running.

## Start it from a terminal

1. Unzip the folder somewhere easy to find, like your Documents folder.
2. Open a terminal in that folder.
   - **Mac:** Open Terminal, type `cd ` (with a space), drag the folder into the window, and press Return.
   - **Windows:** Open the folder, click the address bar, type `cmd`, and press Enter.
3. Type this and press Enter. It downloads what the project needs. It takes a minute or two, and you only do it once.
   ```
   npm install
   ```
4. Type this and press Enter:
   ```
   npm start
   ```
5. The console opens in your browser. The window also prints the links. If another program on your computer already uses the usual port, the console picks a free one and shows its link.
   Storybook runs at **http://127.0.0.1:6006**. It takes about 20 seconds to start the first time.

To stop everything, go back to the terminal and press **Ctrl + C**.

## Connect the design guide to Claude (optional)

Without a key, the guide gives sample answers. Everything else works the same.

1. Make a copy of the file `.env.example` and name the copy `.env`.
   (On a Mac, files that start with a dot are hidden. Press Command + Shift + period in Finder to show them.)
2. Open `.env` in a text editor. After `ANTHROPIC_API_KEY=`, paste your key from https://console.anthropic.com.
3. Stop the console with Ctrl + C, then run `npm start` again.

Keep `.env` private. It is never saved into the project history.

## Connect Figma (optional)

The console and your Figma library can send changes to each other. Either side can change anything. When both sides change the same thing, the console shows it, and you pick which one to keep. Nothing changes until you review the differences.

1. In Figma, open your library file. Pick **Share**, then **Copy link**.
2. In Figma, make an access token. Open the menu at the top left, then **Settings**, then the **Security** tab. Under **Personal access tokens**, pick **Generate new token**. Give it access to **File content: read** and **Variables: read and write**.
3. In the console, open **Sync with Figma** at the bottom of the left column. Paste the link and the token, then click **Connect to Figma**. The token is saved in `.env` on this computer only.
4. Click **Check for changes**. The first time, the console reads your file first. Where Figma already has a value, the console starts with Figma's value. Then it adds everything Figma does not have yet.
5. Look over the differences, then click **Sync now**.

**Your Figma plan matters.** Figma lets other tools read and change variables only on its Enterprise plan, with a full seat. On other plans, the link still works for **Open in Figma**, and you can sync with files instead. On the same page, download the files for Figma and import them in Figma's Variables panel. To bring changes back, export the variables in Figma and pick the files in the console.

**What syncs.** Brand colors, theme colors for each brand in light and dark mode, the color sets, fonts, type sizes, corners, shadows, spacing, shared colors, and every component setting. Theme colors that the console makes from other colors always come from the console. Spacing comes in from Figma only when the admin team syncs. Component guidance stays in the console. Your own variables in other collections are left alone.

---

## Things to try

The sample draft already has changes that are not live yet. It passes every check.

1. **See the safety checks work.** Open **Color**, pick Northfield, and set **Words on the main color** to **White**. White words on this green are too hard to read, so the console blocks Publish. The guide explains why and offers a fix. Click **Add to my draft** on its suggestion. The change saves right away.
2. **See it in the real component.** Open **Components → Actions → Button**. In the preview, set **Preview** to **Real component**. This is the actual React button from Storybook.
3. **Change something and watch it update.** Change the button **Corners** to **Round ends**. After a moment, the real button in the preview changes too.
4. **Publish.** Click **Review and publish**. Pick the kind of update (the console suggests one), read the note the guide wrote, and click **Publish**. Then open the `dist` folder and look at `theme.css`. Its first line now shows the new version number.
5. **Roll back.** Open **Versions** and roll back to 1.3.0. This makes a new version, so nothing is lost. Your unpublished changes stay in your draft.
6. **Look at the icons.** Open **Icons** under Foundations. Point at any icon to see its name. Click one to see its sizes and the code engineers use. Change **Line thickness** to make every icon bolder.
7. **Give the page a gradient or a picture.** Open **Color** and find **Page style**. Pick **Gradient** or **Picture**. For a picture, the guide makes one from your brand colors first. You can keep it or upload your own. Then slide **Window and card see-through** to let the page show behind cards. The checks test the words on every part of the page.
8. **Pick fonts.** Open **Type**. Pick a heading font, a body font, and a font for labels and navigation. Buttons use the label font. Try the **Elegant** set: Cormorant Garamond Italic headings, Atkinson Hyperlegible body text, and Avenir Next labels. Avenir Next and Avenir Next Mono need a license. Until your company adds the font files, the console shows a free look-alike. The checks warn you if a font is hard to read where you put it.
9. **Pick a gray.** On the **Color** page, under **Shared colors**, set **Gray color** to **Match the brand**. Borders, help text, and quiet backgrounds pick up a hint of each brand's main color.
10. **Compare before and after.** The preview always shows your change side by side with how it looked before. Drag the line to compare. Use **Compare with** to switch between your last change and the live version.
11. **Try dark mode.** Set **Mode** to **Dark** in the preview. Buttons keep the same color and the same words in both modes. Only the page around them changes.
12. **Talk to the guide.** Tap the microphone and say what you want to change. Your browser may ask to use the microphone the first time.
13. **Add a color to the color set.** On the **Color** page, scroll to the color set and click **Add a color**. Pick one from the color library, or type the hex code from your brand guide. Click a color's name to rename it, or click the X to remove it.
14. **Add a font.** On the **Type** page, scroll to **Font library** and click **Add a font**. Type a name from Google Fonts, or upload your company's font files. For Avenir Next, pick **Add font files** to replace the free look-alike with the real font.
15. **Look at Storybook.** Use the toolbar at the top to switch brand, screen type, text size, and light or dark mode. Each component's **Docs** page shows the guidance that AI tools read.

## Start over with the sample data

This erases every change and version and puts the sample data back.
```
npm run reset-sample-data
```

## Make sure everything works

```
npm test
```
This checks that token files save and load without losing anything, that the safety checks block colors that are too hard to read, and that publishing, rolling back, and flagging all work. It also tries 120 random brand colors and makes sure every word color the console makes is easy to read in light and dark mode. The Figma tests run the whole sync against a stand-in for Figma's API: the first sync, changes on either side, changes on both sides, values that do not fit, the files route, and uploaded fonts.

### Testing (for contributors)

`npm test` runs two kinds of tests, one after the other:
- `npm run test:node`: the engine, contrast, Figma sync, publishing, and server tests (Node's own test runner, `test/*.test.mjs`).
- `npm run test:components`: the React component tests (Vitest, React Testing Library, and jsdom, `test/components/*.test.jsx`). Each test checks roles, names, and states, and runs axe on what it rendered. jsdom cannot measure colors, so color contrast is checked by `npm run audit:storybook` instead.

`npm run check:types` checks `src/index.d.ts` with TypeScript, using the sample app in `test/types/`. `npm run check:all` runs it too.

To add a component test, copy `test/components/smoke.test.jsx`. Find things the way people do, by role and name, like `getByRole("button", { name: "Save my changes" })`. Do not compare whole HTML snapshots. The tests need Node 22.12 or newer.

### Check every screen for readable text

```
npm install --no-save playwright
npx playwright install chromium
npm run audit
```
This opens every page of the console for both brands, both modes, and both screen types. It measures every piece of text against the color behind it. Words need 4.5 to 1, and large words need 3 to 1.

### More checks

| Command | What it checks |
|---|---|
| `npm run check:colors` | Every color is the same everywhere it shows up: the token files, `theme.css`, the console preview, the hex labels next to each swatch, and, if Storybook is running, the real React components. Set `STORYBOOK=http://127.0.0.1:6006` to include Storybook. |
| `npm run stress` | Makes 16 random brand setups, lets the console fix what its checks catch, then looks at every page. Any text that is still hard to read is a bug, because the checks should have caught it. |
| `npm run audit:storybook` | Builds Storybook, then checks every story in both brands and both modes for readable text and with axe for accessibility problems. |
| `npm run check:tokens` | Runs the publish checks on the draft in `tokens/`, with no console open. Ends with code 1 if a check blocks publishing. Good for CI. |
| `npm run check:types` | Checks the TypeScript types in `src/index.d.ts` against a small sample app in `test/types/`. |
| `npm run sweep` | Clicks every button and switch on every page and watches for errors. It also looks for parts of the preview that spill out of their frame on a computer or a phone, and for pages that scroll sideways on a phone. |
| `npm run check:all` | Runs all of the checks above, one after another. |

## Keep a history in Git (optional)

If you want every publish saved in Git, run these once in the project folder:
```
git init
git add -A
git commit -m "Start"
```
After that, every time you publish, the console makes a Git commit for you.

---

## Where things live

| Folder or file | What it holds |
|---|---|
| `tokens/` | **The draft.** The design token files the console edits. Changes save here as you work. |
| `releases/` | One folder for every published version, plus `index.json`, the list of versions. |
| `dist/` | **The live version** for apps: `theme.css`, `settings.json`, `tokens.resolved.json`, and `components.manifest.json`. |
| `build/draft/` | The same files for the draft. Storybook uses these so you see changes before you publish. |
| `CHANGELOG.md` | A plain list of every version and its note. |
| `fonts/` | Font files your company uploaded. They are copied next to `theme.css` in `dist/` and in each release. |
| `figma.json` | The link to your Figma library. |
| `.figma-sync.json` | What the console and Figma agreed on at the last sync, so the next sync can tell who changed what. |
| `console/` | The Brand Console itself. `engine.js` holds the color math and checks. `registry.js` lists all 67 components. `figma.js` turns the design system into Figma variables and back. `basics.js` holds the small pieces those files share. `app.js` is the screen. |
| `server/` | The small local server that saves, publishes, rolls back, and talks to Figma. It reads and writes files only through `server/storage/`: on this computer that is the project folder and `.env`, and in tests it is memory. |
| `src/components/ui/` | All 68 React components. |
| `src/stories/` | The Storybook pages for those components. |
| `src/docs/` | The Guide pages in Storybook: Start here, Foundations, and Contributing. |
| `docs/` | Notes for contributors: the component rules, the hosting and sign-in plan, and the plan to move off Radix. |
| `test/` | The automatic tests. |

## What is in Phase 1, and what is not

**In Phase 1:**
- Editing, checks, publishing, versions, rollback, and flags, all saved to real files.
- W3C design token files as the source of truth.
- `theme.css` for Tailwind v4 and shadcn, rebuilt automatically.
- 16 real React components in Storybook: Button, Text field, Text area, Select, Checkbox, Radio buttons, Switch, Date input, Error summary, Alert, Badge, Card, Dialog, Tabs, Accordion, and Icon.

**Phase 2, part 1 (done):**
- The other 51 components as real React code, each with a Storybook page, including the healthcare components: member ID card, provider card, medication item, lab result, appointment slots, plan comparison, cost estimate, and consent.
- Every component page in the console can show the real React component. Set **Preview** to **Real component**.
- Accessibility checks for every story. In Storybook, open any story and pick the **Accessibility** tab at the bottom. It runs axe, a standard accessibility checker, on that story. To check every story at once, in both brands and both modes, for readable text and with axe, run `npm run audit:storybook`. Neither check runs on its own yet. Someone has to run them.
- `docs/component-rules.md` lists the rules every component follows. Give it to any person or AI tool that adds a component.
- The design guide, connected to Claude when you add a key, with a real microphone.
- An approved icon set of 226 Lucide icons, with a React `Icon` component and a Storybook page. The icon list is in `components.manifest.json`, so AI tools pick from it too. To change the list, edit `scripts/build-icons.mjs` and run `npm run icons`.
- Page backgrounds can be a flat color, a gradient, or a picture. Windows and cards can be see-through, with a blur. Pictures are saved inside the token files for now. In Phase 3 they move to your company's image hosting.

**Phase 2, part 2 (done):**
- The brand team and the admin team can edit the color set: add colors from a large color library or by hex code, rename them, and remove them.
- A font library: add fonts from Google Fonts, upload your company's own font files, and hide fonts you do not use.
- **Open in Figma** at the top of the left column, and a two-way sync with your Figma library. It uses Figma's REST API, or files when your plan does not allow the API.

**Coming next in Phase 2:**
- The Storybook AI server, so tools like Claude Code can read the components directly.

**Phase 3, with your engineering team:**
- Sign-in and roles, a shared database, and hosting.
- Publishing the package to your company's package registry.
- Connecting to your real shadcn components.

The "Viewing as" menu at the top only changes what you can edit on screen. It is not real security yet. The console stays on your own computer unless you set it up to be shared. If you do, it will not start without a long access code, and everyone must type that code. That is a stopgap. Read `docs/hosting-auth.md` for how it works, what it does not protect, and the plan for real sign-in with the company's single sign-on.

---

## For engineers

### Use the components in an app

This package is for our own apps only. It stays private and is never published to the public npm registry.

1. Add it to your app. In a monorepo, use a workspace. Otherwise, point at this folder: `npm install file:../dsc`.
2. Your app needs React 19, Vite (or another bundler that reads JSX), and Tailwind v4.
3. Import the theme once: `import "brand-console/theme.css";` (it is `dist/theme.css`, made each time the brand team publishes, or by `npm run build`).
4. Import components: `import { Button, Combobox } from "brand-console";` (this is `src/index.js`).
5. Put `data-brand`, `data-screen`, `data-size`, and `data-mode` on `<html>`, like `<html data-brand="northfield" data-screen="consumer" data-size="large" data-mode="light">`.
6. Component settings come from `dist/settings.json` on their own, through the package import `#settings`. You do not need an alias.
7. TypeScript apps get types from `src/index.d.ts`. Button, TextField, Select, Dialog, and Combobox have full prop types. The other components list their prop names. To check the types, run `npm run check:types`. It type-checks a small sample app in `test/types/`.
8. Refs work with form tools like React Hook Form. A ref on Button points to the `<button>`, on TextField and Combobox to the `<input>`, on Select to the control people focus, and on Dialog to the pop-up box.

### How it works

- **Theme:** Import Tailwind, then `dist/theme.css`. Put `data-brand`, `data-screen`, `data-size`, and `data-mode` on `<html>`. Colors map to shadcn's names (`--primary`, `--primary-foreground`, `--border`, `--ring`, and so on) through `@theme inline`.
- **Fonts:** `settings.json` has `fonts.href`, a Google Fonts link that loads only the fonts the brand picked. Add it to your page's `<head>`, or host the font files yourself. Avenir Next and Avenir Next Mono are licensed fonts. `fonts.needLicense` lists them. Add their `@font-face` rules with your licensed files. Until then, the font stacks fall back to Nunito Sans and DM Mono. Labels, tabs, badges, and buttons use `--font-ui`. Headings use `--font-heading` and `--heading-style`.
- **Components:** `src/index.js` exports all 68 components. They use Radix primitives, Tailwind v4, and the CSS variables in `theme.css`. Component choices that change structure, like radio "tiles" or tab style, come from `settings.json` through the package import `#settings`. Apps get the live `dist/settings.json`. Storybook points `#settings` at the draft in `build/draft/` (see `.storybook/main.js`).
- **One engine:** The console, the server, the build, and CI all use `console/engine.js`, `basics.js`, `icons.js`, `registry.js`, and `figma.js`, so checks and outputs match everywhere. They are ES modules: Node imports them in `server/engine.mjs`, and a Cloudflare Worker can import them the same way. They never touch the web page while they load. `app.js` is still a plain script that uses the engine's names directly, so `console/engine-globals.js` puts them on the page first. The prototype build bundles them into one script. Once `app.js` imports what it needs, `engine-globals.js` can go.
- **One storage:** `server/store.mjs` and `server/figma.mjs` never touch the disk. They save and read through a small storage interface (`server/storage/storage.mjs`): read, write, list, remove, and commit. `disk.mjs` keeps files in the project folder and makes each publish a Git commit. `memory.mjs` keeps them in memory, for tests. Secrets, like the Figma token, use a separate get and set interface. A Cloudflare Worker can use the same store with its own storage. Store calls are async, and they run one at a time, so a save never lands in the middle of a publish.
- **Checks in CI:** `npm run check:tokens` runs the same checks that guard Publish, with no console open. It ends with code 1 when a check blocks publishing, so a CI job can stop a token change that would make words hard to read. Use `-- --dir path/to/tokens` to check another tokens folder, `-- --live` for the live version, and `-- --json` for every result as JSON.
- **Token files:** Brand colors, foundations, and component settings live in `tokens/`. Component settings and AI guidance are stored under `$extensions["org.brand-console"]`, because the W3C format has no type for choices like "tiles" or "sentence case".
- **Final values for other tools:** `tokens.resolved.json` sits next to `theme.css` in `dist/` (the live version), `build/draft/` (the draft), and each `releases/v<version>/` folder. It has every color per brand and per light or dark mode, every size per screen type and text size, and every CSS variable from `theme.css`, all as final values. Apps can import it as `brand-console/tokens.resolved.json`. The build and every publish write it on their own. To write it somewhere else, run `npm run export:tokens -- --live --out ../my-app/tokens.json` (leave out `--live` for the draft). It is a snapshot. It has no aliases like `{color.brand.primary}`, so tools that need the links between tokens should read `tokens/*.tokens.json` instead. A full alias export, like Style Dictionary makes, may come later.
- **API** (this computer only, unless it is set up to be shared; see `docs/hosting-auth.md`): `GET /api/state`, `PUT /api/draft`, `POST /api/publish`, `POST /api/rollback`, `POST /api/flag`, `POST /api/ask`, `POST /api/fonts`, and the Figma routes under `/api/figma/`. A shared server also has `POST /api/login` and `POST /api/logout`, and scripts send `Authorization: Bearer <code>`.
- **Checks run twice.** The console blocks Publish, and the server checks again before it writes a release.
- **Version numbers:** Each publish picks one of three kinds of update, so engineers know how careful to be.
  - **Patch** (1.4.0 to 1.4.1): only values change, like a color or a size. Every CSS variable and component name stays the same.
  - **Minor** (1.4.0 to 1.5.0): something new is added, like a new color in a color set or a new component. Nothing is taken away.
  - **Major** (1.4.0 to 2.0.0): a CSS variable or a component name is removed or renamed, or a component works differently. Apps may need changes.
  The console compares the CSS variables in the live version and the draft, and suggests one. The brand team can pick another. A rollback is always minor. The API takes it as `POST /api/publish` with `{ "bump": "patch" | "minor" | "major" }`, and minor is the default.
- **Versions:** `npm start` uses the newest versions of Storybook 10, Vite 8, Tailwind 4, React 19, and Radix. `package-lock.json` pins the exact versions that were tested.

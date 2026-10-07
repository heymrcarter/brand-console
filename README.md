# Brand Console

The Brand Console is where the brand team changes the design system: colors, fonts, and component settings. It checks every change and publishes new versions. The team uses it online, on Cloudflare, behind the company's sign-in (see `docs/cloudflare.md`). This README is mostly for working on the console itself.

The design system is its own repository, [heymrcarter/design-system](https://github.com/heymrcarter/design-system): the design tokens, the engine that turns them into what apps use, the React components, and Storybook. The console installs it as the `@heymrcarter/design-system` package and runs the same engine, so the console's checks and outputs are always the same as the design system's. It serves the matching Storybook, from `@heymrcarter/design-system-storybook`, at `/storybook/`. **Changes to the console never release a design system version.**

---

## What you need

- **Node.js, version 22.12 or newer.** Get it free at https://nodejs.org (pick the "LTS" version, 22 or 24). To check, open a terminal and type `node -v`.
- **A GitHub token that can read packages**, because the design system packages are private. If you use the GitHub CLI, run `gh auth refresh -s read:packages`, then put this line in your user `~/.npmrc` (not in the project): `//npm.pkg.github.com/:_authToken=` followed by the output of `gh auth token`.
- A web browser. Chrome, Edge, or Safari work best, because they can turn your voice into text.

## Run it on your computer

1. Open a terminal in the project folder.
2. Type this and press Enter. It downloads what the project needs, including the design system packages. You only do it once.
   ```
   npm install
   ```
3. Type this and press Enter:
   ```
   npm start
   ```
4. The console opens in your browser at **http://127.0.0.1:5173**, with Storybook at **/storybook/**. If another program already uses the port, the console picks a free one and prints its link.

This runs the real Worker, the same code as on Cloudflare, in `wrangler dev`. It runs against a stand-in for GitHub that holds the sample design system in `fixtures/sample/`, so you need no GitHub repository, no Cloudflare account, and no internet. You can save, publish, and roll back as much as you like. It all disappears when you stop, and the next `npm start` begins again from the sample.

To stop, go back to the terminal and press **Ctrl + C**.

To run against a real GitHub repository instead, copy `.dev.vars.example` to `.dev.vars`, fill it in, and run `npm run worker:dev`.

## Connect the design guide to Claude (optional)

Without a key, the guide gives sample answers. Everything else works the same.

- **Online:** add the `ANTHROPIC_API_KEY` secret to the repository (see `docs/cloudflare.md`). The next deploy sends it to Cloudflare.
- **On your computer:** start with the key in the environment: `ANTHROPIC_API_KEY=your-key npm start`. Get a key at https://console.anthropic.com. Never save it in a file in this project.

## Connect Figma (optional)

The console and your Figma library can send changes to each other. Either side can change anything. When both sides change the same thing, the console shows it, and you pick which one to keep. Nothing changes until you review the differences.

1. In Figma, open your library file. Pick **Share**, then **Copy link**.
2. In Figma, make an access token. Open the menu at the top left, then **Settings**, then the **Security** tab. Under **Personal access tokens**, pick **Generate new token**. Give it access to **File content: read** and **Variables: read and write**.
3. In the console, open **Sync with Figma** at the bottom of the left column. Paste the link and the token, then click **Connect to Figma**. The console keeps the token on its server and never sends it to anyone's browser.
4. Click **Check for changes**. The first time, the console reads your file first. Where Figma already has a value, the console starts with Figma's value. Then it adds everything Figma does not have yet.
5. Look over the differences, then click **Sync now**.

**Your Figma plan matters.** Figma lets other tools read and change variables only on its Enterprise plan, with a full seat. On other plans, the link still works for **Open in Figma**, and you can sync with files instead. On the same page, download the files for Figma and import them in Figma's Variables panel. To bring changes back, export the variables in Figma and pick the files in the console.

**What syncs.** Brand colors, theme colors for each brand in light and dark mode, the color sets, fonts, type sizes, corners, shadows, spacing, shared colors, and every component setting. Theme colors that the console makes from other colors always come from the console. Spacing comes in from Figma only when the admin team syncs. Component guidance stays in the console. Your own variables in other collections are left alone.

---

## Things to try

The sample draft already has changes that are not live yet. It passes every check.

1. **See the safety checks work.** Open **Color**, pick Northfield, and set **Words on the main color** to **White**. White words on this green are too hard to read, so the console blocks Publish. The guide explains why and offers a fix. Click **Add to my draft** on its suggestion. The change saves right away.
2. **See it in the real component.** Open **Components → Actions → Button**. In the preview, set **Preview** to **Real component**. This is the actual React button from Storybook.
3. **Change something.** Change the button **Corners** to **Round ends**. The console's own preview changes right away. The real component shows the design system version the console uses, so it does not change until a new version is released.
4. **Publish.** Click **Review and publish**. Pick the kind of update (the console suggests one), read the note the guide wrote, and click **Publish**. Then open http://127.0.0.1:5173/dist/theme.css. Its first line now shows the new version number.
5. **Roll back.** Open **Versions** and roll back to 1.3.0. This makes a new version, so nothing is lost. Your unpublished changes stay in your draft.
6. **Look at the icons.** Open **Icons** under Foundations. Point at any icon to see its name. Click one to see its sizes and the code engineers use. Change **Line thickness** to make every icon bolder.
7. **Give the page a gradient or a picture.** Open **Color** and find **Page style**. Pick **Gradient** or **Picture**. For a picture, the guide makes one from your brand colors first. You can keep it or upload your own. Then slide **Window and card see-through** to let the page show behind cards. The checks test the words on every part of the page.
8. **Pick fonts.** Open **Type**. Pick a heading font, a body font, and a font for labels and navigation. Buttons use the label font. Try the **Elegant** set: Cormorant Garamond Italic headings, Atkinson Hyperlegible body text, and Avenir Next labels. Avenir Next and Avenir Next Mono need a license. Until your company adds the font files, the console shows a free look-alike. The checks warn you if a font is hard to read where you put it.
9. **Pick a gray.** On the **Color** page, under **Shared colors**, set **Gray color** to **Match the brand**. Borders, help text, and quiet backgrounds pick up a hint of each brand's main color.
10. **Compare before and after.** The preview always shows your change side by side with how it looked before. Drag the line to compare. Use **Compare with** to switch between your last change and the live version.
11. **Add a brand.** Open **Brands** under Foundations and click **Add a brand**. Give it a name and its three colors. The console shows the id apps will use, like `data-brand="harbor"`. The id never changes, so you can rename the brand later without breaking apps. Move a brand to the top to make it the default. On **Review and publish**, adding a brand suggests new things (a minor version), and removing one suggests a big change (a major version).
11. **Try dark mode.** Set **Mode** to **Dark** in the preview. Buttons keep the same color and the same words in both modes. Only the page around them changes.
12. **Talk to the guide.** Tap the microphone and say what you want to change. Your browser may ask to use the microphone the first time.
13. **Add a color to the color set.** On the **Color** page, scroll to the color set and click **Add a color**. Pick one from the color library, or type the hex code from your brand guide. Click a color's name to rename it, or click the X to remove it.
14. **Add a font.** On the **Type** page, scroll to **Font library** and click **Add a font**. Type a name from Google Fonts, or upload your company's font files. For Avenir Next, pick **Add font files** to replace the free look-alike with the real font.
15. **Look at Storybook.** Open **Open Storybook** at the top, or `/storybook/`. Use the toolbar at the top to switch brand, screen type, text size, and light or dark mode. Each component's **Docs** page shows the guidance that AI tools read.

## Start over with the sample data

The sample design system in `fixtures/sample/` has three past versions and a draft with changes that are not live yet. This writes it again from scratch:
```
npm run reset-sample-data
```

## Make sure everything works

```
npm test
```
This checks that publishing, rolling back, and flagging all work, the storage the console saves through (on GitHub, in a Durable Object, on disk, and in memory), the API, the Figma sync against a stand-in for Figma's API, Cloudflare Access sign-in, GitHub App tokens, and the deploy settings.

| Command | What it checks |
|---|---|
| `npm run test:worker` | The real Worker in `wrangler dev` against a stand-in for GitHub: the console page, Storybook, saving, a 2.5 MB font, publishing, rolling back, a restart, and sign-in. |
| `npm run audit` | Every page of the console, for both sample brands, both modes, and both screen types. It measures every piece of text against the color behind it. Words need 4.5 to 1, and large words need 3 to 1. |
| `npm run check:colors` | Every color is the same everywhere it shows up: the token files, `theme.css`, the console preview, and the hex labels next to each swatch. Set `STORYBOOK` to a Storybook address to include the real React components. |
| `npm run stress` | Makes 16 random brand setups, lets the console fix what its checks catch, then looks at every page. Any text that is still hard to read is a bug, because the checks should have caught it. |
| `npm run sweep` | Clicks every button and switch on every page and watches for errors. It also looks for parts of the preview that spill out of their frame on a computer or a phone, and for pages that scroll sideways on a phone. |
| `npm run check:all` | All of the above, one after another. |

The browser checks need Playwright: `npm install --no-save playwright`, then `npx playwright install chromium`, or set `CHROME` to a Chromium browser you have. The design system's own checks (the engine, the React components, the types, and every Storybook story) run in its repository.

## Put it online for your team

The console runs on Cloudflare Workers, with the design system in a GitHub repository and the company's sign-in in front. Every publish becomes a commit, and GitHub Actions deploys each change to the console. The steps are in `docs/cloudflare.md`.

## Where things live

| Folder or file | What it holds |
|---|---|
| `console/` | The console screen. `app.js` is the screen, `index.html` its styles, and `engine-globals.js` puts the design system's engine on the page. |
| `server/` | What the Worker runs to save, publish, roll back, and talk to Figma: the API, the store, and the Figma sync. They read and write files only through `server/storage/`: GitHub with a Durable Object online, and the project folder or memory for scripts and tests. `server/engine.mjs` loads the engine from the package. |
| `worker/` | The console on Cloudflare Workers: the Worker, the Durable Object that holds unpublished changes, and the Cloudflare Access sign-in check. `wrangler.jsonc` is its settings. |
| `fixtures/sample/` | The sample design system the tests and `npm start` use: `tokens/`, three versions in `releases/`, the live files in `dist/`, the draft's in `build/draft/`, and `CHANGELOG.md`. |
| `scripts/` | Running the console on your computer, the Worker test, the deploy, the prototype build, and the browser checks. |
| `test/` | The automatic tests. |
| `docs/cloudflare.md` | Putting the console online, and deploying it. |

## How it works

- **One engine:** The console runs the design system's engine, `@heymrcarter/design-system/engine`, at the version in `package.json`. The server code and the Worker import it through `server/engine.mjs`. A browser cannot import a package by name, so the asset build and the prototype build bundle `console/engine-globals.js` into one script that puts the engine's names on the page. `app.js` is still a plain script that uses those names directly. Once it imports what it needs, `engine-globals.js` can go.
- **One storage:** `server/store.mjs` and `server/figma.mjs` never touch the disk. They save and read through a small storage interface (`server/storage/storage.mjs`): read, write, list, remove, and commit. `github.mjs` reads the design system from a GitHub branch and holds changes in a pending storage (a Durable Object, `worker/durable-storage.mjs`) until a publish sends them all as one commit. It only uses `fetch`, so it runs in a Cloudflare Worker, and it keeps GitHub requests low: about 13 to load the console from scratch, none for a draft save, and 4 for a publish, plus one for each new font file. `disk.mjs` and `memory.mjs` are for scripts and tests. Secrets, like the Figma token, use a separate get and set interface. Store calls are async, and they run one at a time, so a save never lands in the middle of a publish.
- **API** (served by the Worker, behind Cloudflare Access): `GET /api/state`, `PUT /api/draft`, `POST /api/publish`, `POST /api/rollback`, `POST /api/flag`, `POST /api/ask`, `POST /api/fonts`, and the Figma routes under `/api/figma/`. Changes must come from the console's own address.
- **Checks run twice.** The console blocks Publish, and the server checks again before it writes a release.
- **Version numbers:** Each publish picks one of three kinds of update, so engineers know how careful to be.
  - **Patch** (1.4.0 to 1.4.1): only values change, like a color or a size. Every CSS variable and component name stays the same.
  - **Minor** (1.4.0 to 1.5.0): something new is added, like a new color in a color set or a new component. Nothing is taken away.
  - **Major** (1.4.0 to 2.0.0): a CSS variable or a component name is removed or renamed, or a component works differently. Apps may need changes.
  The console compares the CSS variables in the live version and the draft, and suggests one. The brand team can pick another. A rollback is always minor. The API takes it as `POST /api/publish` with `{ "bump": "patch" | "minor" | "major" }`, and minor is the default.
- **Sign-in:** Cloudflare Access signs people in, and the Worker checks its token on every request (`worker/access.mjs`). Everyone is an admin for now. Roles (Viewer, Editor, and Admin) are planned, with Microsoft Entra ID groups deciding who has which.

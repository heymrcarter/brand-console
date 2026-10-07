# The Brand Console on Cloudflare

This note is for the engineers who put the console online for the brand team. It runs on Cloudflare Workers, keeps the design system in a GitHub repository, and lets people in through the company's sign-in with Cloudflare Access.

## In short

- **Where things live.** The design system is its own GitHub repository. The console reads it from main: that is the live version, with the number in its `package.json`. The console never writes to main.
- **Edits** wait in a Durable Object (a small database Cloudflare keeps for the Worker), on top of main. They are not lost if the Worker restarts. Saving never commits to GitHub.
- **Proposals.** Adding edits to a proposal makes one commit on a proposal branch, and the first one opens a pull request. When a reviewer merges it, the design system's own Release workflow releases the new version. The console sees that it landed the next time it loads.
- **Sign-in.** Cloudflare Access signs people in with the company's identity provider. The Worker checks Access's signed token on every request, including the console page. Until Access is set up, the Worker refuses everything.
- **Who did what.** Each change in a proposal is a commit credited to the person who signed in, like `maya@company.com`. The top of the console shows who you are signed in as. Everyone is an admin for now; roles from Microsoft Entra ID groups come later.

## What you need

- A Cloudflare account. The free plan works (see "Free or paid" below).
- The design system repository, like `heymrcarter/design-system`, with its Release workflow.
- Node.js 22.12 or newer, and this project with `npm install` done.

## 1. Make a GitHub App

A GitHub App can only reach the repositories it is installed on, and its tokens expire after an hour, so it is safer than a personal token.

1. On GitHub, go to **Settings > Developer settings > GitHub Apps > New GitHub App**. For a company account, make it under the organization's settings instead.
2. Name it, like "Brand Console". The homepage URL can be the repository's address.
3. Turn **Webhook** off.
4. Under **Repository permissions**, set **Contents** and **Pull requests** to **Read and write**. Leave everything else as it is. (Metadata: Read-only is added for you.) Contents lets it push proposal branches; Pull requests lets it open, update, submit, and close them.
5. Pick **Only on this account**, then **Create GitHub App**.
6. Note the **App ID** at the top of the page.
7. Under **Private keys**, click **Generate a private key**. Your browser downloads a `.pem` file. Keep it somewhere safe. You need it in step 3.
8. Click **Install App**, and install it on the design system repository only. The page you land on ends in `/installations/12345678`. That number is the **installation ID**.

## 2. Add the settings to the repository

GitHub Actions deploys the Worker from this repository, `brand-console` (`.github/workflows/deploy-worker.yml`), with settings stored here, not in `wrangler.jsonc`. In **this** repository, go to **Settings > Secrets and variables > Actions**. (The design system the console reads and proposes changes to is a different repository: `REPO` below.)

On the **Variables** tab, add these. GitHub does not allow names that start with `GITHUB_`, so they are shorter than the Worker's own names:

| Variable | What to put | The Worker sees it as |
|---|---|---|
| `REPO` | The design system repository, like `acme/design-system`. Proposals are pull requests to it. | `GITHUB_REPO` |
| `BRANCH` | Its main branch, which proposals go into. Usually `main`. | `GITHUB_BRANCH` |
| `REVIEWERS` | Optional: GitHub logins to ask for a review when a proposal is submitted, separated by commas, like `sam,lee`. They need access to the design system repository. People can also be asked on the pull request. | `REVIEWERS` |
| `STORYBOOK_PREVIEW_URL` | Optional: where each pull request's Storybook is, with `{number}` for the pull request, like `https://pr-{number}-design-system-storybook.acme.workers.dev`. The console links to it. | `STORYBOOK_PREVIEW_URL` |
| `GH_APP_ID` | The App ID from step 1 | `GITHUB_APP_ID` |
| `GH_APP_INSTALLATION_ID` | The installation ID from step 1 | `GITHUB_APP_INSTALLATION_ID` |
| `TEAM_DOMAIN` | Leave it out for now. Step 5 adds it. | `TEAM_DOMAIN` |
| `POLICY_AUD` | Leave it out for now. Step 5 adds it. | `POLICY_AUD` |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID, from the dashboard's **Account home** | |

**Let this repository install the design system packages.** They are private. On GitHub, open each package, `@heymrcarter/design-system` and `@heymrcarter/design-system-storybook` (your profile > **Packages**), then **Package settings > Manage Actions access > Add repository**, and add `brand-console` with **Read**. The workflow then installs them with its own token.

## 3. Add the secrets

On the **Secrets** tab, add these:

| Secret | What to put |
|---|---|
| `CLOUDFLARE_API_TOKEN` | A token for deploying. In the Cloudflare dashboard, go to **My Profile > API Tokens > Create Token**, and use the **Edit Cloudflare Workers** template. |
| `GH_APP_PRIVATE_KEY` | The whole `.pem` file from step 1, from `-----BEGIN` to `-----END`. |
| `ANTHROPIC_API_KEY` | Optional: connects the console's guide to Claude. |

Each deploy sends `GH_APP_PRIVATE_KEY` and `ANTHROPIC_API_KEY` to Cloudflare as encrypted Worker secrets. A secret that is not in the repository is left as it is in Cloudflare, so a key you already set with `npx wrangler secret put` keeps working.

The Figma token does not go here. People add it in the console under **Sync with Figma**, and the console keeps it in the Durable Object.

## 4. Deploy

Push to `main`, or open the **Actions** tab, pick **Deploy Worker**, and click **Run workflow**. It runs the tests, then checks every setting and lists anything wrong before it builds, then deploys. Last, it checks that the Worker's address is closed to anyone who has not signed in.

The first run prints the Worker's address, like `https://brand-console.your-account.workers.dev`. Opening it shows "This console is not set up for sign-in yet." That is expected: step 5 turns sign-in on.

Every push to `main` deploys again. Only `heymrcarter/brand-console` deploys; copies and forks of it never do. Changes to the console never release a design system version: Storybook and the engine come from the `@heymrcarter/design-system` packages, at the version in `package.json`.

**Do not deploy from your computer.** `wrangler.jsonc` has no settings in it on purpose, so `npx wrangler deploy` would ship a Worker that refuses every request until Actions deploys again. `npm run worker:deploy` stops and says so. To check a change first, run `node scripts/deploy-worker.mjs --dry-run` with the settings in your shell.

## 5. Turn on Cloudflare Access

1. In the Cloudflare dashboard, go to **Workers & Pages**, pick **brand-console**, then **Settings > Domains & Routes**.
2. Next to `workers.dev`, click **Enable Cloudflare Access**. (On a custom domain, add an Access application for that domain instead.)
3. Click **Manage Cloudflare Access**, and set the policy to the people or groups who use the console, like the brand, admin, and design teams.
4. On the Access application's page, copy the **Application Audience (AUD) Tag**. That is `POLICY_AUD`.
5. Your team domain is `https://` followed by your Zero Trust team name and `.cloudflareaccess.com`, like `https://your-team.cloudflareaccess.com`. It is also the address of the Access sign-in page. That is `TEAM_DOMAIN`. Check that it has no spaces.
6. Add both as repository variables, as in step 2, then run the **Deploy Worker** workflow again.

Open the address again. Access asks you to sign in, then the console opens.

**Signing in a small team without Cloudflare accounts.** New Zero Trust accounts sign people in with their Cloudflare login, so only members of your Cloudflare account get in. For a few people, a one-time PIN by email is simpler, and needs no accounts:

1. In **Zero Trust > Integrations > Identity providers**, add **One-time PIN**.
2. In the Access application's policy, set the **Include** rule to **Emails**, and list each person's address.
3. Under the application's **Login methods**, allow **One-time PIN**.

Do not set the Include rule to "Login methods: One-time PIN", or to "Emails ending in" a public domain like `@gmail.com`: both let in anyone who can get an email. If a PIN email does not arrive, ask your email admins to allow `noreply@notify.cloudflare.com`. When the company's Microsoft Entra ID is ready, add it as an identity provider and switch the policy to its groups.

## Free or paid

The free plan gives a Worker 10 ms of CPU time per request, and allows 100,000 requests and 100,000 Durable Object row writes a day.

- The console is built to fit. Saving edits takes a few milliseconds of CPU, and adding a change to a proposal a little more. Cloudflare's servers may be slower than a laptop, so check: after a few changes, open the Worker's **Metrics** in the dashboard and look at **CPU time**.
- If requests fail with error 1102 ("Worker exceeded resource limits"), move to the Workers Paid plan ($5 a month). It allows up to 30 seconds of CPU time per request.
- GitHub is the other limit. A Worker on the free plan can make 50 outgoing requests per request. A test (`test/storage.test.mjs`) keeps loading the console and adding a change under that: loading takes about 20 GitHub requests the first time and a few after that, a save none, and adding a change 15 to 20, plus one for each new font file.

## Running it on your computer

This is for trying changes. It never deploys.

`npm start` runs the real Worker in `wrangler dev` against a stand-in for GitHub that holds the sample design system in `fixtures/sample/`, with the packaged Storybook at `/storybook/`. It needs no accounts and no settings beyond a token to install the packages, and everything you do disappears when you stop it.

To run against a real GitHub repository instead:

```sh
cp .dev.vars.example .dev.vars   # then fill in GITHUB_TOKEN or the GitHub App settings
npm run worker:dev
```

`.dev.vars` holds secrets for `wrangler dev` and Git ignores it. `ACCESS_LOCAL_DEV=allow` lets requests to `localhost` in without Access. It does nothing on any other address, or once `TEAM_DOMAIN` and `POLICY_AUD` are set.

To test the Worker without GitHub or Cloudflare, run `npm run test:worker`. It starts the real Worker in `wrangler dev` against a stand-in for GitHub and goes through saving, a large font, a restart, a proposal that is submitted and lands, and rolling back.

## Good to know

- **Storybook shows the design system version the console uses.** It comes from the `@heymrcarter/design-system-storybook` package, so the console's "Real component" preview does not follow each change. The console's own preview always does.
- **The console follows the design system's releases.** After each release, the design system's Release workflow starts this repository's **Follow the design system** workflow (`.github/workflows/follow-design-system.yml`), which installs the new version of both packages, runs the tests, commits it, and deploys. It needs a `CONSOLE_DISPATCH_TOKEN` secret in the design system repository: a fine-grained GitHub token for this repository only, with **Actions: Read and write**. A daily run catches any release it missed. Until the console has caught up with a new minor or major version, it pauses new changes to proposals, and says so; edits are still saved.
- **One proposal at a time, edited together.** Everyone works on the same edits and the same proposal. Each open console keeps a WebSocket to the Durable Object (hibernation WebSockets, so idle connections cost nothing, and pings are answered without waking it). Saves made at the same moment are combined per setting, and everyone sees them in about a second. If two people add a change to the proposal at the same moment, the Durable Object adds one after the other.
- **If main moves on** while a proposal is open, the next change is built on the new main, with the proposal's earlier commits and the edits. For the files the console writes, its version wins, so there are never merge conflicts.
- **A preview console for each pull request.** `.github/workflows/preview.yml` deploys each brand-console pull request as a Cloudflare Workers Preview, at `https://pr-<number>-brand-console.<account>.workers.dev`, and links it on the pull request. It runs the pull request's code with its own Durable Object storage, so its edits and Figma connection are separate from the real console's. It cannot make proposals (`PREVIEW` is set). It is deleted when the pull request closes. Add `*-brand-console.<account>.workers.dev` to the Access application once; until then the Worker refuses everyone there.
- **Draft pull requests.** GitHub only allows them on private repositories with a paid plan. Without them, a proposal is a branch the console keeps until you submit it, and then it opens the pull request.
- **Rolling back** makes the edits an earlier version. It reaches apps when it is added to a proposal and lands. Nothing is ever lost from the history.

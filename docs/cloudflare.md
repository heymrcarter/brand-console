# The Brand Console on Cloudflare

This note is for the engineers who put the console online for the brand team. It runs on Cloudflare Workers, keeps the design system in a GitHub repository, and lets people in through the company's sign-in with Cloudflare Access.

## In short

- **Where things live.** The design system's files stay in GitHub, in the same folders as on your computer. The console reads them from one branch. Every publish is one commit on that branch, so `dist/`, `releases/`, and the change log update the same way as before.
- **Unpublished changes** wait in a Durable Object (a small database Cloudflare keeps for the Worker) until someone publishes. They are not lost if the Worker restarts. Saving a draft never commits to GitHub.
- **Sign-in.** Cloudflare Access signs people in with the company's identity provider. The Worker checks Access's signed token on every request, including the console page. Until Access is set up, the Worker refuses everything.
- **Who did what.** Each version in the history shows the email of the person who signed in, like `maya@company.com`. The top of the console shows who you are signed in as. Everyone is an admin for now; roles from Microsoft Entra ID groups come later.

## What you need

- A Cloudflare account. The free plan works (see "Free or paid" below).
- A GitHub repository with the design system in it: this project, or a copy of it.
- Node.js 22.12 or newer, and this project with `npm install` done.

## 1. Make a GitHub App

A GitHub App can only reach the repositories it is installed on, and its tokens expire after an hour, so it is safer than a personal token.

1. On GitHub, go to **Settings > Developer settings > GitHub Apps > New GitHub App**. For a company account, make it under the organization's settings instead.
2. Name it, like "Brand Console". The homepage URL can be the repository's address.
3. Turn **Webhook** off.
4. Under **Repository permissions**, set **Contents** to **Read and write**. Leave everything else as it is. (Metadata: Read-only is added for you.)
5. Pick **Only on this account**, then **Create GitHub App**.
6. Note the **App ID** at the top of the page.
7. Under **Private keys**, click **Generate a private key**. Your browser downloads a `.pem` file. Keep it somewhere safe. You need it in step 3.
8. Click **Install App**, and install it on the design system repository only. The page you land on ends in `/installations/12345678`. That number is the **installation ID**.

## 2. Add the settings to the repository

GitHub Actions deploys the Worker (`.github/workflows/deploy-worker.yml`), with settings stored in the repository, not in `wrangler.jsonc`. In the repository the console publishes to, go to **Settings > Secrets and variables > Actions**.

On the **Variables** tab, add these. GitHub does not allow names that start with `GITHUB_`, so they are shorter than the Worker's own names:

| Variable | What to put | The Worker sees it as |
|---|---|---|
| `REPO` | This repository, like `acme/design-system`. Only this repository deploys. | `GITHUB_REPO` |
| `BRANCH` | The branch the console reads and publishes to. Usually `main`. | `GITHUB_BRANCH` |
| `GH_APP_ID` | The App ID from step 1 | `GITHUB_APP_ID` |
| `GH_APP_INSTALLATION_ID` | The installation ID from step 1 | `GITHUB_APP_INSTALLATION_ID` |
| `TEAM_DOMAIN` | Leave it out for now. Step 5 adds it. | `TEAM_DOMAIN` |
| `POLICY_AUD` | Leave it out for now. Step 5 adds it. | `POLICY_AUD` |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID, from the dashboard's **Account home** | |

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

Every push to `main` deploys again, including the commits the console makes when someone publishes. That also rebuilds Storybook, so it shows what was just published.

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

- The console is built to fit. Measured in Node, saving a draft takes about 2 ms of CPU and publishing about 5 ms (7 ms at most). Cloudflare's servers may be slower than a laptop, so check: after a few publishes, open the Worker's **Metrics** in the dashboard and look at **CPU time**.
- If requests fail with error 1102 ("Worker exceeded resource limits"), move to the Workers Paid plan ($5 a month). It allows up to 30 seconds of CPU time per request.
- GitHub is the other limit. A Worker on the free plan can make 50 outgoing requests per request. Loading the console takes about 13 GitHub requests the first time and none after that, a save none, and a publish 4, plus one for each new font file.

## Running it on your computer

This is for trying changes. It never deploys.

`npm start` runs the real Worker in `wrangler dev` against a stand-in for GitHub that holds this project's design system, with Storybook next to it. It needs no accounts and no settings, and everything you do disappears when you stop it.

To run against a real GitHub repository instead:

```sh
cp .dev.vars.example .dev.vars   # then fill in GITHUB_TOKEN or the GitHub App settings
npm run worker:dev
```

`.dev.vars` holds secrets for `wrangler dev` and Git ignores it. `ACCESS_LOCAL_DEV=allow` lets requests to `localhost` in without Access. It does nothing on any other address, or once `TEAM_DOMAIN` and `POLICY_AUD` are set.

To test the Worker without GitHub or Cloudflare, run `npm run test:worker`. It starts the real Worker in `wrangler dev` against a stand-in for GitHub and goes through saving, a large font, publishing, rolling back, and a restart.

## Good to know

- **Storybook shows the draft from the last deploy.** On Cloudflare it is a built copy, not the live Storybook from your computer, so the console's "Real component" preview does not follow each change. Deploy again to update it. The console's own preview always follows each change.
- **If two people publish at the same moment,** the Durable Object runs one publish after the other. If someone pushes to the branch while a publish runs, the console builds its commit again on top of theirs.
- **If someone edits the same file on GitHub** while the console has an unpublished change to it, the console's version wins when it publishes.
- **Rolling back** is a new commit, like on your computer. Nothing is ever lost from the history.

# The Brand Console on Cloudflare

This note is for the engineers who put the console online for the brand team. It runs on Cloudflare Workers, keeps the design system in a GitHub repository, and lets people in through the company's sign-in with Cloudflare Access.

## In short

- **Where things live.** The design system's files stay in GitHub, in the same folders as on your computer. The console reads them from one branch. Every publish is one commit on that branch, so `dist/`, `releases/`, and the change log update the same way as before.
- **Unpublished changes** wait in a Durable Object (a small database Cloudflare keeps for the Worker) until someone publishes. They are not lost if the Worker restarts. Saving a draft never commits to GitHub.
- **Sign-in.** Cloudflare Access signs people in with the company's identity provider. The Worker checks Access's signed token on every request, including the console page. Until Access is set up, the Worker refuses everything.
- **Who did what.** Each version in the history shows the team from the "Viewing as" menu and the email of the person who signed in, like `Brand team · maya@company.com`.

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

## 2. Fill in the settings

Open `wrangler.jsonc` and fill in `vars`:

| Setting | What to put |
|---|---|
| `GITHUB_REPO` | The repository, like `acme/design-system` |
| `GITHUB_BRANCH` | The branch the console reads and publishes to. Usually `main`. |
| `GITHUB_APP_ID` | The App ID from step 1 |
| `GITHUB_APP_INSTALLATION_ID` | The installation ID from step 1 |
| `TEAM_DOMAIN` | Leave empty for now. Step 5 fills it in. |
| `POLICY_AUD` | Leave empty for now. Step 5 fills it in. |

## 3. Add the secrets

Secrets go to Cloudflare, never into the repository. Sign in once with `npx wrangler login`, then:

```sh
npx wrangler secret put GITHUB_APP_PRIVATE_KEY < path/to/your-app.private-key.pem
npx wrangler secret put ANTHROPIC_API_KEY      # optional: connects the console's guide to Claude
```

`wrangler secret put` asks for the value when you leave off the `<`. Do not paste secrets into commands.

The Figma token does not go here. People add it in the console under **Sync with Figma**, and the console keeps it in the Durable Object.

## 4. Deploy

```sh
npm run worker:deploy
```

This builds the console and Storybook into `.worker-assets/` and deploys the Worker. Wrangler prints its address, like `https://brand-console.your-account.workers.dev`. Opening it now shows "This console is not set up for sign-in yet." That is expected: the next step turns sign-in on.

## 5. Turn on Cloudflare Access

1. In the Cloudflare dashboard, go to **Workers & Pages**, pick **brand-console**, then **Settings > Domains & Routes**.
2. Next to `workers.dev`, click **Enable Cloudflare Access**. (On a custom domain, add an Access application for that domain instead.)
3. Click **Manage Cloudflare Access**, and set the policy to the people or groups who use the console, like the brand, admin, and design teams.
4. On the Access application's page, copy the **Application Audience (AUD) Tag**. That is `POLICY_AUD`.
5. Your team domain is `https://` followed by your Zero Trust team name and `.cloudflareaccess.com`, like `https://your-team.cloudflareaccess.com`. It is also the address of the Access sign-in page. That is `TEAM_DOMAIN`.
6. Put both in `wrangler.jsonc` and run `npm run worker:deploy` again.

Open the address again. Access asks you to sign in, then the console opens.

## Free or paid

The free plan gives a Worker 10 ms of CPU time per request, and allows 100,000 requests and 100,000 Durable Object row writes a day.

- The console is built to fit. Measured in Node, saving a draft takes about 2 ms of CPU and publishing about 5 ms (7 ms at most). Cloudflare's servers may be slower than a laptop, so check: after a few publishes, open the Worker's **Metrics** in the dashboard and look at **CPU time**.
- If requests fail with error 1102 ("Worker exceeded resource limits"), move to the Workers Paid plan ($5 a month). It allows up to 30 seconds of CPU time per request.
- GitHub is the other limit. A Worker on the free plan can make 50 outgoing requests per request. Loading the console takes about 13 GitHub requests the first time and none after that, a save none, and a publish 4, plus one for each new font file.

## Running it on your computer

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

# Sharing the Brand Console with a team: hosting and sign-in

This note is for the engineers who will put the Brand Console on a shared server. It says what is safe today, what the small guard in the server does, and what we should build for real sign-in. This design system is for our own teams only.

## In short

- **On one computer (the default), nothing changes.** The server listens on `127.0.0.1` only, so no other computer can reach it. There is no sign-in.
- **Shared with other computers, it needs an access code.** If you set it up to be reached from other computers, the server will not start until you give it a long, random access code. Then every request for data needs that code.
- **The access code is a stopgap.** It keeps strangers out. It does not give each person their own account, and it cannot say who made a change. Before many people use it, put it behind the company's single sign-on (see "The plan for real sign-in" below).
- **The "Viewing as" menu is not security.** It only changes what the screen lets you edit. Anyone who can reach the server can choose any role.

## What the server does today

### Settings

Put these in `.env` in the project folder, or set them in the server's environment.

| Setting | What it does |
|---|---|
| `CONSOLE_HOST` | The address the server listens on. Leave it out to stay on this computer (`127.0.0.1`). Use `0.0.0.0` to listen on every network. `HOST` in `.env` works too. (The shell's own `HOST` is ignored, because some Mac shells set it to the computer's name.) |
| `ALLOW_REMOTE` | Set to `1` to turn on the shared rules even on `127.0.0.1`. Use it when a proxy on the same machine passes in traffic from other computers. |
| `AUTH_BEARER_TOKEN` | The access code. It must be at least 32 characters and look random. Make one with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. |
| `COOKIE_SECURE` | Set to `1` when people reach the console over HTTPS, so the sign-in cookie is only sent over HTTPS. It is turned on by itself when a proxy sends `X-Forwarded-Proto: https`. |
| `PORT` | The port, like before. |

### What happens in shared mode

The server is in **shared mode** when `CONSOLE_HOST` (or `HOST` in `.env`) is not this computer's own address, or when `ALLOW_REMOTE=1`.

1. **It will not start without a strong code.** If `AUTH_BEARER_TOKEN` is missing, shorter than 32 characters, or too simple, the server prints why and stops.
2. **The console page loads, and asks for the code.** People type the code once. The server then sets a sign-in cookie that lasts 12 hours. The cookie is `HttpOnly` and `SameSite=Strict`, and it holds a fingerprint of the code, not the code itself.
3. **Everything else needs the code.** That means every `/api/` call except `/api/health` and `/api/login`, and every file in `dist/`, `build/`, and `fonts/`. (Font files can be licensed, and the draft is not public yet.) Without the code, the answer is `401`.
4. **Scripts and CI send the code as a header:** `Authorization: Bearer <code>`.
5. **Other web sites still cannot make changes.** A change must come from the console's own address. On a shared server, the server's own address counts.
6. **Signing out:** `POST /api/logout` clears the cookie in that browser. The cookie is made from the code, so to sign everyone out at once, change the code and restart the server.

The code for this is in `server/auth.mjs`, and the tests are in `test/hosting-auth.test.mjs`.

### What it protects against, and what it does not

It protects against:
- Someone on the network finding the server and changing or publishing the design system.
- Someone reading the unpublished draft or downloading licensed font files.
- Another web site using a signed-in person's browser to make changes.

It does not protect against:
- **Someone who has the code.** Everyone with the code can do everything, including publish and roll back. Give it only to the people who need it, and change it when someone leaves.
- **Knowing who did what.** Every change looks the same to the server. The names in the version list ("Brand team" and so on) come from the "Viewing as" menu, which anyone can change.
- **Traffic being read on the way.** The server itself speaks plain HTTP. Put it behind HTTPS (see below).
- **Cost.** Anyone with the code can ask the AI guide questions, which uses the company's Claude API key, and can push to Figma with the company's Figma token.

## The plan for real sign-in

This is the setup we recommend before the console is used by more than a few people.

### 1. Put it behind the company's single sign-on

Run the console on a private server, and put the company's standard sign-in proxy in front of it. The proxy signs people in with the company's identity provider (for example Okta, Microsoft Entra ID, or Google Workspace), adds HTTPS, and passes each request to the console with the person's name and groups in headers. The console listens on `127.0.0.1` behind the proxy, with `ALLOW_REMOTE=1` and the access code kept as a second lock until step 2 is done.

### 2. Turn identity groups into roles

Today's "Viewing as" roles become real roles, taken from identity groups. The server checks the role on every route, not just the screen.

| Role today | Identity group (example) | Can do |
|---|---|---|
| Designer | `design-system-designers` | See everything. Suggest changes. Compare with Figma. Cannot save the draft or publish. |
| Brand team | `design-system-brand` | Everything a designer can do, plus save the draft, publish, flag a version, and apply Figma changes. |
| Admin team | `design-system-admins` | Everything the brand team can do, plus sizes and rules, roll back, and connect or disconnect Figma. |

Routes that change things, and the role each one needs:

| Route | Least role |
|---|---|
| `PUT /api/draft` | Brand team (sizes and rules: Admin team) |
| `POST /api/publish` | Brand team |
| `POST /api/rollback` | Admin team |
| `POST /api/flag` | Brand team |
| `POST /api/fonts` | Brand team |
| `POST /api/ask` | Designer |
| `POST /api/figma/connect`, `/link`, `/disconnect` | Admin team |
| `POST /api/figma/compare`, `/files/compare` | Designer |
| `POST /api/figma/apply`, `/files/apply` | Brand team |

The server must trust the name and group headers only from the proxy. The simplest way is to listen only on `127.0.0.1` so nothing else can reach it, and to drop those headers from any request that did not come through the proxy.

### 3. Keep a record of who did what

- Write each publish, rollback, flag, Figma apply, and font upload to an append-only log: the time, the person's name from sign-in, the action, and the version.
- Use the signed-in name instead of "Brand team" in the version list and in `CHANGELOG.md`.
- Turn on Git history (see the README) so every publish is a commit. Push it to the company's Git server for a backup.

### 4. Keep secrets out of reach

On a shared server, `.env` holds the Claude API key, the Figma token, and the access code. Do not leave it readable by everyone on the machine.
- Run the console as its own service user. Make `.env` readable only by that user (`chmod 600 .env`).
- Better: use the platform's secret store, and pass the values in as environment variables. Leave them out of `.env`, and the server uses the environment variables instead.
- Change the Figma token and the access code when someone with access leaves.

### 5. Host Storybook the same way

Run `npm run docs:build` and put `storybook-static/` behind the same sign-in. It shows the draft, which is not public yet.

## Decisions for Heath

1. Which identity provider and sign-in proxy should we use? (The platform team will likely have a standard one.)
2. Are the three roles above right, and which identity groups map to them?
3. Where should the audit log live: a file in the project, the company's log system, or both?
4. Should designers be able to save the draft, or only suggest changes?
5. Until single sign-on is ready, is a shared access code acceptable for a small pilot?

# Deeda Midterm MVP

Deeda is a Next.js, React, and TypeScript text-first MVP for selecting among
three fixed LiteChat proxy interfaces and reviewing token usage. It is not a
payment or billing application.

## Features

- One chat interface for three fixed proxy routes.
- Multi-turn text conversations and route switching between turns.
- Per-response and known conversation-level token usage.
- Create, list, reopen, rename, and delete saved conversations.
- Browser-local accounts, tab-scoped sessions, and account-specific conversation
  persistence.
- Server-side proxy requests. The browser never receives proxy credentials.
- Local account creation and credential verification using Web Crypto. Plaintext
  passwords are never stored. Google sign-in is visibly marked as not connected.

The proxy documentation says the three interfaces currently use DeepSeek Flash.
The route labels identify API-compatible proxy interfaces, not verified access
to three distinct underlying vendor models. Token counts are not prices, charges,
balances, invoices, or proof of payment.

## Requirements

- Node.js `>=20.9.0`.
- npm.
- Chromium and its system libraries for Playwright browser tests.

The project uses Next.js, React, TypeScript, and npm. `package-lock.json` pins the
dependency tree. The application has no server database.

## Install and Run

From a fresh clone, install the declared dependencies:

```sh
npm ci
```

For live proxy chat, configure the credential for each interface you plan to
use. The app can start without credentials, but a live request needs its
server-side credential. One local option is to create the Git-ignored
`.env.local` file with placeholder values, then replace only the needed values
on your machine:

```dotenv
BUILD_OPENAI_KEY=replace-with-approved-proxy-credential
BUILD_ANTHROPIC_KEY=replace-with-approved-proxy-credential
BUILD_GOOGLE_KEY=replace-with-approved-proxy-credential
```

Do not commit `.env.local` or put real values in tracked files. A Vercel
deployment is optional; it is not required to run this repository locally.

Start the local development server:

```sh
npm run dev
```

The development server binds to `0.0.0.0:3000` unless `PORT` is set. A supplied
`PORT` selects both the listening port and CodeRange asset prefix.

Run quality checks and tests:

```sh
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Playwright uses Chromium. Install the browser once on a new development machine:

```sh
npx playwright install chromium
```

On Linux, install the browser's operating-system dependencies if they are
missing:

```sh
npx playwright install-deps chromium
```

Start the production build with:

```sh
npm start
```

The production server binds to `0.0.0.0:3000` unless the runtime supplies
`PORT`. Do not expose the shared proxy credentials to unrestricted users. Check
the assigned CodeRange port, forwarded-host behavior, and runtime version in the
deployment environment. A localhost check does not prove external access.

CodeRange provides `VSCODE_PROXY_URI` with a `/proxy/{{port}}` path template.
Next.js uses that path and the effective port for generated CSS and JavaScript
asset URLs. If `PORT` is absent, the runtime uses `3000` for both the server and
asset prefix. The proxy origin is not included. Local development keeps
Next.js's default asset paths when the forwarded URI is not present. For a
production build, preserve the same CodeRange `VSCODE_PROXY_URI` and effective
port for both `npm run build` and `npm start` because Next.js embeds the asset
prefix in its output. Do not configure `basePath`: CodeRange strips the forwarded
path before it sends requests to Next.js.

## Verified Behavior And Deployment

The GitHub-based Vercel deployment was manually verified: it passed the
Preparing screen, accepted login, loaded the Deeda workspace, and created a
conversation. A real request through the Anthropic-compatible proxy interface
returned a response. Multi-turn chat and per-response and conversation token
usage were also demonstrated. This does not establish that the three proxy
interfaces use distinct underlying vendor models or verify live requests
through every interface. Automated browser tests use mocked chat responses.

During manual testing, the CodeRange forwarded `/proxy/<port>/` environment
persistently remained on the Preparing screen. Localhost automated browser
verification passed, and the GitHub-based Vercel deployment loaded and operated
successfully. The CodeRange observation is limited to that forwarded
environment; its root cause is not established and it is not evidence of a
general Deeda startup failure.

## Proxy Configuration

The application calls `https://proxy.litechat.ai` from a Next.js Route Handler.
It uses these fixed documented routes and presets:

| Route | Request path | Documented model preset |
| --- | --- | --- |
| OpenAI-compatible Chat Completions | `/openai/v1/chat/completions` | `gpt-5.6-luna` |
| Anthropic-compatible Messages | `/anthropic/v1/messages` | `claude-haiku-4-5-20251001` |
| Google-compatible Gemini `generateContent` | `/google/v1beta/models/gemini-3.8-flash:generateContent` | `gemini-3.8-flash` |

The server reads credentials from these environment variables:

- `BUILD_OPENAI_KEY`
- `BUILD_ANTHROPIC_KEY`
- `BUILD_GOOGLE_KEY`

Use the instructor-approved credential for each route only after confirming it
is accepted by the corresponding LiteChat proxy endpoint. Credential provenance
has not been verified by this application. Do not assume a credential is an
ordinary direct-provider key. In deployment, use an approved runtime secret
mechanism. `.gitignore` excludes local `.env*` files and permits only a
value-free `.env.example`.

Never put actual credential values in source code, browser code, localStorage,
Git, tests, fixtures, logs, or documentation. Never print credential values
while checking configuration. Normal automated tests use mocked responses and
do not require credentials or call the external proxy. A live proxy smoke test
is optional and requires authorization and securely configured credentials.

If a selected route has no credential configured, the server returns a safe
configuration error. It does not expose the environment value.

## Local Account Entry

The entry screen provides `Log in` and `Create account`. Account creation uses a
display name, email, password, and password confirmation. Email is trimmed and
lowercased for the local identifier. Passwords must contain at least eight
characters and match the confirmation. Duplicate normalized emails are rejected.

Account records are stored in browser `localStorage` under `deeda.accounts.v1`.
The password is represented by a Web Crypto PBKDF2-HMAC-SHA-256 verifier with a
random per-account salt and 600,000 iterations. Plaintext passwords and password
confirmations are not stored. The active account ID is stored in tab-scoped
`sessionStorage` under `deeda.auth.session.v1`. It survives a reload in the same
tab and is cleared by `Log out`.

Correct credentials enter the existing Deeda chat workspace. Incorrect or
unknown credentials do not. Account authentication is browser-local UI
authentication only. It does not protect `/api/chat`, shared proxy credentials,
or a public deployment. Google sign-in is disabled and says that it is not
connected. Email verification, password recovery, server-side accounts, and
cross-device synchronization are not implemented.

## Chat and Usage Behavior

- The browser sends a fixed route ID and text message history to `POST /api/chat`.
- The server chooses the fixed proxy URL, model preset, and credential. The
  browser cannot submit an endpoint, model ID, upstream header, or credential.
- Requests are limited to 80 messages, 12,000 characters per message, and
  256,000 bytes per request body.
- A failed prompt remains visible and saved. Retry it manually before sending
  another turn in that conversation. The app does not retry automatically.
- Missing usage remains unavailable, not zero. The Anthropic total is calculated
  from input and output counts when both are available. Conversation totals use
  known values and are marked partial if a response has missing usage.
- Responses and conversation totals report tokens only. They do not estimate or
  charge money.
- Conversations are stored per local account in this browser. Browser data can
  be cleared or modified, storage has a browser-defined quota, and data does not
  sync across devices. Valid legacy data under `litechat.conversations.v1` is
  assigned to the first account that logs in and migrated to that account's
  storage key. Token totals in browser storage are not billing or quota records.
- Prompts are sent to the external LiteChat proxy. This application does not
  make claims about proxy retention beyond the public proxy documentation.

If CodeRange access is unrestricted, protect the deployment with an approved
runtime access restriction before exposing shared proxy credentials. Browser-local
accounts are not a substitute for deployment access control.

## Scope

This MVP excludes file uploads, multimodal input, web search, streaming,
payments, dollar-cost estimates, Google OAuth, email verification, password
recovery, server-side accounts, server-side conversation persistence,
cross-device synchronization, advanced session management, model comparisons,
and tools or agent workflows.

The approved scope and reasoning are recorded in
`doc/canonical/litechat-midterm-mvp-decisions.md`. The feasibility study is in
`doc/study/1790657427_litechat_midterm_feasibility.md`.

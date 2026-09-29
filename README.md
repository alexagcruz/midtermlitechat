# LiteChat Midterm MVP

A text-first chat prototype for selecting fixed LiteChat proxy interfaces and
reviewing token usage. It is not a payment or billing application.

## Features

- One chat interface for three fixed proxy routes.
- Multi-turn text conversations and route switching between turns.
- Per-response and known conversation-level token usage.
- Create, list, reopen, rename, and delete saved conversations.
- Browser-local persistence with `localStorage`.
- Server-side proxy requests. The browser never receives proxy credentials.

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

Start the local development server:

```sh
npm run dev
```

The development server binds to `0.0.0.0`. Next.js selects its local default
port unless `PORT` is set.

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

The production server binds to `0.0.0.0` and reads the port from `PORT` when the
runtime provides it. Do not hardcode the CodeRange port. The assigned CodeRange
port, forwarded-host behavior, and runtime version must be checked in the
deployment environment. A localhost check does not prove external access.

CodeRange provides `VSCODE_PROXY_URI` with a `/proxy/{{port}}` path template.
Next.js uses that path and the assigned `PORT` for its generated CSS and
JavaScript asset URLs. The proxy origin is not included. Local development keeps
Next.js's default asset paths when the forwarded URI is not present. For a
production build, preserve the same CodeRange `VSCODE_PROXY_URI` and `PORT`
values for both `npm run build` and `npm start` because Next.js embeds the asset
prefix in its output. Do not configure `basePath`: CodeRange strips the forwarded
path before it sends requests to Next.js.

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
ordinary direct-provider key. Use the CodeRange secret store or another approved
runtime secret mechanism. For local work, set the variables in the server
process. If you create `.env.local`, first confirm that Git ignores it.
`.gitignore` excludes local `.env*` files and permits only a value-free
`.env.example`.

Never put actual credential values in source code, browser code, localStorage,
Git, tests, fixtures, logs, or documentation. Never print credential values
while checking configuration. Normal automated tests use mocked responses and
do not require credentials or call the external proxy. A live proxy smoke test
is optional and requires authorization and securely configured credentials.

If a selected route has no credential configured, the server returns a safe
configuration error. It does not expose the environment value.

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
- Conversations are stored in this browser. Browser data can be cleared or
  modified, storage has a browser-defined quota, and data does not sync across
  devices. Token totals in localStorage are not billing or quota records.
- Prompts are sent to the external LiteChat proxy. This application does not
  make claims about proxy retention beyond the public proxy documentation.

If CodeRange access is unrestricted, protect the deployment with an approved
runtime access restriction before exposing shared proxy credentials. Do not
expand this MVP into user accounts.

## Scope

This MVP excludes file uploads, multimodal input, web search, streaming,
payments, dollar-cost estimates, user accounts, server-side conversation
persistence, cross-device synchronization, advanced session management, model
comparisons, and tools or agent workflows.

The approved scope and reasoning are recorded in
`doc/canonical/litechat-midterm-mvp-decisions.md`. The feasibility study is in
`doc/study/1790657427_litechat_midterm_feasibility.md`.

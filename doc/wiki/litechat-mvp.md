# Deeda MVP

## Purpose

Deeda provides one text chat interface for three fixed LiteChat proxy
interfaces. It supports local browser accounts, multi-turn chat, route
switching, token usage display, and account-specific saved conversations.

The account flow is a local educational MVP. It verifies credentials in the
browser for the Deeda UI. It does not provide production authentication,
server-side authorization, or protection for `/api/chat`.

## Local Account Flow

The entry screen provides two modes:

- `Log in`.
- `Create account`.

Create account fields:

- Display name.
- Email.
- Password.
- Password confirmation.

Registration trims and lowercases the email for the local login identifier. It
requires a valid email, a non-empty display name, a password with at least eight
characters, and a matching confirmation. A duplicate normalized email is
rejected. Successful registration returns to `Log in`, fills the normalized
email, and clears the password fields.

Login verifies the normalized email and password against the local account
record. Unknown accounts and incorrect passwords do not enter the workspace.
Correct credentials establish the local session and mount the existing Deeda
chat workspace. The message composer, conversation sidebar, route selector, and
all existing chat behavior remain available after login.

The account registry is stored in `localStorage` under the versioned
`deeda.accounts.v1` key. Passwords are not stored as plaintext. Deeda uses the
Web Crypto API, a random per-account salt, and a PBKDF2-HMAC-SHA-256 verifier
with 600,000 iterations. The account record stores the verifier, salt, and
algorithm metadata. It does not store password confirmation.

The active account ID is stored in `sessionStorage` under
`deeda.auth.session.v1`. Session resolution occurs after browser hydration. The
session survives a reload in the same tab and is cleared by `Log out`. Closing
the browsing session ends the tab-scoped session. A malformed or stale session
fails closed and does not mount the workspace.

Logout is available in the workspace sidebar. It clears the active tab session
and returns to `Log in`. The user can enter the same verified credentials to
return to the workspace.

Google OAuth is not implemented. The Google action is disabled and marked `Not
connected`.

## Conversation Behavior

Each local account uses its own validated browser storage key:

```text
deeda.conversations.v1:<account-id>
```

Accounts do not automatically see each other's conversations. The existing
legacy key, `litechat.conversations.v1`, is migration input only. When valid
legacy data exists, the first account that successfully logs in claims it. Deeda
records the claim, copies the validated data to that account's key, reads the
destination back, and removes the legacy key only after the copy matches. A
browser Web Lock serializes migration across same-origin tabs.

Migration is repeatable. Interrupted copies can finish on a later login. A
conflicting destination, malformed legacy payload, unavailable storage, or
missing Web Lock does not silently discard or expose the legacy data. The UI
reports migration problems. If normal account conversation persistence becomes
unavailable, Deeda keeps the current changes in the active UI session and shows
a storage warning; those changes may be lost on reload or tab close.

Users can:

- Start a new conversation.
- View saved conversations in the sidebar.
- Reopen a saved conversation.
- Rename a conversation.
- Delete a conversation.
- Continue a conversation with multiple turns.
- Switch the proxy route between turns.

Conversation records include the selected route, messages, delivery state,
assistant route, and normalized usage when available. Account IDs, display names,
emails, salts, verifiers, and session markers are not included in chat requests.

## Chat And Usage

The chat composer sends text message history and a fixed route ID to same-origin
`POST /api/chat`. A successful response adds the assistant message to the
conversation. A pending request shows a loading state. A failed request remains
visible and can be retried manually. Deeda does not retry proxy requests
automatically.

The three approved route interfaces are:

- OpenAI-compatible Chat Completions: `gpt-5.6-luna`.
- Anthropic-compatible Messages: `claude-haiku-4-5-20251001`.
- Google-compatible Gemini: `gemini-3.8-flash`.

The route names identify fixed proxy interfaces or presets. They do not prove
access to three distinct underlying vendor models. The public proxy
documentation currently says all three interfaces use DeepSeek Flash.

Deeda reports input, output, and total token counts when the proxy provides
them. The Anthropic total is calculated from known input and output counts when
required. Missing values remain unavailable, not zero. Conversation totals use
known values and identify partial usage when a response is missing counts.
Token counts are not prices, charges, balances, invoices, or proof of payment.

## Responsive UX

The desktop layout uses a deep-purple sidebar for Deeda branding, new
conversations, saved conversations, account identity, and logout. The main
workspace contains the conversation header, route selector, proxy disclosure,
message log, token summary, and composer.

At mobile widths, the sidebar becomes a drawer. The `Chats` control opens it,
the backdrop or `Close` control dismisses it, and selecting a conversation closes
the drawer. The same drawer exposes new, reopen, rename, and delete actions. The
route selector expands to the available width, and the chat layout prevents
horizontal overflow.

The purple/lavender interface uses system fonts and CSS custom properties in
`src/app/globals.css`. It does not load external fonts, images, or a UI
framework. Focus-visible outlines, labeled controls, named landmarks,
`aria-current`, `aria-expanded`, `aria-controls`, live status messages, and
field-associated validation errors support keyboard and assistive technology
use.

## Setup

Requirements:

- Node.js `>=20.9.0`.
- npm.
- Chromium and its system dependencies for browser tests.

Install dependencies:

```sh
npm ci
```

Run the development server:

```sh
npm run dev
```

Run the production server:

```sh
npm run build
npm start
```

The development and production commands bind to `0.0.0.0`. They use port
`3000` when `PORT` is absent and preserve a supplied `PORT`.

## Proxy Configuration

The server calls `https://proxy.litechat.ai` from a Next.js Route Handler. It
reads these environment-variable names:

- `BUILD_OPENAI_KEY`.
- `BUILD_ANTHROPIC_KEY`.
- `BUILD_GOOGLE_KEY`.

Set values only through an approved secret mechanism. Never place actual values
in source code, browser code, browser storage, Git, tests, fixtures, logs, or
documentation. Normal automated tests use mocked proxy responses and do not
require real credentials. The browser cannot submit an endpoint, model ID,
upstream header, or credential. If a selected route has no server credential,
the server returns a safe configuration error.

## CodeRange Runtime

CodeRange supplies `VSCODE_PROXY_URI` with a `/proxy/{{port}}` path template.
Next.js uses that path and the effective port for generated CSS and JavaScript
asset URLs. If `PORT` is absent, the effective port is `3000`. Without a
forwarded URI, Next.js uses its normal local asset paths.

Build and runtime must use the same forwarded URI and effective port because
Next.js embeds the asset prefix in the build output. Do not set `basePath`:
CodeRange strips the forwarded path before forwarding requests to Next.js.

The verified local runtime returned HTTP 200 and Playwright verified forwarded
`/proxy/3000/` asset paths when `VSCODE_PROXY_URI` was configured without
`PORT`. The external forwarded host was not reachable from the verification
environment, so local success does not prove external CodeRange access.

## Testing

Run the complete checks:

```sh
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Playwright uses Chromium. Install it when required:

```sh
npx playwright install chromium
npx playwright install-deps chromium
```

The browser suite uses mocked `/api/chat` responses and does not require real
LiteChat credentials. It covers account creation, login, workspace use,
composer interaction, logout, failed login, re-login, account isolation,
legacy migration, concurrent account-tab writes, multi-turn chat, route
switching, conversation CRUD, retry behavior, mobile navigation, and CodeRange
asset paths. Playwright is configured for one worker because parallel Chromium
workers are unstable in the constrained verification environment.

## Architecture

- `src/app/page.tsx`: application entry page.
- `src/components/deeda-app.tsx`: hydration-aware authentication state and
  workspace gate.
- `src/components/deeda-entry.tsx`: login and account creation UI.
- `src/components/chat-app.tsx`: chat UI, account-scoped persistence, route
  selection, composer, usage display, conversation CRUD, and logout control.
- `src/lib/auth/`: versioned account storage, Web Crypto password verification,
  and tab session handling.
- `src/lib/storage/conversations.ts`: validated account-scoped conversation
  storage, legacy migration, and serialized account writes.
- `src/app/api/chat/route.ts`: server-only `POST /api/chat` boundary.
- `src/lib/chat/`: fixed route IDs, shared message/usage types, API response
  schemas, and request validation.
- `src/lib/proxy/`: fixed route configuration, protocol adapters, normalized
  usage parsing, timeout handling, and safe proxy failures.
- `e2e/auth-flow.spec.ts`: authenticated lifecycle, migration, isolation, and
  concurrent-tab browser tests.
- `e2e/chat-flow.spec.ts`: chat, route, CRUD, retry, responsive, and asset-path
  browser tests.

The browser sends text history and a fixed route ID to the same-origin Route
Handler. The handler validates the request, chooses the fixed server-side
endpoint and credential, calls the corresponding LiteChat interface, and
returns normalized assistant text and usage. Credentials and upstream
endpoints never enter browser code or account/conversation storage.

## Security Boundary And Limitations

Deeda authentication is browser-local UI authentication for an educational MVP.
It is not production authentication and does not protect a public deployment.
`/api/chat` has no server-side authentication boundary and remains callable
without completing the UI login flow.

Plaintext passwords are not stored. However, browser storage and client code can
be read or changed by same-origin scripts or a person with browser-profile
access. A copied verifier can be attacked offline. Browser data can be cleared,
modified, or lost when storage quota is reached. Accounts and conversations do
not sync across devices.

The MVP does not implement Google OAuth, email verification, password recovery,
password reset, multi-factor authentication, server-side accounts, a user
database, server-issued sessions, or deployment access control. Do not describe
the local account flow as protection for shared LiteChat proxy credentials.

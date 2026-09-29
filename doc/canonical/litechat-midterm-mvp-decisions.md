# Deeda Midterm MVP Decisions

- Status: Human-approved product and technical decisions.
- Approved: 2026-09-29.
- Source: User approval after review of
  `doc/study/1790657427_litechat_midterm_feasibility.md`.
- Scope: This document records human-approved product and technical decisions
  for the ITENT 45 midterm MVP and its approved Deeda presentation update.

## Product Goal

Build Deeda, a text-first, usage-metered prototype that presents the three
selectable LiteChat proxy interfaces in one chat interface. A user can have a
multi-turn conversation and save and manage conversations in the current
browser.

This is a prototype for token usage visibility. It is not a payment, pricing, or
monetary billing system.

## Approved MVP Scope

The MVP must provide:

- One unified chat interface.
- Selectable OpenAI-compatible, Anthropic-compatible, and Google-compatible
  LiteChat proxy routes.
- Text prompts and assistant responses.
- Multi-turn conversations that include the required prior message history.
- Route switching between turns.
- Per-response input and output token usage when available from the proxy.
- Total tokens when provided by the proxy; conversation-level totals calculated
  from known usage values.
- Browser-local conversation storage using `localStorage`.
- Create, list, reopen, rename, and delete conversation behavior.
- Clear loading and error states.
- Server-side proxy calls. The browser must not receive proxy credentials.

Show unavailable usage as unknown, not as zero. Do not infer token counts from
message length. Document that browser data can be cleared and does not sync
across devices.

This scope retains the product's central behavior: choose a route, have a
conversation, and see usage. Text-only input keeps the first implementation
focused on this behavior. Basic local conversation management supports
continuing and revisiting chats without requiring accounts or a server database.

## Proxy Routes and Model Identity

Use the three documented proxy interfaces as fixed route/model presets. The
public documentation currently gives these example model IDs:

| Route/interface | Documented preset | Documented request path |
| --- | --- | --- |
| OpenAI-compatible Chat Completions | `gpt-5.6-luna` | `/openai/v1/chat/completions` |
| Anthropic-compatible Messages | `claude-haiku-4-5-20251001` | `/anthropic/v1/messages` |
| Google-compatible Gemini generateContent | `gemini-3.8-flash` | `/google/v1beta/models/gemini-3.8-flash:generateContent` |

Do not claim that these are necessarily distinct underlying OpenAI, Anthropic,
and Google models. The public documentation says all three interfaces use
DeepSeek Flash and do not reproduce the named providers' model behavior. Until
better evidence is available, label them as documented proxy routes/interfaces
or presets. This uncertainty does not block implementing the documented routes.

Use only these documented, approved fixed presets in the initial MVP. Do not
build a dynamic model catalogue or accept arbitrary client-supplied model IDs,
URLs, or endpoints. Additional model IDs may be added only when they are
documented and approved.

## Usage Metering

Display, when available:

- Input tokens.
- Output tokens.
- Total tokens.
- Conversation totals calculated from known per-response usage.

Do not display monetary charges, prices, balances, invoices, or claims of actual
payment. Do not represent the prototype as a real billing system. This decision
is based on the approved midterm scope and the absence of documented proxy
pricing or billing information.

## Authentication and Runtime Access

The approved local-account scope supersedes the earlier credential-free demo
entry decision. Deeda implements browser-local account creation and real local
credential verification for the UI. Account creation uses display name, email,
password, and password confirmation. Email is trimmed and lowercased. Passwords
must have at least eight characters and are verified with a Web Crypto
PBKDF2-HMAC-SHA-256 verifier and per-account random salt. Plaintext passwords
are not stored.

Account records are versioned in browser `localStorage`. The active account ID is
versioned in tab-scoped `sessionStorage`; it survives a reload in the same tab
and is removed by logout. Correct credentials enter the existing Deeda
workbench. Unknown and incorrect credentials are rejected. Account-specific
conversation storage and safe migration of valid legacy browser conversations
are required.

This is browser-local UI authentication only. It is not production
authentication, deployment access control, or server-side protection for
`/api/chat`. Google OAuth, email verification, password recovery, server-side
accounts, and cross-device synchronization remain out of scope. Keep Google
disabled and clearly marked as not connected.

If CodeRange deployment exposure makes unrestricted use of the shared proxy
credentials unsafe, add an appropriate runtime access restriction. Treat this
as a deployment security requirement; do not silently expand the product into a
multi-user account system.

## Persistence

Use browser `localStorage` for account records, account-scoped conversations,
and displayed usage persistence. Do not add a server database. Cross-device
synchronization and server-side conversation persistence are outside this MVP.

Document these limitations: browser data can be cleared or modified, storage is
limited by browser quota, and history does not sync between devices. Do not use
browser-stored token totals as authoritative billing or quota records.

## Approved Technology and Architecture

- **Framework and UI:** Next.js, React, and TypeScript.
- **Backend:** Next.js Route Handlers as a server-side backend-for-frontend
  (BFF).
- **Proxy integration:** Direct server-side HTTP requests to the LiteChat proxy,
  with one adapter per documented proxy protocol.
- **Account and conversation persistence:** Browser `localStorage`, with
  versioned account records and account-scoped conversation keys.
- **Database:** None for the initial MVP.

The browser sends chat content and a fixed route choice to a Route Handler. The
handler validates the choice, builds the request for that protocol, selects the
matching server-side credential, and calls the proxy. It returns assistant text
and normalized usage to the browser. Keep credentials and fixed upstream
endpoints on the server.

Next.js with React and TypeScript keeps the interactive UI and credential-safe
server endpoints in one application. Route Handlers provide the server-side
boundary between the browser and proxy. Direct HTTP adapters make the proxy's
different protocols explicit and testable. Browser `localStorage` and
`sessionStorage` meet the approved local-account and single-browser persistence
requirements without a server database. The existing global conversation key is
retained only as a safe migration source for the first local account.

## Credentials and Secret Handling

The instructor-provided OpenAI-, Anthropic-, and Google-associated credentials
are secret exogenous inputs. Use only these documented server-side environment
variable names:

- `BUILD_OPENAI_KEY`
- `BUILD_ANTHROPIC_KEY`
- `BUILD_GOOGLE_KEY`

Never hardcode, expose, print, log, or commit credential values. Add and verify
`.gitignore` protection for local secret files before creating any local secret
file. Automated tests must not require real credentials.

## Deferred Features

Do not include these features in the initial MVP:

| Feature | Reason for deferral |
| --- | --- |
| Multimodal or file uploads | Text chat demonstrates the approved core journey. Uploads add file handling, provider differences, privacy, and storage concerns. |
| Web search | No LiteChat search service is documented, and hosted search is unavailable on the documented OpenAI Responses interface. |
| Streaming | The protocols use different stream formats and completion/usage events. Full responses reduce integration risk in the first implementation. |
| Payments or dollar-cost estimates | No approved prices, billing endpoint, or payment rules are available. Token counts are the approved metering scope. |
| Google OAuth | No provider integration is available or required. Keep the Google action disabled and marked as not connected. |
| Email verification and password recovery | The account system is local to one browser and has no email service or recovery channel. |
| Server-side accounts and deployment access control | Browser-local authentication does not protect `/api/chat` or shared proxy credentials. |
| Server-side conversation persistence or cross-device synchronization | `localStorage` meets the approved single-browser requirement without adding a database or account ownership model. |
| Advanced session management | Create, list, reopen, rename, and delete cover the approved session needs. Folders, sharing, and collaboration do not. |
| Model comparisons | Selecting one route per turn demonstrates user choice without parallel requests or comparison workflows. |
| Tools or agent workflows | They are not required for text chat and would add backend execution and security risks. |

## Testing Requirements

Automated testing is a major implementation requirement. Normal tests must mock
the external proxy and must not require real credentials. Tests must cover:

- Each protocol adapter.
- Request construction and response parsing.
- Token usage normalization.
- Route validation and missing credentials.
- Malformed proxy responses and proxy errors.
- Chat behavior and multi-turn conversations.
- Route switching.
- Loading and failure states.
- Saved conversation behavior.

A minimal real-proxy smoke test may be run later. Use the instructor-provided
credentials only through secure environment variables. Do not expose values in
logs, test output, screenshots, or command history.

## CodeRange Requirements and Unknowns

The application must bind to `0.0.0.0` and work through CodeRange. The exact
port, runtime version, and forwarded-host behavior are not established. Verify
these as runtime/deployment configuration before final launch. Preserve an
assigned `PORT`; when it is absent, the approved runtime default is `3000`, which
must match the CodeRange asset prefix. Do not invent another assigned value.
These unknowns are not product-design blockers and do not prevent planning the
approved MVP.

## Approved Deeda Presentation And Local Account Update

- User-facing product name: **Deeda**. Keep the external LiteChat proxy name,
  technical routes, credential variable names, and API contracts unchanged.
- Use the restrained purple/lavender Deeda identity and system fonts. Do not add
  external font or image assets.
- Provide a polished local account entry experience. It does not add an
  authentication service, account database, OAuth flow, cookies, server-issued
  sessions, or production access control.
- Keep valid existing local conversations by assigning the legacy
  `litechat.conversations.v1` data to the first account that successfully logs
  in, then use account-specific browser storage keys. Do not use the legacy key
  for normal account reads or writes.

## Remaining Uncertainties

Keep these items visible in the implementation plan and documentation. Do not
silently invent answers:

- The exact underlying model mapping behind each proxy interface.
- Whether the instructor expects additional model IDs.
- The exact CodeRange port, runtime, and forwarded-host configuration.
- Whether the instructor expects any feature beyond the written brief.

None of these uncertainties blocks planning or implementation of the approved
MVP unless new evidence shows that the information is required for a specific
task. If such a blocker appears, ask for the missing input at that time.

## Final Implementation And Verification Status

Deeda is implemented as a Next.js, React, and TypeScript LiteChat-style MVP.
Users can create and log in to browser-local accounts, create and manage
conversations, select among the supported LiteChat proxy interfaces, and view
per-response and conversation token usage when available. Conversations and
account records are stored in browser storage.

Account verification is browser-local UI authentication, not production
server-side authentication. There is no server-side identity system, email
verification, password recovery, OAuth, or cross-device synchronization.
`/api/chat` is not protected by production authentication. Proxy credentials
remain server-side environment variables: `BUILD_OPENAI_KEY`,
`BUILD_ANTHROPIC_KEY`, and `BUILD_GOOGLE_KEY`. Never record credential values in
this repository.

Manual verification on the GitHub-based Vercel deployment confirmed login,
workspace access, conversation creation, a real response through the
Anthropic-compatible proxy interface, multi-turn chat, and per-response and
conversation token usage. This does not prove that the available proxy
interfaces use distinct underlying vendor models. Automated localhost browser
verification passed and uses mocked chat responses.

Vercel is optional. To run locally, install dependencies with `npm ci`, set
only the needed proxy credentials in server-side environment variables or the
Git-ignored `.env.local`, then run `npm run dev`.

During manual testing, the CodeRange forwarded `/proxy/<port>/` environment
persistently remained on the Preparing screen. This is an environment-specific
observation, not a general application failure. Its root cause and a production
fix have not been established. The localhost automated browser checks passed,
and the GitHub-based Vercel deployment loaded and operated successfully.

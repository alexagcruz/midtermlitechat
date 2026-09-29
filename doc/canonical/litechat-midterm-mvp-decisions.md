# LiteChat Midterm MVP Decisions

- Status: Human-approved product and technical decisions.
- Approved: 2026-09-29.
- Source: User approval after review of
  `doc/study/1790657427_litechat_midterm_feasibility.md`.
- Scope: This document is authoritative for planning the initial ITENT 45
  midterm MVP. It does not authorize application implementation.

## Product Goal

Build a text-first, usage-metered prototype that presents selectable LiteChat
proxy routes in one chat interface. A user can have a multi-turn conversation,
save and manage conversations in the current browser.

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

Do not implement user registration, username/password authentication, or Google
OAuth for the initial MVP. Treat it as a restricted, single-user,
single-browser demonstration.

If CodeRange deployment exposure makes unrestricted use of the shared proxy
credentials unsafe, add an appropriate runtime access restriction. Treat this
as a deployment security requirement; do not silently expand the product into a
multi-user account system.

## Persistence

Use browser `localStorage` for conversation and displayed usage persistence. Do
not add a server database. Cross-device synchronization and server-side
conversation persistence are outside this MVP.

Document these limitations: browser data can be cleared or modified, storage is
limited by browser quota, and history does not sync between devices. Do not use
browser-stored token totals as authoritative billing or quota records.

## Approved Technology and Architecture

- **Framework and UI:** Next.js, React, and TypeScript.
- **Backend:** Next.js Route Handlers as a server-side backend-for-frontend
  (BFF).
- **Proxy integration:** Direct server-side HTTP requests to the LiteChat proxy,
  with one adapter per documented proxy protocol.
- **Conversation persistence:** Browser `localStorage`.
- **Database:** None for the initial MVP.

The browser sends chat content and a fixed route choice to a Route Handler. The
handler validates the choice, builds the request for that protocol, selects the
matching server-side credential, and calls the proxy. It returns assistant text
and normalized usage to the browser. Keep credentials and fixed upstream
endpoints on the server.

Next.js with React and TypeScript keeps the interactive UI and credential-safe
server endpoints in one application. Route Handlers provide the server-side
boundary between the browser and proxy. Direct HTTP adapters make the proxy's
different protocols explicit and testable. `localStorage` meets the approved
single-browser persistence requirement without introducing accounts, database
setup, or migrations.

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
| Google login or any user accounts | The approved deployment is a restricted single-user/single-browser demo. Accounts are not required for that journey. |
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
these as runtime/deployment configuration before final launch. Do not invent
values. These unknowns are not product-design blockers and do not prevent
planning the approved MVP.

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

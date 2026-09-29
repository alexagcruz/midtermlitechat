# ITENT 45 Midterm: LiteChat Feasibility and Product Study

- Study timestamp: `1790657427` (2026-09-29 UTC)
- Status: Product and technical recommendation; no application code exists yet.
- Scope: Define a small, defensible midterm MVP and study the public proxy
  documentation without using or exposing credentials.

## Executive Recommendation

The application is feasible as a small web chat with a server-side proxy
adapter. The smallest coherent product should let a user start a text
conversation, select among the proxy's documented API interfaces, continue a
multi-turn conversation, review token usage, and keep a small set of saved
conversations in that browser.

There is a significant product mismatch to resolve before implementation. The
LiteChat public marketing page presents OpenAI and Anthropic models. The supplied
proxy documentation lists OpenAI, Anthropic, and Google interfaces, but states
that all three interfaces use DeepSeek Flash and do not reproduce the named
providers' model behavior. Therefore, the UI must not claim that selecting an
interface gives access to a distinct OpenAI, Anthropic, or Google model unless
the instructor confirms that the proxy behavior or documentation has changed.

The midterm can demonstrate a unified chat interface, protocol-specific proxy
integration, model/interface selection, and transparent token metering. It
cannot honestly demonstrate distinct model behavior, dollar-based pay-as-you-go
billing, or a real purchase flow from the public information currently
available. Treat those as explicit limitations, not implied functionality.

Recommended baseline: TypeScript with Next.js, server-side Route Handlers as a
same-origin backend-for-frontend (BFF), direct HTTP calls to the documented
proxy endpoints, and browser-local conversation persistence. Do not add a
server database, account system, payment provider, file-upload pipeline, or web
search integration unless the instructor confirms that one is required.

## Evidence and Scope

The repository contains only `AGENTS.md`; it has no application code, package
manifest, tests, README, `.gitignore`, or existing product decisions. There is no
existing technology choice to preserve. This study follows the repository
workflow and does not change application code.

The instructor brief describes the observed production experience as including
multi-model chat, model switching, multimodal uploads, optional real-time web
search, saved conversations, username/password login, and Google login. Those
are treated as observed capabilities, not as automatic requirements for this
midterm.

The public LiteChat landing page describes unified access, model selection,
images/documents/PDFs/spreadsheets, web search, and saved sessions. Its visible
marketing names GPT-4o, GPT-5, and Claude Sonnet. The `/app` page returned a
username/password form and a Google login link. This is public-page inspection,
not authenticated use of the application.

The proxy documentation is branded “BUILD LLM Proxy.” The pages inspected were
public and did not require credentials. They identify the service as providing
OpenAI, Anthropic, and Google Gemini API interfaces. The docs revision shown on
the pages is 2026-09-19. No authenticated request was made. No credential value
was read, requested, or written.

## CORE MVP

### Core Value Proposition

LiteChat's product idea is one approachable interface for trying capable LLMs
without committing to a recurring subscription. Its essential user promise is
choice at the point of use: select an available model, ask a question, see the
answer, and understand the usage incurred.

For this assessment, the smallest demonstrable version is a text-only,
multi-turn chat that can target the proxy's documented provider interfaces and
show returned token counts. It should be presented as a usage-metered prototype,
not as a payment or billing system. The proxy documentation does not publish
prices, and no billing API or purchase flow was found.

### Primary User Journey

1. Open the application and start a new conversation without a registration
   flow, if the instructor approves a single-user or class-restricted demo.
2. Select one of the configured proxy interface/model presets.
3. Enter a text prompt and submit it.
4. Read the completed response and the usage reported for that response.
5. Send a follow-up that includes prior turns as conversation context.
6. Switch the selected interface/model for a later turn if desired.
7. Start another conversation, reopen a saved conversation, rename it, or
   delete it.

### Capabilities to Include

- A single chat screen with a clear new-conversation action.
- A fixed, validated selector for documented proxy routes. The documentation
  gives one example model ID for each route; it does not document a model
  catalogue endpoint.
- Text prompts and assistant text responses, with multi-turn history.
- Switching the selected route/model between turns. The application must
  translate its common message representation into the selected interface's
  request format.
- Full-response requests (not streaming) for the first implementation. Show a
  pending state while waiting.
- Browser-local saved conversations with create, list, reopen, rename, and
  delete behavior. This is limited session management, not account sync or
  collaboration.
- Per-response input/output/total token counts when the proxy returns them, and
  a conversation total computed from known responses. Label missing usage as
  unavailable; do not treat it as zero.
- Clear, safe error states. Keep the user's prompt when a request fails. Do not
  create a successful-looking assistant response for a failed request.
- A visible notice that token counts are usage information and that the MVP
  does not calculate a charge or process payment.

### Metering and Cost Presentation

“Metered, a-la-carte” should mean that the prototype associates usage with each
completed model request instead of implying an unlimited recurring plan. The
proxy provides token metadata in documented successful responses:

- OpenAI Chat Completions: `prompt_tokens`, `completion_tokens`, and
  `total_tokens`.
- Anthropic Messages: `input_tokens` and `output_tokens`.
- Google Gemini: `promptTokenCount`, `candidatesTokenCount`, and
  `totalTokenCount`.

The app can show these counts per response and sum known counts within a local
conversation. The Anthropic total can be displayed as input plus output tokens,
with the UI making clear that it is a calculated total if no total field is
returned. Failed requests may have unknown usage. Do not infer usage from text
length.

The public proxy docs provide no token prices, currency, billing endpoint,
account balance, or charge receipt. Do not display dollars, claim to charge per
token, or call the result an invoice. A trustworthy dollar estimate requires an
approved price schedule that matches the actual upstream service and model.
Actual payment or server-authoritative usage accounting would also require
additional backend persistence and identity controls.

### Authentication and Session Behavior

Authentication is not needed to demonstrate chat, interface selection, or
browser-local saved conversations. Defer username/password accounts, Google
OAuth, password recovery, and multi-user administration for a class-restricted
single-user MVP. Store chats and displayed usage in the user's browser, not on a
shared server. Clearing browser data can erase those sessions; conversations do
not sync between devices.

This recommendation is conditional. If the CodeRange deployment is reachable
by untrusted users, shared proxy credentials can be used by anyone who can call
the backend. Do not expose an unrestricted proxy-backed application publicly.
Before deployment, confirm whether CodeRange access is already restricted or
whether a minimal access gate, user authentication, rate limits, and server-side
usage controls are required. For real multi-user service behavior, authenticate
users and enforce ownership and usage limits on the server; localStorage is not
an authority for billing or quotas.

## IMPORTANT BUT DEFERRED

- **True provider/model diversity.** The proxy docs currently say the three
  interfaces all use DeepSeek Flash. Resolve this discrepancy before presenting
  the routes as distinct underlying models.
- **Full authentication.** The production experience visibly offers
  username/password and Google login. These are valuable for cross-device
  persistence, privacy boundaries, and server-side usage attribution, but they
  add account security and external identity-provider work. Add only if required
  by the rubric or deployment exposure.
- **Server-persisted sessions.** Browser-local persistence is enough for a
  single-browser demonstration. A database is appropriate if users need
  accounts, cross-device history, server-authoritative usage, or durable storage
  beyond browser state.
- **Streaming.** The proxy supports streaming, but the three protocols emit
  different server-sent event (SSE) formats and have different completion and
  usage events. A normalized non-streaming flow is lower risk for the initial
  demonstration. Add streaming only after response parsing, error handling, and
  usage accounting work reliably.
- **Multimodal uploads.** Image and provider file APIs are described, but the
  user journey, upload requests, retention, per-route support, and safe file
  handling add scope. The overview states a 64 MiB per-file limit, 100 files and
  256 MiB per account/provider, and one-hour file expiry. Audio and video
  generation are not supported. These limits do not make uploads a core need.
- **Web search.** The OpenAI Responses page explicitly says hosted search is
  unavailable. The docs describe tool calls as actions that the application
  backend must execute; no LiteChat search endpoint or search service was
  documented. Defer search rather than imply that a model response is current
  web research.
- **Payments and dollar-cost estimates.** No price table, billing API, payment
  integration, or balance service is documented. Defer all of these until the
  instructor supplies the required commercial rules and external service
  details.
- **Advanced session features.** Folders, sharing, collaboration, conversation
  export, cross-device synchronization, and account-level session management
  are not required for the core demonstration.

## UNNECESSARY FOR THIS MIDTERM

Unless the instructor changes the assessment scope, omit:

- Google login, social login, registration, password reset, and full account
  administration.
- Payment-card collection, subscriptions, checkout, refunds, or claims of
  monetary billing.
- A dynamic provider catalogue when the proxy documents no catalogue endpoint.
- Model comparisons, parallel multi-model answers, and routing or automatic
  model selection.
- Function calling, backend-executed tools, agent workflows, and arbitrary
  provider parameters.
- File upload, PDF/spreadsheet parsing, image understanding UI, audio, and
  video.
- Web search, citations, or claims that results are grounded in current web
  content.
- Production-scale multi-tenant administration, team spaces, and analytics.

## Proxy/API Findings

### Endpoint and Authentication

The public proxy documentation instructs callers to make JSON requests from a
backend. It explicitly says to keep keys out of browser code and public
repositories.

| Interface | Base URL and request path | Authentication header | Documented example model |
| --- | --- | --- | --- |
| OpenAI Chat Completions | `https://proxy.litechat.ai/openai/v1/chat/completions` | `Authorization: Bearer <key>` | `gpt-5.6-luna` |
| OpenAI Responses | `https://proxy.litechat.ai/openai/v1/responses` | `Authorization: Bearer <key>` | `gpt-5.6-luna` |
| Anthropic Messages | `https://proxy.litechat.ai/anthropic/v1/messages` | `x-api-key: <key>` and `anthropic-version: 2023-06-01` | `claude-haiku-4-5-20251001` |
| Google Gemini generateContent | `https://proxy.litechat.ai/google/v1beta/models/gemini-3.8-flash:generateContent` | `x-goog-api-key: <key>` | `gemini-3.8-flash` |

The overview provides base URLs `https://proxy.litechat.ai/openai/v1`,
`https://proxy.litechat.ai/anthropic`, and `https://proxy.litechat.ai/google`.
It says the OpenAI Chat Completions and Responses interfaces share the OpenAI
key. All example requests use `Content-Type: application/json`.

The docs' examples refer to backend environment variable names
`BUILD_OPENAI_KEY`, `BUILD_ANTHROPIC_KEY`, and `BUILD_GOOGLE_KEY`. These names
are the only credential configuration names established by the public examples.
They do not prove whether the instructor's supplied credentials are keys issued
by this proxy or ordinary provider credentials accepted by the proxy. Confirm
that with the instructor before making authenticated calls.

### Protocols and Payloads

These are separate request protocols, not one identical wire format:

- **OpenAI Chat Completions:** POST JSON with `model` and a `messages` array.
  Read `choices[0].message.content`; inspect
  `choices[0].finish_reason`. Tool calls can replace ordinary answer text.
- **OpenAI Responses:** POST JSON with `model` and `input`; response content is
  in typed `output` items. Check `status`. The docs say stored-response
  retrieval and `previous_response_id` are not supported; send conversation and
  tool history in subsequent requests. Hosted search and code execution are
  unavailable.
- **Anthropic Messages:** POST JSON with `model`, `messages`, and `max_tokens`;
  send system instructions using `system`. Read text blocks from `content` and
  inspect `stop_reason`.
- **Google Gemini:** The model is part of the URL. POST `contents` with parts;
  read text from `candidates[].content.parts[]` and inspect `finishReason`.

The application should maintain one internal representation of text messages
and have a small adapter for each documented protocol. Test request construction
and response/usage normalization separately. Do not pass arbitrary browser
URLs, model IDs, or headers through to the proxy.

### Model Availability and Identity

The docs give one example model identifier for each interface, not a catalogue
or discovery API. They do not establish that the marketing-page model names are
accepted by the proxy. The proxy overview also says: “BUILD LLM Proxy uses
DeepSeek Flash for all three provider interfaces. The interfaces do not
reproduce the named providers' model behavior.”

This is the highest product risk. The names in the request examples appear to
identify interface presets, but the docs do not explain the exact upstream
model mapping or whether it is stable. Use only the documented IDs until the
instructor confirms otherwise. Label choices accurately as proxy routes or
presets, and disclose the shared engine as stated in the docs. Do not market
them as three distinct providers' model behavior without confirmation.

### Streaming, Usage, and Errors

All three provider pages document streaming, but each has a different SSE event
shape and completion marker. OpenAI Chat Completions uses `choices[].delta` and
`[DONE]`; OpenAI Responses uses typed events such as
`response.output_text.delta` and terminal response events; Anthropic uses
message/content-block events and `message_stop`; Gemini uses SSE data with
candidate/usage details and no `[DONE]` sentinel. The docs warn to detect
interruption or stream errors. OpenAI Chat Completions can include usage chunks
with `stream_options.include_usage`. Use non-streaming first.

The overview documents these error classes:

- `400`: correct the request.
- `401`/`403`: check the key, provider, and expiry.
- `429`: reduce overlapping requests and use a bounded delay. No numeric quota
  or retry schedule is published.
- `502`/`504`: the upstream request failed.
- `503` or persistent failures: contact the administrator.

The docs warn not to retry automatically after partial output arrives and state
that usage can be unknown after a failure. For non-streaming requests, show a
retry action to the user instead of silently replaying the request. Never log
credential values or expose raw credential-bearing headers in errors.

### Limits and Undocumented Behavior

No numeric request rate, token quota, spending cap, price, or service-level
guarantee was found in the public docs. A `429` response is mentioned without a
published threshold. The proxy's administration page is linked, but this study
did not access it or assume its contents.

The overview says image inputs and provider file APIs are available. Files are
private to an account and provider and expire after one hour; documented limits
are 64 MiB per file, 100 files, and 256 MiB per account/provider. The docs do
not establish a complete, uniform upload workflow for this application, so this
is not a recommendation to implement uploads in the MVP.

No OpenAPI document was found at `https://proxy.litechat.ai/docs/openapi.json`
(the URL returned 404). The public docs are therefore the available contract
for this study. No other API behavior is assumed.

## Recommended Technology and Architecture

### Application and Frontend

**Recommendation: Next.js with TypeScript and React.** Next.js provides the
interactive web UI and server Route Handlers in one application. This fits a
chat-heavy interface while keeping proxy credentials and outbound requests on
the server. One runtime and one origin also avoid a separate frontend/backend
deployment and most browser CORS configuration.

Use React client components for the interactive conversation, selector, and
session list. Keep proxy calls in server-only code. The UI should present a
clear text-first chat, a modest model/route selector, response-level usage, and
a compact saved-session list; it should not imitate every production feature.

**Reasonable alternative:** Vite + React with a separate Express/Fastify API.
This separates frontend and API concerns and is a familiar architecture, but it
adds another server, a cross-origin/development-proxy setup, and more deployment
configuration for a small midterm.

### Backend and LLM Integration

**Recommendation: Next.js Route Handlers as a BFF, using server-side `fetch`
and one adapter per documented API protocol.** The browser submits an
allowlisted route/model choice and conversation messages. A server handler
validates the request, selects the fixed endpoint and matching server
credential, maps the internal conversation into the provider format, calls the
proxy, and returns normalized assistant text plus usage metadata.

This design keeps credentials out of JavaScript bundles, browser network
requests, and localStorage. Use no general-purpose provider SDK initially:
the proxy already exposes three different wire protocols, and direct HTTP
requests make the actual endpoints, headers, payloads, and tests explicit.

**Reasonable alternative:** a unified model SDK or provider abstraction library.
It can reduce some format-specific code, but may not match this proxy's base
URLs, model aliases, or feature limits. It can also obscure which protocol and
usage fields the proxy actually returns. Reconsider only if it demonstrably
supports these exact endpoints.

The handler should use an allowlist; cap request size and history length; reject
unknown roles/models; avoid accepting a client-supplied endpoint; set a bounded
request timeout; map upstream errors to safe user messages; and never return
secret headers or raw configuration. Tool execution is outside the MVP.

### Persistence and Data Model

**Recommendation: no server database for the approved single-browser MVP.**
Use browser `localStorage` for text-only sessions and their visible usage
records. This is the smallest solution for create/list/reopen/rename/delete
behavior, requires no database account or migration workflow, and avoids storing
conversation text on the application server.

Suggested logical data shape:

- `Conversation`: `id`, `title`, `createdAt`, `updatedAt`, selected route/model
  key, and ordered messages.
- `Message`: `id`, `role` (`user` or `assistant`), `text`, `createdAt`, route/model
  key used for the response, and nullable normalized usage.
- `Usage`: nullable `inputTokens`, `outputTokens`, and `totalTokens` attached to
  a completed assistant request. Keep failed/unknown usage distinct from zero.

Generate IDs in the application, derive a short initial title from the first
prompt, and update conversation timestamps when messages or names change. Set
reasonable size limits and handle storage quota errors. Never place proxy
credentials in this data.

**Tradeoff and alternative:** localStorage can be cleared, is limited by browser
quota, is editable by the user, and does not sync. Use SQLite (with a
server-side database layer and migrations) only if accounts, cross-device
history, durable server sessions, or auditable usage become requirements. At
that point also add user ownership to every conversation/message and enforce it
server-side. Do not treat browser-stored token counts as billing records.

### Authentication and Authorization

Do not implement end-user accounts for the initial restricted demo unless the
instructor confirms they are required. The prototype still must protect the
proxy keys: all keys remain server-side. If the deployed URL is available to
untrusted users, a browser-local session is not access control. Require an
approved access restriction or implement a human-approved minimum gate before
deployment. A multi-user product requires real identity, per-user conversation
ownership, and server-side quotas; this is a material scope increase.

### Validation, Security, and Failure Behavior

- Load proxy keys from server environment variables only. Never hardcode them,
  return them to the browser, or write their values to logs, docs, tests, or Git.
- The repository currently has no `.gitignore`. Add and verify ignore rules for
  `.env*` secret files before using local secrets. Use `.env.local` only for
  development and provide a value-free environment example if needed.
- Validate route/model choices against a fixed server allowlist. Validate
  message roles, lengths, message count, and content type before making proxy
  calls.
- Render returned text as text, not trusted HTML. Do not execute model-generated
  instructions or tool calls.
- Use rate limiting or an access restriction appropriate to actual deployment
  exposure. Shared instructor credentials create an abuse and cost risk.
- Show safe errors for invalid requests, missing/invalid credentials, rate
  limits, upstream outages, and malformed responses. Do not expose secrets or
  raw upstream internals. Do not automatically retry failed calls.
- Document that prompts are sent to the external proxy. Do not promise data
  retention or privacy properties beyond what the proxy documentation states.

## Testing and Validation Strategy

The tests should define product behavior, not implementation shape:

- Unit tests for each protocol adapter: URL, required headers, body conversion,
  response text extraction, finish-state handling, and token normalization.
- Unit tests for unknown/missing usage, malformed payloads, unexpected model
  IDs, and each documented error class. Assert that secret values are not
  included in returned errors or logs.
- Route tests with mocked outbound `fetch`: correct credential selected for a
  route, no key in response, request validation, timeout/upstream errors, and no
  uncontrolled retry.
- UI tests for starting a chat, switching route/model, showing pending/error
  states, preserving a prompt on failure, displaying token usage, and
  create/reopen/rename/delete behavior.
- End-to-end tests against a mocked proxy for the primary multi-turn journey.
  Tests must not need real credentials or incur proxy usage.
- A manual, low-volume proxy smoke test only after the instructor confirms the
  key type, model mapping, and approved environment setup. Keep secret values
  out of command history, test output, screenshots, and logs.
- Runtime verification through the actual CodeRange forwarded host, not only a
  localhost check. Also verify responsive layout at desktop and mobile widths.

No application tests or runtime checks were run because this repository does
not contain an application yet.

## CodeRange and Reproducibility

`AGENTS.md` requires externally accessible CodeRange applications to bind to
`0.0.0.0` and the required port and to account for the forwarded-host
environment where applicable. The repository and available study inputs do not
identify the required port, Node version, forwarded-host variable, build/start
command, or persistent-volume behavior. Verify these against the actual
CodeRange configuration before selecting deployment settings; do not assume a
localhost success proves external access.

Once the stack is approved, commit the standard dependency manifest and lockfile
and document exact fresh-clone commands for dependency installation,
configuration, tests, production build, and startup. Do not depend on globally
installed packages or ignored local state. A database is not required for the
recommended initial MVP. Keep all local secret files ignored and confirm that
required manifests are not ignored.

## Exogenous Inputs

- **Proxy credentials:** The instructor supplied OpenAI-, Anthropic-, and
  Google-associated credentials. Public proxy examples name server environment
  variables `BUILD_OPENAI_KEY`, `BUILD_ANTHROPIC_KEY`, and `BUILD_GOOGLE_KEY`.
  The values must only be supplied through an approved secret environment. They
  must not be written to tracked files or printed during verification.
- **Credential provenance and authorization:** Confirm whether these are keys
  issued for the LiteChat proxy, what endpoints each key can call, and whether
  live test requests are authorized. Do not assume they are ordinary direct
  provider API keys or that they have particular quotas.
- **Actual model mapping:** Instructor or proxy administrator confirmation is
  needed because public docs say all three routes use DeepSeek Flash.
- **Pricing and billing rules:** Required only if the assessment expects a
  monetary estimate, charge, or balance. No rate schedule or billing input is
  currently available.
- **CodeRange deployment facts:** Confirm the assigned port, runtime version,
  forwarded-host behavior, deployment visibility/access restriction, and
  whether local files persist between restarts.
- **Authentication decision:** If individual accounts are required, identify
  the expected identity system and whether Google OAuth credentials/accounts
  are available. Neither is needed for the recommended restricted demo.
- **Optional search/upload services:** Not needed for the recommended MVP. If
  added later, their API credentials, quotas, privacy terms, and allowed data
  sources must be supplied and reviewed first.

## Risks and Tradeoffs

- **Product truthfulness:** The proxy's shared DeepSeek Flash engine may mean
  the app cannot demonstrate genuinely different provider/model behavior. This
  needs a human decision before UI labels and acceptance criteria are fixed.
- **Credential exposure and abuse:** A public backend using shared keys can
  generate unauthorized proxy usage. Keep keys server-side and establish the
  deployment access policy before publishing the app.
- **No financial metering:** Token counts are available, but prices and billing
  behavior are not. Do not imply that token usage equals a specific currency
  charge.
- **Protocol differences:** Each route has different payload, response, usage,
  error, and streaming formats. Adapters and mocked tests are needed; blindly
  sharing a request shape will fail.
- **Browser-only persistence:** Users can lose or modify local history and
  usage. This is acceptable for a demo, not authoritative billing or
  multi-device service behavior.
- **External service instability:** Invalid/expired credentials, rate limits,
  and upstream errors can interrupt the demo. A clear error state and mocked
  tests reduce but do not remove this dependency.
- **Unverified CodeRange details:** Port, host forwarding, runtime, and storage
  behavior must be confirmed during planning and execution.

## OPEN QUESTIONS Requiring Human Approval

1. **Proxy/model mismatch:** Is the public proxy documentation current and
   authoritative for the instructor's credentials? Should the MVP present
   three protocol routes that all currently use DeepSeek Flash, or is there a
   different proxy configuration that provides distinct OpenAI, Anthropic, and
   Google models? Which labels are acceptable for the assessment?
2. **Credential provenance:** Are the supplied values keys specifically
   accepted by `proxy.litechat.ai` for their respective routes? Confirm without
   sending the values in chat or putting them in repository files.
3. **Metering acceptance:** Is reporting proxy-returned token counts sufficient
   to demonstrate “metered, a-la-carte,” or does the instructor expect cost
   estimates, actual charges, or a payment flow? If costs are expected, provide
   the approved rates and currency source.
4. **Authentication and exposure:** Is the CodeRange application private or
   otherwise protected? Is login part of the grading rubric? Approve whether a
   restricted, single-browser demo is acceptable or whether user accounts and
   server-side usage limits are required.
5. **Session persistence:** Is browser-local saved history acceptable, including
   loss when browser data is cleared, or is server-side/cross-device persistence
   required?
6. **Available model list:** Are the three example model IDs in the public docs
   the approved complete list, or is there a private/current catalogue or
   model configuration the instructor expects us to use?
7. **CodeRange runtime:** What port and Node/runtime version are assigned? What
   forwarded-host settings and persistent storage behavior apply to this
   project?
8. **Evaluation priorities:** Does the rubric explicitly require uploads, web
   search, Google login, or another observed production feature? The brief says
   these are not automatically required; confirmation would change the MVP.

## Sources

Public pages accessed 2026-09-29. No authenticated access was performed.

- LiteChat landing page: <https://litechat.ai/>
- LiteChat application login page: <https://litechat.ai/app>
- Proxy overview and setup: <https://proxy.litechat.ai/docs>
- OpenAI Chat Completions: <https://proxy.litechat.ai/docs/openai/chat-completions>
- OpenAI Responses: <https://proxy.litechat.ai/docs/openai/responses>
- Anthropic Messages: <https://proxy.litechat.ai/docs/anthropic/messages>
- Google Gemini: <https://proxy.litechat.ai/docs/google/gemini>
- OpenAPI-document probe: <https://proxy.litechat.ai/docs/openapi.json> (404)

# LiteChat Midterm MVP Implementation Plan

- Plan timestamp: `1790658472` (2026-09-29 UTC)
- Status: Approved product decisions recorded; implementation not started.
- Basis:
  - `doc/study/1790657427_litechat_midterm_feasibility.md`
  - `doc/canonical/litechat-midterm-mvp-decisions.md`
  - Instructor brief and approved clarifications.
- Scope: Implement the approved text-first, token-metered, single-browser MVP.

## Goal

Build one web chat interface that lets a user select one of three documented
LiteChat proxy routes, send text prompts, continue multi-turn conversations,
switch routes between turns, see available token usage, and manage saved
conversations in the current browser.

The MVP reports token usage. It does not process payments, show monetary costs,
or claim that the documented routes use distinct underlying vendor models. The
public proxy documentation says that all three interfaces currently use
DeepSeek Flash. Present them as proxy routes/interfaces or presets.

## Repository Baseline

The repository contains `AGENTS.md`, the completed study, and the approved
canonical decisions. It has no application code, package manifest, lockfile,
tests, README, or `.gitignore`. The current branch is `main` and the worktree is
clean as this plan is written.

## Fixed Proxy Contract

The browser may send only a fixed route identifier and validated text message
history to the application backend. The backend owns the route table, endpoint
paths, model IDs, and credential selection. Never accept an arbitrary endpoint,
header, or model ID from the browser.

| Route ID (internal) | Protocol | Fixed model preset | Request path | Authentication |
| --- | --- | --- | --- | --- |
| `openai-chat` | OpenAI-compatible Chat Completions | `gpt-5.6-luna` | `/openai/v1/chat/completions` | `Authorization: Bearer` with `BUILD_OPENAI_KEY` |
| `anthropic-messages` | Anthropic-compatible Messages | `claude-haiku-4-5-20251001` | `/anthropic/v1/messages` | `x-api-key` with `BUILD_ANTHROPIC_KEY`; `anthropic-version: 2023-06-01` |
| `google-generate-content` | Google-compatible Gemini `generateContent` | `gemini-3.8-flash` | `/google/v1beta/models/gemini-3.8-flash:generateContent` | `x-goog-api-key` with `BUILD_GOOGLE_KEY` |

Use the documented proxy host `https://proxy.litechat.ai` in server-side route
configuration. Keep endpoint paths and model IDs fixed in server code. Do not
add a dynamic model catalogue. The OpenAI route in this MVP is Chat Completions;
the separate OpenAI Responses interface is not an additional selector option.

## Implementation Checklist

Update this checklist during EXECUTE PLAN. Do not mark tasks complete during
planning.

### 1. Prepare the Project and Secret Handling

- [ ] Before execution, check Git status and create a feature branch from the
  approved base. Do not overwrite existing work.
- [ ] Verify the available local Node.js and npm versions. Check the selected
  Next.js release requirements. Record the unresolved CodeRange runtime facts
  without inventing them.
- [ ] Create a Next.js App Router project using TypeScript, React, and npm.
- [ ] Add `.gitignore` protection for `.env*` local secret files before creating
  or populating any local environment file. Keep a value-free `.env.example`
  trackable if used.
- [ ] Verify the ignore rule with Git (for example, check that `.env.local` is
  ignored). Do not create a real secret file before this check passes.
- [ ] Commit `package.json` and `package-lock.json`. Declare all runtime and test
  dependencies. Use `npm ci` as the reproducible clean-install command.
- [ ] Add scripts for development, lint/type checks, automated tests, production
  build, and production start. Document the exact commands after verifying them.
- [ ] Add the approved environment-variable names to setup documentation and, if
  created, `.env.example`; include names only and no values.
- [ ] Confirm that no secret values are in source, Git, fixtures, logs, browser
  bundles, or browser storage.

### 2. Define Shared Types, Fixed Routes, and Validation

- [ ] Define one internal message type for the MVP. It must represent a text
  message with a `user` or `assistant` role and content. Do not add file, tool,
  or multimodal message types.
- [ ] Define fixed route identifiers for the three approved proxy presets in
  this plan. Keep base URL, path, model ID, auth-header strategy, and environment
  variable name in server-only configuration.
- [ ] Define normalized server response and usage types. Represent unavailable
  input, output, or total token counts as `null`/unknown, not zero. Track whether
  a total came from the proxy or was calculated from known input and output.
- [ ] Define a normalized assistant response with text, route ID, completion
  state, and nullable usage.
- [ ] Add request validation (Zod is the planned schema validator) for the route
  ID, message roles, message content, message count, and serialized request size.
  Reject unsupported fields, roles, and route IDs.
- [ ] Set and document conservative maximums for message count, individual
  message length, and total request size. Enforce them on the server, and test
  just-below, at-limit, and over-limit cases.
- [ ] Ensure validation cannot be bypassed by sending an endpoint, model ID,
  credential, or arbitrary header in the client request.

### 3. Implement Browser-Local Conversation Storage

- [ ] Define versioned localStorage data for conversations, messages, selected
  route, timestamps, and per-assistant-response usage. Do not store credentials.
- [ ] Implement create, list, reopen/select, rename, and delete operations.
- [ ] Generate a local conversation ID and a simple initial title from the first
  user prompt. Do not call an LLM to create titles.
- [ ] Update the conversation timestamp when its name or messages change.
- [ ] Validate data when reading localStorage. Handle empty, invalid, outdated,
  or corrupted data without crashing the application.
- [ ] Handle storage quota/write errors with a clear message. Do not claim that
  history is backed up or synchronized.
- [ ] Calculate conversation totals from known per-response usage. If one or more
  responses have unavailable usage, identify the totals as known/partial; never
  silently count unknown usage as zero.
- [ ] Add unit tests for create, list, select/reopen, rename, delete, reload
  persistence, corrupted data, and storage write failure.

### 4. Implement the Server Route Handler and Proxy Adapters

- [ ] Add a same-origin Next.js Route Handler for chat requests (for example,
  `POST /api/chat`). Keep all proxy calls and credentials on the server.
- [ ] Require the client to send a fixed route ID and validated conversation
  history. Derive the URL, path, model ID, and credential on the server.
- [ ] Read `BUILD_OPENAI_KEY`, `BUILD_ANTHROPIC_KEY`, and `BUILD_GOOGLE_KEY` only
  from the server environment. If the selected route's key is missing, return a
  safe configuration error without exposing the value or logging a secret.
- [ ] Implement the OpenAI Chat Completions adapter. Construct the documented
  JSON request with the fixed model and message history; use the Bearer header;
  parse assistant text, finish reason, and `prompt_tokens`,
  `completion_tokens`, and `total_tokens` when present.
- [ ] Implement the Anthropic Messages adapter. Construct the documented JSON
  request with the fixed model and message history; use `x-api-key` and
  `anthropic-version: 2023-06-01`; parse text content blocks, stop reason,
  `input_tokens`, and `output_tokens`.
- [ ] Implement the Google Gemini `generateContent` adapter. Construct the
  documented `contents` payload at the fixed model path; use `x-goog-api-key`;
  parse candidate text parts, finish reason, and
  `promptTokenCount`, `candidatesTokenCount`, and `totalTokenCount`.
- [ ] Normalize the three responses to the common assistant response and usage
  types. For Anthropic, derive a total only if both input and output are known;
  mark it as calculated. Preserve a missing count as unknown.
- [ ] Validate the upstream response shape before returning it. Treat missing
  assistant text, malformed JSON, unsupported tool-call-only responses, and
  invalid usage fields as safe errors rather than success with blank text.
- [ ] Check completion/finish state. Where the proxy reports an incomplete or
  length-limited answer, return the text with an explicit incomplete status if
  available; do not silently label it complete.
- [ ] Apply a bounded upstream request timeout. Do not automatically retry a
  proxy request. The user may manually retry after reviewing an error.
- [ ] Map request, configuration, authorization, rate-limit, malformed-response,
  timeout, and upstream-service failures to safe application errors. Cover proxy
  `400`, `401`/`403`, `429`, `502`, `503`, and `504` behavior. Do not expose raw
  credential-bearing headers or sensitive upstream details.
- [ ] Keep errors and logs free of prompt contents unless specifically needed
  for a safe local development diagnostic; never log secrets. Production errors
  must not reveal environment values.
- [ ] Add adapter and Route Handler tests using mocked `fetch`. Cover the exact
  request path, headers, model, body mapping, response parsing, usage mapping,
  missing credentials, invalid route/model, malformed response, auth failure,
  rate limiting, timeout, and upstream errors.

### 5. Implement the Chat Interface

- [ ] Build a responsive text-first chat view with a fixed selector for the
  three approved route labels. Describe choices as proxy routes/interfaces or
  presets, not as guaranteed distinct underlying vendor models.
- [ ] Provide a new-conversation action, conversation list, route selector,
  message history, prompt input, and send action.
- [ ] On submit, add the user's message to the active conversation before the
  request. Keep it visible and saved if the request fails.
- [ ] Send the active route ID and prior user/assistant messages to the Route
  Handler. Preserve all successful turns when the route changes.
- [ ] Prevent duplicate submissions while a request is pending. Show a loading
  state, then append the normalized assistant response on success.
- [ ] On failure, show a safe actionable error and keep the user's prompt. Do not
  append a successful-looking assistant answer and do not automatically retry.
- [ ] Allow a manual retry without duplicating the failed user's message in
  conversation history.
- [ ] Persist successful conversation changes, route choice, and usage in
  localStorage. Persist the user prompt even if its proxy request fails.
- [ ] Show per-response input, output, and total tokens where available. Mark
  unavailable counts clearly. Show conversation totals as known/partial when
  some responses have missing usage.
- [ ] Display a persistent or readily visible notice: token counts are usage
  information, not monetary charges or proof of payment.
- [ ] Add component tests for new conversation, prompt send, assistant response,
  multi-turn context, route switching, loading, safe failure, prompt
  preservation, usage display, and manual retry.

### 6. Complete Automated and End-to-End Tests

- [ ] Use Vitest and React Testing Library for unit and component tests, with a
  DOM environment suitable for localStorage tests.
- [ ] Use Playwright for the main browser-level flow. Mock the application chat
  endpoint or proxy in browser tests so the test cannot use real credentials.
- [ ] Confirm the normal test command passes with all three real credential
  environment variables unset.
- [ ] Cover OpenAI, Anthropic, and Google request construction and response
  parsing independently.
- [ ] Cover token normalization, derived Anthropic total, missing usage, and
  conversation totals containing both known and unknown usage.
- [ ] Cover invalid route/model, arbitrary endpoint fields, missing selected
  credential, proxy authentication failure, rate limiting, malformed response,
  timeout, and upstream service errors.
- [ ] Cover the end-to-end flow: start a conversation, send a message, receive a
  response, send a follow-up with prior history, switch route, and receive the
  next response.
- [ ] Cover saved conversation create/list/reopen/rename/delete and persistence
  after a browser reload.
- [ ] Cover loading and error behavior, including preservation of a failed
  prompt and no automatic retry.
- [ ] Confirm test fixtures contain no real credentials and no test sends
  requests to `proxy.litechat.ai`.

### 7. Document Setup, Security, and Existing Behavior

- [ ] Add a README with exact dependency installation, environment setup,
  development, lint/type-check, test, build, and production start commands.
- [ ] Document the required environment-variable names only. State how to set
  them securely without documenting or printing their values.
- [ ] Document that prompts are sent to the LiteChat proxy; route names identify
  proxy interfaces/presets and do not promise distinct upstream models; token
  usage is not monetary billing.
- [ ] Document localStorage behavior: data is browser-local, can be cleared or
  modified, has browser storage limits, and does not sync across devices.
- [ ] After implementation is verified, update `doc/wiki/` to describe only
  existing functionality and exact setup/runtime commands.
- [ ] Add relevant notes to `doc/wiki/footguns/`, including secret-file ignore
  rules, proxy-route/model identity, missing usage handling, and the fact that
  localhost success does not prove CodeRange access.
- [ ] Check all required manifests, lockfiles, and documentation are tracked and
  not accidentally excluded by `.gitignore`.

### 8. Verify Reproducibility and CodeRange Runtime

- [ ] From a clean clone of the committed application, run `npm ci` without
  relying on globally installed or untracked packages.
- [ ] Configure no real secrets for the normal test/build checks. Confirm that
  tests and the production build pass with credentials unset.
- [ ] Run documented lint/type-check, automated test, build, and startup commands
  from the clean clone.
- [ ] Verify the application server binds to `0.0.0.0` and reads the actual
  platform-assigned port from verified runtime configuration. Do not hardcode or
  invent the CodeRange port.
- [ ] Verify forwarded-host behavior and test through the actual external
  CodeRange URL. A localhost test alone is not acceptance.
- [ ] Determine whether CodeRange exposure is restricted. If unrestricted access
  would expose shared credentials to abuse, add an approved runtime access
  restriction before public launch. Do not expand into user accounts.
- [ ] Verify mobile and desktop layouts and the browser-local session flow on
  the deployed runtime.
- [ ] If instructor-approved credentials are available through secure runtime
  configuration and live requests are authorized, send one minimal smoke-test
  request per route. Confirm response parsing and usage without printing or
  recording credential values. If authorization or keys are unavailable, skip
  the live test and report this as an external limitation; mocked tests remain
  required and sufficient for code acceptance.

## Acceptance Criteria

All criteria are observable and must pass before rendezvous:

- [ ] The application presents one unified, responsive text-chat interface.
- [ ] The selector contains exactly the three fixed, documented route presets
  unless an approved documentation update adds another preset.
- [ ] Route labels do not claim that the interfaces are distinct underlying
  OpenAI, Anthropic, and Google models. The documented DeepSeek Flash mapping is
  disclosed as a proxy documentation statement or is clearly marked unverified
  if the documentation changes.
- [ ] A user can start a new conversation, send a text prompt, and see a
  normalized assistant response.
- [ ] Follow-up requests include prior successful user and assistant messages.
- [ ] A user can switch routes between turns without losing conversation
  history; each assistant response identifies the route used.
- [ ] Loading state is visible while the app waits for the proxy.
- [ ] On failure, the user sees a safe error, the submitted prompt remains in
  the conversation, no false assistant success is shown, and no automatic
  retry occurs.
- [ ] Responses show input/output/total token values when available. Missing
  values remain unknown, not zero. Anthropic totals derived from input plus
  output are identified as calculated.
- [ ] Conversation totals sum known usage and are marked partial/known if a
  response has unavailable usage.
- [ ] The app clearly states that token usage is not a monetary charge, invoice,
  balance, or proof of payment.
- [ ] Conversations can be created, listed, reopened, renamed, and deleted, and
  remain available after reload in the same browser.
- [ ] Browser-local limitations are documented. No conversation or usage data
  syncs to a server or another device.
- [ ] The browser cannot choose a proxy endpoint, arbitrary model ID, credential,
  or upstream header. The server uses only the fixed route allowlist.
- [ ] No credential value appears in source, Git history, tracked environment
  files, test output, logs, browser code, network responses, or localStorage.
- [ ] `.gitignore` excludes local secret files before any local secret file is
  created; the value-free environment example, if present, is safe to track.
- [ ] Automated tests pass with mocked external responses and with real proxy
  credentials unset. No normal automated test makes an external proxy request.
- [ ] The dependency lockfile supports a clean `npm ci`; tests, build, and
  documented startup work from a fresh clone.
- [ ] Final CodeRange verification confirms binding to `0.0.0.0`, uses the
  assigned port without inventing it, and succeeds through the forwarded host.
- [ ] No explicitly deferred feature is present in the MVP.

## OPEN QUESTIONS

### A. BLOCKS IMPLEMENTATION

None. The human-approved scope, stack, fixed proxy presets, secret variable
names, storage choice, and test requirements are sufficient to begin
implementation. Real credential values are not needed for implementation or
normal automated tests.

### B. CAN BE RESOLVED DURING RUNTIME / FINAL VERIFICATION

- What Node.js runtime, port, and forwarded-host configuration does CodeRange
  assign? Verify these before final launch and document the actual values or
  platform-provided configuration names. Do not invent them.
- Is the deployed CodeRange endpoint restricted? If not, determine and apply an
  appropriate runtime access restriction before exposing shared proxy keys.
- Are the supplied credentials accepted by the documented proxy routes, and is
  a live smoke test authorized? Verify only through secure environment
  configuration. This does not block mocked development or testing.
- Does current authoritative proxy information change the documented
  DeepSeek Flash mapping or fixed model IDs? Keep route labels truthful. Any
  additional IDs or product features require a scope update; they are not
  assumed by this plan.

## Execution Boundary

This document is the plan only. Do not start implementation until the plan is
approved and the EXECUTE PLAN stage begins. During execution, update this
checklist as work is completed. Do not mark work complete based only on code
existing; verify the relevant tests and acceptance criteria.

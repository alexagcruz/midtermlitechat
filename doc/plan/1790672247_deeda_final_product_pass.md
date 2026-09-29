# Deeda Final Product And Interaction Plan

- Plan timestamp: `1790672247`.
- Status: EXECUTE PLAN in progress on `feat/deeda-final-product-ux`.
- Basis:
  - `doc/study/1790672205_deeda_final_product_pass.md`.
  - `doc/canonical/litechat-midterm-mvp-decisions.md`.
  - Current implementation and tests on `main`.
- Scope: Fix CodeRange asset/hydration delivery first, then add the credential-
  free Deeda entry screen and complete a restrained purple product UX pass.

## Approved Decisions

- Use **Deeda** as the user-facing product name and a polished purple/lavender
  visual identity.
- Keep Next.js, React, TypeScript, CSS custom properties, the system font stack,
  native route `select`, and existing automated test frameworks.
- Add a local in-memory demo entry screen. `Log in` does not validate, store, or
  transmit the username or password. Label the Google action as demo/not
  connected and prevent it from implying OAuth works.
- Keep the existing workbench and proxy architecture behind the entry screen.
- Preserve supplied `PORT`; use `3000` as the default when it is absent so the
  Next.js server port and CodeRange asset prefix match the requested runtime.
- Keep existing proxy technical names and `litechat.conversations.v1` unchanged.

## OPEN QUESTIONS

### Blocks Implementation

None. The request resolves the product name, palette, authentication boundary,
Google-button behavior, preserved functionality, and default runtime port.

### Runtime Verification

- The actual CodeRange forwarded browser session may not be reachable from this
  execution environment. Verify generated prefixed assets and use a browser
  against the local server with the forwarded runtime variables where possible.
  Do not claim an external forwarded-host check if only localhost was tested.
- Proxy credentials are external secrets. Do not request or use them for mocked
  functional checks. Do not print environment variable values.

## Implementation Checklist

Update this checklist during execution only after completing and verifying each
item.

### 1. Execution Setup And Interaction Root Cause

- [x] Record the pre-change worktree. Preserve the pre-existing `next-env.d.ts`
  edit and all untracked transcript artifacts; never stage or edit them.
- [x] Run the baseline `npm test` and `npm run test:e2e`. Result: 58 unit/UI tests
  and 2 browser tests pass on localhost.
- [x] Create a scoped feature branch after the study and plan commits are on
  `main`.
- [x] Confirm the exact effective port fallback and forwarded prefix behavior
  without printing the `VSCODE_PROXY_URI` value.
- [x] Keep the root-cause sequence explicit: absent `PORT` suppresses
  `assetPrefix`, failed asset delivery can prevent hydration, and controls remain
  inert/disabled without hydrated handlers. Do not add speculative overlay or
  `pointer-events` workarounds.

### 2. CodeRange Asset And Control Interaction Fix

- [x] Use supplied `PORT`, or `3000` when absent, consistently for Next.js
  startup and `getForwardedAssetPrefix`. Keep normal non-CodeRange paths unchanged.
- [x] Add unit regression cases for forwarded URL prefix selection with missing
  port and explicit port, and for local development with no forwarded URI.
- [x] Add browser assertions that the forwarded-style CSS/JavaScript asset paths
  load and application styles/hydration are active.
- [x] Exercise actual Playwright pointer and keyboard actions for click, focus,
  type, route selection, send, new conversation, reopen, rename, delete, retry,
  and mobile drawer controls. Check for intercepted clicks and visible focus.
- [x] Verify closed mobile navigation/backdrop state cannot block the composer or
  route selector. Keep controls disabled only for real loading/request states.

### 3. Deeda Entry Experience

- [x] Add a focused Deeda entry component at the application boundary and retain
  the existing `ChatApp` workbench without moving proxy or conversation logic.
- [x] Include Deeda brand treatment, Welcome heading, labeled username/email and
  password fields, primary `Log in`, divider, and secondary Google action.
- [x] Let `Log in` enter the workspace with blank or arbitrary fields. Do not
  validate credentials, call a service, persist fields, or add a backend.
- [x] Clearly label Google as demo/not connected and disable its action.
- [x] Add UI and Playwright coverage for field labels, focus/typing, credential-
  free entry, and disconnected Google behavior. Confirm passwords are not stored.

### 4. Branding And Visual Refresh

- [x] Change user-facing metadata, workbench brand, message role label, entry
  screen, and project-facing setup copy to Deeda.
- [x] Update canonical product decisions to record the approved Deeda rename and
  clarify that technical proxy references and the existing storage key remain.
- [x] Keep `https://proxy.litechat.ai`, fixed proxy route labels/IDs, environment
  variables, storage key, and server API behavior unchanged.
- [x] Replace the green palette with deep purple primary surfaces, violet/lavender
  accents, light lavender/neutral surfaces, readable text, subtle borders, and
  restrained shadows.
- [x] Refine typography, spacing, sidebar/list hierarchy, route selection,
  buttons, messages, empty state, composer, and hover/focus/disabled/loading/error
  states without adding features or external assets.
- [x] Verify desktop and mobile layouts, no horizontal overflow, at least 44px
  primary touch targets, keyboard navigation, visible focus, labels, and readable
  contrast. Local contrast checks for key text/surface pairs exceed WCAG AA.

### 5. Regression And Existing Functionality

- [x] Keep adapter, route handler, validation, credential boundary, message
  serialization, storage schema, and all three proxy interfaces intact.
- [x] Preserve multi-turn history, route switching, usage totals, loading,
  failed-prompt recovery/retry, and create/list/reopen/rename/delete behavior.
- [x] Extend only focused tests where entry, hydration, or interaction semantics
  change. Retain mocked proxy responses; no real credentials or external calls.
- [x] Cover CodeRange asset-prefix behavior and actual browser control interaction
  alongside existing chat/proxy workflow tests.

### 6. Verification And Reproducibility

- [x] Run `npm ci` to verify declared dependencies reproduce the project.
- [x] Run `npm test`.
- [x] Run `npm run test:e2e`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.
- [x] Run `npm run build` with the same forwarded URI and effective port used by
  runtime verification.
- [x] Verify the active app is reachable on a non-loopback interface at
  `0.0.0.0:3000` when `PORT` is absent; preserve a platform-supplied port when
  present. An existing development server occupied the port, so a second
  production server could not bind concurrently.
- [x] Check the document and prefixed CSS/JavaScript response status and content
  type. Run the entry and workbench interaction flow. Check browser errors and
  desktop/mobile overflow. The external forwarded host is unreachable from this
  execution environment; local production and prefixed assets were verified.
- [x] Keep environment values and proxy credentials out of output, tests,
  screenshots, and Git. Do not alter transcript artifacts.

### 7. Documentation, Rendezvous, And Sync

- [x] Update README setup/brand/entry/runtime behavior and `doc/wiki/` only for
  functionality that exists after implementation.
- [x] Update `doc/wiki/footguns/` with the absent-`PORT` asset-prefix behavior
  and demo-entry limitations.
- [x] Mark completed plan items with evidence and list any inaccessible external
  forwarded-host check as a limitation.
- [x] Inspect final diff, run all required verification, and confirm no secrets or
  transcript artifacts are included.
- [ ] Merge the feature branch into `main` without altering existing history.
- [ ] Commit all in-scope work with scoped Conventional Commit messages. Push
  completed `main` changes to `origin` if authentication is available and verify
  the remote state.

## Acceptance Criteria

- [x] A CodeRange runtime without `PORT` uses `/proxy/3000` for assets and binds
  to `0.0.0.0:3000`; a supplied `PORT` remains authoritative.
- [x] Browser regression tests perform real click/focus/type/select/chat and
  conversation-management interactions without intercepted pointer events.
- [x] The Deeda entry screen is polished, accessible, responsive, accepts blank
  credentials, never stores passwords, and does not claim Google OAuth works.
- [x] The workbench presents Deeda's purple identity and remains responsive and
  accessible.
- [x] Existing proxy routes/contracts, server-side credentials, chat history,
  usage, route switching, retries, local persistence, conversation controls, and
  CodeRange asset behavior remain intact.
- [x] `npm test`, `npm run test:e2e`, `npm run typecheck`, `npm run lint`,
  `npm run build`, and the documented runtime checks pass.
- [x] Wiki/README match shipped behavior. Worktree changes include only intended
  product work plus the user's pre-existing `next-env.d.ts` edit and untouched
  transcript artifacts.

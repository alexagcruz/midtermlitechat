# Deeda Final Product And Interaction Plan

- Plan timestamp: `1790672247`.
- Status: Approved scope; execution not started.
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
- [ ] Create a scoped feature branch after the study and plan commits are on
  `main`.
- [ ] Confirm the exact effective port fallback and forwarded prefix behavior
  without printing the `VSCODE_PROXY_URI` value.
- [ ] Keep the root-cause sequence explicit: absent `PORT` suppresses
  `assetPrefix`, failed asset delivery can prevent hydration, and controls remain
  inert/disabled without hydrated handlers. Do not add speculative overlay or
  `pointer-events` workarounds.

### 2. CodeRange Asset And Control Interaction Fix

- [ ] Use supplied `PORT`, or `3000` when absent, consistently for Next.js
  startup and `getForwardedAssetPrefix`. Keep normal non-CodeRange paths unchanged.
- [ ] Add unit regression cases for forwarded URL prefix selection with missing
  port and explicit port, and for local development with no forwarded URI.
- [ ] Add browser assertions that the forwarded-style CSS/JavaScript asset paths
  load and application styles/hydration are active.
- [ ] Exercise actual Playwright pointer and keyboard actions for click, focus,
  type, route selection, send, new conversation, reopen, rename, delete, retry,
  and mobile drawer controls. Check for intercepted clicks and visible focus.
- [ ] Verify closed mobile navigation/backdrop state cannot block the composer or
  route selector. Keep controls disabled only for real loading/request states.

### 3. Deeda Entry Experience

- [ ] Add a focused Deeda entry component at the application boundary and retain
  the existing `ChatApp` workbench without moving proxy or conversation logic.
- [ ] Include Deeda brand treatment, Welcome heading, labeled username/email and
  password fields, primary `Log in`, divider, and secondary Google action.
- [ ] Let `Log in` enter the workspace with blank or arbitrary fields. Do not
  validate credentials, call a service, persist fields, or add a backend.
- [ ] Clearly label Google as demo/not connected and disable its action.
- [ ] Add UI and Playwright coverage for field labels, focus/typing, credential-
  free entry, and disconnected Google behavior. Confirm passwords are not stored.

### 4. Branding And Visual Refresh

- [ ] Change user-facing metadata, workbench brand, message role label, entry
  screen, and project-facing setup copy to Deeda.
- [ ] Update canonical product decisions to record the approved Deeda rename and
  clarify that technical proxy references and the existing storage key remain.
- [ ] Keep `https://proxy.litechat.ai`, fixed proxy route labels/IDs, environment
  variables, storage key, and server API behavior unchanged.
- [ ] Replace the green palette with deep purple primary surfaces, violet/lavender
  accents, light lavender/neutral surfaces, readable text, subtle borders, and
  restrained shadows.
- [ ] Refine typography, spacing, sidebar/list hierarchy, route selection,
  buttons, messages, empty state, composer, and hover/focus/disabled/loading/error
  states without adding features or external assets.
- [ ] Verify desktop and mobile layouts, no horizontal overflow, at least 44px
  primary touch targets, keyboard navigation, visible focus, labels, and readable
  contrast.

### 5. Regression And Existing Functionality

- [ ] Keep adapter, route handler, validation, credential boundary, message
  serialization, storage schema, and all three proxy interfaces intact.
- [ ] Preserve multi-turn history, route switching, usage totals, loading,
  failed-prompt recovery/retry, and create/list/reopen/rename/delete behavior.
- [ ] Extend only focused tests where entry, hydration, or interaction semantics
  change. Retain mocked proxy responses; no real credentials or external calls.
- [ ] Cover CodeRange asset-prefix behavior and actual browser control interaction
  alongside existing chat/proxy workflow tests.

### 6. Verification And Reproducibility

- [ ] Run `npm ci` to verify declared dependencies reproduce the project.
- [ ] Run `npm test`.
- [ ] Run `npm run test:e2e`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build` with the same forwarded URI and effective port used by
  runtime verification.
- [ ] Start the app bound to `0.0.0.0:3000` when `PORT` is absent; preserve a
  platform-supplied port when present.
- [ ] Check the document and prefixed CSS/JavaScript response status and content
  type. Run the entry and workbench interaction flow. Check browser errors and
  desktop/mobile overflow.
- [ ] Keep environment values and proxy credentials out of output, tests,
  screenshots, and Git. Do not alter transcript artifacts.

### 7. Documentation, Rendezvous, And Sync

- [ ] Update README setup/brand/entry/runtime behavior and `doc/wiki/` only for
  functionality that exists after implementation.
- [ ] Update `doc/wiki/footguns/` with the absent-`PORT` asset-prefix behavior
  and demo-entry limitations.
- [ ] Mark completed plan items with evidence and list any inaccessible external
  forwarded-host check as a limitation.
- [ ] Inspect final diff, run all required verification, and confirm no secrets or
  transcript artifacts are included.
- [ ] Merge the feature branch into `main` without altering existing history.
- [ ] Commit all in-scope work with scoped Conventional Commit messages. Push
  completed `main` changes to `origin` if authentication is available and verify
  the remote state.

## Acceptance Criteria

- [ ] A CodeRange runtime without `PORT` uses `/proxy/3000` for assets and binds
  to `0.0.0.0:3000`; a supplied `PORT` remains authoritative.
- [ ] Browser regression tests perform real click/focus/type/select/chat and
  conversation-management interactions without intercepted pointer events.
- [ ] The Deeda entry screen is polished, accessible, responsive, accepts blank
  credentials, never stores passwords, and does not claim Google OAuth works.
- [ ] The workbench presents Deeda's purple identity and remains responsive and
  accessible.
- [ ] Existing proxy routes/contracts, server-side credentials, chat history,
  usage, route switching, retries, local persistence, conversation controls, and
  CodeRange asset behavior remain intact.
- [ ] `npm test`, `npm run test:e2e`, `npm run typecheck`, `npm run lint`,
  `npm run build`, and the documented runtime checks pass.
- [ ] Wiki/README match shipped behavior. Worktree changes include only intended
  product work plus the user's pre-existing `next-env.d.ts` edit and untouched
  transcript artifacts.

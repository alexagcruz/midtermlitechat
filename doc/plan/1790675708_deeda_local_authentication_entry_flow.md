# Deeda Local Authentication And Entry Flow Plan

- Plan timestamp: `1790675708`.
- Status: Approved for execution; implementation has not started.
- Basis:
  - Approved study: `doc/study/1790674972_deeda_local_authentication_entry_flow.md`.
  - User approval of the browser-local architecture and all five product
    decisions in the current workflow.
  - Current application source, tests, and storage behavior on `main`.
- Scope: Replace the demo entry with local account creation, verified login,
  tab-scoped session behavior, logout, and account-scoped conversations.

## Approved Decisions

- Authentication verifies credentials only in the browser UI. It does not
  protect `/api/chat` or provide production authentication.
- Account fields are display name, email, password, and password confirmation.
  Trim and lowercase email for local account lookup and duplicate detection.
  Do not verify the email or provide recovery.
- Require a password of at least eight characters. Never store plaintext
  passwords.
- Keep accounts in versioned browser-local storage. Use Web Crypto, a unique
  random salt per account, and a salted PBKDF2 verifier.
- Keep the active account ID in `sessionStorage`. Resolve it after hydration,
  preserve it across reloads in the same tab, and clear it on logout.
- Isolate conversations by local account ID. Assign valid legacy
  `litechat.conversations.v1` data to the first account that successfully logs in
  using a repeatable migration that verifies the destination before removing the
  legacy key.
- Keep Google OAuth out of scope. The Google action remains disabled or clearly
  marked as not connected.
- Keep all existing proxy, chat, Deeda visual, and CodeRange behavior.

## Architecture

- Keep Next.js, React, TypeScript, Zod, Web Crypto, Vitest, React Testing Library,
  and Playwright. Do not add an authentication provider, database, or dependency
  for this browser-local flow.
- Put versioned account validation, local account storage, password derivation,
  and session storage in a focused `src/lib/auth/` boundary.
- Make `DeedaApp` the explicit `session-resolving`, `signed-out`, and `signed-in`
  workspace gate. Do not mount `ChatApp` until the session resolves to a valid
  local account.
- Keep the entry form responsible for login and registration presentation and
  validation feedback. After registration, return to login with the normalized
  email filled in and password fields cleared.
- Pass the local account identity and logout action to `ChatApp`. Scope
  conversation storage by stable account ID within the existing conversation
  storage boundary. Do not add account or authentication fields to chat API
  request or response schemas.
- Keep proxy route selection, server-side credentials, chat request validation,
  request/response behavior, and all proxy adapters unchanged.

## OPEN QUESTIONS

### Blocks Execution

None. The user approved the security boundary, fields, conversation isolation and
migration policy, session duration, and password/recovery policy.

### Runtime Verification

- A real CodeRange forwarded browser session may not be reachable in the
  execution environment. Verify forwarded asset paths and local browser
  behavior where possible. Do not claim external CodeRange success unless that
  path is tested.
- The PBKDF2 work factor must be measured in supported browsers and recorded in
  account hash metadata. This is an implementation validation task, not an open
  product decision. Do not fall back to plaintext or a fast unsalted hash if
  Web Crypto is unavailable.
- LiteChat proxy credentials remain external server-only secrets. They are not
  required for these tests or for local authentication. Never print or commit
  their values.

## Execution Checklist

Update this checklist during execution only after completing and verifying each
item. Create a scoped feature branch after this plan is committed. Preserve the
pre-existing worktree changes recorded below.

### 1. Execution Setup And Baseline

- [ ] Check `git status --short --branch` before changing files. Preserve the
  existing `next-env.d.ts` edit and all untracked transcript artifacts. Do not
  stage, overwrite, or remove them.
- [ ] Confirm the approved study and plan are committed on `main`.
- [ ] Create a scoped feature branch for implementation.
- [ ] Run and record baseline `npm test`, `npm run test:e2e`, lint, typecheck, and
  build results where the current environment permits. Use mocked proxy
  responses; do not require or print credentials.
- [ ] Confirm the current entry, conversation storage key/schema, all existing
  regression tests, and CodeRange asset-prefix behavior before editing.

### 2. Local Account And Password-Verifier Boundary

- [ ] Add a focused `src/lib/auth/` module for the account schema, account
  storage, password derivation/verification, and tab-session storage.
- [ ] Use a versioned account record containing a stable random account ID,
  display name, normalized email, per-account random salt, derived verifier, and
  algorithm/work-factor metadata. Never store password confirmation.
- [ ] Use Web Crypto `crypto.getRandomValues` for unique salts and
  `crypto.subtle` for PBKDF2-HMAC-SHA-256 derivation. Benchmark an appropriate
  work factor in supported browsers and validate stored parameters before
  derivation.
- [ ] Compare verifier bytes without an early-exit string comparison. Do not
  claim that local hashes or client-side comparison provide production security.
- [ ] Normalize email by trimming and lowercasing it. Validate email format and
  non-empty display name. Require passwords of at least eight characters and
  matching confirmation. Do not add email delivery, verification, or recovery.
- [ ] Detect duplicate normalized emails before account creation. Re-read and
  validate the account registry before writing so malformed or stale state does
  not silently authenticate or overwrite another record.
- [ ] Validate all records read from localStorage. Handle malformed/unsupported
  versions, quota errors, unavailable storage, and unavailable Web Crypto with
  clear recoverable UI feedback. Fail closed for authentication.
- [ ] Store only account records under a versioned localStorage key such as
  `deeda.accounts.v1`. Store only the active account ID and schema version in a
  versioned `sessionStorage` key such as `deeda.auth.session.v1`.
- [ ] Clear password form state after submit and when changing entry modes. Use
  suitable `autocomplete` attributes for registration and login.
- [ ] Confirm no proxy/API credential is added to account/session storage, source,
  tests, logs, or documentation.

### 3. Entry Flow, Session Gate, And Logout

- [ ] Replace demo-only copy and behavior with visible, keyboard-accessible
  `Log in` and `Create account` choices in the existing purple Deeda entry
  design.
- [ ] Provide registration fields for display name, email, password, and
  password confirmation. Associate validation feedback with each field and
  announce form-level status/errors accessibly.
- [ ] On duplicate email, invalid/missing field, or password mismatch, keep the
  user on registration and show a clear error. Do not create an account.
- [ ] On successful registration, save only the account record and verifier,
  return to login, prefill the email, clear password values, and require valid
  login before showing the workspace.
- [ ] Verify normalized email and password during login. Reject unknown accounts
  and incorrect passwords without mounting `ChatApp`; avoid messages that expose
  a stored password or verifier.
- [ ] Model `DeedaApp` states explicitly as session-resolving, signed-out, and
  signed-in. Resolve session storage after client hydration. Confirm stale or
  malformed sessions are cleared and remain signed out. Avoid server/client
  hydration mismatch or a flash of the workspace.
- [ ] On successful login, run required first-login conversation migration
  before mounting `ChatApp`. Persist the active account marker only after login
  and migration requirements are safely handled.
- [ ] Add an accessible logout control to the existing workbench. Logout clears
  the tab session and returns to login. Re-login with the same credentials must
  restore that account's workspace.
- [ ] Ensure a pending chat response after logout cannot write to another
  account's conversation key. The `/api/chat` request itself remains unchanged
  and is not revoked by logout.
- [ ] Keep Google visibly disabled/not connected in login and registration
  states. Do not add Google OAuth copy, routes, or credentials.
- [ ] Preserve responsive layout, visible focus, keyboard navigation, labels,
  touch targets, and purple Deeda branding at desktop and mobile sizes.

### 4. Account-Scoped Conversation Storage And Legacy Migration

- [ ] Change conversation storage to use a stable per-account key, for example
  `deeda.conversations.v1:<accountId>`, while retaining the validated
  conversation payload shape and existing CRUD behavior.
- [ ] Keep `litechat.conversations.v1` as a legacy source only. Do not let normal
  reads or writes for one account fall back to the legacy key.
- [ ] Implement a one-time migration claim that assigns the legacy key to the
  first account that successfully logs in. Persist the claim before copying so
  retries cannot assign the same history to another account.
- [ ] Serialize migration across same-origin tabs. Use a supported browser
  locking mechanism or another verified exclusive protocol; fail safely if an
  exclusive claim cannot be established.
- [ ] Validate the legacy payload with the existing conversation schema. If it
  is valid and no destination exists, write the account-scoped destination,
  read it back, validate it, and confirm it matches before removing the legacy
  key.
- [ ] Make interrupted migration repeatable. If the claim and a matching
  destination exist while the legacy key remains, verify them and finish
  cleanup. Never overwrite conflicting destination data or delete the legacy
  source before the destination is verified.
- [ ] If destination storage fails or valid source data cannot be safely
  migrated, retain the legacy bytes, keep the migration assigned to the same
  account, show a retryable error, and do not expose the data to other accounts.
- [ ] If the legacy payload is malformed, preserve its raw value, report that it
  could not be migrated, and do not copy it or expose it to other accounts.
- [ ] When no legacy key exists, record migration as complete without creating
  shared conversation data.
- [ ] Test two accounts: the first successful login owns migrated legacy chats;
  another account starts with its own empty conversation store and never sees
  the first account's chats.
- [ ] Keep account IDs, display names, emails, salts, verifiers, and session
  markers out of `/api/chat`. Preserve the existing route ID and message payload
  contract exactly.

### 5. Automated Unit, Component, And Browser Coverage

- [ ] Add account storage and password-verifier tests for valid creation,
  account schema/version validation, random salt, verifier metadata, and correct
  password verification.
- [ ] Test missing/invalid fields, email trimming/case normalization, duplicate
  account rejection, password length, password confirmation mismatch, unknown
  account, and incorrect password.
- [ ] Assert submitted passwords and confirmation never appear in account
  localStorage, sessionStorage, other auth records, or `/api/chat` requests.
- [ ] Test malformed and unsupported account data, stale session IDs, storage
  quota/write failures, and unavailable Web Crypto. None may enter the
  authenticated workspace.
- [ ] Test session resolution, same-tab reload persistence, signed-out reload,
  logout clearing the marker, and successful re-login. Confirm a new tab does not
  inherit a tab-scoped session.
- [ ] Test per-account conversation read/write isolation and CRUD behavior.
- [ ] Test successful legacy migration, write/read-back verification, cleanup
  ordering, interrupted retry, conflicting destination preservation, malformed
  legacy preservation, storage failure preservation, and single-account claim
  across competing tabs.
- [ ] Update existing entry component tests to use real account creation and
  login instead of expecting blank/arbitrary values to enter the workspace.
- [ ] Keep and run all existing chat component, storage, route, adapter, and API
  tests. Assert no authentication data is added to the `/api/chat` payload.
- [ ] Update Playwright helpers to create and authenticate a local account; do
  not bypass the UI gate by setting internal auth storage directly in lifecycle
  tests.
- [ ] Add a complete Playwright lifecycle: create account, return to login, log
  in, enter the workspace, type and submit a prompt through the composer, verify
  mocked chat behavior, log out, reject an incorrect password, log in correctly,
  and re-enter the workspace with the same account conversations.
- [ ] Add Playwright coverage for two-account conversation isolation, legacy
  migration, same-tab reload, responsive entry/workspace, keyboard focus, and
  absence of browser errors. Keep proxy responses mocked.
- [ ] Preserve existing browser coverage for all three routes, multi-turn chat,
  route switching, token accounting, conversation CRUD, retry/error behavior,
  mobile navigation, stylesheet/script asset paths, and composer typing/focus.

### 6. Runtime, Security, And Reproducibility Verification

- [ ] From a reproducible dependency install, run every required command and
  record results:

  ```sh
  npm ci
  npm run lint
  npm run typecheck
  npm test
  npm run test:e2e
  npm run build
  ```

- [ ] Confirm normal tests and browser tests use mocked `/api/chat` responses
  and do not require real LiteChat credentials.
- [ ] Inspect browser storage, account serialization, browser bundles, and chat
  requests to verify passwords are not persisted and proxy credentials remain
  server-side. Do not print secret values.
- [ ] Verify the running application still binds to `0.0.0.0` and respects the
  configured `PORT` and existing CodeRange forwarded asset prefix. Build and
  start with matching CodeRange variables; do not alter the existing asset
  prefix/runtime fix.
- [ ] Manually verify account creation, login, reload, logout, and re-login in a
  browser through CodeRange forwarding when available. A localhost test alone
  is not proof of external forwarding. Record any unavailable external check
  without claiming it passed.
- [ ] Verify no dependency or lockfile change is needed. If implementation
  evidence requires a new dependency, stop and document why before adding it.
- [ ] Verify a fresh clone can install from `package-lock.json` and run the
  project checks without untracked local files, real proxy credentials, or
  account seed state.

### 7. Documentation Sync And Acceptance

- [ ] After rendezvous, update `doc/canonical/litechat-midterm-mvp-decisions.md`
  to record the approved local-account scope and explicitly retain the limits:
  browser-local only, no server access control, no OAuth, no email verification,
  and no recovery. Supersede the prior no-account decision without removing the
  proxy security constraints.
- [ ] Update README and `doc/wiki/` setup/runtime/feature documentation to
  describe account creation, local password verifiers, session duration,
  account-scoped conversations, migration, logout, and data-loss limitations.
- [ ] Update `doc/wiki/footguns/` with the local-only security boundary, browser
  storage/XSS limitations, `/api/chat` remaining unauthenticated, and legacy
  conversation migration behavior.
- [ ] Keep Google login marked not connected. Do not claim production security,
  server authentication, email verification, recovery, or cross-device sync.
- [ ] Confirm all checklist items are complete or explicitly identify a genuine
  blocker. Update this plan during execution and preserve the final verification
  results for rendezvous.

## Acceptance Criteria

- A user can create a local account using display name, normalized email, and a
  password of at least eight characters with matching confirmation. Duplicate
  email and invalid fields are rejected. Registration returns to login and does
  not store plaintext passwords.
- Login rejects unknown emails and incorrect passwords. Correct credentials
  enter the existing Deeda workspace.
- The authenticated account resolves from a validated `sessionStorage` marker
  after hydration, survives same-tab reload, clears on logout, and can log in
  again. Invalid or unavailable auth state fails closed.
- Each local account reads and writes only its own conversations. Valid legacy
  conversations are assigned once to the first account that successfully logs
  in, verified before legacy cleanup, and preserved through interrupted or
  failed migration. A second account cannot read them.
- No account, session, password, verifier, or proxy credential is added to the
  `/api/chat` contract or browser-stored proxy configuration. The endpoint's
  existing behavior remains unchanged and documentation says it is not protected
  by this local UI login.
- All three LiteChat interfaces, server-side credential handling, chat API
  contracts, multi-turn chat, route switching, token accounting, conversation
  CRUD, retry/error behavior, composer typing, responsive purple Deeda UX, and
  CodeRange asset-prefix/runtime behavior continue to pass regression checks.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, and
  `npm run build` pass. `npm ci` reproduces dependencies from the lockfile.
- CodeRange runtime/manual verification is completed when the forwarded browser
  is available, or its unavailability is recorded without claiming success.
- The app and documentation make no production-security claim, and Google
  authentication remains clearly disconnected.

## Implementation Commits And Rendezvous

- Use scoped Conventional Commits for implementation, tests, and docs. Do not
  commit credentials or the pre-existing worktree changes.
- Before rendezvous, inspect `git status`, `git diff`, and the commits on the
  feature branch. Run all required automated and runtime checks.
- Merge the completed feature branch to `main` only after the plan is complete
  and the application is in a workable state.
- During `SYNC DOCS`, ensure living documentation describes only implemented
  behavior. Verify the final branch, status, commit list, and any remote push
  result under the repository workflow.

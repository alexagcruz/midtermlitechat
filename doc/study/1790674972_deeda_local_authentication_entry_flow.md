# Deeda Local Authentication And Entry Flow Study

- Study timestamp: `1790674972`.
- Status: Study only. No application code was changed.
- Scope: Assess a working local account creation, login, workspace gate, and logout
  flow for the existing Deeda midterm application.
- Product direction: This new requirement supersedes the earlier no-account scope
  in `doc/canonical/litechat-midterm-mvp-decisions.md` if the study is approved.
  Update canonical decisions during a later documentation-sync stage, not during
  this study.

## Executive Finding

The current entry screen is an intentional presentation-only demo. It accepts
any values, does not verify or save the password, and switches to the chat app
through a React state boolean. There is no account store, authenticated session,
logout action, or server-side authentication. The chat API is an independently
reachable Next.js Route Handler and does not require a browser login.

The requested create-account, login, logout, and re-login flow is feasible as a
browser-local educational MVP without changing the LiteChat proxy or chat API.
The proportionate recommendation is to keep account records and salted password
verifiers in browser `localStorage`, use the Web Crypto API to derive and verify
password hashes, keep the signed-in account marker in `sessionStorage`, and gate
mounting the existing `ChatApp` on successful local verification. Do not add an
authentication provider, server database, or new package for this scope.

This is real credential verification within the current browser profile, but it
is not production authentication or deployment access control. Browser storage
and client code are under the user's control. The public `/api/chat` route would
remain callable without completing the UI login flow. Do not describe this
feature as protecting shared proxy credentials or a publicly exposed deployment.

## Current Implementation

- `src/components/deeda-entry.tsx` renders one form with username/email and
  password fields. Its copy says `LOCAL DEMO`, says no account is needed, and
  states that the password is not verified or saved. Google is disabled and
  marked not connected.
- `src/components/deeda-app.tsx` stores only an `entered` boolean in React state.
  Submitting the form sets it to `true` and mounts `ChatApp`; a page reload resets
  the state.
- `src/components/chat-app.tsx` owns the existing chat UI and calls the existing
  browser storage functions. It has no account identity or logout callback.
- `src/lib/storage/conversations.ts` validates conversation records with Zod and
  stores all conversations under the single key `litechat.conversations.v1`.
  That data is currently browser-wide, not associated with an account.
- `src/app/api/chat/route.ts` validates the chat request and uses server-side
  proxy services. It does not authenticate the caller. Browser requests contain
  chat content and a fixed route ID, not proxy credentials or endpoints.
- Existing UI tests in `src/components/deeda-app.test.tsx` and the entry test in
  `e2e/chat-flow.spec.ts` assert that arbitrary or blank credentials enter the
  workspace. These expectations must be replaced by account lifecycle tests.
- The repository uses Next.js 16, React 19, TypeScript, Zod, Vitest,
  React Testing Library, and Playwright. `package.json` declares no database or
  authentication library. Development and production servers bind to
  `0.0.0.0`; the existing CodeRange asset-prefix behavior is separately
  configured in `next.config.ts`.
- Google-compatible support in this repository is a LiteChat chat protocol
  adapter. It is not Google OAuth infrastructure. There are no OAuth routes,
  provider credentials, or authentication service to reuse.

## Problem And Outcomes

The current button text promises `Log in`, but no account is created or checked.
The new entry flow must not allow arbitrary credentials to enter the workspace.
It must provide distinct, clear `Log in` and `Create account` actions.

Required testable outcomes:

- A new user can open account creation and submit valid local account fields.
- Validation rejects missing or invalid fields, a password confirmation
  mismatch, and an already-registered normalized identifier.
- Account creation saves a password verifier, not a plaintext password. The user
  then returns to login or otherwise reaches a login step that requires the
  credentials to be verified.
- Login rejects an unknown identifier and an incorrect password, and accepts the
  account's correct credentials.
- Successful login enters the existing chat workspace. Logout returns to the
  entry screen, and the same account can log in again.
- Reload behavior follows the approved session duration. A signed-out reload
  does not enter the workspace.
- The existing proxy route choices, chat contracts, multi-turn history, token
  accounting, conversation operations, error/retry behavior, responsive layout,
  and CodeRange runtime behavior continue to work.
- Google remains visibly not connected. No button or copy implies that Google
  login works.

## Feasible Approaches

### Browser-local accounts (recommended)

Store a small validated account registry in `localStorage`. Store an account ID,
display name if approved, normalized login identifier, random salt, password
hash, and hash-format metadata. Use `crypto.getRandomValues` for salts and
`crypto.subtle` for a salted PBKDF2-HMAC-SHA-256 password verifier. Select and
measure an appropriate work factor in supported browsers. Compare derived and
stored verifier bytes without an early-exit string comparison. Never store or
log the submitted password. Use the same origin's browser APIs and no network
request for account operations.

Keep the active account ID in `sessionStorage`. It survives a reload in the same
tab and is cleared when that tab's browsing session ends. Clear it on logout.
Resolve the session after client hydration and do not mount `ChatApp` until the
account record is found. This avoids treating a missing or malformed account as
authenticated and avoids a server/client render mismatch.

Advantages: matches the explicit browser-local scope, uses existing browser
storage patterns, requires no server database or service, and introduces no
dependency or credential secret. Tradeoffs: users cannot recover accounts,
accounts do not sync across devices, browser data can be modified or erased, and
the UI gate is not a security boundary.

### Server-side accounts and sessions

Add a persistent account store, server-side password hashing, registration and
login endpoints, and secure HTTP-only session cookies. Authenticate `/api/chat`
and any other protected server action. This is the appropriate direction if the
goal changes to protect a public deployment or shared proxy credentials.

It is not the recommended midterm implementation: the repository has no account
database, migrations, session lifecycle, or deployment persistence contract.
Choosing and operating those components would materially expand scope and require
deployment decisions. A browser-local UI requirement does not provide an
external account system or database.

### External authentication or OAuth

An identity provider would require provider setup, credentials, callback and
redirect configuration, and network availability. No such infrastructure
exists. Google OAuth is explicitly out of scope for this midterm. The existing
Google-compatible proxy adapter does not change that finding.

### Fixed demo credentials or an unverified form

Hard-coded credentials or another form that accepts arbitrary values would not
meet the requirement for account creation and credential verification. Do not
use either approach.

## Recommended Architecture

Keep the existing framework and test stack. Use native Web Crypto rather than a
new password-hashing dependency because verification is local to the browser and
the application already targets modern browsers. If supported-browser testing
finds a Web Crypto gap, stop and revisit the platform requirement; do not silently
fall back to plaintext, a fast unsalted hash, or a hand-written cryptographic
algorithm.

Keep authentication state at the `DeedaApp` boundary. Replace the boolean entry
state with explicit client states for session resolution, signed out, and signed
in. Keep account validation, storage, and password derivation in a small
`src/lib/auth/` boundary so the form remains a view and authentication behavior
can be tested independently. Pass the verified local account identity and a
logout action to the existing workbench. Keep the existing chat request and
proxy implementation unchanged.

Use a versioned account-storage schema and validate data when reading it. Treat
missing, malformed, or unsupported account data as signed out and show a useful
recoverable error when a write fails. Handle unavailable Web Crypto and storage
errors visibly. Keep password values only in transient form state, clear them
after submit or navigation, and use appropriate `autocomplete` values for login
and account creation.

For an account flow, the recommended fields are display name, email, password,
and password confirmation. Normalize the email for duplicate detection and login.
An email address is only a local identifier: there is no email delivery,
verification, or recovery. After successful registration, return the user to
login with the identifier filled in, clear the password fields, and require a
successful login before mounting the workspace. This produces an unambiguous
credential-verification step while keeping the entry flow understandable.

Keep error messages perceivable and accessible. Label every field, associate
validation messages with controls, expose form-level success/error feedback with
appropriate live-region semantics, preserve visible keyboard focus, and move
focus appropriately when changing between login and registration. Preserve the
existing responsive Deeda styling. Keep the Google action disabled with clear
`not connected` text on both entry modes.

## Security And Privacy Tradeoffs

- A random per-account salt and deliberately slow PBKDF2 derivation prevent
  plaintext storage and avoid storing a directly reusable password. They do not
  make local accounts secure against someone who controls the browser profile.
- `localStorage` contents can be read or changed by same-origin JavaScript and
  by a person with browser-profile access. A copied password verifier permits
  offline password guesses. XSS could capture a password as it is typed. Use
  this only for the disclosed local educational prototype.
- `sessionStorage` is also client-controlled. A person can modify the session
  marker or application code. It is useful for ordinary UI session behavior,
  not proof to the server that the user authenticated.
- The Next.js `/api/chat` endpoint remains available without login unless a
  separate server-side access-control change is made. Do not put proxy keys in
  browser bundles, `localStorage`, `sessionStorage`, account records, or chat
  requests. Keep all existing proxy credentials server-side and keep them out of
  tests and documentation values.
- A local email has no proof of ownership. Do not claim email verification,
  password recovery, multi-factor authentication, production-grade security, or
  cross-device accounts.
- Clearing site data removes local accounts, their password verifiers, active
  session state, and any browser-local conversations. Without recovery, an
  account cannot be restored after its local data is removed.
- Registration and login should have simple minimum validation, but should not
  imply that a client-enforced password rule makes the app production-secure.

If deployment access control is required, browser-only credentials are not an
acceptable substitute. That requirement needs an approved server-side
authentication and persistence design before implementation.

## Session And Logout Behavior

Recommended session behavior is one tab-scoped session marker in
`sessionStorage`, which remains through a reload in that tab and ends when the
tab closes. Logout removes the marker and immediately returns the UI to the
entry screen. Another tab does not automatically share this session. Do not
persist a password or a reusable authentication token.

Logout only changes the local workspace gate. Since the chat API has no
authentication, it cannot revoke or reject an already-started or direct API
request. A plan should define safe UI behavior for a pending chat request at
logout and test that no credentials or account fields are added to the chat
payload.

## Conversation Storage Interaction

The current `litechat.conversations.v1` key contains all browser conversations
without an owner. Leaving that global key unchanged would let every local account
see the same saved chats. That is simple and preserves the key, but it does not
provide account separation. Moving to a per-account key isolates accounts but
supersedes the prior canonical decision to keep the global key unchanged and
requires a migration policy.

Recommendation: after the human approves account isolation, store conversations
under a key scoped by stable local account ID. On the first successful login,
migrate the existing global conversation record to that account's key. Write and
validate the destination before removing the legacy key. Make migration
repeatable and safe if an interrupted write leaves both keys. Do not silently
discard or expose existing history to every account. Define what to do if the
legacy record is malformed or the destination write fails.

This change belongs in the existing conversation storage boundary, not in the
proxy API. It must preserve the current validated conversation shape, CRUD
behavior, retry state, route selection, and token usage. No account data should
be sent to LiteChat or added to `POST /api/chat`.

## Impact On Existing Architecture

- `DeedaEntry` becomes a two-mode login/create-account view with real validation
  and status feedback.
- `DeedaApp` becomes the client-side session and workspace gate. It resolves
  browser session state only after hydration.
- `ChatApp` needs account context for conversation isolation and a visible logout
  control, likely in its existing sidebar/header. Its message behavior and
  endpoint contract should not change.
- `src/lib/storage/conversations.ts` may need an account-scoped key and an
  explicit legacy migration. Keep Zod validation and the message schema.
- Add a focused authentication storage/hash module and tests. Do not add auth
  fields to proxy request/response schemas.
- Existing tests that expect credential-free entry must be rewritten. Existing
  proxy adapter, API route, multi-turn, route-switch, usage, CRUD, retry, and
  CodeRange tests remain required regression coverage.
- Existing README/wiki/canonical statements that say there are no accounts will
  become inaccurate after implementation. Update them only after the approved
  implementation exists and during `SYNC DOCS`. Clearly document local-only
  limitations and that this does not protect `/api/chat`.

## Testing And Validation

Automated unit and component coverage should test:

- Valid account creation and account record schema.
- Missing fields, email normalization, duplicate identifiers, and mismatched
  password confirmation.
- A random salt is used; the account record and all browser storage contain no
  submitted plaintext password.
- Correct password verification succeeds; incorrect and unknown account
  credentials fail without entering the workspace.
- Malformed account storage, unsupported versions, Web Crypto failure, and
  storage write/quota failure do not authenticate a user.
- Session resolution, tab session persistence through reload, logout, and signed
  out gating.
- Approved conversation isolation and legacy migration behavior, including
  malformed legacy data and failed destination writes.
- Accessible field labels, focus behavior, keyboard mode switching, and readable
  status/error messages.

Playwright should cover the complete lifecycle: create an account, complete the
login step, enter the existing workspace, log out, reject an incorrect password,
accept the correct password, and re-enter the workspace. Also cover reload
behavior, a second account's approved conversation policy, and narrow/mobile
entry layout. Continue to mock `/api/chat`; no test should need a real proxy
credential or send an authentication secret to the chat endpoint.

Run the existing reproducibility checks from the lockfile-managed install:

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Confirm runtime operation on CodeRange using its forwarded asset path and
effective `PORT`, with the existing `0.0.0.0` binding. Localhost tests alone do
not prove external forwarding. Do not print environment variables or proxy
credential values during checks. The recommended approach requires no package
addition; if a dependency is later approved, update and test the lockfile.

## Constraints, Risks, And Assumptions

- The account system is local to one browser profile and one origin. It is not a
  server-side identity, deployment gate, or cross-device account.
- The browser supports Web Crypto in the target runtime. Localhost and secure
  CodeRange HTTPS contexts are expected to support it; verify on the actual
  runtime.
- Account and conversation storage are subject to browser quota, clearing, and
  user modification.
- Account-scoped chat history needs a human-approved policy for old global
  conversations.
- The new feature must not alter any of the three approved proxy interfaces,
  server-side proxy secret handling, the chat API contracts, multi-turn chat,
  route selection, token accounting, conversation CRUD, retry/error behavior,
  responsive UX, or the CodeRange asset-prefix/runtime fix.
- The existing canonical project decisions explicitly reject user accounts.
  This new user requirement is a scope change. Record its approval and updated
  rationale in canonical documentation during the appropriate later workflow
  stage; do not treat the old decision as still binding for the new request.

## Exogenous Inputs

No external account provider, OAuth credentials, email service, account dataset,
or new secret is required for a browser-local MVP. Users create local account
data at runtime. Existing LiteChat proxy credentials remain secret external
inputs on the server only. They are not authentication inputs and must not be
exposed, stored in browser data, or committed.

## Explicitly Out Of Scope

- Google OAuth or any claim that Google sign-in works.
- Server-side accounts, a user database, server-issued sessions, or access
  control for `/api/chat`.
- Production authentication/security claims, email verification, password
  reset, recovery, multi-factor authentication, account sharing, and
  cross-device synchronization.
- Account deletion or changing a password unless separately approved.
- Changes to the proxy interfaces, server-side credentials, chat API payloads,
  model routes, usage accounting, or CodeRange asset handling.

## Human Decisions

The following decisions need approval before implementation. Recommendations are
included to make approval concrete.

1. **Security boundary:** Confirm that this requirement means real local
   credential checking for the browser UI only, and not protection of a public
   deployment or the shared proxy endpoint. If server access control is
   required, the recommended browser-only approach is not sufficient.
2. **Account fields and identifier:** Approve display name, email, password, and
   confirmation as the fields, with normalized email as the login identifier.
   The email will not be verified or used for recovery.
3. **Conversation privacy and migration:** Approve per-account conversation
   isolation and assignment of existing `litechat.conversations.v1` data to the
   first account that successfully logs in, or choose to keep conversations
   shared browser-wide. These behaviors cannot both be provided.
4. **Session duration:** Approve a tab-scoped session that survives reload and
   ends when the tab closes. A persistent sign-in would require a different
   client storage decision and remains client-controlled.
5. **Password and recovery policy:** Approve a modest client-side minimum
   password length (recommended: eight characters) and no password recovery. If
   local account data is cleared, the user must create a new account; existing
   conversations can only be recovered if their storage remains.

## Planning Readiness

The repository supports the recommended local-only implementation without new
infrastructure or dependencies. The study is ready for product review. A plan
can be created after the human decisions above are approved or explicitly
resolved in the plan's `OPEN QUESTIONS` section. Do not begin implementation
before the approved study and plan stages are complete.

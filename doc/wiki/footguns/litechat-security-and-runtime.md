# Deeda Security And Runtime Footguns

## Secrets

- Keep `.env.local` and other `.env*` files out of Git. The repository allows
  only a value-free `.env.example`.
- Do not place LiteChat credential values in source code, tests, fixtures,
  browser code, localStorage, logs, screenshots, or documentation.
- The server reads `BUILD_OPENAI_KEY`, `BUILD_ANTHROPIC_KEY`, and
  `BUILD_GOOGLE_KEY`. Documentation may name these variables but must not contain
  their values.
- Keep proxy requests in the server-side Route Handler. Do not accept a
  client-supplied endpoint, model ID, upstream header, or proxy credential.

## Local Authentication Is Not Server Authorization

- Deeda account verification happens in the browser. It is a UI gate for this
  educational MVP, not production authentication.
- `/api/chat` is not protected by the local login. A direct caller can reach the
  Route Handler without a browser account session.
- Do not expose shared proxy credentials to unrestricted CodeRange users. Add an
  approved runtime access restriction if deployment exposure requires it.
- Browser storage and client code are user-controlled. Same-origin code or a
  person with browser-profile access can read or modify local account and
  conversation data.

## Password And Account Data

- Passwords are not stored as plaintext. Account records use Web Crypto,
  PBKDF2-HMAC-SHA-256, a random salt per account, and 600,000 iterations.
- Keep entry fields controlled by React and do not add HTML `name` attributes.
  A form's native fallback can otherwise serialize credentials into a GET URL
  if its submit handler does not run. The React handler must keep calling
  `preventDefault()`.
- Do not add password confirmation, password values, proxy credentials, or
  reusable authentication tokens to `localStorage` or `sessionStorage`.
- The account registry is `deeda.accounts.v1`. The active tab session is
  `deeda.auth.session.v1` and stores only a version and account ID.
- The local session survives reload in the same tab and ends when the browsing
  session closes. `Log out` removes the session marker.
- There is no email verification, password recovery, password reset, multi-factor
  authentication, server-side account store, or cross-device synchronization.
- Clearing browser data can remove local accounts, sessions, and conversations.

## Conversation Migration And Isolation

- Account conversations use `deeda.conversations.v1:<account-id>`.
- `litechat.conversations.v1` is legacy migration input only. Do not use it as a
  fallback for normal account reads or writes.
- The first account that successfully logs in claims valid legacy conversations.
  Deeda verifies the account-scoped destination before deleting the legacy key.
- Migration uses a browser Web Lock. Browsers without Web Locks fail safely
  rather than allowing two accounts to claim the same legacy data.
- Malformed legacy data, conflicting destinations, or storage failures must not
  be silently deleted or exposed to another account.
- Account conversation read-modify-write operations also use a per-account Web
  Lock. This prevents concurrent tabs for the same account from overwriting
  newer saved conversations.
- If conversation persistence fails, Deeda shows a storage warning and keeps
  current changes only in the active UI session. Those changes can be lost on
  reload or tab close.

## Proxy And Usage Behavior

- The three route labels identify proxy interfaces. Public proxy documentation
  says all three currently use DeepSeek Flash. Do not describe them as verified
  distinct vendor models.
- Missing token usage is unavailable. Do not display it as zero or infer it from
  message length.
- Browser-local token totals are not billing, quota, or payment records.
- A failed prompt remains visible and can be retried. The app does not retry
  proxy requests automatically.
- A real request through the Anthropic-compatible proxy interface was manually
  verified on the deployed app. This does not verify live requests through every
  interface or distinct underlying vendor models. Automated tests use mocked
  responses and do not require real credentials.

## CodeRange And Mobile Runtime

- The actual CodeRange forwarded `/proxy/<port>/` environment persistently
  remained on the Preparing screen during manual testing. Treat this as an
  environment-specific observation. Its root cause is not established, and it
  is not evidence of a general app failure or a verified production fix.
- Localhost automated browser verification passed, and the GitHub-based Vercel
  deployment loaded and operated successfully. Neither result explains the
  CodeRange forwarded-path behavior.
- CodeRange can provide `VSCODE_PROXY_URI` without `PORT`. In that case Deeda
  uses `3000` for the server and `/proxy/3000` for the asset prefix. If the
  platform supplies `PORT`, that value is authoritative.
- Keep build and runtime `VSCODE_PROXY_URI` and `PORT` settings aligned. Next.js
  embeds the asset prefix in the build output.
- Do not set `basePath`. CodeRange strips the forwarded path before forwarding
  requests to Next.js.
- If the UI appears unstyled, inspect CSS requests, JavaScript requests, and the
  browser console before changing application CSS.
- If port `3000` is already in use, inspect the active server before starting
  another. A second server can fail to bind even when the active server is
  working.
- On mobile, the sidebar is a drawer. Use `Chats` to open it and the backdrop or
  `Close` control to dismiss it. Do not assume desktop sidebar controls remain
  visible on a narrow viewport.

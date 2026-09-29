# Deeda Final Product And Interaction Study

- Study timestamp: `1790672205`.
- Status: Study only. No application code was changed.
- Scope: Diagnose the reported CodeRange interaction failure and assess a
  controlled Deeda branding, entry-screen, and visual refinement pass.

## Executive Finding

The strongest confirmed cause of the inert controls is CodeRange asset delivery,
not an overlay or pointer-events rule. The current execution environment has
`VSCODE_PROXY_URI` configured but does not set `PORT`. `next.config.ts` passes
`process.env.PORT` to `getForwardedAssetPrefix`, and that helper returns no prefix
when either value is absent. The Next.js document can therefore refer to
root-relative JavaScript and CSS assets instead of the forwarded
`/proxy/3000/` path. If CodeRange does not serve those root paths, client
hydration fails. React handlers then do not work, and the composer and route
selector also remain disabled because their enabled state depends on client
hydration.

The existing local Playwright suite passes through conversation creation,
route switching, conversation controls, retries, and mobile navigation. Its
base URL is localhost, so that result does not cover the forwarded asset path.
The current stylesheet has no desktop overlay. The mobile backdrop is hidden
unless the drawer is explicitly open and is placed below the drawer. No
`pointer-events`, `readOnly`, or unexpected overlay rule was found. Those are
not supported as the root cause by repository evidence.

The final implementation should make the port used for the server and forwarded
asset prefix deterministic. Preserve a platform-provided `PORT`; when it is
absent, use the explicitly requested CodeRange/runtime port `3000`. Add browser
regression coverage that confirms the forwarded prefix is used and that real
browser clicks, focus, typing, route selection, conversation creation, and
conversation controls work after hydration. A live forwarded-host browser
session should be used for runtime confirmation when available.

## Requirements And Testable Outcomes

- The product is presented to users as **Deeda** in page metadata, entry screen,
  workbench, and user-facing documentation.
- Technical LiteChat proxy identities, the proxy URL, route IDs, environment
  variable names, and the existing `litechat.conversations.v1` storage key stay
  unchanged. The last item preserves existing local conversations.
- CodeRange asset URLs use the forwarded path even when the runtime omits
  `PORT`; an explicitly supplied `PORT` takes precedence.
- A user can click and focus controls, type in labeled fields and the composer,
  choose all existing routes, create a conversation, and use saved-conversation
  selection, rename, delete, retry, and mobile navigation controls.
- A local demo entry screen shows Deeda branding, welcome copy, username/email
  and password fields, a `Log in` button, a divider, and a Google button that is
  visibly and accessibly marked as not connected.
- `Log in` enters the existing workbench without credential validation or
  password persistence. The entry experience does not add authentication,
  account storage, cookies, or a backend.
- The existing three proxy interfaces, server-side secret handling, API
  contracts, chat history, usage accounting, conversation storage, retry/error
  behavior, and asset-prefix runtime fix remain intact.
- The visual identity uses a high-contrast restrained purple palette and
  system-font stacks. It remains usable on desktop and mobile and preserves
  keyboard navigation, visible focus, labels, and adequate touch targets.
- `npm test`, `npm run test:e2e`, `npm run typecheck`, `npm run lint`, and
  `npm run build` pass. Runtime verification confirms binding on
  `0.0.0.0:3000` and checks the forwarded asset path.

## Architecture And Technology

Keep Next.js, React, TypeScript, CSS custom properties, the current native
`select`, and the existing Vitest/Testing Library/Playwright stack. These
technologies already cover the UI, server-side proxy boundary, API behavior,
responsive styles, and browser tests. Adding a component library, authentication
service, external font, or image dependency would increase risk without meeting a
requirement better.

Add the entry experience as a small client-side presentation boundary around the
existing chat workbench. Keep its entry state in React memory. Keep the
conversation manager and all proxy behavior in their existing components and
server modules. Do not alter credentials, route contracts, message serialization,
conversation data, or the storage key.

For the runtime fix, derive the asset prefix from `VSCODE_PROXY_URI` and the same
effective port the server uses: the supplied `PORT`, or `3000` when absent. Keep
local asset paths unchanged when no forwarded URI is available. Test both
provided-port and fallback-port cases. Browser testing must exercise controls
with real Playwright actions, rather than infer usability from enabled-state or
DOM-only assertions.

## Visual And Interaction Approach

- Replace green identity tokens with deep purple brand surfaces, violet/lavender
  accents, pale lavender/neutral backgrounds, readable text, subtle borders, and
  restrained shadows.
- Refine the existing sidebar, list items, route selector, message surfaces,
  empty state, composer, and focus/hover/disabled/pending/error states without
  introducing new product workflows.
- Preserve the native route selector for reliable keyboard and assistive
  technology behavior.
- Keep responsive navigation compact on mobile. Confirm no backdrop or fixed
  element intercepts controls when the navigation drawer is closed.
- Keep the existing architecture and CSS rather than adding a UI framework.

## Constraints And Invariants

- Do not change the three approved proxy interfaces, API contract, server-side
  credential handling, normalized usage, multi-turn behavior, or local
  conversation schema.
- Do not rename the external LiteChat proxy or protocol-specific terminology.
- Do not rename the existing localStorage key or discard its data.
- Do not add real Google OAuth, user authentication, a user database, or any
  server authentication boundary. Clearly disable/label the Google demo button.
- Do not store the password in localStorage or another persistent store.
- Do not add external font dependencies, unrelated features, or real proxy calls
  to automated tests.
- Keep CodeRange assets under the existing `assetPrefix` strategy. Do not add
  `basePath` because CodeRange strips the forwarded prefix.
- Preserve the pre-existing worktree edit to `next-env.d.ts` and all untracked
  transcript artifacts. Do not stage or modify them.

## Risks And Validation

- If CodeRange uses a non-default port but fails to provide `PORT`, a hard-coded
  fallback would be wrong. Preserve a supplied `PORT`, use `3000` only as the
  documented default, and verify the effective runtime port before claiming
  forwarded operation.
- Next.js embeds `assetPrefix` in generated assets. Build and run with matching
  forwarded settings; rebuilding under different settings can produce incorrect
  URLs.
- A Playwright test against localhost can validate generated prefix paths but
  cannot fully prove an externally forwarded browser session. Report that
  distinction if the actual forwarded host is not reachable.
- The visual refresh can accidentally reduce contrast or obscure controls. Add
  semantic browser interaction checks and inspect narrow and desktop viewports.
- Entry fields can imply real authentication. State that this is a local demo,
  make login credential-free, and clearly mark Google sign-in as not connected.
- Automated tests must use mocked chat responses and must not need credentials.

## External Inputs

- Proxy credentials remain secret external inputs under the existing server-only
  environment variable names. They are not needed for the requested mocked tests
  or the demo login.
- The CodeRange forwarding environment must provide `VSCODE_PROXY_URI` and, when
  its assigned port is not `3000`, `PORT`. Do not expose either variable value
  while checking it.
- No Google OAuth credentials, user database, external login service, font,
  image, or proprietary dataset is required.

## Human Decisions

No blocking decisions remain. The user explicitly approved the Deeda name,
purple direction, local credential-free entry experience, disconnected Google
button behavior, preservation of existing proxy/chat architecture, and the
required runtime port of `3000` when no platform port is supplied.

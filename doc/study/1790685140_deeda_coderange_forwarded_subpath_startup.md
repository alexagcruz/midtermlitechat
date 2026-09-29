# Study: Deeda Startup Through the CodeRange Forwarded Subpath

## Requested Outcome

When a fresh browser opens Deeda through CodeRange at `/proxy/<port>/`, it
must leave `Preparing your Deeda workspace...` and show the login form. The same
application must continue to work at the local root URL. Authentication must
not be redesigned.

## Verified Inputs

- A fresh clone from `origin/main` installed with `npm ci` and reproduced the
  stuck loading screen through CodeRange at `/proxy/3001/`.
- Localhost Playwright verification previously completed account creation,
  login, chat submission, and logout.
- The reported lint, typecheck, unit test, E2E, and build checks passed before
  this investigation.
- In this worktree, `VSCODE_PROXY_URI` is configured with a port template.
  The actual URI is intentionally not recorded in this document.
- A headless browser launched from this workspace could not reach the real
  forwarded app: the request redirected to `/` outside the app context. This is
  not a valid forwarded-browser verification.

## Code Findings

`src/components/deeda-app.tsx` initializes `authState` as `resolving`. Its
mount-only effect calls `resolveAuthSession()`. When the tab has no session,
the effect immediately sets `signed-out`, which renders `DeedaEntry`. Exceptions
also set `signed-out` and show an error. Only a valid session plus conversation
migration can delay the signed-in transition.

`resolveAuthSession()` in `src/lib/auth/accounts.ts` reads tab session storage
and, when needed, the local account registry. It does not use Web Crypto,
network requests, or `window.location`. For a fresh browser, no crypto work or
conversation migration is needed. An indefinitely visible loading screen
therefore means that the client effect did not run or client startup did not
complete; it is not a normal authentication outcome.

The app page and auth code contain no pathname-based startup logic. The root
layout loads the application stylesheet and the client component. The known
auth, storage, and initialization code has no branch for `/proxy/<port>/`.

`next.config.ts` derives `assetPrefix` from `VSCODE_PROXY_URI`, replacing its
port template with `PORT` (default `3000`). `src/lib/runtime/asset-prefix.ts`
returns a path such as `/proxy/3001`. The config does not set `basePath`.
`assetPrefix` prefixes Next static asset URLs; it does not make the app's route
tree or root-relative application URLs live below that prefix. CodeRange strips
the forwarded prefix before sending requests to Next, so adding `basePath` would
conflict with the proxy's existing behavior unless new evidence shows otherwise.

The recent E2E test, `loads auth with the forwarded CodeRange origin on
development assets`, opens `/` on localhost and adds a root-path referer to
`/_next` requests. It checks that the login heading appears and that no asset
response failed. It does not open `/proxy/<port>/`, preserve that path as the
browser's document pathname, or emulate CodeRange stripping that prefix. Its
passing result therefore does not cover the reported startup condition.

## Root-Cause Investigation

The exact failing client request/runtime condition is not yet established. The
strongest code-level localization is to Next client runtime loading or
hydration at the forwarded document URL: the auth effect is sufficient to leave
the loading state as soon as it runs. The live external forwarded host is not
reachable from the current headless-browser context, so this workspace cannot
prove the real CodeRange result by itself.

Before changing application configuration, add a deterministic E2E simulation
of the proxy contract. Configure the dev server with a forwarded path asset
prefix, navigate the browser to `/proxy/<port>/`, and have the test proxy strip
that prefix when forwarding document, script, and stylesheet requests to Next.
Capture failed scripts, page errors, browser pathname, and the final rendered
auth screen. Compare this to the existing root-path localhost flow. This will
show whether the current configuration and runtime actually fail under the
condition, and identify the specific failing requests or hydration behavior.

The current asset-prefix test is not that reproduction. Also, the headless
attempt to open the external CodeRange URL redirected outside the app and did
not produce evidence about the Deeda page itself.

## Requirements and Testable Outcomes

- A fresh browser at a forwarded `/proxy/<port>/` document URL loads all required
  client JavaScript and hydrates without runtime errors.
- The forwarded browser leaves the resolving state and renders the login form.
- The browser remains on the forwarded path; no unexpected document navigation
  is needed to reach the login form.
- The same outcome holds for the normal localhost `/` URL.
- Existing local authentication and chat behavior remains unchanged.
- The test distinguishes failed script requests from application/auth errors.
- No real proxy credentials or external LiteChat requests are needed.
- Do not add `basePath` unless the proxy simulation proves it is required and
  compatible with CodeRange prefix stripping.

## Feasibility and Architecture

Keep the Next.js App Router, current client-side local auth, and `assetPrefix`
approach unless the forwarded-path test provides contrary evidence. Add the
regression at the Playwright browser layer because the failure concerns browser
asset loading and hydration, not an isolated helper. A small test-only reverse
proxy simulation can preserve the real browser path while forwarding stripped
paths to the existing dev server. Avoid introducing production proxy code,
authentication changes, or a new runtime dependency.

The browser test should explicitly exercise both the prefixed URL with a
CodeRange-like strip-prefix proxy and the unprefixed localhost URL. Unit tests
for prefix derivation remain useful but cannot validate hydration.

## Alternatives and Tradeoffs

- **Add `basePath`:** Rejected as a speculative first change. Next would treat
  the forwarded prefix as part of its own route handling, while CodeRange is
  reported to remove that prefix before forwarding. It risks doubled or
  mismatched paths and does not explain the current lack of browser-runtime
  evidence.
- **Keep `assetPrefix` and test the proxy contract:** Recommended. It matches
  Next's static asset prefix purpose and the existing CodeRange stripping model.
  A deterministic test can expose missing or incorrectly prefixed runtime
  requests without external credentials or services.
- **Change authentication initialization:** Rejected. The auth effect resolves
  a fresh session to signed-out without crypto or network work. Changing auth
  would obscure the unverified client startup boundary and risks regressing
  known-good account behavior.
- **Use a full external CodeRange E2E test in CI:** Not recommended as the only
  test. It depends on an externally available forwarded host and environment
  configuration, so it is not reproducible from a fresh clone.

## Constraints, Risks, and Assumptions

- CodeRange preserves `/proxy/<port>/` in the browser URL and strips the prefix
  before forwarding to the Next server, as stated in existing project docs and
  implied by the verified browser URL.
- `VSCODE_PROXY_URI` and `PORT` must match when the app server starts because
  Next embeds the resulting asset prefix in development/build output.
- A local test proxy must model URL rewriting and forwarded referer/origin
  behavior closely enough to reveal asset and hydration failures. It cannot
  prove external CodeRange infrastructure behavior.
- Do not edit `/home/coder/deeda-github-final` or
  `/home/coder/deeda-fresh-test`.
- Preserve `next-env.d.ts` and the untracked transcript artifacts. They are
  unrelated worktree changes.
- Do not inspect, print, or record credential values. Automated chat requests
  must remain mocked.

## Exogenous Inputs

- Live verification requires CodeRange to expose the running port through its
  forwarded browser URL. This environment provides a URI template, but the
  headless browser could not reach the application through that external URL.
- LiteChat credentials are not needed and must not be used for this fix.

## Validation Needs

- Run the new forwarded-path browser regression and existing localhost browser
  authentication flow.
- Run `npm run lint`, `npm run typecheck`, `npm test`,
  `CI=1 npm run test:e2e`, and `npm run build` after the fix.
- Inspect the browser's actual script URLs, failed requests, page errors, final
  pathname, and login heading in the simulated test.
- If real external CodeRange access remains unavailable, report that a manual
  forwarded-browser check is still required; do not report it as passed.

## Decisions Needed

No authentication or framework redesign is needed. The exact runtime fix must
remain open until the forwarded-subpath reproduction identifies the failing
client request or hydration assumption. Do not change Next.js path configuration
or application code on speculation.

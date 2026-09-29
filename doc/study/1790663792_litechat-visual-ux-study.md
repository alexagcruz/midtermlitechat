# LiteChat Visual UX Improvement Study

- Study timestamp: `1790663792`.
- Status: Study only. No application code was changed.
- Scope: Diagnose the reported plain-looking interface and define a
  human-approvable visual redesign for the existing MVP.

## Executive Finding

The current plain appearance is not caused by a missing CSS import or a broken
static asset path in the inspected application. The root layout imports
`src/app/globals.css`, the stylesheet contains extensive component rules, the
production HTML references a generated CSS asset, and the local production
server returned that asset with HTTP 200. The asset contained the expected
`.app-shell` rules.

The most likely cause is a combination of insufficient visual polish relative
to contemporary AI chat products and an environment-specific delivery or
inspection difference through CodeRange. The implementation already has styling:
dark sidebar, pale panel, custom color tokens, responsive breakpoints, message
bubbles, route controls, loading dots, and a composer. It is not default HTML.
However, its visual language is intentionally sparse and editorial: Georgia
serif headings, monospace labels, pale gray-green surfaces, thin borders, small
controls, and minimal chrome. This can look like lightly styled HTML when
compared with the denser, more finished interaction patterns expected from a
modern AI chat application.

The forwarded CodeRange URL was not independently reachable from the OpenCode
execution environment during this study. Therefore, this study cannot prove
that the browser path delivered the same CSS asset. The existing local asset
check does prove that the Next.js CSS import and production asset generation
work locally. A browser-side CodeRange check should still inspect the CSS
request and console errors before redesign implementation.

## Evidence

The current frontend has these relevant facts:

- `src/app/layout.tsx` imports `./globals.css` at the root layout.
- `src/app/globals.css` is approximately 810 lines and defines the full
  application shell, sidebar, controls, message styles, composer, responsive
  breakpoints, and focus states.
- `src/components/chat-app.tsx` uses class names that match the stylesheet,
  including `app-shell`, `sidebar`, `chat-panel`, `route-bar`, `message-list`,
  and `composer`.
- `next.config.ts` does not define `basePath`, `assetPrefix`, a custom asset
  host, or a rewrite that would obviously break CSS delivery.
- A local production server started with `npm start` on port `3000` and bound to
  `0.0.0.0`.
- The local HTML referenced one generated CSS asset under `/_next/static/...css`.
- The CSS asset returned HTTP 200 and contained the `.app-shell` selector.
- There is no `public/` directory and no external font or image dependency.
  The current UI relies on system font stacks, so there is no font asset request
  whose failure would explain the entire appearance.
- The browser tests pass through the UI with the existing class-based styling.

These facts rule out a simple “global CSS was never imported” diagnosis for the
repository-local application. They do not rule out a proxy-specific browser
cache, stale deployment, blocked `/_next` asset request, or browser console
error in the manually accessed CodeRange instance.

## Root Cause Decision Tree

### CSS or Static Asset Delivery

**Local result: working.** Next.js emits and serves the CSS asset. The stylesheet
contains application rules.

**CodeRange result: not independently verified.** The next implementation
session should first use browser developer tools on the forwarded URL:

- Check the document request status.
- Check the `/_next/static/...css` request status and content type.
- Check the browser console for stylesheet, hydration, or chunk errors.
- Confirm a rendered element has a class such as `app-shell` and that its
  computed `display` is `grid`.

If the stylesheet is 404, blocked, or replaced by an HTML error page, fix the
deployment/proxy path before changing design. Do not add CSS as a workaround
for an asset-delivery problem.

### Stylesheet Import/Application

**Repository result: working.** The import is in the root layout and generated
CSS contains the selectors. There is no evidence of an incorrect import path or
missing global stylesheet.

### Styling Sufficiency

**Most likely issue.** The current design has a strong starting direction, but
the interface has low information density, small low-contrast metadata, limited
state feedback, and few visual affordances. The sidebar and main workspace are
present, but the design does not yet communicate a polished AI workspace:

- The first screen has large empty space and only one short empty-state message.
- The conversation list is visually quiet and action controls are hidden until
  hover/focus, which is weak on touch devices.
- Route selection uses a normal browser `select`, which is functional but not a
  strong product control.
- The composer is compact and lacks a clear context hierarchy around send,
  keyboard behavior, and current route.
- Message metadata and token information use very small monospace text.
- There is little separation between system disclosure, route context, usage,
  and conversation content.
- The visual system uses several subtle gray-green values without a clearly
  prioritized primary action.

## Recommended Visual Direction

Preserve the current restrained deep-green and lime accent foundation, but move
from “editorial landing page” to “focused AI workbench.” The redesign should
feel calm and useful, not decorative.

### Design Principles

- Use one clear page shell with a stable sidebar and a focused main workspace.
- Use a sans-serif UI font stack for readability and reserve a display face for
  one short empty-state heading only if it remains legible.
- Increase spacing rhythm and control height before adding ornament.
- Use a small set of surface levels: app background, sidebar, workspace, message
  surface, and composer surface.
- Make the active route, send action, pending state, error state, and selected
  conversation visually obvious.
- Use color and border changes for hierarchy, not large gradients or heavy
  shadows.
- Keep token usage available but secondary to the response text.
- Keep the proxy/model disclosure visible but compact and clearly informational.

### Suggested Visual Tokens

Use CSS custom properties in `globals.css` rather than adding a UI framework:

- Deep ink for the sidebar and primary action.
- Warm off-white application background.
- White or near-white workspace and message surfaces.
- One pale green accent for active route, selected conversation, and success.
- One amber/red accent for errors and incomplete responses.
- A readable muted text color that meets contrast requirements on each surface.
- A spacing scale such as 4, 8, 12, 16, 24, 32, and 48 pixels.
- Minimum interactive height of about 40 to 44 pixels for touch targets.

These values are design guidance, not code requirements. Confirm contrast with a
contrast checker during planning or implementation.

## Proposed Layout

### Desktop

- A full-height application shell with a fixed-width sidebar around 280 to 320
  pixels and a flexible workspace.
- Sidebar header with the LiteChat mark, short product descriptor, and a high-
  contrast `New conversation` button.
- Saved conversations below the button. Each item has a selected state and
  visible or keyboard-accessible rename/delete actions.
- Sidebar footer with “Saved in this browser” and a small privacy/persistence
  hint.
- Main workspace with a top header containing the conversation title, a compact
  route selector, and a small prototype/status indicator.
- A narrow information row below the header that explains route identity and the
  DeepSeek Flash documentation caveat without competing with chat content.
- Scrollable message region with a readable max width around 720 to 800 pixels.
- User messages aligned right with a tinted accent surface. Assistant messages
  aligned left with a neutral surface and route metadata.
- Usage displayed as a quiet metadata row below each assistant response and as a
  compact conversation total near the composer or header.
- Composer pinned naturally to the bottom of the workspace with a larger text
  area, explicit send button, and the no-billing disclosure.

### Mobile

- Replace the persistent desktop sidebar with a compact top bar or collapsible
  navigation region. Do not force a 280-pixel sidebar above the chat.
- Keep `New conversation`, current conversation navigation, and saved sessions
  reachable without horizontal overflow.
- Place the route selector in a full-width control row below the header.
- Give the composer a comfortable minimum height and keep the send target at
  least 44 pixels high.
- Keep message bubbles within the viewport with `overflow-wrap: anywhere` and
  safe horizontal padding.
- Avoid hover-only controls. Rename/delete actions must be visible on focus and
  usable by touch.

## Components Likely to Change

The redesign should stay within the existing architecture and likely change:

- `src/components/chat-app.tsx`: semantic grouping, sidebar controls, header,
  route selector presentation, message metadata, composer labels, and responsive
  navigation behavior.
- `src/app/globals.css`: visual tokens, typography, spacing, surface hierarchy,
  focus/hover/disabled states, breakpoint layout, and mobile navigation styles.
- `src/app/layout.tsx`: only if metadata, font loading, or an accessibility
  landmark needs a small correction. Avoid external font assets unless the
  network behavior is verified through CodeRange.
- `src/components/chat-app.test.tsx`: update selectors only when the semantic
  structure changes. Preserve behavioral assertions.
- `e2e/chat-flow.spec.ts`: add stable accessible checks for the responsive shell
  only if needed. Do not assert exact colors or pixel positions.

No proxy adapter, storage schema, API route, credential code, or message
serialization should change for a visual redesign.

## Functionality That Must Remain Unchanged

- Three fixed route IDs and documented model presets.
- Server-only proxy credentials using `BUILD_OPENAI_KEY`,
  `BUILD_ANTHROPIC_KEY`, and `BUILD_GOOGLE_KEY`.
- `POST /api/chat` request validation and safe error mapping.
- Multi-turn message history and route switching between turns.
- Per-response usage and known/partial conversation totals.
- `litechat.conversations.v1` browser-local persistence behavior.
- Create, list, reopen, rename, and delete conversation actions.
- Loading, failed-prompt preservation, manual retry, and interrupted pending
  prompt recovery.
- No authentication, payment, uploads, web search, streaming, or other deferred
  feature.

## Testing Implications

Existing tests assert important behavior through accessible names and stable
test IDs. A redesign should preserve those semantics where possible. Tests that
should remain unchanged include:

- Adapter and route-handler tests.
- Request validation and security tests.
- Local storage tests.
- Chat multi-turn, route switching, usage, loading, failure, retry, rename,
  delete, and recovery tests.
- Playwright mocked-proxy flow.

Add only focused UI behavior tests where the redesign changes interaction:

- The mobile navigation can reveal and select saved conversations.
- The route selector remains keyboard accessible.
- The composer remains reachable and usable at desktop and mobile widths.
- The selected conversation and active route have programmatically visible
  state.
- No horizontal overflow occurs at a narrow mobile viewport.

Do not test exact colors, font pixels, shadow values, or CSS class names. Use
semantic roles, labels, visible states, and layout constraints.

## Accessibility

- Keep one `h1` for the active workspace and logical heading levels below it.
- Use landmarks for navigation, main content, and the message log.
- Keep visible labels for the route selector, message input, and conversation
  actions.
- Use `aria-current` or equivalent state for the selected conversation.
- Keep focus-visible outlines with sufficient contrast.
- Do not rely on hover to expose essential actions.
- Make error and loading announcements understandable without color alone.
- Preserve readable line length and text size. Avoid tiny all-caps text for
  essential information.
- Ensure disabled controls communicate why they are disabled through nearby text
  or clear state, not only opacity.

## CodeRange and Asset Delivery

The local production check showed that `globals.css` is imported and emitted as
a generated `/_next/static/...css` asset with HTTP 200 and expected application
selectors. The CodeRange browser report still requires a deployment check:

- Load the forwarded URL in a browser.
- Inspect the CSS asset request and confirm HTTP 200 with a CSS content type.
- Check the console for failed Next.js chunks, hydration errors, or stylesheet
  errors.
- Inspect an `.app-shell` element and its computed layout.

If the CSS asset fails through CodeRange, fix the forwarded asset path or stale
deployment before changing the visual design. Do not add a styling workaround
for a proxy delivery problem.

## Risks and Tradeoffs

- A larger visual redesign can accidentally change accessible names used by the
  test suite. Prefer semantic markup and update tests only when necessary.
- More responsive navigation behavior can increase state complexity. Keep the
  same conversation and storage state; add no account or server persistence.
- External fonts or image assets can create new CodeRange delivery failures.
  Prefer system font stacks or verify every new asset path through the forwarded
  runtime.
- Stronger contrast can change the established restrained palette. Prioritize
  readable text and clear states over exact color preservation.
- A custom route picker can improve product quality but can introduce keyboard
  and screen-reader issues. A styled native `select` is the lower-risk option.

## Human Decisions Required Before Planning

1. Approve the visual direction: restrained deep-green workbench with stronger
   surfaces, typography, spacing, and interaction hierarchy.
2. Decide whether mobile saved conversations use a compact collapsible drawer,
   a top-sheet pattern, or a simple stacked navigation block. The study
   recommends a compact collapsible drawer or top-sheet behavior.
3. Decide whether to keep the current system-font-only approach. The study
   recommends no external font dependency unless CodeRange asset delivery is
   explicitly verified.
4. Confirm that a visual redesign may change markup and CSS while preserving
   accessible labels and all approved MVP behavior.

## Recommendation

Proceed to planning only after confirming the four decisions above. Treat the
current issue as primarily styling sufficiency, with a required CodeRange CSS
delivery check before implementation. Keep the redesign limited to the existing
chat shell, components, and CSS architecture.

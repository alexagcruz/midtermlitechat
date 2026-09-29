# LiteChat Visual UX Improvement Plan

- Plan timestamp: `1790664052`.
- Status: EXECUTE PLAN in progress on `feat/litechat-visual-ux`.
- Basis:
  - `doc/study/1790663792_litechat-visual-ux-study.md`
  - `doc/canonical/litechat-midterm-mvp-decisions.md`
  - Existing verified implementation on `main`.
- Scope: Improve the existing frontend presentation without changing approved MVP
  behavior, API contracts, proxy integration, storage schema, credentials, or
  deferred-feature scope.

## Approved Decisions

- Use a restrained deep-green AI workbench direction with stronger surfaces,
  typography, spacing, hierarchy, and interaction states.
- Use compact collapsible conversation navigation/drawer behavior on mobile.
- Keep the system-font-only approach. Do not add external font dependencies.
- Change frontend markup and CSS as needed while preserving accessible labels
  and every approved MVP behavior.

## Non-Goals and Invariants

Do not change:

- The three fixed proxy routes, route IDs, or documented model presets.
- `POST /api/chat`, request validation, response normalization, or safe errors.
- Server-only credential handling and the environment variable names.
- Message serialization, multi-turn behavior, route switching, or token totals.
- `litechat.conversations.v1`, its data shape, or browser-local persistence.
- Create, list, reopen, rename, delete, loading, failure, retry, and recovery
  behavior.
- Authentication, billing, uploads, web search, streaming, additional routes,
  server persistence, or other deferred features.

## OPEN QUESTIONS

### A. BLOCKS IMPLEMENTATION

None. The user approved the visual direction, mobile navigation pattern,
system-font constraint, and markup/CSS change boundary. Existing architecture
and tests provide enough information to begin implementation.

### B. CAN BE RESOLVED DURING EXECUTION OR RUNTIME VERIFICATION

- Confirm the manually accessed CodeRange deployment serves the generated CSS
  asset with HTTP 200 and a CSS content type, and that the browser console has
  no stylesheet, chunk, or hydration errors. If CSS delivery fails, resolve
  that runtime issue before changing visual styles.
- Confirm the final mobile and desktop layout through the accessible CodeRange
  browser URL. This does not change the implementation scope.

## Implementation Checklist

Update this checklist during EXECUTE PLAN only after the relevant behavior is
implemented and verified.

### 1. Baseline and Asset Delivery

- [x] Check Git status and create a feature branch from the approved `main`.
- [x] Record the current baseline test results before changing the frontend.
- [x] Start the existing production server on the verified local runtime and
  confirm the generated CSS asset returns HTTP 200 with a CSS content type.
- [ ] Through the accessible CodeRange browser URL, inspect the document and
  `/_next/static/...css` requests, browser console, and computed `.app-shell`
  display. If the asset fails, stop styling work and resolve delivery first.
- [x] Confirm that no external fonts, images, or UI-framework dependencies are
  required. Keep all design assets in existing CSS and markup.

### 2. Visual System

- [x] Refine `src/app/globals.css` custom properties for the deep-green sidebar,
  warm application background, workspace surface, message surfaces, pale-green
  accent, error accent, muted text, spacing scale, radii, and control heights.
- [x] Replace overly small or low-contrast essential metadata with readable UI
  text. Keep compact labels only for secondary context.
- [x] Use system-font stacks only. Do not add remote fonts, font files, image
  assets, or new UI libraries.
- [x] Define consistent hover, focus-visible, selected, disabled, pending, and
  error states. Keep contrast sufficient on light and dark surfaces.
- [x] Keep the visual language restrained. Do not add gradients, decorative
  illustrations, product claims, or features outside the approved MVP.

### 3. Desktop Application Shell

- [x] Refine the shell into a stable sidebar and flexible main workspace.
- [x] Keep branding, product descriptor, `New conversation`, saved conversations,
  and browser-local persistence hint in the sidebar.
- [x] Make the selected conversation state obvious without depending on hover.
- [x] Keep rename and delete actions keyboard accessible and visible on focus.
- [x] Give the main header clear title hierarchy, route context, and prototype
  status without duplicating or changing existing accessible names unnecessarily.
- [x] Give the route selector a clear visual grouping near the conversation
  header. Keep it a native accessible `select` unless a custom control can be
  implemented without reducing keyboard or screen-reader behavior.
- [x] Keep the proxy/model disclosure visible but visually secondary.
- [x] Improve the empty state with useful hierarchy and a clear first action
  without adding sample prompts that trigger external requests.
- [x] Keep the message region at a readable max width. Distinguish user and
  assistant messages through alignment, surface, label, and spacing.
- [x] Keep usage below responses and conversation totals near the composer as
  secondary information.
- [x] Make the composer the clear primary interaction with a comfortable text
  area, clear send action, pending state, and no-billing disclosure.

### 4. Mobile Navigation and Layout

- [x] At the mobile breakpoint, collapse the desktop sidebar into a compact
  navigation/drawer control. Do not keep a fixed-width sidebar above the chat.
- [x] Provide an accessible button with an explicit label to open and close the
  conversation drawer. Include an appropriate expanded state.
- [x] Let users start a new conversation, select a saved conversation, rename,
  and delete from the mobile navigation without horizontal overflow.
- [x] Close the drawer after selecting a conversation or starting a new one when
  that behavior is appropriate for the current interaction.
- [x] Keep the route selector full-width or comfortably sized below the header.
- [x] Keep message bubbles and the composer within the viewport. Use at least
  approximately 44px touch targets for primary controls.
- [x] Ensure essential controls do not rely on hover. Verify keyboard focus and
  touch interaction.

### 5. Accessibility and Semantics

- [x] Preserve one logical `h1` for the active workspace and valid heading order.
- [x] Preserve navigation, main, and message-log landmarks.
- [x] Preserve accessible labels for route selection, message input, new chat,
  rename, delete, retry, and conversation selection.
- [x] Preserve or improve `aria-current` for the selected conversation and add
  `aria-expanded`/`aria-controls` for the mobile drawer.
- [x] Keep focus-visible outlines with sufficient contrast on every interactive
  surface.
- [x] Ensure loading and error states are understandable without color alone.
- [x] Avoid essential information in tiny all-caps text.
- [x] Check text and control contrast with an accessibility contrast tool during
  implementation. Do not assert exact color values in automated tests.

### 6. Regression and UX Testing

- [x] Keep adapter, route-handler, validation, storage, and proxy security tests
  unchanged unless a semantic interface change requires a narrow test update.
- [x] Run existing UI tests after markup changes. Preserve coverage for prompt
  sending, multi-turn context, route switching, usage, loading, failure, retry,
  rename, delete, storage reload, and interrupted request recovery.
- [x] Add focused UI tests for opening/closing mobile navigation, selecting a
  saved conversation from the drawer, and preserving accessible selected state.
- [x] Add or update Playwright checks for narrow viewport no-overflow behavior,
  visible composer, route selector access, and mobile drawer interaction.
- [x] Do not test exact colors, pixel coordinates, shadow values, font pixels,
  or CSS class names. Use roles, labels, visible states, and layout constraints.
- [x] Run the complete normal suite without real credentials:
  `npm test`, `npm run test:e2e`, `npm run typecheck`, and `npm run lint`.

### 7. Documentation and Reproducibility

- [ ] Update `doc/wiki/litechat-mvp.md` only for implemented visual behavior,
  especially mobile navigation and any changed user-facing interaction.
- [ ] Update `doc/wiki/footguns/` if the drawer, responsive layout, or asset
  delivery introduces a noteworthy operational behavior.
- [x] Keep README setup and runtime commands accurate. Do not add secret values.
- [x] Confirm no external font, image, or UI framework dependency was added.
- [x] Verify `.gitignore`, package manifest, and lockfile remain unchanged except
  for intentionally approved dependency changes. Do not alter credentials or
  environment handling.
- [ ] Run `npm ci`, `npm run build`, and the documented startup command from a
  clean clone or equivalent clean dependency installation.

### 8. CodeRange Runtime Verification

- [ ] Verify the application binds to `0.0.0.0` and uses the assigned CodeRange
  port without inventing a value.
- [ ] Through the actual forwarded browser URL, verify the page, CSS asset,
  responsive layout, mobile drawer, conversation flow, and browser console.
- [ ] Confirm the CodeRange forwarded URL does not produce horizontal overflow
  at a narrow mobile viewport.
- [ ] Do not run live proxy requests unless instructor authorization and secure
  runtime credentials are available. Mocked tests remain required.

## Acceptance Criteria

- [ ] Local CSS delivery is confirmed. The global stylesheet is imported, the
  generated CSS asset returns successfully, and no local console/chunk error
  explains the visual result.
- [ ] The desktop UI reads as a polished, restrained AI workbench with a clear
  sidebar, workspace, route context, message hierarchy, usage metadata, and
  composer.
- [ ] The mobile UI uses compact collapsible conversation navigation and has no
  horizontal overflow.
- [ ] The new visual system uses system fonts and no new UI framework or external
  asset dependency.
- [ ] Primary actions and controls have clear hover, focus-visible, selected,
  disabled, loading, and error states.
- [ ] Essential actions are available without hover and remain keyboard and touch
  accessible.
- [ ] Existing route, chat, usage, persistence, loading, error, retry, rename,
  delete, and recovery behavior remains unchanged.
- [ ] All existing automated tests pass. New tests cover only changed responsive
  and interaction behavior.
- [ ] The browser tests use semantic assertions and do not lock the design to
  exact colors or pixel values.
- [ ] README and `doc/wiki/` accurately describe the implemented UI behavior.
- [ ] CodeRange verification confirms the CSS asset loads through the forwarded
  path, the application works on desktop and mobile, and the browser console has
  no relevant asset or hydration errors.
- [ ] No deferred product feature is added.

## Execution Boundary

This document is the approved visual UX plan only. Do not implement until the
EXECUTE PLAN stage begins. Do not mark a task complete because code exists;
verify the relevant behavior and tests first.

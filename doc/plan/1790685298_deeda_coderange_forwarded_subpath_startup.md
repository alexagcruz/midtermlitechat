# Plan: Correct Deeda Startup Through the CodeRange Forwarded Subpath

## OPEN QUESTIONS

- Which exact script request, Next.js runtime assumption, or hydration operation
  fails when the browser document URL is `/proxy/<port>/`? The current code
  localizes the problem to client startup, but does not yet prove the failing
  operation. Resolve this with the forwarded-path browser reproduction before
  choosing an application fix. Do not add `basePath` or alter authentication by
  guesswork.
- Can a browser in this environment reach the real CodeRange forwarded URL?
  The initial headless attempt redirected outside the app. If it remains
  unreachable, the owner must perform the real forwarded-browser smoke check
  after the fix; a local proxy simulation is not a substitute for claiming that
  CodeRange passed.

## Implementation Checklist

- [ ] Add a deterministic Playwright browser case that opens the document at
  `/proxy/<port>/` while a test-only proxy strips that prefix before forwarding
  requests to Next.js, matching CodeRange's documented routing contract.
- [ ] Ensure the Playwright-launched development server uses a matching
  forwarded asset prefix in both normal CI and CodeRange-configured runs. Do not
  log or record the forwarded host or any credential values.
- [ ] In the regression case, record failed `_next` scripts/stylesheets, client
  page errors, document navigations, final browser pathname, and whether the
  login heading appears. Assert the loading status disappears and login is
  visible on the forwarded URL.
- [ ] Run the regression against the current implementation first. Identify the
  concrete failing request or runtime condition. If the proxy model does not
  reproduce the reported behavior, improve the model or obtain the missing
  runtime evidence before changing production behavior.
- [ ] Apply the smallest code/configuration correction supported by that
  evidence. Keep the existing authentication and local account flow unchanged.
  Add no `basePath` unless the reproduction proves it is required and works with
  prefix stripping.
- [ ] Keep or adjust the existing forwarded-origin smoke test so it continues to
  assert development asset responses. Keep the standard localhost auth flow as
  a regression control.
- [ ] Update the CodeRange runtime documentation to describe the actual tested
  prefix, client startup behavior, and any remaining external verification
  requirement.

## Automated Validation

- [ ] Run the forwarded-subpath Playwright regression and verify that it fails
  before the fix for the identified reason and passes after the fix.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm test`.
- [ ] Run `CI=1 npm run test:e2e`.
- [ ] Run `npm run build`.
- [ ] Review test output and browser instrumentation for failed client scripts,
  unhandled runtime errors, unexpected document navigation, and a remaining
  loading status.

## Runtime Checks

- [ ] Start the app on localhost without a forwarded URI. Open `/` in Chromium
  and verify login/create-account renders and the loading status disappears.
- [ ] Start the app with the CodeRange URI template and the selected `PORT`.
  Verify the generated `_next` URLs include `/proxy/<port>` and that the local
  strip-prefix browser simulation reaches login at that same browser path.
- [ ] If the real CodeRange URL is accessible, open `/proxy/<port>/` in its
  forwarded browser and verify the rendered login form, working create-account
  controls, no console/page runtime errors, and no failed JavaScript requests.
- [ ] If the real forwarded browser is unavailable here, report the exact
  manual verification steps and mark the final result as needing that check.

## Reproducibility and Safety

- [ ] Keep the test dependency-free beyond the existing Playwright installation.
- [ ] Keep automated chat calls mocked; do not use or expose LiteChat keys.
- [ ] Do not edit `/home/coder/deeda-github-final` or
  `/home/coder/deeda-fresh-test`.
- [ ] Preserve the pre-existing `next-env.d.ts` modification and untracked
  transcript artifacts. Stage only files required for this task.
- [ ] Confirm the documented clean-clone commands remain `npm ci`, the required
  checks, and `npm run dev`; do not depend on untracked local state.

## Acceptance Criteria

- The test reproduces the browser pathname and prefix-stripping behavior, not
  only the asset-prefix helper or a root-path request with a rewritten referer.
- On the simulated forwarded path, all required client JavaScript loads, React
  mounts without runtime errors, `Preparing your Deeda workspace...` disappears,
  and the login/create-account UI is visible without document navigation.
- Normal localhost startup continues to render login/create-account and the
  existing auth, chat, and logout E2E tests continue to pass.
- All requested lint, typecheck, unit, E2E, and build commands pass.
- No unrelated changes or credentials are committed.
- Live CodeRange is reported as passed only if verified through the real
  forwarded browser after the fix.

## Rendezvous and Documentation

- [ ] Inspect status, diffs, branch history, and test results before committing.
- [ ] Commit the scoped fix with a Conventional Commit message.
- [ ] Merge the completed feature branch into `main` after verification.
- [ ] Update `doc/wiki/` to distinguish local/simulated results from real
  CodeRange verification and accurately document any runtime requirement.
- [ ] Push the verified `main` commits to `origin` only after automated checks
  pass; report whether the push succeeded and whether manual browser validation
  remains.

# Deeda Security And Runtime Footguns

- Keep `.env.local` and other `.env*` files out of Git. The repository allows
  only a value-free `.env.example`.
- Do not place LiteChat credential values in source code, tests, fixtures,
  browser code, localStorage, logs, screenshots, or documentation.
- The Deeda entry screen is not authentication or access control. It accepts
  blank or arbitrary input and does not validate, transmit, or persist the
  password. Google sign-in is disabled and not connected. Do not rely on this
  screen to protect shared proxy credentials.
- The proxy credentials are server-only. Do not move proxy requests into a
  client component or accept a client-supplied endpoint, model ID, or header.
- The three route labels identify proxy interfaces. The public proxy
  documentation says that all three use DeepSeek Flash. Do not describe them as
  verified distinct vendor models.
- Missing token usage is unavailable. Do not display it as zero or infer it
  from message length.
- Browser-local conversations are not authoritative billing or quota records.
  Browser data can be cleared, changed, or lost when storage limits are reached.
- Localhost success does not prove CodeRange access. Verify the application
  through the actual forwarded host and use the platform-assigned port.
- If port `3000` is already in use, check the active server before starting
  another. During the Deeda pass, an existing development server occupied the
  port; a production server could not bind concurrently. The active server
  served the Deeda page and prefixed assets, but the external forwarded host was
  unreachable from the execution environment.
- Live LiteChat proxy requests with instructor credentials remain unverified.
  Normal tests use mocked proxy responses and do not require real credentials.
- Do not expose a deployment with shared proxy credentials to unrestricted users.
  Add an approved runtime access restriction if CodeRange exposure requires it.
- On mobile, the sidebar is a drawer. Use the `Chats` control to open it and the
  backdrop or `Close` control to dismiss it. Do not assume desktop sidebar
  controls remain visible on a narrow viewport.
- CodeRange can provide `VSCODE_PROXY_URI` without `PORT`. In that case the app
  uses `3000` for both the server and its `/proxy/3000` asset prefix. If a
  platform supplies `PORT`, the supplied value is used instead. Keep build and
  runtime settings aligned or Next.js can emit asset URLs for the wrong port.
- Next.js generates root-relative `/_next/static/` asset URLs by default. In
  CodeRange, `VSCODE_PROXY_URI` supplies the `/proxy/{{port}}` path template and
  `PORT` supplies the assigned port or the app defaults it to `3000`.
  `next.config.ts` uses that path as the `assetPrefix`, so generated CSS and
  JavaScript requests stay under the
  forwarded URL. CodeRange strips this prefix before forwarding requests; do not
  set `basePath`. If the UI appears unstyled, inspect the CSS request and browser
  console before changing application CSS. A production build must use the same
  forwarded URI and port as its runtime.

# LiteChat Security And Runtime Footguns

- Keep `.env.local` and other `.env*` files out of Git. The repository allows
  only a value-free `.env.example`.
- Do not place LiteChat credential values in source code, tests, fixtures,
  browser code, localStorage, logs, screenshots, or documentation.
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
- Rendezvous verified a successful local production start on port `3000` and a
  manual browser check through the CodeRange forwarded proxy URL. OpenCode could
  not independently reach that forwarded URL from its environment.
- Live LiteChat proxy requests with instructor credentials remain unverified.
  Normal tests use mocked proxy responses and do not require real credentials.
- Do not expose a deployment with shared proxy credentials to unrestricted users.
  Add an approved runtime access restriction if CodeRange exposure requires it.
- On mobile, the sidebar is a drawer. Use the `Chats` control to open it and the
  backdrop or `Close` control to dismiss it. Do not assume desktop sidebar
  controls remain visible on a narrow viewport.
- Next.js generates root-relative `/_next/static/` asset URLs by default. In
  CodeRange, `VSCODE_PROXY_URI` supplies the `/proxy/{{port}}` path template and
  `PORT` supplies the assigned port. `next.config.ts` uses that path as the
  `assetPrefix`, so generated CSS and JavaScript requests stay under the
  forwarded URL. CodeRange strips this prefix before forwarding requests; do not
  set `basePath`. If the UI appears unstyled, inspect the CSS request and browser
  console before changing application CSS. A production build must use the same
  forwarded URI and port as its runtime.

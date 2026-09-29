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
- Do not expose a deployment with shared proxy credentials to unrestricted users.
  Add an approved runtime access restriction if CodeRange exposure requires it.

# LiteChat MVP

## Purpose

The application provides one text chat interface for three fixed LiteChat proxy
interfaces. It supports multi-turn chat, route switching, token usage display,
and browser-local saved conversations.

The application is a usage-metered prototype. It does not process payments or
calculate monetary charges. The proxy documentation states that the three
interfaces currently use DeepSeek Flash. The route names identify compatible
proxy interfaces or presets. They do not prove access to three distinct
underlying vendor models.

## Setup

Requirements:

- Node.js `>=20.9.0`.
- npm.
- Chromium and its system dependencies for browser tests.

Install dependencies:

```sh
npm ci
```

Run the development server:

```sh
npm run dev
```

Run checks:

```sh
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Run the production server:

```sh
npm start
```

The development and production commands bind to `0.0.0.0`. The runtime reads
`PORT` when provided. Verify the actual CodeRange port and forwarded-host
configuration in the deployment environment.

## Proxy Routes

The server calls `https://proxy.litechat.ai` through `POST /api/chat`. It selects
the endpoint and model from a fixed server-side route table:

- OpenAI-compatible Chat Completions: `gpt-5.6-luna`.
- Anthropic-compatible Messages: `claude-haiku-4-5-20251001`.
- Google-compatible Gemini: `gemini-3.8-flash`.

The browser submits only a route ID and text message history. It cannot submit
an endpoint, model ID, credential, or upstream header.

## Conversation Behavior

Users can start a conversation, send a text prompt, continue with follow-up
prompts, switch the proxy route between turns, and view the route used for each
assistant response. A pending request shows a loading state. A failed prompt
remains visible and can be retried manually. The application does not retry
proxy requests automatically.

Conversations support create, list, reopen, rename, and delete behavior. The
application saves conversations in browser `localStorage` under a versioned
storage key. Browser data can be cleared or modified, storage has a browser
quota, and conversations do not sync across devices.

## Usage

The application displays input, output, and total token counts when the proxy
returns them. The Anthropic total is calculated from known input and output
counts when required. Missing counts remain unavailable, not zero. Conversation
totals include known values and identify when one or more responses have missing
usage.

Token counts are not prices, charges, balances, invoices, or proof of payment.

## Secret Configuration

The server reads these environment variables:

- `BUILD_OPENAI_KEY`
- `BUILD_ANTHROPIC_KEY`
- `BUILD_GOOGLE_KEY`

Set values only through an approved secret mechanism. Never store values in the
repository, browser code, browser storage, logs, tests, fixtures, or
documentation. Normal tests use mocked proxy responses and do not require real
credentials.

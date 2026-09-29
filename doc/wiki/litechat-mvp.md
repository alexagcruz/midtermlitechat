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
- The verified CodeRange environment provided Node.js `v22.23.1`.

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
`PORT` when provided. The application was started successfully on port `3000`
during rendezvous. The application was also manually opened in a browser
through the CodeRange forwarded proxy URL. OpenCode could not independently
reach that forwarded URL from its execution environment.

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

The desktop layout uses a dark sidebar for branding, new conversations, and
saved conversations. The main workspace contains the conversation header, route
selector, proxy disclosure, message log, token summary, and composer. User and
assistant messages use different alignment and surfaces. The composer remains
the primary action area.

At mobile widths, the saved-conversation sidebar becomes a compact drawer. The
`Chats` control opens it, the backdrop or `Close` control closes it, and selecting
a conversation closes the drawer. The drawer exposes the same new, reopen,
rename, and delete actions. The route selector expands to the available width,
and the chat layout prevents horizontal overflow.

The interface uses system fonts and CSS custom properties in
`src/app/globals.css`. It does not load external fonts, images, or a UI
framework. Focus-visible outlines, `aria-current`, `aria-expanded`,
`aria-controls`, named landmarks, and labeled controls support keyboard and
assistive technology use. Loading and error states do not rely on color alone.

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
credentials. Live LiteChat proxy requests using the instructor-provided
credentials have not been verified.

## Application Structure

- `src/app/page.tsx`: application entry page.
- `src/components/chat-app.tsx`: interactive chat UI, route selector, composer,
  conversation list, usage display, and local session actions.
- `src/app/api/chat/route.ts`: server-only `POST /api/chat` boundary.
- `src/lib/chat/`: fixed route IDs, shared message/usage types, API response
  schemas, and request validation.
- `src/lib/proxy/`: fixed route configuration, protocol adapters, normalized
  usage parsing, timeout handling, and safe proxy failures.
- `src/lib/storage/`: versioned `localStorage` persistence and validation.
- `src/components/*.test.tsx`, `src/lib/**/*.test.ts`, and
  `src/app/api/chat/route.test.ts`: automated unit, UI, storage, adapter, and
  route tests.
- `e2e/chat-flow.spec.ts`: Playwright browser flows with mocked `/api/chat`.

## Architecture

The browser sends text message history and a fixed route ID to the same-origin
Next.js Route Handler. The handler validates the request, selects the fixed
server-side endpoint and credential, calls the corresponding LiteChat proxy
interface, and returns normalized assistant text and token usage. Credentials
and upstream endpoints never enter browser code or `localStorage`.

The application uses Next.js, React, TypeScript, Zod, direct server-side
`fetch`, Vitest, React Testing Library, and Playwright. It has no server
database, accounts, payment system, file upload flow, web search, streaming, or
server-side conversation persistence.

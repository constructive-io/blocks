# Chat Widget

**Type:** `registry:block`  
**Status:** `v1 (frontend ready)`

## Purpose

An installable AI chat surface with page-context scraping, provider settings,
streaming messages, optional tool approval, and floating or embedded layouts.
The block includes Next.js route handlers for the server-side AI SDK calls.

## Install

```bash
pnpm dlx shadcn@latest add @constructive/chat
```

Add the UI styles and typography plugin to the consuming application's global
stylesheet:

```css
@import '@constructive-io/ui/globals.css';
@plugin '@tailwindcss/typography';
```

Mount the provider and widget once near the application root:

```tsx
import { ChatProvider, ChatWidget } from '@/components/chat';

<ChatProvider config={{ api: '/api/chat', scrape: true }}>
  {children}
  <ChatWidget />
</ChatProvider>
```

The installed API handlers keep provider calls on the server. Configure the
allowed providers and secret-handling policy for the host application before
exposing the route publicly; never bake provider credentials into source.

## Server egress and application security

The installed routes allow `https://api.openai.com/v1` by default. Every other
OpenAI-compatible base URL is rejected before the provider SDK is created. To
enable a custom gateway or local provider, set a comma-separated, server-side
allowlist before starting the host application:

```dotenv
CHAT_ALLOWED_PROVIDER_BASE_URLS=http://127.0.0.1:11434/v1,https://llm.example.com/openai
```

Each entry must be an absolute HTTP(S) URL without credentials, a query, or a
fragment. Requests must match an allowed origin and its exact path prefix at a
path-segment boundary. A localhost entry refers to the machine or container
running the route, not the visitor's browser, so list only endpoints that the
deployed server is intended to reach.

These generic handlers cannot infer the host application's trust model. Add
authentication, authorization, and rate limiting around both POST routes before
making them public. Treat provider keys as secrets, accept them only from users
who are authorized to use the configured provider, and never log or persist
them in plaintext.

## Included surface

- Floating action button and animated chat panel.
- Streaming AI SDK transport with stop and clear controls.
- Markdown message rendering and tool-call status/approval UI.
- Optional `data-chat-*` page-context extraction.
- Provider and embeddings settings UI.
- Next.js chat and connection-test route handlers.

## Source

Canonical source: `apps/blocks/src/blocks/chat/` in the
`constructive-io/blocks` repository.

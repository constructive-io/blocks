# AI components

Presentational primitives for AI and agentic chat UIs. Runtime-agnostic: hosts
wire streaming state (AI SDK, pi, custom) and pass props — no IPC, GraphQL, or
model client lives in this package.

## Install

```bash
pnpm add @constructive-io/ui
# or registry source install
pnpm dlx shadcn@latest add @constructive/ai
```

```ts
import {
  AgentLoader,
  ChatContainer,
  Message,
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
} from '@constructive-io/ui/ai';
```

## Phase 0 surface

| Export | Role |
| --- | --- |
| `TextShimmer` | Status text with sweeping gradient |
| `AgentLoader` / `Loader` | Pixel grid (drive/dots/orbit) + simple spinners |
| `PromptInput` family | Compound composer shell |
| `Message` family | User/assistant message layout |
| `Markdown` | Throttled zero-dep markdown subset |
| `CodeBlock` | Code surface with copy |
| `ResponseStream` | Client typewriter for fixtures |
| `ChatContainer` + `ScrollButton` | Stick-to-bottom transcript |
| `SystemMessage` | Banner notice via Alert |
| `useThrottledText` | Shared stream throttle (66ms) |

## Design rules

- Constructive OKLCH tokens only (no hard-coded brand hex)
- Continuous loaders use CSS keyframes (`ai-shimmer-text`, `ai-pixel-on`, …)
- Respect `prefers-reduced-motion` (package globals already clamp animations)
- Composer default shape is `rounded-xl`; pass `shape="pill"` for rounder shells
- Markdown skips full GFM tables; hosts can replace with marked+DOMPurify when needed

## Planned next

Reasoning / thinking traces, tool chips, approval cards, plan tracker, context
ring — see the session plan for AI agentic components.

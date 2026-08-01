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
  PromptInput,
  Message,
  Reasoning,
  Tool,
  PlanTracker,
  ApprovalCard,
  AgentLoader,
} from '@constructive-io/ui/ai';
```

## Surface map

### Foundation
| Export | Role |
| --- | --- |
| `TextShimmer` | Status text shimmer |
| `AgentLoader` / `Loader` | Pixel grid + simple spinners |
| `PromptInput` family | Compound composer |
| `Message` family | User/assistant layout |
| `Markdown` | Throttled markdown subset |
| `CodeBlock` | Code + copy + lightweight sugar-high highlighting |
| `ResponseStream` | Client typewriter |
| `ChatContainer` + `ScrollButton` | Stick-to-bottom transcript + jump-to-latest (docs under Chat Container) |
| `SystemMessage` | Banner notice |
| `useThrottledText` | 66ms stream throttle |

### Agent traces & tools
| Export | Role |
| --- | --- |
| `Reasoning` / `ThinkingBar` | Collapsible thinking |
| `ThinkingTrace` | Steps / reasoning / search / coding modes |
| `Steps` / `Step` / `ChainOfThought` | Vertical step list |
| `Tool` / `ToolGroup` | card · chip · row densities |
| `ApprovalCard` | HITL confirm or multi-question |
| `Source` / `Sources` | Citation chips |
| `InlineDiff` | +/− file diff |
| `DiffTable` | Proposed row add/remove in tabular data |
| `StreamingText` | Blur-resolve answer + follow-ups |

### Planning & chrome
| Export | Role |
| --- | --- |
| `PlanTracker` | Plan checklist above composer |
| `ContextRing` | Token window ring |
| `TaskRow` / `TaskList` | Live agent tasks |
| `ContextCard` / `ContextCards` | RAG chunks |
| `RecommendationCard` | Confidence + alternatives |
| `FeedbackBar` | Copy / thumbs / regenerate |
| `PromptSuggestion(s)` | Follow-up chips |
| `FileUpload` | Attachments |
| `AiImage` | Base64 / bytes image |

### Types
`ToolStatus`, `normalizeToolStatus`, `Plan`, `PlanStep`, `ContextUsage`, `formatDuration`

## Design rules

- Constructive OKLCH tokens only
- Continuous loaders: CSS keyframes (`ai-shimmer-text`, `ai-pixel-on`, …)
- Enter rows: `ai-fade-up` with stagger; respect `prefers-reduced-motion`
- Composer default `rounded-xl`; `shape="pill"` optional
- Tool status maps AI SDK part states and desktop enums via `normalizeToolStatus`

## Storybook

`AI/Overview` — loaders, composer+plan, reasoning/tools, HITL, tasks/context, streaming, full transcript.

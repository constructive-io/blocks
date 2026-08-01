export type AiComponentDoc = Readonly<{
  name: string;
  title: string;
  /** Primary package export(s) */
  exportName: string;
  description: string;
  whenToUse: readonly string[];
  /** Short install/import snippet */
  importExample: string;
  /** Key props or composition notes */
  api: readonly { name: string; type: string; behavior: string }[];
}>;

/**
 * Individual AI surfaces documented under /blocks/ai/[name].
 * Order matches sidebar order.
 */
export const AI_COMPONENTS: readonly AiComponentDoc[] = [
  {
    name: 'text-shimmer',
    title: 'Text Shimmer',
    exportName: 'TextShimmer',
    description: 'Sweeping-gradient status text for in-flight agent states.',
    whenToUse: [
      'Use while a model is thinking, searching, or streaming a long job label.',
      'Prefer static muted text once the run settles.',
    ],
    importExample: `import { TextShimmer } from '@constructive-io/ui/ai';

<TextShimmer>Thinking</TextShimmer>`,
    api: [
      { name: 'active', type: 'boolean', behavior: 'When false, renders static muted text.' },
      { name: 'children', type: 'ReactNode', behavior: 'Label content.' },
    ],
  },
  {
    name: 'agent-loader',
    title: 'Agent Loader',
    exportName: 'AgentLoader',
    description:
      'Loading indicator with pixel-grid variants (drive, dots, orbit), elapsed timer, and simple spinners.',
    whenToUse: [
      'Use pixel variants for long-running agent work with a status label.',
      'Use circular/typing/wave for compact inline chat spinners.',
    ],
    importExample: `import { AgentLoader } from '@constructive-io/ui/ai';

<AgentLoader variant="drive" label="Working" />`,
    api: [
      {
        name: 'variant',
        type: 'drive | dots | orbit | circular | …',
        behavior: 'Visual style. Pixel variants support elapsed time.',
      },
      { name: 'label / text', type: 'string', behavior: 'Status label for text/pixel variants.' },
      { name: 'showElapsed / elapsedMs', type: 'boolean / number', behavior: 'Live or controlled timer.' },
    ],
  },
  {
    name: 'prompt-input',
    title: 'Prompt Input',
    exportName: 'PromptInput',
    description: 'Compound chat composer with autosize textarea, action slots, and submit/stop patterns.',
    whenToUse: [
      'Use as the shell for send/stop, attachments, and model chrome.',
      'Host owns streaming and network; this only presents layout and controlled value.',
    ],
    importExample: `import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
} from '@constructive-io/ui/ai';

<PromptInput value={v} onValueChange={setV} onSubmit={send} isLoading={streaming}>
  <PromptInputTextarea placeholder="Message…" />
  <PromptInputActions>{/* buttons */}</PromptInputActions>
</PromptInput>`,
    api: [
      { name: 'value / onValueChange', type: 'string / callback', behavior: 'Controlled text.' },
      { name: 'onSubmit / isLoading', type: 'callback / boolean', behavior: 'Submit and loading shell state.' },
      { name: 'shape', type: "'default' | 'pill'", behavior: 'rounded-xl vs rounder shell.' },
    ],
  },
  {
    name: 'message',
    title: 'Message',
    exportName: 'Message',
    description: 'User and assistant transcript rows with optional avatar, markdown content, and actions.',
    whenToUse: [
      'Use for chat turns in a transcript list.',
      'Pair MessageContent markdown + streaming with FeedbackBar for settled turns.',
    ],
    importExample: `import { Message, MessageContent } from '@constructive-io/ui/ai';

<Message from="user">
  <MessageContent>Hello</MessageContent>
</Message>`,
    api: [
      { name: 'from', type: "'user' | 'assistant' | 'system'", behavior: 'Alignment and bubble styling.' },
      { name: 'MessageContent markdown / streaming', type: 'boolean', behavior: 'Render markdown; throttle while streaming.' },
    ],
  },
  {
    name: 'markdown',
    title: 'Markdown',
    exportName: 'Markdown',
    description: 'Zero-dependency markdown subset with stream throttling for assistant text.',
    whenToUse: [
      'Use for assistant prose that may stream.',
      'Swap for a host marked+DOMPurify pipeline when you need full GFM tables.',
    ],
    importExample: `import { Markdown } from '@constructive-io/ui/ai';

<Markdown streaming={streaming}>{text}</Markdown>`,
    api: [
      { name: 'children', type: 'string', behavior: 'Markdown source.' },
      { name: 'streaming', type: 'boolean', behavior: 'Throttles re-renders while true.' },
    ],
  },
  {
    name: 'code-block',
    title: 'Code Block',
    exportName: 'CodeBlock',
    description:
      'Agent code surface with lightweight sugar-high highlighting, elegant header, copy, and collapse/expand for long sources.',
    whenToUse: [
      'Use for fenced code in tool results or assistant replies.',
      'Pass language for presets (TS/JS default; Python, Rust, Go, Java, C, CSS, Diff) or free-form labels (SQL, Bash, JSON).',
      'Long sources collapse after 12 lines with a fade and “Show N more lines”; expand keeps an inner scroll cap by default.',
      'Leave streamingLines for demos; hosts usually pass the full code string. Set highlight={false} only on ultra-hot paths.',
    ],
    importExample: `import { CodeBlock } from '@constructive-io/ui/ai';

<CodeBlock language="TypeScript" filename="app.ts" code={source} />
<CodeBlock language="Python" filename="score.py" code={py} />
{/* Never collapse */}
<CodeBlock language="SQL" code={query} maxCollapsedLines={false} />`,
    api: [
      { name: 'code', type: 'string', behavior: 'Full source (copy always uses the full string).' },
      {
        name: 'language / filename',
        type: 'string',
        behavior: 'Header: filename + language pill (or language alone).',
      },
      {
        name: 'highlight',
        type: 'boolean',
        behavior: 'Syntax highlight with sugar-high (default true).',
      },
      {
        name: 'maxCollapsedLines',
        type: 'number | false',
        behavior: 'Lines shown while collapsed (default 12). false disables collapse.',
      },
      {
        name: 'maxExpandedHeight',
        type: 'string | false',
        behavior: 'CSS max-height when expanded (default min(28rem, 70vh)). false = unconstrained.',
      },
      {
        name: 'expanded / defaultExpanded / onExpandedChange',
        type: 'boolean / boolean / callback',
        behavior: 'Controlled or uncontrolled expand state.',
      },
      {
        name: 'showCopy / streamingLines / lineIntervalMs',
        type: 'boolean / boolean / number',
        behavior: 'Copy button and progressive line reveal for demos.',
      },
    ],
  },
  {
    name: 'response-stream',
    title: 'Response Stream',
    exportName: 'ResponseStream',
    description: 'Client-side progressive text reveal for fixtures and offline demos.',
    whenToUse: [
      'Use for docs and demos when you do not have a live token stream.',
      'Production hosts should stream tokens into Markdown or MessageContent instead.',
    ],
    importExample: `import { ResponseStream } from '@constructive-io/ui/ai';

<ResponseStream text={demo} markdown />`,
    api: [
      { name: 'text', type: 'string', behavior: 'Full text to reveal.' },
      { name: 'mode / speed / markdown', type: 'typewriter | fade / number / boolean', behavior: 'Reveal style.' },
    ],
  },
  {
    name: 'chat-container',
    title: 'Chat Container',
    exportName: 'ChatContainer',
    description:
      'Stick-to-bottom transcript scroll region with ScrollButton jump-to-latest. ScrollButton is documented here (not as a separate page).',
    whenToUse: [
      'Use ChatContainer as the scroll parent of a message list.',
      'Render ScrollButton as a child of ChatContainer so it can read pin state and appear when the user scrolls up.',
      'Pair with Message, Reasoning, Tool, and PromptInput for a full chat shell.',
    ],
    importExample: `import {
  ChatContainer,
  ChatContainerContent,
  ScrollButton,
  Message,
  MessageContent,
} from '@constructive-io/ui/ai';

<ChatContainer className="h-full">
  <ChatContainerContent>
    <Message from="user">
      <MessageContent>Hello</MessageContent>
    </Message>
  </ChatContainerContent>
  <ScrollButton />
</ChatContainer>`,
    api: [
      {
        name: 'ChatContainer autoScroll',
        type: 'boolean',
        behavior: 'Follow new content while pinned to the bottom (default true).',
      },
      {
        name: 'ChatContainer bottomThreshold',
        type: 'number',
        behavior: 'Pixels from bottom that still count as pinned (default 48).',
      },
      {
        name: 'useChatContainer()',
        type: 'hook',
        behavior: 'Returns { scrollRef, isAtBottom, scrollToBottom }. Throws outside ChatContainer.',
      },
      {
        name: 'ScrollButton visible',
        type: 'boolean',
        behavior: 'Override auto visibility from pin state. Default is !isAtBottom.',
      },
      {
        name: 'ScrollButton label',
        type: 'string',
        behavior: 'Accessible name for the control (default “Scroll to latest”).',
      },
    ],
  },
  {
    name: 'system-message',
    title: 'System Message',
    exportName: 'SystemMessage',
    description: 'Banner-style notice for app-injected transcript messages (errors, hints).',
    whenToUse: [
      'Use for non-assistant notices such as missing credentials.',
      'Do not use for model replies — use Message instead.',
    ],
    importExample: `import { SystemMessage } from '@constructive-io/ui/ai';

<SystemMessage title="No API key" variant="warning">
  Add a provider key in settings.
</SystemMessage>`,
    api: [
      { name: 'title / variant', type: 'ReactNode / Alert variant', behavior: 'Header and tone.' },
      { name: 'children', type: 'ReactNode', behavior: 'Body copy.' },
    ],
  },
  {
    name: 'reasoning',
    title: 'Reasoning',
    exportName: 'Reasoning',
    description:
      'Collapsible model thinking with auto-open while streaming and duration labels when settled.',
    whenToUse: [
      'Use for chain-of-thought or extended thinking text on assistant turns.',
      'Use ThinkingBar for a one-line status without expandable content.',
    ],
    importExample: `import { Reasoning } from '@constructive-io/ui/ai';

<Reasoning isStreaming={streaming} durationMs={elapsed} content={text} />`,
    api: [
      { name: 'isStreaming / durationMs', type: 'boolean / number', behavior: 'Open behavior and “Thought for” label.' },
      { name: 'content / markdown', type: 'string / boolean', behavior: 'Body text and rendering mode.' },
    ],
  },
  {
    name: 'thinking-trace',
    title: 'Thinking Trace',
    exportName: 'ThinkingTrace',
    description:
      'Expandable agent trace with modes: steps, reasoning, search, and coding tool rows.',
    whenToUse: [
      'Use when the agent should show structured intermediate steps, not free prose alone.',
      'Drive rows and visibleCount from the host; do not rely on internal demo timers.',
    ],
    importExample: `import { ThinkingTrace } from '@constructive-io/ui/ai';

<ThinkingTrace
  mode="coding"
  rows={[{ primary: 'Read', secondary: 'app.ts', mono: true }]}
/>`,
    api: [
      { name: 'mode', type: 'steps | reasoning | search | coding', behavior: 'Visual language of the trace.' },
      { name: 'rows / isStreaming / visibleCount', type: 'row[] / boolean / number', behavior: 'Content and progressive reveal.' },
    ],
  },
  {
    name: 'steps',
    title: 'Steps',
    exportName: 'Steps',
    description:
      'Collapsible vertical step list with quiet status icons, gapped connectors, and room for long titles, descriptions, and nested body content.',
    whenToUse: [
      'Use for ordered agent operations where each step has a clear status.',
      'Prefer title + description for dense traces; put payloads, SQL, or tool output in Step children.',
      'ChainOfThought / ChainOfThoughtStep are aliases for the same compound API.',
    ],
    importExample: `import { Steps, Step } from '@constructive-io/ui/ai';

<Steps title="Plan">
  <Step status="done" title="Read files" description="12 paths" />
  <Step status="running" title="Edit schema">
    <pre>{"ALTER TABLE reorder_queue …"}</pre>
  </Step>
  <Step status="pending" title="Open PR" />
</Steps>`,
    api: [
      {
        name: 'Steps title',
        type: 'ReactNode',
        behavior: 'Collapsible header label. Truncates on overflow.',
      },
      {
        name: 'Steps open / defaultOpen / onOpenChange',
        type: 'boolean / boolean / (open) => void',
        behavior: 'Controlled or uncontrolled disclosure. defaultOpen defaults to true.',
      },
      {
        name: 'Step status',
        type: 'pending | running | done | error',
        behavior: 'Icon, title emphasis, aria-current on running, and sr-only status prefix.',
      },
      {
        name: 'Step title / description',
        type: 'ReactNode / ReactNode',
        behavior: 'Primary label (wraps) and optional secondary line. Both break long strings.',
      },
      {
        name: 'Step children',
        type: 'ReactNode',
        behavior: 'Optional body under the description. pre/code get compact agent-output styling.',
      },
    ],
  },
  {
    name: 'tool',
    title: 'Tool',
    exportName: 'Tool',
    description:
      'Tool call presentation in card, chip, or compact row density with input/output, errors, and diff chips.',
    whenToUse: [
      'Use row/chip for live agent traces; card when JSON payloads should expand.',
      'normalizeToolStatus maps AI SDK part states and desktop enums.',
    ],
    importExample: `import { Tool, ToolGroup } from '@constructive-io/ui/ai';

<ToolGroup label="2 tool calls">
  <Tool name="edit" status="success" summary="app.ts" variant="row" />
</ToolGroup>`,
    api: [
      { name: 'name / status / summary', type: 'string / ToolStatus / ReactNode', behavior: 'Header identity.' },
      { name: 'variant', type: 'card | chip | row', behavior: 'Density.' },
      { name: 'input / output / detail / diff', type: 'unknown / lines / chips', behavior: 'Expanded body.' },
    ],
  },
  {
    name: 'approval-card',
    title: 'Approval Card',
    exportName: 'ApprovalCard',
    description:
      'Human-in-the-loop confirm/skip or multi-question approval before the agent acts.',
    whenToUse: [
      'Use simple title/description mode for tool-confirm gates.',
      'Use questions for multi-step agent questionnaires.',
    ],
    importExample: `import { ApprovalCard } from '@constructive-io/ui/ai';

<ApprovalCard
  title="Delete table customers?"
  destructive
  onConfirm={approve}
  onSkip={skip}
/>`,
    api: [
      { name: 'title / description / destructive', type: 'ReactNode / boolean', behavior: 'Simple confirm mode.' },
      { name: 'questions / onConfirm / onSkip', type: 'ApprovalQuestion[] / callbacks', behavior: 'Multi-step or submit handlers.' },
    ],
  },
  {
    name: 'source',
    title: 'Source',
    exportName: 'Source',
    description: 'Citation chips for retrieved sources with hover details.',
    whenToUse: [
      'Use under streamed answers that cite the web or knowledge base.',
      'Wrap groups in Sources for a labeled chip row.',
    ],
    importExample: `import { Source, Sources } from '@constructive-io/ui/ai';

<Sources label="2 sources">
  <Source title="Docs" href="https://example.com" />
</Sources>`,
    api: [
      { name: 'title / href / description', type: 'string', behavior: 'Chip label and tooltip.' },
      { name: 'favicon / domain', type: 'string', behavior: 'Optional visual host metadata.' },
    ],
  },
  {
    name: 'inline-diff',
    title: 'Inline Diff',
    exportName: 'InlineDiff',
    description: 'Line-oriented before/after file diff for tool edits.',
    whenToUse: [
      'Use under edit/write tools when a unified diff is available.',
      'Prefer DiffTable for structural row changes in grids.',
    ],
    importExample: `import { InlineDiff } from '@constructive-io/ui/ai';

<InlineDiff source={{ fileName: 'a.ts', before, after }} />`,
    api: [
      { name: 'source', type: 'InlineDiffSource', behavior: 'before, after, optional fileName.' },
      { name: 'maxLines', type: 'number', behavior: 'Collapse long diffs.' },
    ],
  },
  {
    name: 'diff-table',
    title: 'Diff Table',
    exportName: 'DiffTable',
    description: 'Tabular proposed edits with removed-row tint and added-row reveal.',
    whenToUse: [
      'Use when the agent proposes spreadsheet-like cleanup.',
      'Do not use as a full CRUD grid — use Sheets for that.',
    ],
    importExample: `import { DiffTable } from '@constructive-io/ui/ai';

<DiffTable title="Proposed cleanup" columns={cols} rows={rows} addedRows={added} />`,
    api: [
      { name: 'columns / rows', type: 'column[] / row[]', behavior: 'Base table; rows may mark removed.' },
      { name: 'addedRows / animate', type: 'row[] / boolean', behavior: 'Green additions and enter choreography.' },
    ],
  },
  {
    name: 'streaming-text',
    title: 'Streaming Text',
    exportName: 'StreamingText',
    description:
      'Streamed answer with blur-resolve words, citation chips, feedback actions, and follow-ups.',
    whenToUse: [
      'Use for demo streams or composed answer chrome.',
      'Hosts with real token streams can still pass text + streaming=false when complete.',
    ],
    importExample: `import { StreamingText } from '@constructive-io/ui/ai';

<StreamingText text={answer} sources={sources} followUps={ups} />`,
    api: [
      { name: 'text / tokens / streaming', type: 'string / token[] / boolean', behavior: 'Content and reveal.' },
      { name: 'sources / followUps', type: 'arrays', behavior: 'Citations and suggestion chips after settle.' },
    ],
  },
  {
    name: 'plan-tracker',
    title: 'Plan Tracker',
    exportName: 'PlanTracker',
    description: 'Live agent plan checklist, typically pinned above the composer.',
    whenToUse: [
      'Use when the agent exposes multi-step plans.',
      'Stack with PromptInput using flushBottom + rounded-t-none for a single shell.',
    ],
    importExample: `import { PlanTracker } from '@constructive-io/ui/ai';

<PlanTracker plan={plan} streaming={streaming} />`,
    api: [
      { name: 'plan', type: 'Plan | null', behavior: 'steps with pending | in_progress | done.' },
      { name: 'streaming / flushBottom', type: 'boolean', behavior: 'Header focus and corner styling.' },
    ],
  },
  {
    name: 'context-ring',
    title: 'Context Ring',
    exportName: 'ContextRing',
    description: 'Compact context-window usage ring for composer chrome.',
    whenToUse: [
      'Place near PromptInput actions to show token budget.',
      'percent ≥ 80 warning, ≥ 95 destructive stroke colors.',
    ],
    importExample: `import { ContextRing } from '@constructive-io/ui/ai';

<ContextRing usage={{ tokens: 48_000, percent: 42, contextWindow: 128_000 }} />`,
    api: [
      { name: 'usage', type: 'ContextUsage', behavior: 'tokens, percent, contextWindow; tokens null while recomputing.' },
      { name: 'size / stroke', type: 'number', behavior: 'SVG dimensions.' },
    ],
  },
  {
    name: 'task-row',
    title: 'Task Row',
    exportName: 'TaskRow',
    description: 'Live agent task status with progress ring, details, and retry.',
    whenToUse: [
      'Use for multi-task agent runs outside the transcript (or as a side panel).',
      'Distinct from command-palette background tasks.',
    ],
    importExample: `import { TaskList, TaskRow } from '@constructive-io/ui/ai';

<TaskList>
  <TaskRow status="running" label="Index files" progress={40} />
</TaskList>`,
    api: [
      { name: 'status / progress', type: 'TaskStatus / number', behavior: 'pending | running | completed | failed.' },
      { name: 'details / onRetry / index', type: 'detail[] / callback / number', behavior: 'Expand body, retry, stagger.' },
    ],
  },
  {
    name: 'context-card',
    title: 'Context Card',
    exportName: 'ContextCard',
    description: 'Retrieved knowledge chunk card with source type badge.',
    whenToUse: [
      'Use for RAG chunk previews in the agent UI.',
      'Group with ContextCards for a labeled list.',
    ],
    importExample: `import { ContextCard, ContextCards } from '@constructive-io/ui/ai';

<ContextCards count={1}>
  <ContextCard title="Policy" body="…" sourceType="PDF" sourceName="sop.pdf" />
</ContextCards>`,
    api: [
      { name: 'title / body / meta', type: 'ReactNode', behavior: 'Content and size label.' },
      { name: 'sourceType / sourceName', type: 'string', behavior: 'Footer provenance.' },
    ],
  },
  {
    name: 'recommendation-card',
    title: 'Recommendation Card',
    exportName: 'RecommendationCard',
    description: 'Agent suggestion with confidence meter and alternatives drawer.',
    whenToUse: [
      'Use when the agent proposes a primary action with optional alternatives.',
      'onAccept receives the selected option id.',
    ],
    importExample: `import { RecommendationCard } from '@constructive-io/ui/ai';

<RecommendationCard body="Reorder cones" confidence={0.86} onAccept={accept} />`,
    api: [
      { name: 'body / confidence', type: 'ReactNode / number 0–1', behavior: 'Primary copy and meter.' },
      { name: 'alternatives / onAccept', type: 'option[] / callback', behavior: 'Other options and confirm.' },
    ],
  },
  {
    name: 'feedback-bar',
    title: 'Feedback Bar',
    exportName: 'FeedbackBar',
    description: 'Copy, regenerate, and thumbs actions for assistant turns.',
    whenToUse: [
      'Place under settled MessageContent.',
      'Pass copyText when clipboard should receive the full answer.',
    ],
    importExample: `import { FeedbackBar } from '@constructive-io/ui/ai';

<FeedbackBar copyText={text} onRegenerate={regen} onFeedback={rate} />`,
    api: [
      { name: 'onCopy / copyText', type: 'callback / string', behavior: 'Clipboard helpers.' },
      { name: 'onRegenerate / onFeedback', type: 'callbacks', behavior: 'Retry and rating.' },
    ],
  },
  {
    name: 'prompt-suggestion',
    title: 'Prompt Suggestion',
    exportName: 'PromptSuggestion',
    description: 'Follow-up chip the user can click to send a suggested prompt.',
    whenToUse: [
      'Use after an assistant turn for next-step prompts.',
      'Group with PromptSuggestions for a labeled row.',
    ],
    importExample: `import { PromptSuggestion, PromptSuggestions } from '@constructive-io/ui/ai';

<PromptSuggestions>
  <PromptSuggestion onClick={() => send('Summarize')}>Summarize</PromptSuggestion>
</PromptSuggestions>`,
    api: [
      { name: 'onClick / children', type: 'callback / ReactNode', behavior: 'Chip label and action.' },
      { name: 'PromptSuggestions label', type: 'ReactNode', behavior: 'Optional group heading.' },
    ],
  },
  {
    name: 'file-upload',
    title: 'File Upload',
    exportName: 'FileUpload',
    description: 'Drag-and-drop or button-triggered attachments for chat.',
    whenToUse: [
      'Use dropzone for dedicated attachment UI; button for composer chrome.',
      'Host uploads files; this only manages local File[] state if uncontrolled.',
    ],
    importExample: `import { FileUpload } from '@constructive-io/ui/ai';

<FileUpload multiple onFilesChange={setFiles} />`,
    api: [
      { name: 'files / onFilesChange', type: 'File[] / callback', behavior: 'Controlled list.' },
      { name: 'variant / accept / multiple', type: 'dropzone | button / string / boolean', behavior: 'Chrome and constraints.' },
    ],
  },
  {
    name: 'image',
    title: 'AI Image',
    exportName: 'AiImage',
    description: 'Display AI-generated or uploaded images from base64, bytes, or URL.',
    whenToUse: [
      'Use for vision inputs and generated image outputs.',
      'Always pass a meaningful alt string.',
    ],
    importExample: `import { AiImage } from '@constructive-io/ui/ai';

<AiImage data={base64} mimeType="image/png" alt="Generated chart" />`,
    api: [
      { name: 'data / bytes / src', type: 'string / Uint8Array / string', behavior: 'Image payload.' },
      { name: 'mimeType / alt', type: 'string', behavior: 'Type and accessibility.' },
    ],
  },
] as const;

export type AiComponentName = (typeof AI_COMPONENTS)[number]['name'];

const BY_NAME = new Map(AI_COMPONENTS.map((c) => [c.name, c] as const));

export function getAiComponent(name: string): AiComponentDoc | undefined {
  return BY_NAME.get(name as AiComponentName);
}

export function getAiComponentNeighbors(name: string) {
  const index = AI_COMPONENTS.findIndex((c) => c.name === name);
  if (index === -1) return { previous: undefined, next: undefined };
  return {
    previous: index > 0 ? AI_COMPONENTS[index - 1] : undefined,
    next: index < AI_COMPONENTS.length - 1 ? AI_COMPONENTS[index + 1] : undefined,
  };
}

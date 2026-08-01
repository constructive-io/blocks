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
      'Use TextShimmer while a model is thinking, searching, or streaming a long job label.',
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
      'Use pixel variants for long-running agent work that needs a status label.',
      'Use circular, typing, or wave for compact inline chat spinners.',
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
      'Use PromptInput as the shell for send, stop, attachments, and model chrome.',
      'Keep streaming and network in the host; this surface only owns layout and controlled value.',
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
      'Use Message for chat turns in a transcript list.',
      'Use FeedbackBar under settled MessageContent when the turn is complete.',
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
      'Use Markdown for assistant prose that may stream.',
      'Prefer a host marked and DOMPurify pipeline when you need full GFM tables.',
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
      'Code surface with syntax highlighting, optional filename header, copy, and collapse for long sources.',
    whenToUse: [
      'Use CodeBlock for tool results or assistant replies that need a language label, copy, or long source handling.',
      'Prefer Markdown fenced blocks for short inline snippets that do not need copy or collapse.',
    ],
    importExample: `import { CodeBlock } from '@constructive-io/ui/ai';

<CodeBlock language="TypeScript" filename="app.ts" code={source} />
<CodeBlock language="Python" filename="score.py" code={py} />
{/* Never collapse */}
<CodeBlock language="SQL" code={query} maxCollapsedLines={false} />`,
    api: [
      { name: 'code', type: 'string', behavior: 'Full source. Copy always uses the complete string.' },
      {
        name: 'language / filename',
        type: 'string',
        behavior: 'Header label and optional language pill. Presets cover TS/JS, Python, Rust, Go, Java, C, CSS, and Diff; other labels stay free-form.',
      },
      {
        name: 'highlight',
        type: 'boolean',
        behavior: 'Enables syntax highlighting (default true). Set false on ultra-hot paths.',
      },
      {
        name: 'maxCollapsedLines',
        type: 'number | false',
        behavior: 'Lines shown while collapsed (default 12). false disables collapse.',
      },
      {
        name: 'maxExpandedHeight',
        type: 'string | false',
        behavior: 'CSS max-height when expanded (default min(28rem, 70vh)). false removes the cap.',
      },
      {
        name: 'expanded / defaultExpanded / onExpandedChange',
        type: 'boolean / boolean / callback',
        behavior: 'Controlled or uncontrolled expand state.',
      },
      {
        name: 'showCopy / streamingLines / lineIntervalMs',
        type: 'boolean / boolean / number',
        behavior: 'Copy control and progressive line reveal for demos. Hosts usually pass the full code string.',
      },
    ],
  },
  {
    name: 'response-stream',
    title: 'Response Stream',
    exportName: 'ResponseStream',
    description: 'Client-side progressive text reveal for fixtures and offline demos.',
    whenToUse: [
      'Use ResponseStream for docs and demos when you do not have a live token stream.',
      'Prefer streaming tokens into Markdown or MessageContent in production hosts.',
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
    description: 'Stick-to-bottom transcript scroll region with a jump-to-latest ScrollButton.',
    whenToUse: [
      'Use ChatContainer as the scroll parent of a message list.',
      'Render ScrollButton inside ChatContainer so it can read pin state and appear when the user scrolls up.',
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
      'Use SystemMessage for non-assistant notices such as missing credentials.',
      'Use Message for model replies instead of SystemMessage.',
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
      'Use Reasoning for chain-of-thought or extended thinking text on assistant turns.',
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
      'Use ThinkingTrace when the agent should show structured intermediate steps, not free prose alone.',
      'Drive rows and visibleCount from the host rather than internal demo timers.',
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
      'Collapsible vertical step list with status icons, gapped connectors, and nested body content.',
    whenToUse: [
      'Use Steps for ordered agent operations that each have a clear status.',
      'Prefer title and description for dense traces; put payloads or tool output in Step children.',
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
        behavior: 'Optional body under the description. pre and code get compact agent-output styling.',
      },
      {
        name: 'ChainOfThought / ChainOfThoughtStep',
        type: 'alias',
        behavior: 'Aliases for Steps and Step with the same compound API.',
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
      'Use Tool row or chip for live agent traces; use card when JSON payloads should expand.',
      'Use normalizeToolStatus to map AI SDK part states and desktop enums into ToolStatus.',
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
      'Use ApprovalCard title and description mode for tool-confirm gates.',
      'Use questions when the agent needs a multi-step questionnaire.',
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
      'Use Source under streamed answers that cite the web or a knowledge base.',
      'Group chips in Sources when you need a labeled row.',
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
      'Use InlineDiff under edit or write tools when a unified diff is available.',
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
      'Use DiffTable when the agent proposes spreadsheet-like row cleanup.',
      'Prefer Sheets for full CRUD grids.',
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
      'Streamed answer with blur-resolve on the newest word, then citation chips, feedback, and follow-ups.',
    whenToUse: [
      'Use StreamingText for demo streams or composed answer chrome.',
      'Pass text with streaming false when a real token stream has already completed.',
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
      'Use PlanTracker when the agent exposes multi-step plans.',
      'Stack with PromptInput using flushBottom and rounded-t-none for a single shell.',
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
    description:
      'Compact context-window meter: dense radial tick bars (circular segmented bar) with a soft glow on used capacity.',
    whenToUse: [
      'Use ContextRing near PromptInput actions to show token budget.',
      'Tone shifts to warning at 80 percent and destructive at 95 percent. Pass tokens null while recomputing.',
    ],
    importExample: `import { ContextRing } from '@constructive-io/ui/ai';

<ContextRing usage={{ tokens: 48_000, percent: 42, contextWindow: 128_000 }} />`,
    api: [
      {
        name: 'usage',
        type: 'ContextUsage',
        behavior: 'tokens, percent, contextWindow. tokens null while recomputing after compaction.',
      },
      {
        name: 'size / stroke',
        type: 'number',
        behavior: 'Drawn diameter (default 24) and progress stroke width (default 2).',
      },
    ],
  },
  {
    name: 'task-row',
    title: 'Task Row',
    exportName: 'TaskRow',
    description: 'Live agent task status with progress ring, details, and retry.',
    whenToUse: [
      'Use TaskRow for multi-task agent runs outside the transcript or in a side panel.',
      'Prefer the command-palette background task model for app-wide background work.',
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
      'Use ContextCard for RAG chunk previews in the agent UI.',
      'Group cards in ContextCards when you need a labeled list.',
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
      'Use RecommendationCard when the agent proposes a primary action with optional alternatives.',
      'Handle onAccept with the selected option id in the host.',
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
      'Use FeedbackBar under settled MessageContent.',
      'Pass copyText when the clipboard should receive the full answer.',
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
      'Use PromptSuggestion after an assistant turn for next-step prompts.',
      'Group chips in PromptSuggestions when you need a labeled row.',
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
      'Use the dropzone variant for dedicated attachment UI and the button variant for composer chrome.',
      'Keep uploads in the host; FileUpload only manages local File state when uncontrolled.',
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
      'Use AiImage for vision inputs and generated image outputs.',
      'Pass a meaningful alt string for every image.',
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

export const AI_DOC = {
  name: 'ai',
  title: 'AI',
  description:
    'Presentational primitives for AI and agentic chat UIs: composer, messages, reasoning, tools, human-in-the-loop approval, plan tracking, and streaming surfaces. Hosts own models, IPC, and persistence.',
  whenToUse: [
    'Use the AI block for chat, agent, or tool-calling experiences that need Constructive density and motion.',
    'Keep model runtimes (AI SDK, pi, custom) in the host and pass streaming state and tool results as props.',
    'Prefer Sheets or Table for dense data work. DiffTable is only for agent-proposed row edits.',
  ],
  usage: {
    description:
      'Install the aggregate block, then compose the transcript from presentational pieces. The host owns send, stop, streaming reducers, and tool execution.',
    example: `'use client';

import { useState } from 'react';

import {
  Message,
  MessageContent,
  PlanTracker,
  PromptInput,
  PromptInputActions,
  PromptInputBody,
  PromptInputTextarea,
  Reasoning,
  Tool,
} from '@/components/ui/ai';
import { Button } from '@/components/ui/button';

export function AgentPane({
  plan,
  streaming,
  thinking,
  onSend,
  onStop,
}: {
  plan?: { steps: { label: string; status: 'pending' | 'in_progress' | 'done' }[] };
  streaming: boolean;
  thinking?: { content: string; streaming: boolean; elapsedMs?: number };
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const [value, setValue] = useState('');

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        {thinking ? (
          <Reasoning
            content={thinking.content}
            isStreaming={thinking.streaming}
            durationMs={thinking.elapsedMs}
          />
        ) : null}
        <Message from="assistant">
          <MessageContent markdown streaming={streaming}>
            {/* host text */}
          </MessageContent>
        </Message>
        <Tool name="edit" status="running" summary="schema.ts" variant="row" />
      </div>
      <div className="px-4 pb-4">
        <PlanTracker plan={plan} streaming={streaming} />
        <PromptInput
          value={value}
          onValueChange={setValue}
          isLoading={streaming}
          className={plan?.steps.length ? 'rounded-t-none' : undefined}
          onSubmit={() => {
            const text = value.trim();
            if (!text) return;
            onSend(text);
            setValue('');
          }}
        >
          <PromptInputBody>
            <PromptInputTextarea placeholder="Message the agent…" />
            <PromptInputActions className="justify-end">
              {streaming ? (
                <Button type="button" size="sm" variant="secondary" onClick={onStop}>
                  Stop
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={!value.trim()}
                  onClick={() => {
                    const text = value.trim();
                    if (!text) return;
                    onSend(text);
                    setValue('');
                  }}
                >
                  Send
                </Button>
              )}
            </PromptInputActions>
          </PromptInputBody>
        </PromptInput>
      </div>
    </div>
  );
}
`,
  },
  state: {
    title: 'Streaming and host ownership',
    description:
      'Every streaming, tool, and plan signal is a prop. The installed block never opens network connections or owns chat history.',
    guidance: [
      'Throttle markdown while tokens arrive with MessageContent streaming or useThrottledText so long answers stay responsive.',
      'Keep tool status referentially stable when possible. normalizeToolStatus accepts AI SDK part states and desktop enums.',
      'PlanTracker is independent of streaming open and close. Do not force-expand it when a run starts.',
      'ApprovalCard is presentational. onConfirm and onSkip must gate real tool execution in the host.',
    ],
  },
  composition: {
    description:
      'Stack plan chrome on the composer, agent traces in the transcript, and HITL cards inline with tool rows.',
    boundaries: [
      {
        title: 'Presentation only',
        body: 'No AI SDK, pi, Electron IPC, or GraphQL clients live in the installed AI source.',
      },
      {
        title: 'Composer stack',
        body: 'PlanTracker flushBottom with PromptInput rounded-t-none reads as one shell above the input.',
      },
      {
        title: 'Tool densities',
        body: 'Use row or chip for live agent traces and card when input or output JSON must expand.',
      },
    ],
  },
  previewDescription:
    'Tabbed use cases ordered simple to complex: composer, chat, reasoning, tools, HITL, and workspace.',
  accessibility: [
    'Keep streaming regions polite: use aria-live on loaders and status labels, not on every token.',
    'Give icon-only composer and feedback controls accessible names. Button size icon-* defaults type to button.',
    'Confirm destructive ApprovalCard actions with clear copy. Destructive styling alone is not enough.',
    'DiffTable add and remove state is not color-only. Removed rows also use line-through and success or destructive text.',
  ],
  api: [
    {
      name: 'PromptInput',
      type: 'compound',
      behavior: 'Composer shell with value, onValueChange, onSubmit, isLoading, shape.',
    },
    {
      name: 'Message / MessageContent',
      type: 'compound',
      behavior: 'Transcript row; markdown + streaming props on content.',
    },
    {
      name: 'Reasoning / ThinkingTrace',
      type: 'component',
      behavior: 'Collapsible thinking; auto-open while streaming; duration labels.',
    },
    {
      name: 'Tool / ToolGroup',
      type: 'component',
      behavior: 'Tool call card | chip | row; normalizeToolStatus maps AI SDK + desktop enums.',
    },
    {
      name: 'ApprovalCard',
      type: 'component',
      behavior: 'Confirm/skip or multi-question HITL with optional destructive accent.',
    },
    {
      name: 'PlanTracker / ContextRing',
      type: 'component',
      behavior: 'Plan checklist above the composer; token-window usage ring.',
    },
    {
      name: 'DiffTable / InlineDiff',
      type: 'component',
      behavior: 'Agent-proposed table row edits and file line diffs.',
    },
  ],
} as const;

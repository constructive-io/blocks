'use client';

import { ArrowUp, Paperclip } from 'lucide-react';
import { useState } from 'react';

import {
  AgentLoader,
  AiImage,
  ApprovalCard,
  ChatContainer,
  ChatContainerContent,
  CodeBlock,
  ContextCard,
  ContextCards,
  ContextRing,
  DiffTable,
  FeedbackBar,
  FileUpload,
  InlineDiff,
  Markdown,
  Message,
  MessageContent,
  PlanTracker,
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputBody,
  PromptInputTextarea,
  PromptSuggestion,
  PromptSuggestions,
  Reasoning,
  RecommendationCard,
  ResponseStream,
  ScrollButton,
  Source,
  Sources,
  Step,
  Steps,
  StreamingText,
  SystemMessage,
  TaskList,
  TaskRow,
  TextShimmer,
  ThinkingTrace,
  Tool,
  ToolGroup,
} from '@constructive-io/ui/ai';
import { Button } from '@constructive-io/ui/button';

import type { AiComponentName } from '@/lib/ai-components';

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={
        className ??
        'registry-block flex min-h-48 w-full items-center justify-center overflow-auto p-6'
      }
      data-slot="ai-component-preview"
    >
      <div className="w-full max-w-xl">{children}</div>
    </div>
  );
}

export function AiComponentPreview({ name }: { name: AiComponentName }) {
  switch (name) {
    case 'text-shimmer':
      return (
        <Frame>
          <div className="flex flex-col gap-3">
            <TextShimmer>Thinking</TextShimmer>
            <TextShimmer active={false}>Thought for 2.4s</TextShimmer>
          </div>
        </Frame>
      );
    case 'agent-loader':
      return (
        <Frame>
          <div className="flex flex-col gap-4">
            <AgentLoader variant="drive" label="Working" />
            <AgentLoader variant="dots" label="Planning" />
            <AgentLoader variant="orbit" label="Searching" showElapsed={false} />
            <div className="flex flex-wrap items-center gap-4">
              <AgentLoader variant="circular" />
              <AgentLoader variant="bounce-dots" />
              <AgentLoader variant="typing" />
              <AgentLoader variant="wave" />
            </div>
          </div>
        </Frame>
      );
    case 'prompt-input':
      return (
        <Frame>
          <PromptInputDemo />
        </Frame>
      );
    case 'message':
      return (
        <Frame>
          <div className="flex flex-col gap-3">
            <Message from="user">
              <MessageContent>Compare mint chip to last summer.</MessageContent>
            </Message>
            <Message from="assistant">
              <MessageContent markdown>
                {`Mint chip is up **12%** with stronger weekend peaks.`}
              </MessageContent>
            </Message>
          </div>
        </Frame>
      );
    case 'markdown':
      return (
        <Frame>
          <Markdown>{`### Summary\n\n- **Mint chip** is up 12%\n- Check \`inventory\` before promos\n\n[Docs](https://constructive.io)`}</Markdown>
        </Frame>
      );
    case 'code-block':
      return (
        <Frame>
          <CodeBlock
            language="TypeScript"
            filename="reorder.ts"
            code={`export function buildOrder(skus: string[]) {\n  return skus.filter((s) => s !== 'rocky-road')\n}\n`}
          />
        </Frame>
      );
    case 'response-stream':
      return (
        <Frame>
          <ResponseStream
            markdown
            text="Summer demand spikes for stone-fruit flavors — peach and apricot lead."
          />
        </Frame>
      );
    case 'chat-container':
      return (
        <Frame className="registry-block p-0">
          <div className="relative mx-auto h-72 w-full max-w-xl">
            <ChatContainer className="h-full rounded-xl border border-border">
              <ChatContainerContent>
                <Message from="user">
                  <MessageContent>Hello</MessageContent>
                </Message>
                <Message from="assistant">
                  <MessageContent>Scroll up to reveal the jump control, then return.</MessageContent>
                </Message>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Message key={i} from="assistant">
                    <MessageContent>Line {i + 1} of filler transcript content.</MessageContent>
                  </Message>
                ))}
              </ChatContainerContent>
              <ScrollButton />
            </ChatContainer>
          </div>
        </Frame>
      );
    case 'scroll-button':
      return (
        <Frame>
          <p className="text-sm text-muted-foreground">
            ScrollButton only appears inside ChatContainer when not pinned to the bottom. See Chat
            Container for the interactive demo.
          </p>
        </Frame>
      );
    case 'system-message':
      return (
        <Frame>
          <SystemMessage title="No API key" variant="warning">
            Add a provider key in settings to continue.
          </SystemMessage>
        </Frame>
      );
    case 'reasoning':
      return (
        <Frame>
          <Reasoning
            isStreaming={false}
            durationMs={4200}
            content="Weekend demand carries pistachio, so it churns first."
          />
        </Frame>
      );
    case 'thinking-trace':
      return (
        <Frame>
          <ThinkingTrace
            mode="coding"
            isStreaming={false}
            rows={[
              { primary: 'Read', secondary: 'flavors.ts', mono: true },
              { primary: 'Edit', secondary: 'reorder.ts', mono: true, add: 24, del: 3 },
              { primary: 'Run', secondary: 'pnpm test', mono: true },
            ]}
          />
        </Frame>
      );
    case 'steps':
      return (
        <Frame>
          <Steps title="Agent steps" defaultOpen>
            <Step status="done" title="Read POS export" description="3 files" />
            <Step status="running" title="Score stockout risk" description="68%" />
            <Step status="pending" title="Draft supplier emails" />
          </Steps>
        </Frame>
      );
    case 'tool':
      return (
        <Frame>
          <ToolGroup label="3 tool calls">
            <Tool name="Read" status="success" summary="flavors.ts" variant="row" />
            <Tool
              name="Edit"
              status="success"
              summary="reorder.ts"
              variant="row"
              diff={{ file: 'reorder.ts', add: 24, del: 3 }}
            />
            <Tool name="bash" status="running" summary="pnpm test" variant="row" />
          </ToolGroup>
        </Frame>
      );
    case 'approval-card':
      return (
        <Frame>
          <ApprovalCard
            title="Apply schema migration?"
            description="Creates table reorder_queue and two indexes."
            confirmLabel="Apply"
            skipLabel="Skip"
          />
        </Frame>
      );
    case 'source':
      return (
        <Frame>
          <Sources label="2 sources">
            <Source title="Scoop Data" href="https://example.com" description="Sales index" />
            <Source title="Trends Index" href="https://example.com" />
          </Sources>
        </Frame>
      );
    case 'inline-diff':
      return (
        <Frame>
          <InlineDiff
            source={{
              fileName: 'menu.ts',
              before: 'const hero = "vanilla"\n',
              after: 'const hero = "pistachio"\nconst backup = "mint"\n',
            }}
          />
        </Frame>
      );
    case 'diff-table':
      return (
        <Frame>
          <DiffTable
            title="Proposed menu cleanup"
            animate
            columns={[
              { id: 'f', header: 'Flavor', cell: (r: { flavor: string }) => r.flavor },
              { id: 'c', header: 'Category', cell: (r: { category: string }) => r.category },
            ]}
            rows={[
              { id: '1', flavor: 'Rocky Road', category: 'Classic', removed: true },
              { id: '2', flavor: 'Mint Chip', category: 'Classic' },
            ]}
            addedRows={[{ id: 'a', cells: ['Pistachio', 'Seasonal'] }]}
          />
        </Frame>
      );
    case 'streaming-text':
      return (
        <Frame>
          <StreamingText
            text="Mint chip is up 12% with stronger weekend peaks."
            sources={[{ id: '1', title: 'Scoop Data', href: 'https://example.com' }]}
            followUps={['Winter leaders', 'Gelato margins']}
          />
        </Frame>
      );
    case 'plan-tracker':
      return (
        <Frame>
          <PlanTracker
            streaming
            plan={{
              steps: [
                { label: 'Read project context', status: 'done' },
                { label: 'Draft schema changes', status: 'in_progress' },
                { label: 'Open PR summary', status: 'pending' },
              ],
            }}
          />
        </Frame>
      );
    case 'context-ring':
      return (
        <Frame>
          <div className="flex items-center gap-6">
            <ContextRing usage={{ tokens: 48_000, percent: 42, contextWindow: 128_000 }} size={32} />
            <ContextRing usage={{ tokens: 110_000, percent: 88, contextWindow: 128_000 }} size={32} />
            <ContextRing usage={{ tokens: 124_000, percent: 97, contextWindow: 128_000 }} size={32} />
          </div>
        </Frame>
      );
    case 'task-row':
      return (
        <Frame>
          <TaskList>
            <TaskRow index={0} status="completed" label="Verified vendors" meta="12 suppliers" />
            <TaskRow index={1} status="running" label="Score stockout risk" progress={68} />
            <TaskRow index={2} status="failed" label="Draft emails" onRetry={() => undefined} />
          </TaskList>
        </Frame>
      );
    case 'context-card':
      return (
        <Frame>
          <ContextCards count={1}>
            <ContextCard
              title="Vendor onboarding rule"
              meta="290 characters"
              body="Cold-chain certification must be verified before a new dairy is added."
              sourceType="PDF"
              sourceName="Dairy Onboarding SOP.pdf"
            />
          </ContextCards>
        </Frame>
      );
    case 'recommendation-card':
      return (
        <Frame>
          <RecommendationCard
            body="Reorder waffle cones with a 7-day lead time."
            confidence={0.86}
            confidenceLabel="High confidence"
            alternatives={[
              { id: 'a', label: 'Switch supplier', badge: 'Needs review' },
              { id: 'b', label: 'Full restock', badge: 'No signal' },
            ]}
          />
        </Frame>
      );
    case 'feedback-bar':
      return (
        <Frame>
          <FeedbackBar copyText="Sample answer" showRegenerate />
        </Frame>
      );
    case 'prompt-suggestion':
      return (
        <Frame>
          <PromptSuggestions>
            <PromptSuggestion>Forecast summer demand</PromptSuggestion>
            <PromptSuggestion>Find waffle cone suppliers</PromptSuggestion>
          </PromptSuggestions>
        </Frame>
      );
    case 'file-upload':
      return (
        <Frame>
          <FileUpload multiple />
        </Frame>
      );
    case 'image':
      return (
        <Frame>
          <AiImage
            alt="Sample"
            // 1×1 constructive-blue-ish PNG
            data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
            mimeType="image/png"
            className="size-24 rounded-lg"
          />
        </Frame>
      );
    default:
      return null;
  }
}

function PromptInputDemo() {
  const [value, setValue] = useState('');
  return (
    <PromptInput value={value} onValueChange={setValue} onSubmit={() => setValue('')}>
      <PromptInputBody>
        <PromptInputTextarea placeholder="Ask the agent…" />
        <PromptInputActions className="justify-between">
          <PromptInputAction tooltip="Attach">
            <Button type="button" size="icon-sm" variant="ghost" aria-label="Attach">
              <Paperclip className="size-4" />
            </Button>
          </PromptInputAction>
          <Button type="button" size="icon-sm" aria-label="Send" disabled={!value.trim()}>
            <ArrowUp className="size-4" />
          </Button>
        </PromptInputActions>
      </PromptInputBody>
    </PromptInput>
  );
}

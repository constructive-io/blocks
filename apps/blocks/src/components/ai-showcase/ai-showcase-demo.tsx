'use client';

import { ArrowUp, Paperclip, Square } from 'lucide-react';
import { useState } from 'react';

import {
  AgentLoader,
  ApprovalCard,
  ChatContainer,
  ChatContainerContent,
  CodeBlock,
  ContextCard,
  ContextCards,
  ContextRing,
  DiffTable,
  FeedbackBar,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@constructive-io/ui/tabs';

/** Full-width stage — never center a max-w-xl island. */
function Stage({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`w-full min-w-0 p-4 sm:p-5 ${className}`}
      data-slot="ai-showcase-stage"
    >
      {children}
    </div>
  );
}

function SceneLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[12px] leading-5 text-muted-foreground sm:mb-4">{children}</p>
  );
}

/** 1 — Composer: input shell + light status chrome */
function ComposerDemo() {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = () => {
    if (!value.trim()) return;
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setValue('');
    }, 1400);
  };

  return (
    <Stage>
      <SceneLabel>
        Composer shell with plan band, context meter, and send/stop. Status atoms sit above the input.
      </SceneLabel>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {loading ? (
          <TextShimmer className="text-sm">Thinking</TextShimmer>
        ) : (
          <span className="text-sm text-muted-foreground">Ready</span>
        )}
        <AgentLoader variant="drive" label="Working" size="sm" showElapsed={false} />
        <AgentLoader variant="orbit" label="Searching" size="sm" showElapsed={false} />
        <ContextRing
          usage={{ tokens: 62_000, percent: 55, contextWindow: 128_000 }}
          size={28}
        />
      </div>
      <div className="w-full min-w-0">
        <PlanTracker
          streaming={loading}
          flushBottom
          plan={{
            steps: [
              { label: 'Read project context', status: 'done' },
              { label: 'Draft schema changes', status: 'in_progress' },
              { label: 'Open PR summary', status: 'pending' },
            ],
          }}
        />
        <PromptInput
          value={value}
          onValueChange={setValue}
          isLoading={loading}
          className="rounded-t-none"
          onSubmit={submit}
        >
          <PromptInputBody>
            <PromptInputTextarea placeholder="Message the agent…" />
            <PromptInputActions className="justify-between">
              <div className="flex items-center gap-1.5">
                <PromptInputAction tooltip="Attach">
                  <Button type="button" size="icon-sm" variant="ghost" aria-label="Attach">
                    <Paperclip className="size-4" />
                  </Button>
                </PromptInputAction>
                <ContextRing
                  usage={{ tokens: 62_000, percent: 55, contextWindow: 128_000 }}
                  size={22}
                />
              </div>
              {loading ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  aria-label="Stop"
                  onClick={() => setLoading(false)}
                >
                  <Square className="size-3.5 fill-current" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="icon-sm"
                  aria-label="Send"
                  disabled={!value.trim()}
                  onClick={submit}
                >
                  <ArrowUp className="size-4" />
                </Button>
              )}
            </PromptInputActions>
          </PromptInputBody>
        </PromptInput>
      </div>
    </Stage>
  );
}

/** 2 — Chat: stick-to-bottom transcript */
function ChatDemo() {
  return (
    <Stage className="!p-0">
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <SceneLabel>
          Stick-to-bottom transcript with messages, feedback, follow-ups, and jump-to-latest.
        </SceneLabel>
      </div>
      <div className="relative h-[min(28rem,55vh)] min-h-72 w-full sm:h-[32rem]">
        <ChatContainer className="h-full">
          <ChatContainerContent className="max-w-none gap-3 px-4 py-4 sm:px-5">
            <SystemMessage title="Demo fixture" variant="info">
              Static props only — hosts own streaming and history.
            </SystemMessage>
            <Message from="user">
              <MessageContent>
                Compare mint chip to last summer and draft a reorder.
              </MessageContent>
            </Message>
            <Message from="assistant">
              <div className="flex w-full min-w-0 flex-col gap-2">
                <MessageContent markdown>
                  {`Mint chip is up **12%** with stronger weekend peaks.

- Reorder waffle cones
- Hold rocky road promotions`}
                </MessageContent>
                <FeedbackBar
                  copyText="Mint chip is up 12% with stronger weekend peaks."
                  showRegenerate={false}
                />
                <PromptSuggestions label="Follow-ups">
                  <PromptSuggestion>Which flavors sell best in winter</PromptSuggestion>
                  <PromptSuggestion>Compare gelato margins</PromptSuggestion>
                </PromptSuggestions>
              </div>
            </Message>
            <Message from="user">
              <MessageContent>Also check cone inventory before we commit.</MessageContent>
            </Message>
            <Message from="assistant">
              <MessageContent markdown>
                {`Cone stock is **healthy** for two weeks of peak weekend demand. I can open a draft PO if you want.`}
              </MessageContent>
            </Message>
          </ChatContainerContent>
          <ScrollButton />
        </ChatContainer>
      </div>
    </Stage>
  );
}

/** 3 — Reasoning: thinking surfaces */
function ReasoningDemo() {
  return (
    <Stage>
      <SceneLabel>
        Thinking UX: collapsible reasoning, structured trace, and ordered steps with status.
      </SceneLabel>
      <div className="flex w-full min-w-0 flex-col gap-4">
        <Reasoning
          isStreaming={false}
          durationMs={3800}
          content="Pulled three summers of mint chip sales and cross-checked cone inventory before drafting the reorder."
        />
        <ThinkingTrace
          mode="coding"
          isStreaming={false}
          rows={[
            { primary: 'Read', secondary: 'sales.ts', mono: true },
            { primary: 'Read', secondary: 'inventory.csv', mono: true },
            { primary: 'Edit', secondary: 'reorder.ts', mono: true, add: 24, del: 3 },
          ]}
        />
        <Steps title="Agent plan" defaultOpen>
          <Step status="done" title="Load sales window" description="FY24 · Q2–Q3" />
          <Step status="done" title="Score stockout risk" description="7 SKUs" />
          <Step status="running" title="Draft reorder + migration">
            <pre>{`create table reorder_queue (…)`}</pre>
          </Step>
          <Step status="pending" title="Open PR summary" />
        </Steps>
      </div>
    </Stage>
  );
}

/** 4 — Tools: tool rows + code */
function ToolsDemo() {
  return (
    <Stage>
      <SceneLabel>
        Tool calls at row density, with diff chips and a highlighted code result.
      </SceneLabel>
      <div className="flex w-full min-w-0 flex-col gap-4">
        <ToolGroup label="3 tool calls">
          <Tool
            name="Read"
            status="success"
            summary="flavors.ts"
            variant="row"
            detail={[{ text: '128 lines · 3 exports' }]}
          />
          <Tool
            name="Edit"
            status="success"
            summary="reorder.ts"
            variant="row"
            diff={{ file: 'reorder.ts', add: 24, del: 3 }}
            detail={[
              {
                text: '+ export function buildOrder(skus: string[])',
                tone: 'add',
              },
            ]}
          />
          <Tool name="bash" status="running" summary="pnpm test" variant="row" />
        </ToolGroup>
        <CodeBlock
          language="TypeScript"
          filename="reorder.ts"
          code={`export function buildOrder(skus: string[]) {
  return skus
    .filter((s) => s !== 'rocky-road')
    .map((sku) => ({ sku, qty: 24 }))
}
`}
        />
        <div className="flex flex-wrap gap-2">
          <Tool name="search" status="success" summary="12 hits" variant="chip" />
          <Tool name="web" status="pending" summary="Queued" variant="chip" />
        </div>
      </div>
    </Stage>
  );
}

/** 5 — HITL: approvals and proposed edits */
function HitlDemo() {
  return (
    <Stage>
      <SceneLabel>
        Human-in-the-loop gates: confirm, recommend with alternatives, and tabular proposed edits.
      </SceneLabel>
      <div className="flex w-full min-w-0 flex-col gap-4">
        <ApprovalCard
          title="Apply schema migration?"
          description="Creates table reorder_queue and two indexes on the analytics warehouse."
          confirmLabel="Apply"
          skipLabel="Skip"
        />
        <RecommendationCard
          body={
            <>
              Reorder waffle cones from{' '}
              <code className="rounded bg-muted px-1 font-mono text-[12px]">cone_king</code> with
              lead time{' '}
              <code className="rounded bg-muted px-1 font-mono text-[12px]">7_days</code>.
            </>
          }
          confidence={0.86}
          confidenceLabel="High confidence"
          alternatives={[
            { id: 'a', label: 'Switch supplier', badge: 'Needs review' },
            { id: 'b', label: 'Full restock', badge: 'No signal' },
          ]}
        />
        <DiffTable
          title="Proposed menu cleanup"
          animate={false}
          columns={[
            {
              id: 'flavor',
              header: 'Flavor',
              cell: (r: { flavor: string }) => r.flavor,
            },
            {
              id: 'category',
              header: 'Category',
              cell: (r: { category: string }) => r.category,
            },
            {
              id: 'supplier',
              header: 'Supplier',
              cell: (r: { supplier: string }) => r.supplier,
            },
          ]}
          rows={[
            {
              id: '1',
              flavor: 'Rocky Road',
              category: 'Classic',
              supplier: 'aurora-scoops',
              removed: true,
            },
            {
              id: '2',
              flavor: 'Mint Chip',
              category: 'Classic',
              supplier: 'maple-orbit',
            },
          ]}
          addedRows={[
            {
              id: 'add-1',
              cells: ['Pistachio', 'Seasonal', 'maple-orbit'],
            },
          ]}
        />
      </div>
    </Stage>
  );
}

/** 6 — Workspace: tasks, RAG, streamed answer chrome */
function WorkspaceDemo() {
  return (
    <Stage>
      <SceneLabel>
        Side-panel workspace: live tasks, retrieved chunks, and a settled streamed answer with
        citations.
      </SceneLabel>
      <div className="grid w-full min-w-0 gap-5 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <TaskList>
            <TaskRow
              index={0}
              status="completed"
              label="Verified vendors"
              meta="12 suppliers"
              details={[
                { label: 'Matched tax IDs', meta: '12/12' },
                { label: 'Flagged stale', meta: '0' },
              ]}
            />
            <TaskRow
              index={1}
              status="running"
              label="Score stockout risk"
              meta="7 SKUs"
              progress={68}
            />
            <TaskRow
              index={2}
              status="failed"
              label="Draft supplier emails"
              meta="2 messages"
              onRetry={() => undefined}
            />
          </TaskList>
          <ContextCards count={2}>
            <ContextCard
              index={0}
              title="Vendor onboarding rule"
              meta="290 characters"
              body="Cold-chain certification must be verified before a new dairy is added."
              sourceType="PDF"
              sourceName="Dairy Onboarding SOP.pdf"
            />
            <ContextCard
              index={1}
              title="Seasonal demand"
              meta="1,250 characters"
              body="Q4 velocity: pistachio +18%, vanilla +6%, rocky road -11%."
              sourceType="CSV"
              sourceName="Sales Velocity Export.csv"
            />
          </ContextCards>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <StreamingText
            streaming={false}
            text="Mint chip is up 12% with stronger weekend peaks. Check cone inventory before a waffle-bowl special."
            sources={[
              { id: '1', title: 'Scoop Data', href: 'https://example.com' },
              { id: '2', title: 'Trends Index', href: 'https://example.com' },
            ]}
            followUps={['Winter leaders', 'Gelato margins']}
          />
          <Sources label="Citations">
            <Source title="Scoop Data" href="https://example.com" description="Sales index" />
            <Source title="Trends Index" href="https://example.com" />
          </Sources>
        </div>
      </div>
    </Stage>
  );
}

/**
 * Overview showcase for /blocks/ai — tabbed use cases ordered simple → complex.
 */
export function AiShowcaseDemo() {
  return (
    <div className="registry-block min-w-0" data-slot="ai-showcase-preview">
      <Tabs defaultValue="composer" className="w-full">
        <div className="border-b border-border px-3 pt-3 sm:px-4 sm:pt-4">
          <TabsList className="mb-0 h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
            <TabsTrigger value="composer" className="px-3">
              Composer
            </TabsTrigger>
            <TabsTrigger value="chat" className="px-3">
              Chat
            </TabsTrigger>
            <TabsTrigger value="reasoning" className="px-3">
              Reasoning
            </TabsTrigger>
            <TabsTrigger value="tools" className="px-3">
              Tools
            </TabsTrigger>
            <TabsTrigger value="hitl" className="px-3">
              HITL
            </TabsTrigger>
            <TabsTrigger value="workspace" className="px-3">
              Workspace
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="composer" className="mt-0 outline-none">
          <ComposerDemo />
        </TabsContent>
        <TabsContent value="chat" className="mt-0 outline-none">
          <ChatDemo />
        </TabsContent>
        <TabsContent value="reasoning" className="mt-0 outline-none">
          <ReasoningDemo />
        </TabsContent>
        <TabsContent value="tools" className="mt-0 outline-none">
          <ToolsDemo />
        </TabsContent>
        <TabsContent value="hitl" className="mt-0 outline-none">
          <HitlDemo />
        </TabsContent>
        <TabsContent value="workspace" className="mt-0 outline-none">
          <WorkspaceDemo />
        </TabsContent>
      </Tabs>
    </div>
  );
}

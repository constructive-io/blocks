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
  StreamingText,
  SystemMessage,
  TaskList,
  TaskRow,
  ThinkingTrace,
  Tool,
  ToolGroup,
} from '@constructive-io/ui/ai';
import { Button } from '@constructive-io/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@constructive-io/ui/tabs';

function ComposerDemo() {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="mx-auto w-full max-w-xl">
      <PlanTracker
        streaming={loading}
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
        onSubmit={() => {
          if (!value.trim()) return;
          setLoading(true);
          window.setTimeout(() => {
            setLoading(false);
            setValue('');
          }, 1400);
        }}
      >
        <PromptInputBody>
          <PromptInputTextarea placeholder="Ask the agent…" />
          <PromptInputActions className="justify-between">
            <div className="flex items-center gap-1">
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
                onClick={() => {
                  if (!value.trim()) return;
                  setLoading(true);
                  window.setTimeout(() => {
                    setLoading(false);
                    setValue('');
                  }, 1400);
                }}
              >
                <ArrowUp className="size-4" />
              </Button>
            )}
          </PromptInputActions>
        </PromptInputBody>
      </PromptInput>
    </div>
  );
}

function TranscriptDemo() {
  return (
    <div className="relative mx-auto h-[440px] w-full max-w-xl rounded-xl border border-border">
      <ChatContainer className="h-full">
        <ChatContainerContent>
          <Message from="user">
            <MessageContent>Compare mint chip to last summer and draft a reorder.</MessageContent>
          </Message>
          <Message from="assistant">
            <div className="flex w-full flex-col gap-2">
              <Reasoning
                isStreaming={false}
                durationMs={3800}
                content="Pulled three summers of mint chip sales and cross-checked cone inventory."
              />
              <ThinkingTrace
                mode="coding"
                isStreaming={false}
                rows={[
                  { primary: 'Read', secondary: 'sales.ts', mono: true },
                  { primary: 'Edit', secondary: 'reorder.ts', mono: true, add: 24, del: 3 },
                ]}
              />
              <MessageContent markdown>
                {`Mint chip is up **12%** with stronger weekend peaks.\n\n- Reorder waffle cones\n- Hold rocky road promotions`}
              </MessageContent>
              <FeedbackBar copyText="Mint chip is up 12%" showRegenerate={false} />
              <PromptSuggestions label="Follow-ups">
                <PromptSuggestion>Which flavors sell best in winter</PromptSuggestion>
                <PromptSuggestion>Compare gelato margins</PromptSuggestion>
              </PromptSuggestions>
            </div>
          </Message>
          <SystemMessage title="Preview fixture" variant="info">
            This demo uses static props — wire streaming from your host runtime.
          </SystemMessage>
        </ChatContainerContent>
        <ScrollButton />
      </ChatContainer>
    </div>
  );
}

function ToolsDemo() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <AgentLoader variant="drive" label="Working" />
        <AgentLoader variant="orbit" label="Searching" showElapsed={false} />
      </div>
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
          detail={[{ text: '+ export function buildOrder(skus: string[])', tone: 'add' }]}
        />
        <Tool name="bash" status="running" summary="pnpm test" variant="row" />
      </ToolGroup>
      <CodeBlock
        language="TypeScript"
        filename="reorder.ts"
        code={`export function buildOrder(skus: string[]) {\n  return skus.filter((s) => s !== 'rocky-road')\n}\n`}
      />
    </div>
  );
}

function HitlDemo() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <ApprovalCard
        title="Apply schema migration?"
        description="Creates table reorder_queue and two indexes."
        confirmLabel="Apply"
        skipLabel="Skip"
      />
      <RecommendationCard
        body={
          <>
            Reorder waffle cones from{' '}
            <code className="rounded bg-muted px-1 font-mono text-[12px]">cone_king</code> with lead
            time <code className="rounded bg-muted px-1 font-mono text-[12px]">7_days</code>.
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
        animate
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
  );
}

function ContextDemo() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <TaskList>
        <TaskRow
          index={0}
          status="completed"
          label="Verified vendor records"
          meta="12 suppliers"
          details={[
            { label: 'Matched tax IDs', meta: '12/12' },
            { label: 'Flagged stale', meta: '0' },
          ]}
        />
        <TaskRow index={1} status="running" label="Score stockout risk" meta="7 SKUs" progress={68} />
        <TaskRow index={2} status="failed" label="Draft supplier emails" meta="2 messages" onRetry={() => undefined} />
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
      <StreamingText
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
  );
}

export function AiShowcaseDemo() {
  return (
    <div className="registry-block min-w-0" data-slot="ai-showcase-preview">
      <Tabs defaultValue="composer" className="w-full">
        <TabsList className="mb-4 w-full flex-wrap justify-start sm:w-auto">
          <TabsTrigger value="composer">Composer</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="hitl">HITL</TabsTrigger>
          <TabsTrigger value="context">Context</TabsTrigger>
        </TabsList>
        <TabsContent value="composer" className="mt-0 outline-none">
          <ComposerDemo />
        </TabsContent>
        <TabsContent value="transcript" className="mt-0 outline-none">
          <TranscriptDemo />
        </TabsContent>
        <TabsContent value="tools" className="mt-0 outline-none">
          <ToolsDemo />
        </TabsContent>
        <TabsContent value="hitl" className="mt-0 outline-none">
          <HitlDemo />
        </TabsContent>
        <TabsContent value="context" className="mt-0 outline-none">
          <ContextDemo />
        </TabsContent>
      </Tabs>
    </div>
  );
}

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

function Frame({
  children,
  className,
  /** Skip the centered max-w-xl shell (full-bleed demos like chat). */
  fullBleed = false,
}: {
  children: React.ReactNode;
  className?: string;
  fullBleed?: boolean;
}) {
  return (
    <div
      className={
        className ??
        'registry-block flex min-h-48 w-full items-center justify-center overflow-auto p-6'
      }
      data-slot="ai-component-preview"
    >
      {fullBleed ? (
        children
      ) : (
        <div className="mx-auto w-full max-w-xl">{children}</div>
      )}
    </div>
  );
}

function StepsDemoBlock({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className="text-[11px] font-medium tracking-wide text-foreground uppercase">{label}</p>
        {description ? (
          <p className="text-[12px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function CodeBlockDemo({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className="text-[11px] font-medium tracking-wide text-foreground uppercase">{label}</p>
        {description ? (
          <p className="text-[12px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
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
        <Frame className="registry-block flex w-full items-start justify-center overflow-auto p-6">
          <div className="flex w-full max-w-xl flex-col gap-6">
            <CodeBlockDemo label="TypeScript" description="Default JS/TS tokenizer with filename.">
              <CodeBlock
                language="TypeScript"
                filename="reorder.ts"
                code={`export function buildOrder(skus: string[]) {\n  // drop discontinued flavors\n  return skus.filter((s) => s !== 'rocky-road')\n}\n`}
              />
            </CodeBlockDemo>
            <CodeBlockDemo label="Python" description="Preset keywords for Python.">
              <CodeBlock
                language="Python"
                filename="score.py"
                code={`from dataclasses import dataclass\n\n@dataclass\nclass Risk:\n    sku: str\n    score: float\n\ndef score_stockout(rows: list[dict]) -> list[Risk]:\n    \"\"\"Rank SKUs by stockout probability.\"\"\"\n    return [Risk(r[\"sku\"], r[\"prob\"]) for r in rows if r[\"prob\"] > 0.4]\n`}
              />
            </CodeBlockDemo>
            <CodeBlockDemo label="Rust" description="Preset for systems / tool output.">
              <CodeBlock
                language="Rust"
                filename="main.rs"
                code={`fn main() {\n    let skus = vec![\"mint\", \"pistachio\"];\n    for sku in skus {\n        println!(\"checking {sku}\");\n    }\n}\n`}
              />
            </CodeBlockDemo>
            <CodeBlockDemo label="Go" description="Preset for service snippets.">
              <CodeBlock
                language="Go"
                filename="handler.go"
                code={`package api\n\nfunc Score(ctx context.Context, sku string) (float64, error) {\n    // TODO: call inventory service\n    return 0.68, nil\n}\n`}
              />
            </CodeBlockDemo>
            <CodeBlockDemo label="SQL" description="Heuristic highlight for query plans.">
              <CodeBlock
                language="SQL"
                filename="reorder.sql"
                code={`SELECT store_id, sku, SUM(qty) AS units\nFROM pos.line_items\nWHERE sold_at >= now() - interval '90 days'\nGROUP BY 1, 2\nORDER BY units DESC\nLIMIT 50;\n`}
              />
            </CodeBlockDemo>
            <CodeBlockDemo label="Bash" description="Shell scripts and CLI traces.">
              <CodeBlock
                language="Bash"
                filename="deploy.sh"
                code={`#!/usr/bin/env bash\nset -euo pipefail\n\npnpm build\npnpm pack:local\necho \"artifact ready\"\n`}
              />
            </CodeBlockDemo>
            <CodeBlockDemo label="CSS" description="Preset for stylesheets.">
              <CodeBlock
                language="CSS"
                filename="tokens.css"
                code={`:root {\n  --radius: 0.5rem;\n  --primary: oklch(0.69 0.18 245);\n}\n\n.card {\n  border-radius: var(--radius);\n  border: 1px solid var(--border);\n}\n`}
              />
            </CodeBlockDemo>
            <CodeBlockDemo label="JSON" description="Config / tool JSON payloads.">
              <CodeBlock
                language="JSON"
                filename="plan.json"
                code={`{\n  "steps": [\n    { "id": "read", "status": "done" },\n    { "id": "score", "status": "running" }\n  ],\n  "confidence": 0.86\n}\n`}
              />
            </CodeBlockDemo>
            <CodeBlockDemo label="Diff" description="Preset for patch-style output.">
              <CodeBlock
                language="Diff"
                filename="reorder.ts"
                code={`- return skus\n+ return skus.filter((s) => s !== 'rocky-road')\n`}
              />
            </CodeBlockDemo>
            <CodeBlockDemo label="Streaming lines" description="Progressive reveal (demo / fixtures).">
              <CodeBlock
                language="TypeScript"
                filename="stream.ts"
                streamingLines
                lineIntervalMs={180}
                code={`const lines = ['one', 'two', 'three']\nfor (const line of lines) {\n  console.log(line)\n}\n`}
              />
            </CodeBlockDemo>
            <CodeBlockDemo
              label="Long source"
              description="Collapses past 12 lines with fade + show more; expand scrolls inside the block."
            >
              <CodeBlock
                language="TypeScript"
                filename="inventory-sync.ts"
                code={`import type { Store, Sku } from './types'\n\nexport type SyncOptions = {\n  dryRun?: boolean\n  region?: string\n  since?: Date\n}\n\nexport async function syncInventory(\n  stores: Store[],\n  skus: Sku[],\n  options: SyncOptions = {},\n): Promise<{ updated: number; skipped: number }> {\n  const { dryRun = false, region = 'us-west', since } = options\n  let updated = 0\n  let skipped = 0\n\n  for (const store of stores) {\n    if (region && store.region !== region) {\n      skipped += 1\n      continue\n    }\n\n    for (const sku of skus) {\n      const qty = await fetchOnHand(store.id, sku.id, since)\n      if (qty === null) {\n        skipped += 1\n        continue\n      }\n      if (!dryRun) {\n        await writeSnapshot(store.id, sku.id, qty)\n      }\n      updated += 1\n    }\n  }\n\n  return { updated, skipped }\n}\n\nasync function fetchOnHand(\n  storeId: string,\n  skuId: string,\n  since?: Date,\n): Promise<number | null> {\n  // Host wires the data client; this is illustrative only.\n  void storeId\n  void skuId\n  void since\n  return 12\n}\n\nasync function writeSnapshot(\n  storeId: string,\n  skuId: string,\n  qty: number,\n): Promise<void> {\n  void storeId\n  void skuId\n  void qty\n}\n`}
              />
            </CodeBlockDemo>
            <CodeBlockDemo
              label="Always expanded"
              description="maxCollapsedLines={false} keeps long code fully open."
            >
              <CodeBlock
                language="JSON"
                filename="small-config.json"
                maxCollapsedLines={false}
                code={`{\n  "region": "us-west",\n  "dryRun": true,\n  "stores": ["sfo", "sea", "pdx"]\n}\n`}
              />
            </CodeBlockDemo>
          </div>
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
        <Frame
          fullBleed
          className="registry-block flex h-[28rem] w-full flex-col overflow-hidden p-0"
        >
          <p className="shrink-0 border-b border-border bg-muted/30 px-4 py-2 text-center text-[12px] text-muted-foreground">
            Scroll up in the transcript — the jump-to-latest control appears over the messages.
          </p>
          <ChatContainer className="min-h-0 w-full flex-1">
            <ChatContainerContent className="max-w-none gap-3 px-4 py-4 sm:px-6">
              <Message from="user">
                <MessageContent>Compare mint chip to last summer.</MessageContent>
              </Message>
              <Message from="assistant">
                <MessageContent>
                  Mint chip is up 12% with stronger weekend peaks. Scroll this panel to inspect the
                  history, then use the floating control to jump back to the latest message.
                </MessageContent>
              </Message>
              {Array.from({ length: 10 }).map((_, i) => (
                <Message key={i} from={i % 3 === 0 ? 'user' : 'assistant'}>
                  <MessageContent>
                    {i % 3 === 0
                      ? `Follow-up ${i + 1}: any stockout risk on cones?`
                      : `Update ${i + 1}: waffle cone inventory looks healthy through next week.`}
                  </MessageContent>
                </Message>
              ))}
            </ChatContainerContent>
            <ScrollButton />
          </ChatContainer>
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
        <Frame className="registry-block flex w-full items-start justify-center overflow-auto p-6">
          <div className="flex w-full max-w-xl flex-col gap-8">
            <StepsDemoBlock label="Default" description="Mixed status mid-run.">
              <Steps title="Agent steps" defaultOpen>
                <Step status="done" title="Read POS export" description="3 files" />
                <Step status="running" title="Score stockout risk" description="68%" />
                <Step status="pending" title="Draft supplier emails" />
              </Steps>
            </StepsDemoBlock>

            <StepsDemoBlock label="All statuses" description="Pending, running, done, and error.">
              <Steps title="Status catalog" defaultOpen>
                <Step status="done" title="Resolved inventory snapshot" description="Cached 12m ago" />
                <Step status="running" title="Scoring stockout risk" description="68%" />
                <Step status="error" title="Push reorder to ERP" description="HTTP 503 from vendor gateway" />
                <Step status="pending" title="Notify store managers" />
              </Steps>
            </StepsDemoBlock>

            <StepsDemoBlock
              label="Long content"
              description="Wrapped titles, long descriptions, and nested body output."
            >
              <Steps title="Reconciliation run" defaultOpen>
                <Step
                  status="done"
                  title="Fetch last 90 days of POS line items for every store in the Pacific region"
                  description="Joined sales.line_items with inventory.snapshots across 48 stores and three warehouses. 1.2M rows after dedupe."
                >
                  <pre>{`SELECT store_id, sku, SUM(qty)
FROM pos.line_items
WHERE sold_at >= now() - interval '90 days'
GROUP BY 1, 2`}</pre>
                </Step>
                <Step
                  status="running"
                  title="Build a multi-week replenishment plan that respects lead times, case packs, and cold-chain constraints"
                  description="Optimizing against service-level targets while keeping total outbound under carrier capacity."
                />
                <Step
                  status="pending"
                  title="Open a draft PR with migration + runbook"
                  description="Includes rollback notes and on-call checklist."
                />
              </Steps>
            </StepsDemoBlock>

            <StepsDemoBlock label="Short steps" description="Title-only rows still keep a readable connector.">
              <Steps title="Quick path" defaultOpen>
                <Step status="done" title="Parse" />
                <Step status="done" title="Validate" />
                <Step status="running" title="Apply" />
                <Step status="pending" title="Verify" />
              </Steps>
            </StepsDemoBlock>

            <StepsDemoBlock label="Single step" description="No connector when only one item.">
              <Steps title="One-shot" defaultOpen>
                <Step status="running" title="Generating summary" description="Streaming…" />
              </Steps>
            </StepsDemoBlock>

            <StepsDemoBlock label="Completed" description="All steps done.">
              <Steps title="Nightly import" defaultOpen>
                <Step status="done" title="Download feed" description="ok" />
                <Step status="done" title="Normalize rows" description="14,208" />
                <Step status="done" title="Upsert warehouse" description="2.1s" />
              </Steps>
            </StepsDemoBlock>

            <StepsDemoBlock label="Collapsed" description="defaultOpen={false} — expand to inspect.">
              <Steps title="Hidden detail" defaultOpen={false}>
                <Step status="done" title="Warm cache" />
                <Step status="done" title="Prefetch schema" />
              </Steps>
            </StepsDemoBlock>
          </div>
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
          <div className="flex items-end justify-center gap-10 py-4">
            {(
              [
                { label: 'Healthy', percent: 42, tokens: 48_000 as number | null },
                { label: 'High', percent: 88, tokens: 110_000 },
                { label: 'Critical', percent: 97, tokens: 124_000 },
              ] as const
            ).map((state) => (
              <div key={state.label} className="flex flex-col items-center gap-2.5">
                <ContextRing
                  size={40}
                  stroke={2.25}
                  usage={{
                    tokens: state.tokens,
                    percent: state.percent,
                    contextWindow: 128_000,
                  }}
                />
                <p className="text-[11px] text-muted-foreground">{state.label}</p>
              </div>
            ))}
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

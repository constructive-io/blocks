import { CodeBlock, Message, MessageContent, PromptInput, PromptInputTextarea } from '@constructive-io/ui/ai';

import { SinkCard } from './sink-card';

const SNIPPET = `const { data } = await db
  .from('orders')
  .select('*');`;

export function AssistantCard() {
  return (
    <SinkCard title="Assistant" contentClassName="flex flex-col gap-4">
      <Message from="user">
        <MessageContent>List this month&apos;s orders.</MessageContent>
      </Message>
      <Message from="assistant">
        <MessageContent className="flex flex-col gap-2 text-xs">
          <p className="text-muted-foreground">
            Query the <code className="font-mono">orders</code> table filtered by the current billing period:
          </p>
          <CodeBlock
            code={SNIPPET}
            language="ts"
            maxCollapsedLines={false}
            maxExpandedHeight={false}
            className="rounded-md text-[11px]"
          />
        </MessageContent>
      </Message>
      <PromptInput value="" onValueChange={() => {}} onSubmit={() => {}} className="rounded-md">
        <PromptInputTextarea placeholder="Ask anything…" aria-label="Ask the assistant" />
      </PromptInput>
    </SinkCard>
  );
}

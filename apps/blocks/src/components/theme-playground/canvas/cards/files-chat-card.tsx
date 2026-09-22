import { ContextCard, ContextCards, FileUpload, InlineDiff, Message, MessageContent } from '@constructive-io/ui/ai';

import { ChatColumn, ChatPrompt } from './chat-column';

export function FilesChatCard() {
  return (
    <ChatColumn
      title="Migration review"
      model="gemini-2.5-pro"
      prompt={
        <ChatPrompt
          placeholder="Attach a dump or describe the change…"
          top={<FileUpload multiple variant="compact" aria-label="Upload schema files" />}
        />
      }
    >
      <Message from="user">
        <div className="flex w-full flex-col gap-2">
          <ContextCards count={2}>
            <ContextCard
              index={0}
              title="schema.sql"
              meta="4.2 KB"
              body="CREATE TABLE orders (id uuid, customer_id uuid…)"
              sourceType="SQL"
              sourceName="schema.sql"
              className="rounded-md"
            />
            <ContextCard
              index={1}
              title="orders.csv"
              meta="18,204 rows"
              body="id, customer_id, total"
              sourceType="CSV"
              sourceName="orders.csv"
              className="rounded-md"
            />
          </ContextCards>
          <MessageContent>Reconcile this export with the live schema.</MessageContent>
        </div>
      </Message>
      <Message from="assistant">
        <div className="flex w-full flex-col gap-3">
          <MessageContent markdown>
            {`The export is missing \`orders.status\` — rows default to \`'pending'\`. Proposed migration:`}
          </MessageContent>
          <InlineDiff
            className="rounded-md"
            source={{
              fileName: 'migrations/0042_orders_status.sql',
              before: 'ALTER TABLE orders\n  ADD COLUMN customer_id uuid NOT NULL;',
              after:
                "ALTER TABLE orders\n  ADD COLUMN customer_id uuid NOT NULL,\n  ADD COLUMN status text DEFAULT 'pending';",
            }}
          />
        </div>
      </Message>
    </ChatColumn>
  );
}

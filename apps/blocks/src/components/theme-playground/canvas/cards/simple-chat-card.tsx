import { Message, MessageContent, PromptSuggestion, PromptSuggestions, TextShimmer } from '@constructive-io/ui/ai';

import { ChatColumn, ChatPrompt } from './chat-column';

export function SimpleChatCard() {
  return (
    <ChatColumn
      title="Schema assistant"
      model="claude-sonnet-4"
      prompt={
        <ChatPrompt
          placeholder="Ask about your schema…"
          top={
            <PromptSuggestions>
              <PromptSuggestion>Index the orders table</PromptSuggestion>
              <PromptSuggestion>Explain RLS policies</PromptSuggestion>
            </PromptSuggestions>
          }
        />
      }
    >
      <Message from="user">
        <MessageContent>Why is my orders report query slow?</MessageContent>
      </Message>
      <Message from="assistant">
        <MessageContent markdown>
          {`The report runs a sequential scan on \`orders\` — no index covers the filter.\n\n- Add \`idx_orders_customer_id\` on \`orders(customer_id)\`\n- Re-run \`EXPLAIN ANALYZE\` to confirm the index scan\n- Consider partitioning by \`created_at\` once the table passes 10M rows`}
        </MessageContent>
      </Message>
      <Message from="user">
        <MessageContent>Can you write the migration?</MessageContent>
      </Message>
      <Message from="assistant">
        <TextShimmer className="text-[13px]">Drafting migration…</TextShimmer>
      </Message>
    </ChatColumn>
  );
}

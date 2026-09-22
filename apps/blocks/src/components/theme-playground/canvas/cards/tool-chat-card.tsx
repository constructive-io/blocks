import { ApprovalCard, Message, MessageContent, Step, Steps, Tool, ToolGroup } from '@constructive-io/ui/ai';

import { ChatColumn } from './chat-column';

export function ToolChatCard() {
  return (
    <ChatColumn title="Query optimizer" model="gpt-5">
      <Message from="user">
        <MessageContent>Speed up the orders report — it's timing out in production.</MessageContent>
      </Message>
      <Message from="assistant">
        <div className="flex w-full flex-col gap-3">
          <ToolGroup label="3 tool calls">
            <Tool name="list_tables" status="success" summary="orders, customers, +11 more" variant="row" />
            <Tool
              name="explain_query"
              status="success"
              summary="Seq Scan on orders · 1.2M rows"
              variant="row"
              detail={[{ text: 'Seq Scan on orders (cost=0.00..18340.12)' }]}
            />
            <Tool name="create_index" status="running" summary="idx_orders_customer_id" variant="row" />
          </ToolGroup>
          <Steps title="Agent steps" defaultOpen>
            <Step status="done" title="Inspect schema" description="13 tables" />
            <Step status="done" title="Profile query" description="1.4 s p95" />
            <Step status="running" title="Draft migration" />
          </Steps>
          <ApprovalCard
            className="rounded-md"
            title="Drop unused index idx_orders_legacy?"
            description="No scans used it in the last 30 days. This cannot be undone."
            destructive
            confirmLabel="Approve"
            skipLabel="Reject"
            onSkip={() => undefined}
          />
        </div>
      </Message>
    </ChatColumn>
  );
}

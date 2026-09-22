import {
  CodeBlock,
  FeedbackBar,
  Message,
  MessageContent,
  Reasoning,
  Source,
  Sources,
  ThinkingTrace,
} from '@constructive-io/ui/ai';

import { ChatColumn } from './chat-column';

export function ReasoningChatCard() {
  return (
    <ChatColumn title="RLS advisor" model="claude-opus-4">
      <Message from="user">
        <MessageContent>Can customers in one org see another org's orders?</MessageContent>
      </Message>
      <Message from="assistant">
        <div className="flex w-full flex-col gap-3">
          <Reasoning
            isStreaming={false}
            durationMs={6000}
            content="RLS on orders joins through customers.org_id — tracing the policy chain end to end."
          />
          <ThinkingTrace
            mode="coding"
            isStreaming={false}
            durationMs={2800}
            rows={[
              { primary: 'Read', secondary: 'policies/orders_select.sql', mono: true },
              { primary: 'Query', secondary: 'pg_policies', mono: true },
              { primary: 'Check', secondary: 'customers.org_id', mono: true, add: 2 },
            ]}
          />
          <MessageContent markdown>
            {`Every row in \`orders\` resolves through \`customer_id\` → \`customers.org_id\`. Add a tenant-isolation policy so members only read their own org's orders:`}
          </MessageContent>
          <CodeBlock
            className="rounded-md"
            language="SQL"
            filename="orders_rls.sql"
            code={`CREATE POLICY orders_tenant_isolation ON orders\n  USING (customer_id IN (\n    SELECT id FROM customers\n    WHERE org_id = current_org_id()\n  ));`}
          />
          <Sources label="3 sources">
            <Source
              title="Row-level security"
              href="https://constructive.io/docs/security/rls"
              description="Constructive docs"
            />
            <Source title="Writing policies" href="https://constructive.io/docs/security/policies" />
            <Source title="Multi-tenant patterns" href="https://constructive.io/docs/guides/multi-tenant" />
          </Sources>
          <FeedbackBar copyText="orders_tenant_isolation policy" />
        </div>
      </Message>
    </ChatColumn>
  );
}

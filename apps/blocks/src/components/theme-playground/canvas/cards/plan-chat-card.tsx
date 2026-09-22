import {
  Message,
  MessageContent,
  PlanTracker,
  RecommendationCard,
  SystemMessage,
  TaskList,
  TaskRow,
} from '@constructive-io/ui/ai';

import { ChatColumn, ChatPrompt } from './chat-column';

const RLS_PLAN = [
  { label: 'Snapshot customers', status: 'done' },
  { label: 'Draft RLS policies', status: 'done' },
  { label: 'Backfill org_id', status: 'in_progress' },
  { label: 'Enable RLS and verify', status: 'pending' },
  { label: 'Cut over reads', status: 'pending' },
] as const;

export function PlanChatCard() {
  return (
    <ChatColumn
      title="Migration planner"
      model="claude-sonnet-4"
      prompt={
        <ChatPrompt
          placeholder="Adjust the rollout plan…"
          top={<PlanTracker className="rounded-md" plan={{ steps: [...RLS_PLAN] }} />}
        />
      }
    >
      <SystemMessage title="Context" variant="info">
        acme-prod · eu-central-1
      </SystemMessage>
      <Message from="user">
        <MessageContent>Migrate customers to RLS without downtime.</MessageContent>
      </Message>
      <Message from="assistant">
        <div className="flex w-full flex-col gap-3">
          <MessageContent>Here's the rollout plan — tracking each step:</MessageContent>
          <TaskList>
            <TaskRow
              className="rounded-md"
              index={0}
              status="completed"
              label="Snapshot customers"
              meta="84,210 rows"
            />
            <TaskRow className="rounded-md" index={1} status="completed" label="Draft RLS policies" meta="4 policies" />
            <TaskRow
              className="rounded-md"
              index={2}
              status="running"
              label="Backfill org_id"
              meta="62%"
              progress={62}
            />
            <TaskRow className="rounded-md" index={3} status="pending" label="Enable RLS and verify" />
            <TaskRow className="rounded-md" index={4} status="pending" label="Cut over reads" />
          </TaskList>
          <RecommendationCard
            className="rounded-md"
            body={
              <>
                Enable PITR on <code className="rounded bg-muted px-1 font-mono text-[12px]">acme-prod</code> before the
                cutover.
              </>
            }
            confidence={0.9}
            confidenceLabel="High confidence"
            alternatives={[{ id: 'skip', label: 'Skip PITR (faster cutover)', badge: 'Risky' }]}
          />
        </div>
      </Message>
    </ChatColumn>
  );
}

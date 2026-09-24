'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';

import {
  AGENTS_BUILDER_DEMO,
  AgentsBuilder,
  type AgentsBuilderAction,
  type AgentsBuilderTheme,
} from '@/components/ui/agents-builder';

function describeAgentsBuilderAction(action: AgentsBuilderAction) {
  switch (action.type) {
    case 'navigate':
      return `The host would route to ${action.target.replace('-', ' ')}.`;
    case 'open-agent':
      return `The host would open the ${action.agentId} agent.`;
    case 'create-agent':
      return `The host would save the ${action.draft.name} agent draft.`;
    case 'send-follow-up':
      return 'The host would forward the follow-up to the running agent.';
    case 'search':
      return `The host would search the workspace for “${action.query}”.`;
    default:
      return `The host received ${action.type}.`;
  }
}

export function AgentsBuilderPreview() {
  const { theme, setTheme } = useTheme();
  const [message, setMessage] = useState(
    'Start a recommended chat, triage the Inbox, or open Revenue Analyst to watch a run.',
  );

  return (
    <div
      className="flex h-dvh min-h-[640px] w-full flex-col"
      data-slot="application-block-showcase-canvas"
    >
      <AgentsBuilder
        className="min-h-0 flex-1"
        data={AGENTS_BUILDER_DEMO}
        theme={(theme as AgentsBuilderTheme | undefined) ?? 'system'}
        onThemeChange={setTheme}
        onAction={(action) => setMessage(describeAgentsBuilderAction(action))}
        onConnectIntegration={(integration, toolIds) =>
          setMessage(
            `${integration.name} connected with ${toolIds.length} ${toolIds.length === 1 ? 'tool' : 'tools'}.`,
          )
        }
      />
      <p
        aria-live="polite"
        className="shrink-0 truncate border-t border-border bg-background px-3 py-1.5 text-xs text-muted-foreground"
        role="status"
      >
        {message}
      </p>
    </div>
  );
}

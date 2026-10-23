'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import {
  CODING_AGENT_DEMO,
  CodingAgent,
  type CodingAgentAction,
  type CodingAgentLayout,
} from '@/components/ui/coding-agent';
import type { CodingAgentExample } from '@/lib/application-blocks/coding-agent';

/** The docs preview's examples, picked with `?example=`; each opens the same demo data a different way. */
const EXAMPLES: Record<CodingAgentExample, { layout: CodingAgentLayout; sessionId: string; hint: string }> = {
  tabs: {
    layout: 'tabs',
    sessionId: 'session-invites',
    hint: 'Watch the first session run, approve its test command, review the diff, or answer the question waiting in another tab.',
  },
  sidebar: {
    layout: 'sidebar',
    sessionId: 'session-invites',
    hint: 'Sessions sit under their project with their live status; collapse the sidebar to a rail or switch back to tabs from its footer.',
  },
  'sub-agents': {
    layout: 'tabs',
    sessionId: 'session-security',
    hint: 'The lead agent runs three workers in parallel: open one from its card, approve the command one of them asks for, or follow them in the Agents tab.',
  },
};

function describeCodingAgentAction(action: CodingAgentAction) {
  switch (action.type) {
    case 'new-session':
      return `The host would start a session ${action.location === 'worktree' ? 'in a new worktree' : 'in the checkout'}.`;
    case 'send':
      return 'The host would send the message to the agent runtime.';
    case 'stop':
      return 'The host would stop the running agent.';
    case 'stop-run':
      return 'The host would stop that agent and everything it started.';
    case 'pause-run':
    case 'resume-run':
      return `The host would ${action.type === 'pause-run' ? 'pause' : 'resume'} that agent.`;
    case 'steer-run':
      return 'The host would pass the message to that agent mid-run.';
    case 'retry-run':
      return 'The host would run that agent again.';
    case 'permission':
      return action.decision === 'deny'
        ? `The host would tell the agent not to run ${action.command}.`
        : `The host would let the agent run ${action.command}.`;
    case 'open-pull-request':
      return `The host would open pull request #${action.number}.`;
    case 'create-pull-request':
      return `The host would open a pull request for ${action.worktreeId}.`;
    case 'rerun-checks':
      return `The host would re-run ${action.checkIds.length === 1 ? 'the failed check' : `${action.checkIds.length} failed checks`} on ${action.worktreeId}.`;
    case 'answer':
      return 'The host would hand the answer back to the waiting agent.';
    case 'comment':
      return `The host would attach a comment on ${action.path}:${action.line} to the next message.`;
    case 'terminal-command':
      return `The host would run ${action.command} in the session's shell.`;
    case 'open-file':
      return `The host would read ${action.path} from the checkout.`;
    case 'open-url':
      return `The host would load ${action.url} in the browser tab.`;
    case 'layout':
      return `Sessions now show as ${action.layout === 'tabs' ? 'tabs' : 'a sidebar'}.`;
    default:
      return `The host received ${action.type}.`;
  }
}

export function CodingAgentPreview() {
  const requested = useSearchParams().get('example');
  const example = requested && requested in EXAMPLES ? EXAMPLES[requested as CodingAgentExample] : EXAMPLES.tabs;
  const [message, setMessage] = useState(example.hint);

  return (
    <div
      className="flex h-dvh min-h-[640px] w-full flex-col"
      data-slot="application-block-showcase-canvas"
    >
      <CodingAgent
        className="min-h-0 flex-1"
        data={CODING_AGENT_DEMO}
        defaultLayout={example.layout}
        defaultActiveSessionId={example.sessionId}
        onAction={(action) => setMessage(describeCodingAgentAction(action))}
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

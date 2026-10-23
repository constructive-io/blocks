import type { ApplicationBlockDoc } from './types';

export const agentsBuilderBlock: ApplicationBlockDoc = {
  name: 'agents-builder',
  title: 'Agents Builder',
  description:
    'A complete agent workspace template: chat with inline questions and tool traces, an integrations directory with a two-step connect flow, a skills library, and an agent detail view with a live run panel and pannable canvas.',
  previewDescription:
    'Start a recommended chat, answer the agent’s questions, connect a source, triage agent-drafted replies in the Inbox, pause or run schedules, then open Revenue Analyst to watch a run reason, query the warehouse, fan out across sub-agents and skills, and wait for your approval.',
  previewHeight: 820,
  whenToUse: [
    'Use Agents Builder as the starting shell for a product where people chat with agents, connect the apps those agents read from, and inspect what each agent runs.',
    'Install the AI kit primitives on their own when you only need a chat surface or a single agent card inside an existing layout.',
  ],
  usage: {
    description:
      'Pass workspace data and handle side effects through callbacks. The template owns navigation between its views, the connect dialog, and scripted playback; the host owns routing, OAuth, persistence, and model calls.',
    example: `'use client';

import { useRouter } from 'next/navigation';

import {
  AgentsBuilder,
  type AgentsBuilderAction,
  type AgentsBuilderData,
  type Integration
} from '@/components/ui/agents-builder';

type AgentWorkspaceProps = Readonly<{
  data: AgentsBuilderData;
  startOAuth: (integration: Integration) => Promise<void>;
  saveConnection: (
    integrationId: string,
    toolIds: string[]
  ) => Promise<void>;
}>;

export function AgentWorkspace({
  data,
  startOAuth,
  saveConnection
}: AgentWorkspaceProps) {
  const router = useRouter();

  const handleAction = (action: AgentsBuilderAction) => {
    if (action.type === 'navigate') router.push(\`/\${action.target}\`);
    if (action.type === 'open-agent') router.push(\`/agents/\${action.agentId}\`);
  };

  return (
    <div className="h-dvh">
      <AgentsBuilder
        data={data}
        onAuthorizeIntegration={startOAuth}
        onConnectIntegration={(integration, toolIds) =>
          saveConnection(integration.id, toolIds)
        }
        onAction={handleAction}
      />
    </div>
  );
}`,
  },
  state: {
    title: 'Views, connections, and playback',
    description:
      'The active view is uncontrolled by default; pass view and onViewChange to sync it with a router. Connections start from each integration’s connected flag and update only after onConnectIntegration resolves. Chat replies and the agent run play from scripted beats, so map live model and run events onto the same shapes when you connect a runtime.',
  },
  composition: [
    'Built from the AI kit: PromptInput, ChatContainer, ToolTrace, ThinkingStatus, AskCard, ConnectPrompt, AgentDraftCard, and UsageNotice, so each surface can be reused outside the template.',
    'Each view (ChatView, IntegrationsView, SkillsView, AgentView) and the ConnectIntegrationDialog is exported for hosts that want their own shell or router.',
    'Integration marks fall back to tinted monograms; pass real brand marks through each integration’s mark field.',
  ],
  accessibility: [
    'Every icon-only control has a label and a tooltip; the collapsed sidebar keeps labels available through tooltips and aria-label.',
    'The agent canvas is a focusable region: arrow keys pan, plus and minus zoom, and zero resets to 100%.',
    'Clarifying questions use radio semantics with lettered options and a labeled free-text row, and streamed status lines are announced politely.',
    'Scripted playback shortens to near-instant steps when reduced motion is requested.',
  ],
  api: [
    {
      name: 'data',
      type: 'AgentsBuilderData',
      behavior:
        'Workspace name, models, integrations and categories, agents, skills, starter packs, chat recommendations and replies, the agent blueprint, and its run script. AGENTS_BUILDER_DEMO is a complete example.',
    },
    {
      name: 'view / defaultView / onViewChange',
      type: "'chat' | 'integrations' | 'skills' | 'agent'",
      behavior: 'Controls or seeds the active view.',
    },
    {
      name: 'onAuthorizeIntegration',
      type: '(integration) => Promise<void>',
      behavior:
        'Runs the provider consent handoff. Resolve to advance to tool selection; reject to return to sign-in.',
    },
    {
      name: 'onConnectIntegration',
      type: '(integration, toolIds) => void | Promise<void>',
      behavior:
        'Persists a connection with the tools left enabled. Rejecting keeps the dialog open on the tools step.',
    },
    {
      name: 'onAction',
      type: '(action: AgentsBuilderAction) => void',
      behavior:
        'Receives every host-owned control: navigation, search, sharing, skill and agent links, workspace menu items, stop, and follow-ups.',
    },
    {
      name: 'theme / onThemeChange',
      type: "'light' | 'dark' | 'system'",
      behavior: 'Drives the appearance switch in the workspace menu.',
    },
    {
      name: 'defaultSidebarCollapsed / autoplayRun',
      type: 'boolean',
      behavior:
        'Starts with the icon rail, and chooses whether the agent run replays or opens settled.',
    },
  ],
};

import type { ApplicationBlockDoc } from './types';

/** The coding agent preview's examples, shared with the preview route so a renamed one can't silently fall back. */
export type CodingAgentExample = 'tabs' | 'sidebar' | 'sub-agents';

export const codingAgentBlock: ApplicationBlockDoc = {
  name: 'coding-agent',
  title: 'Coding Agent',
  description:
    'A coding agent workspace template: sessions in a tab strip or a project sidebar, each with a chat transcript, a resizable side panel for reviewing diffs by worktree with each branch’s pull request and failing or pending checks, reading files, previewing the app, and following the session’s other agents and shared tasks, and a terminal dock. Sub-agents, orchestrator/worker runs, and messages between agents show in the transcript, and a session flags when any of its agents needs an answer.',
  previewDescription:
    'Pick an example above the preview. In the tabs layout, watch the first session run, approve its test command, comment on a line of the diff, or answer the question waiting in another tab; the sub-agents example opens a lead agent running three workers in parallel.',
  previewHeight: 820,
  examples: ([
    {
      value: 'tabs',
      label: 'Tabs layout',
      description:
        'Sessions as a tab strip across the top, each tab carrying its live status, with the chat, the review panel, and the file tree side by side under it.',
    },
    {
      value: 'sidebar',
      label: 'Sidebar layout',
      description:
        'The same sessions grouped by project in a collapsible sidebar, for products that keep many sessions around rather than a few open at once.',
    },
    {
      value: 'sub-agents',
      label: 'Sub-agents',
      description:
        'A lead agent splits a security pass across three workers in their own worktrees: their cards in the transcript, a worker asking for approval, messages between them, and the Agents and Tasks tabs.',
    },
  ] satisfies readonly { value: CodingAgentExample; label: string; description: string }[]),
  whenToUse: [
    'Use Coding Agent as the starting shell for a product where people run several coding sessions at once, review what each one changed, and approve the commands it wants to run.',
    'Use Agents Builder for agents that work across connected apps instead of a code checkout, or install the AI kit primitives on their own when you only need a chat surface.',
  ],
  usage: {
    description:
      'Pass projects, sessions, models, and commands as one data object and handle side effects through onAction. The template owns tabs, panels, the terminal dock, and scripted playback; the host owns the agent runtime, the checkout, shell commands, and persistence.',
    example: `'use client';

import type { ReactNode } from 'react';

import {
  CodingAgent,
  type CodingAgentAction,
  type CodingAgentData
} from '@/components/ui/coding-agent';

type AgentWorkspaceProps = Readonly<{
  data: CodingAgentData;
  runtime: {
    send: (sessionId: string, text: string, attachments: string[]) => void;
    stop: (sessionId: string) => void;
    decide: (sessionId: string, command: string, allow: boolean) => void;
  };
  renderPreview: (url: string) => ReactNode | null;
}>;

export function AgentWorkspace({
  data,
  runtime,
  renderPreview
}: AgentWorkspaceProps) {
  const handleAction = (action: CodingAgentAction) => {
    if (action.type === 'send') {
      runtime.send(action.sessionId, action.text, action.attachments);
    }
    if (action.type === 'stop') runtime.stop(action.sessionId);
    if (action.type === 'permission') {
      runtime.decide(
        action.sessionId,
        action.command,
        action.decision !== 'deny'
      );
    }
  };

  return (
    <div className="h-dvh">
      <CodingAgent
        data={data}
        renderBrowserPage={renderPreview}
        onAction={handleAction}
      />
    </div>
  );
}`,
  },
  guides: [
    {
      id: 'harness',
      title: 'Driving sessions from your harness',
      description:
        'Scripts are for demos. A real session takes the events your harness reports, either as an events array or a store you push into as they stream. The session’s own agent is the run "root"; every other agent is a run with a parent, and its status, messages, tasks, and approval requests are events too, so one-agent loops, sub-agents, and orchestrator/worker teams all draw from the same log.',
      example: `'use client';

import { useEffect, useMemo } from 'react';

import {
  CodingAgent,
  createHarnessStore,
  type CodingAgentAction,
  type CodingAgentData,
  type HarnessEvent
} from '@/components/ui/coding-agent';

type HarnessClient = {
  /** Calls back with each event your harness reports for a session; returns an unsubscribe. */
  subscribe: (sessionId: string, onEvent: (event: HarnessEvent) => void) => () => void;
  /** Stop, pause, resume, steer, retry, approve, answer, send. */
  control: (action: CodingAgentAction) => void;
};

type HostedWorkspaceProps = Readonly<{
  data: CodingAgentData;
  harness: HarnessClient;
}>;

export function HostedWorkspace({ data, harness }: HostedWorkspaceProps) {
  // One store per session. The template re-renders a session as its events arrive.
  const stores = useMemo(
    () => new Map(data.sessions.map((session) => [session.id, createHarnessStore()])),
    [data.sessions]
  );

  useEffect(() => {
    const unsubscribes = [...stores].map(([sessionId, store]) =>
      harness.subscribe(sessionId, (event) => store.push(event))
    );
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [harness, stores]);

  return (
    <div className="h-dvh">
      <CodingAgent
        data={{
          ...data,
          sessions: data.sessions.map((session) => ({
            ...session,
            store: stores.get(session.id)
          }))
        }}
        // In host mode controls change nothing locally: your harness acts,
        // then reports what happened as events.
        onAction={harness.control}
      />
    </div>
  );
}

// A lead agent starting a worker in its own worktree, which then asks to run a command.
// The session's own agent is always the run "root".
export const exampleEvents: HarnessEvent[] = [
  { id: 'e1', runId: 'root', kind: 'beat', beat: { kind: 'user', text: 'Check every form posts a CSRF token' } },
  {
    id: 'e2',
    runId: 'csrf',
    kind: 'run.spawned',
    run: {
      id: 'csrf',
      name: 'CSRF',
      role: 'worker',
      parentRunId: 'root',
      task: 'Audit the forms under src/app',
      workspace: { kind: 'worktree', branch: 'audit/csrf' }
    }
  },
  { id: 'e3', runId: 'csrf', kind: 'run.status', status: 'running' },
  {
    id: 'e4',
    runId: 'csrf',
    kind: 'request',
    request: { id: 'r1', type: 'approval', title: 'Run the form tests', command: 'pnpm test forms' }
  },
  { id: 'e5', runId: 'csrf', kind: 'run.status', status: 'waiting', waitingOn: { kind: 'human', requestId: 'r1' } },
  { id: 'e6', runId: 'csrf', kind: 'message', from: 'csrf', to: ['root'], text: 'Two forms skip the token.', protocol: 'result' }
];`,
    },
  ],
  state: {
    title: 'Sessions, panels, and playback',
    description:
      'The layout is uncontrolled by default; pass layout and onLayoutChange to persist it. Open tabs, the active session, recently closed sessions, and each session’s side panel and terminal are local state seeded by defaultActiveSessionId, defaultPanelOpen, and defaultTerminalOpen. Every open session stays mounted, so a run in a background tab keeps playing and marks its tab when it needs an answer, fails, or finishes. A session plays a scripted run, or shows a real harness: pass its events as an \`events\` array, or give it a store from \`createHarnessStore()\` and push events as they arrive. Runs (the session’s own agent and any it starts), their status and usage, messages between agents, handoffs, phases, shared tasks, and approval requests are all events, folded by \`reduceHarness\`; controls such as stop, pause, steer and approve reach the host through onAction. Worktrees are events too: agents with their own worktree register it as they start, \`worktree\`, \`pr\` and \`check\` events report how far each branch is from its base, its pull request and its CI, and changes are kept per worktree, so one agent can work in several and two can change the same file in different branches.',
  },
  composition: [
    'Built on the workspace kit shell, so the sidebar layout collapses to the same icon rail and drawer as the other workspace templates.',
    'The transcript and composer come from the AI kit: Message, Reasoning, ToolGroup, InlineDiff, PlanTracker, AskCard, and ApprovalCard in the timeline, and PromptInput with attachments, a follow-up queue, ModelSelector, ContextRing, and UsageNotice around it.',
    'Diffs and file views render with @pierre/diffs and the file tree with @pierre/trees; both follow the nearest dark-mode class so code surfaces match the host theme.',
    'Session status rings, the new-session mascot, and the playback clock are shared with Agents Builder, so installing Coding Agent also installs that template.',
    'The browser tab draws each URL through renderBrowserPage. Return null to show a can’t-preview state; without a renderer it shows a bundled preview of the demo app.',
  ],
  accessibility: [
    'Each session tab’s accessible name includes its live status, such as Working, Waiting for your answer, or New result, and every icon-only control has a label and a tooltip that names its shortcut.',
    'Shortcuts avoid the ones browsers reserve: ⌘K opens the command menu, ⌥⌘N and ⌥⌘W open and close sessions, ⌘P opens a file, ⌘\\ and ⌃` toggle the side panel and terminal, and ⌃1 to ⌃9 jump to a tab. ⌘ is Ctrl outside Apple platforms.',
    'The chat column, side panel, and terminal dock are labeled regions; terminal output is a polite live log, and the terminal input and composer have their own labels.',
    'Line comments on a diff submit with ⌘ or Ctrl+Enter and cancel with Escape, and scripted playback shortens to near-instant steps when reduced motion is requested.',
  ],
  api: [
    {
      name: 'data',
      type: 'CodingAgentData',
      behavior:
        'Product name, projects with their files, sessions and their scripts, the sessions open on first render, models and the default selection, slash commands, the context window, usage, and the scripts played for follow-ups and new sessions. CODING_AGENT_DEMO is a complete example.',
    },
    {
      name: 'layout / defaultLayout / onLayoutChange',
      type: "'tabs' | 'sidebar'",
      behavior:
        'Shows sessions as a tab strip across the top or grouped by project in a sidebar. Switching keeps every session mounted.',
    },
    {
      name: 'defaultActiveSessionId',
      type: 'string',
      behavior: 'The session in front on first render; defaults to the first open one.',
    },
    {
      name: 'defaultPanelOpen / defaultTerminalOpen',
      type: 'boolean',
      behavior: 'Whether sessions open with the side panel (default true) and the terminal dock (default false) showing.',
    },
    {
      name: 'renderBrowserPage',
      type: '(url: string) => ReactNode | null',
      behavior: 'Draws the page for a URL in a browser tab. Return null to show the can’t-preview state.',
    },
    {
      name: 'onAction',
      type: '(action: CodingAgentAction) => void',
      behavior:
        'Receives every host-owned effect: new, closed, renamed, deleted, and exported sessions, sent messages, stop, permission decisions, answers, opened files and URLs, line comments, terminal commands, opening or creating a pull request, re-running failed checks, and layout changes.',
    },
    {
      name: 'framed / className',
      type: 'boolean / string',
      behavior: 'Sits the workspace in a rounded frame for hosts that show it as an app window, and adds layout classes to the outer shell.',
    },
  ],
  buildingBlocks: {
    description:
      'Each of these comes from the AI kit and installs with the template. They work outside it too: pass them data and callbacks in your own chat or agent surface.',
    components: [
      { name: 'PromptInput / PromptInputTray / PromptInputAttachments', type: 'composer', behavior: 'The message box with file and comment chips and the queue of follow-ups typed while the agent works.' },
      { name: 'ModelSelector / ContextRing / UsageNotice', type: 'composer', behavior: 'The model and effort picker, the share of the context window used, and the plan usage warning above the composer.' },
      { name: 'Message / Reasoning / ToolGroup / InlineDiff', type: 'transcript', behavior: 'Replies, collapsible reasoning, batches of read-only tool calls, and edits shown as inline diffs.' },
      { name: 'PlanTracker / AskCard / ApprovalCard', type: 'gates', behavior: 'The agent’s plan, questions that hold the run until answered, and command approvals with allow once, always allow, and deny.' },
      { name: 'Tool / TaskList / TaskRow', type: 'agents', behavior: 'Each sub-agent as a card with its task, live state, last step, and usage, and the shared task board with owners and what each task waits on.' },
      { name: 'ThinkingStatus / SystemMessage / FeedbackBar', type: 'status', behavior: 'The live line naming the next step, a failed run with its retry, and copy controls under the last reply.' },
    ],
  },
};

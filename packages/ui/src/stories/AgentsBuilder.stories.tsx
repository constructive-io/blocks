import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import {
	AGENTS_BUILDER_DEMO,
	AgentsBuilder,
	type AgentsBuilderAction,
	type AgentsBuilderData,
	type AgentsBuilderProps,
	type AgentsBuilderView,
} from '../components/agents-builder';

const meta: Meta<typeof AgentsBuilder> = {
	title: 'Templates/AgentsBuilder',
	component: AgentsBuilder,
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component:
					'A complete agent workspace: chat with scripted replies, an integrations directory with a connect flow, a skills library, and an agent detail view with a live run panel and canvas. Every agent in the sidebar opens its own run as it stands: running, waiting on your approval or answer, failed with a retry, queued with "Run now", or finished. Runs keep going while you look elsewhere, and a result that lands off screen marks its agent unread.',
			},
		},
	},
	args: {
		data: AGENTS_BUILDER_DEMO,
	},
	argTypes: {
		data: { control: false },
		defaultView: { control: 'inline-radio', options: ['chat', 'inbox', 'schedules', 'integrations', 'skills', 'agent'] },
		statusIndicator: { control: 'inline-radio', options: ['rail', 'rings'] },
	},
};

export default meta;
type Story = StoryObj<typeof AgentsBuilder>;

function Frame(props: AgentsBuilderProps) {
	const [log, setLog] = useState<AgentsBuilderAction[]>([]);
	return (
		<div className="flex h-dvh min-h-[640px] flex-col gap-2 p-4">
			{/* A framed shell draws its own edge, so the story drops its frame around it. */}
			<div className={props.framed ? 'min-h-0 flex-1 overflow-hidden' : 'min-h-0 flex-1 overflow-hidden rounded-xl border border-border shadow-sm'}>
				<AgentsBuilder {...props} onAction={(action) => setLog((current) => [action, ...current].slice(0, 4))} />
			</div>
			<p className="truncate font-mono text-xs text-muted-foreground" aria-live="polite">
				{log.length ? `onAction → ${log.map((action) => JSON.stringify(action)).join('  ·  ')}` : 'onAction → (click a host-owned control)'}
			</p>
		</div>
	);
}

export const Chat: Story = {
	args: { defaultView: 'chat' },
	render: (args) => <Frame {...args} />,
};

export const Inbox: Story = {
	args: { defaultView: 'inbox' },
	render: (args) => <Frame {...args} />,
};

export const Schedules: Story = {
	args: { defaultView: 'schedules' },
	render: (args) => <Frame {...args} />,
};

export const Sources: Story = {
	args: { defaultView: 'integrations' },
	render: (args) => <Frame {...args} />,
};

export const Framed: Story = {
	name: 'Framed shell',
	args: { defaultView: 'integrations', framed: true },
	render: (args) => <Frame {...args} />,
};

export const Skills: Story = {
	args: { defaultView: 'skills' },
	render: (args) => <Frame {...args} />,
};

/** The demo opens Revenue Analyst at its pending approval; here it starts mid-run so the whole replay plays. */
const RUNNING_DEMO: AgentsBuilderData = {
	...AGENTS_BUILDER_DEMO,
	agents: AGENTS_BUILDER_DEMO.agents.map((agent) =>
		agent.id === AGENTS_BUILDER_DEMO.agent.id ? { ...agent, status: 'running', statusNote: undefined } : agent,
	),
};

export const AgentRun: Story = {
	name: 'Agent (live run)',
	args: { defaultView: 'agent', data: RUNNING_DEMO },
	render: (args) => <Frame {...args} />,
};

/** The same run with progress rings: each agent's ring before its name, and the header's ring filling as plan steps finish. */
export const AgentRunRings: Story = {
	name: 'Agent (live run, rings)',
	args: { defaultView: 'agent', data: RUNNING_DEMO, statusIndicator: 'rings' },
	render: (args) => <Frame {...args} />,
};

/** Approval, input, and failed agents past the six-row limit take the place of calm rows above them. */
export const RosterOverflow: Story = {
	name: 'Roster overflow',
	args: {
		defaultView: 'chat',
		data: {
			...AGENTS_BUILDER_DEMO,
			// The flat roster: without projects, agents past the limit that need you take the place of calm rows.
			projects: undefined,
			agents: AGENTS_BUILDER_DEMO.agents.map((agent) => {
				if (agent.id === 'access-auditor') return { ...agent, status: 'approval', statusNote: 'Revoke 4 dormant admin keys in Snowflake?' };
				if (agent.id === 'anomaly-watch') return { ...agent, status: 'failed', statusNote: 'Lost the Stripe webhook at 08:12.' };
				return agent;
			}),
		},
	},
	render: (args) => <Frame {...args} />,
};

export const AgentSettled: Story = {
	name: 'Agent (settled)',
	args: { defaultView: 'agent', autoplayRun: false },
	render: (args) => <Frame {...args} />,
};

export const CollapsedSidebar: Story = {
	args: { defaultView: 'chat', defaultSidebarCollapsed: true },
	render: (args) => <Frame {...args} />,
};

export const CollapsedSidebarRings: Story = {
	name: 'Collapsed sidebar (rings)',
	args: { defaultView: 'chat', defaultSidebarCollapsed: true, statusIndicator: 'rings' },
	render: (args) => <Frame {...args} />,
};

export const ControlledView: Story = {
	render: function ControlledViewStory(args) {
		const [view, setView] = useState<AgentsBuilderView>('integrations');
		return (
			<div className="flex flex-col gap-2">
				<p className="text-sm text-muted-foreground">
					Current view: <code className="font-mono text-foreground">{view}</code>
				</p>
				<Frame {...args} view={view} onViewChange={setView} />
			</div>
		);
	},
};

export const FailingConnect: Story = {
	name: 'Connect failure keeps the dialog open',
	args: {
		defaultView: 'integrations',
		onConnectIntegration: () => new Promise<void>((_, reject) => window.setTimeout(() => reject(new Error('denied')), 600)),
	},
	render: (args) => <Frame {...args} />,
};

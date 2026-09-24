import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import {
	AGENTS_BUILDER_DEMO,
	AgentsBuilder,
	type AgentsBuilderAction,
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
					'A complete agent workspace: chat with scripted replies, an integrations directory with a connect flow, a skills library, and an agent detail view with a live run panel and canvas.',
			},
		},
	},
	args: {
		data: AGENTS_BUILDER_DEMO,
	},
	argTypes: {
		data: { control: false },
		defaultView: { control: 'inline-radio', options: ['chat', 'inbox', 'schedules', 'integrations', 'skills', 'agent'] },
	},
};

export default meta;
type Story = StoryObj<typeof AgentsBuilder>;

function Frame(props: AgentsBuilderProps) {
	const [log, setLog] = useState<AgentsBuilderAction[]>([]);
	return (
		<div className="flex h-[calc(100vh-2rem)] min-h-[640px] flex-col gap-2">
			<div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border shadow-sm">
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

export const Skills: Story = {
	args: { defaultView: 'skills' },
	render: (args) => <Frame {...args} />,
};

export const AgentRun: Story = {
	name: 'Agent (live run)',
	args: { defaultView: 'agent' },
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

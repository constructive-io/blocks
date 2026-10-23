import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { CODING_AGENT_DEMO, CodingAgent, type CodingAgentAction, type CodingAgentProps } from '../components/coding-agent';

const meta: Meta<typeof CodingAgent> = {
	title: 'Templates/CodingAgent',
	component: CodingAgent,
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component:
					'A coding agent workspace. Sessions sit in a tab strip or a project sidebar; each has a chat column built from the AI kit, a resizable side panel with a review of every changed file, file tabs, a file tree and a browser preview, and a terminal dock. Open sessions keep running in the background: the demo has one working live, one finishing off screen, one waiting on your answer and one that failed.'
			}
		}
	},
	args: {
		data: CODING_AGENT_DEMO
	},
	argTypes: {
		data: { control: false },
		layout: { control: 'inline-radio', options: ['tabs', 'sidebar'] },
		renderBrowserPage: { control: false }
	}
};

export default meta;
type Story = StoryObj<typeof CodingAgent>;

function Frame(props: CodingAgentProps) {
	const [log, setLog] = useState<CodingAgentAction[]>([]);
	return (
		<div className="flex h-dvh min-h-[680px] flex-col gap-2 p-4">
			<div className={props.framed ? 'min-h-0 flex-1 overflow-hidden' : 'min-h-0 flex-1 overflow-hidden rounded-xl border border-border shadow-sm'}>
				<CodingAgent {...props} onAction={(action) => setLog((current) => [action, ...current].slice(0, 3))} />
			</div>
			<p className="truncate font-mono text-xs text-muted-foreground" aria-live="polite">
				{log.length ? `onAction → ${log.map((action) => JSON.stringify(action)).join('  ·  ')}` : 'onAction → (send a message, open a file, run a command)'}
			</p>
		</div>
	);
}

/** Tabs across the top. The first session plays live: it reads, edits, asks to run the tests, and opens the app. */
export const Tabs: Story = {
	render: (args) => <Frame {...args} />
};

/** The same sessions in a sidebar grouped by project. Switching layouts keeps every run where it was. */
export const Sidebar: Story = {
	args: { defaultLayout: 'sidebar' },
	render: (args) => <Frame {...args} />
};

/** The terminal dock open under the session; type `help`, `git status` or `ls src`. */
export const WithTerminal: Story = {
	name: 'With terminal',
	args: { defaultTerminalOpen: true },
	render: (args) => <Frame {...args} />
};

/** A session waiting on your answer, with the side panel closed. */
export const WaitingOnYou: Story = {
	name: 'Waiting on you',
	args: { defaultActiveSessionId: 'session-temporal', defaultPanelOpen: false },
	render: (args) => <Frame {...args} />
};

/** With no sessions open, the workspace starts on a fresh one: pick a project and where to run, then send. */
export const NewSession: Story = {
	name: 'New session',
	args: { data: { ...CODING_AGENT_DEMO, openSessionIds: [] } },
	render: (args) => <Frame {...args} />
};

export const Framed: Story = {
	name: 'Framed shell',
	args: { framed: true },
	render: (args) => <Frame {...args} />
};

/**
 * Agents working together: a lead starts a scout, then three workers in their own worktrees that message each other
 * and share a task board; one needs your approval, one fails a test and recovers, and a reviewer checks the lot.
 * Open a worker from its card, the Agents tab, or the "working" menu in the header.
 */
export const MultiAgent: Story = {
	name: 'Multi-agent',
	args: { defaultActiveSessionId: 'session-security' },
	render: (args) => <Frame {...args} />
};

/** The same multi-agent session in the sidebar layout, where each session's agents are indented under it. */
export const MultiAgentSidebar: Story = {
	name: 'Multi-agent (sidebar)',
	args: { defaultActiveSessionId: 'session-security', defaultLayout: 'sidebar' },
	render: (args) => <Frame {...args} />
};

/**
 * A stress test: a thread of 120 turns (about 700 transcript rows, each turn with reasoning, reads, an edit, a
 * test run and a reply) opened in front of the other sessions. Scroll it, and sweep the turn rail on its left edge.
 */
export const LongThread: Story = {
	name: 'Long thread (stress test)',
	args: {
		data: { ...CODING_AGENT_DEMO, openSessionIds: ['session-long', ...CODING_AGENT_DEMO.openSessionIds] },
		defaultActiveSessionId: 'session-long'
	},
	render: (args) => <Frame {...args} />
};

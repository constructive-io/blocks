import type { Meta, StoryObj } from '@storybook/react-vite';

import { AGENTS_BUILDER_DEMO, AgentsBuilder, type AgentsBuilderData, type AgentsBuilderView } from '../../components/agents-builder';
import { pickDataset } from './dataset';
import { emptyAgentsBuilder, hugeAgentsBuilder, oneAgentsBuilder, worstAgentsBuilder } from './agents-worst-case';

const meta: Meta = {
	title: 'Break UI/Agents Builder',
	parameters: {
		layout: 'fullscreen',
		breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] },
	},
};
export default meta;

function Frame({ data, view, autoplay = false, collapsed = false }: { data: AgentsBuilderData; view: AgentsBuilderView; autoplay?: boolean; collapsed?: boolean }) {
	return (
		<div className="h-dvh min-h-[640px] p-2">
			<div className="h-full overflow-hidden rounded-xl border border-border shadow-sm">
				<AgentsBuilder data={data} defaultView={view} autoplayRun={autoplay} defaultSidebarCollapsed={collapsed} />
			</div>
		</div>
	);
}

const story =
	(view: AgentsBuilderView, options: { autoplay?: boolean; collapsed?: boolean } = {}): StoryObj =>
	({
		render: (_args, context) => {
			const data = pickDataset(context, { demo: AGENTS_BUILDER_DEMO, worst: worstAgentsBuilder, empty: emptyAgentsBuilder, one: oneAgentsBuilder, huge: hugeAgentsBuilder });
			return <Frame data={data} view={view} {...options} />;
		},
	});

export const Chat: StoryObj = story('chat');
export const Inbox: StoryObj = story('inbox');
export const Schedules: StoryObj = story('schedules');
export const Integrations: StoryObj = story('integrations');
export const Skills: StoryObj = story('skills');
export const AgentSettled: StoryObj = story('agent');
export const CollapsedRail: StoryObj = story('chat', { collapsed: true });

/** A realistic long model name (46 characters) as the composer's default, to check the send button stays reachable on a phone. */
const REALISTIC_MODEL = 'Claude Opus 5.5 (1M context, extended thinking)';
const modelData: AgentsBuilderData = {
	...AGENTS_BUILDER_DEMO,
	models: [...AGENTS_BUILDER_DEMO.models, { id: 'long-realistic', name: REALISTIC_MODEL, provider: 'Anthropic', integrationId: 'claude', pricing: { input: 5, output: 25 }, contextWindow: 1_000_000 }],
	modelSections: { pinnedIds: ['auto'], recentIds: ['long-realistic'], recommendedIds: ['sonnet-5'] },
};
export const ChatRealisticModelName: StoryObj = { render: () => <Frame data={modelData} view="chat" /> };

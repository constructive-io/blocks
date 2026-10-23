import type { Meta, StoryObj } from '@storybook/react-vite';

import { CODING_AGENT_DEMO, CodingAgent, type CodingAgentData, type CodingAgentLayout } from '../../components/coding-agent';
import { emptyCodingAgent, hugeCodingAgent, oneCodingAgent, worstCodingAgent } from './coding-worst-case';
import { pickDataset } from './dataset';

const meta: Meta = {
	title: 'Break UI/Coding Agent',
	parameters: {
		layout: 'fullscreen',
		breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] }
	}
};
export default meta;

function Frame({ data, layout, terminal }: { data: CodingAgentData; layout: CodingAgentLayout; terminal?: boolean }) {
	return (
		<div className="h-dvh min-h-[640px] p-2">
			{/* Keyed on the dataset so switching fixtures starts a fresh workspace. */}
			<div className="h-full overflow-hidden rounded-xl border border-border shadow-sm">
				<CodingAgent key={data.brand + data.sessions.length} data={data} defaultLayout={layout} defaultTerminalOpen={terminal} />
			</div>
		</div>
	);
}

const story =
	(layout: CodingAgentLayout, options: { terminal?: boolean } = {}): StoryObj =>
	({
		render: (_args, context) => {
			const data = pickDataset(context, { demo: CODING_AGENT_DEMO, worst: worstCodingAgent, empty: emptyCodingAgent, one: oneCodingAgent, huge: hugeCodingAgent });
			return <Frame data={data} layout={layout} {...options} />;
		}
	});

export const Tabs: StoryObj = story('tabs');
export const Sidebar: StoryObj = story('sidebar');
export const WithTerminal: StoryObj = story('tabs', { terminal: true });

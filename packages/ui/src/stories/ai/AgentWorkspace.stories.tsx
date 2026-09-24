import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';

import {
	AgentDraftCard,
	type AiModel,
	type ModelSelection,
	ModelSelector,
	type AskAnswer,
	AskCard,
	ConnectPrompt,
	type ConnectPromptStatus,
	ThinkingStatus,
	PromptInput,
	PromptInputAttachment,
	PromptInputAttachments,
	PromptInputTextarea,
	PromptInputTray,
	ToolTrace,
	type ToolTraceStep,
	UsageNotice,
	usageTone,
} from '../../components/ai';

const meta: Meta = {
	title: 'AI/Agent workspace',
	parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

function Mark({ letter, color }: { letter: string; color: string }) {
	return (
		<span className="text-[10px] font-semibold leading-none" style={{ color }}>
			{letter}
		</span>
	);
}

const STEPS: ToolTraceStep[] = [
	{ id: 'zendesk', label: 'Zendesk Search', icon: <Mark letter="Z" color="#2F8F83" /> },
	{ id: 'slack', label: 'Slack History #support', icon: <Mark letter="S" color="#B0489E" /> },
	{ id: 'notion', label: 'Notion Create Support / Weekly', icon: <Mark letter="N" color="currentColor" /> },
];

export const ToolTraceProgress: Story = {
	name: 'Tool trace',
	render: function ToolTraceStory() {
		const [done, setDone] = useState(0);
		useEffect(() => {
			const id = window.setInterval(() => setDone((value) => (value >= STEPS.length + 2 ? 0 : value + 1)), 900);
			return () => window.clearInterval(id);
		}, []);
		return (
			<div className="flex max-w-md flex-col gap-6">
				<ToolTrace
					steps={STEPS.map((step, index) => ({
						...step,
						status: index < done ? 'done' : index === done ? 'running' : 'pending',
					}))}
				/>
				<ThinkingStatus elapsedSeconds={60} tokens={2500} tokensPerTick={40} />
				<ThinkingStatus label="Searching" live={false} elapsedSeconds={7} />
			</div>
		);
	},
};

export const Ask: Story = {
	name: 'Ask card',
	render: function AskStory() {
		const [answer, setAnswer] = useState<AskAnswer | undefined>();
		const questions = [
			{
				id: 'destination',
				question: 'Where should the digest go? Notion is not in this one - I can add it for the filing.',
				options: [
					{ id: 'slack', label: 'Post it to #support-leads' },
					{ id: 'here', label: 'Keep it here' },
					{ id: 'notion', label: 'Add Notion and file it under Support / Weekly' },
				],
			},
		];
		return (
			<div className="flex max-w-2xl flex-col gap-3">
				<AskCard
					questions={questions}
					answer={answer}
					onSubmit={(choices) => setAnswer({ choices })}
					onSkip={() => setAnswer({ skipped: true })}
				/>
				{answer ? (
					<button type="button" className="self-start text-xs text-link underline" onClick={() => setAnswer(undefined)}>
						Reset
					</button>
				) : null}
			</div>
		);
	},
};

export const AskMultiple: Story = {
	name: 'Ask card (two questions)',
	render: () => (
		<div className="max-w-2xl">
			<AskCard
				questions={[
					{
						id: 'back',
						question: 'How do you want them back?',
						options: [
							{ id: 'comments', label: 'Comment on the frames' },
							{ id: 'subtasks', label: 'Subtasks in ClickUp' },
							{ id: 'both', label: 'Both' },
						],
					},
					{
						id: 'task',
						question: 'And the task itself?',
						allowOther: false,
						options: [
							{ id: 'review', label: 'Move it to In review' },
							{ id: 'leave', label: 'Leave it In progress' },
						],
					},
				]}
				onSubmit={() => {}}
				onSkip={() => {}}
			/>
		</div>
	),
};

export const Connect: Story = {
	name: 'Connect prompt',
	render: function ConnectStory() {
		const [status, setStatus] = useState<ConnectPromptStatus>('idle');
		return (
			<div className="flex max-w-2xl flex-col gap-3">
				<ConnectPrompt
					icon={<Mark letter="I" color="#286EFA" />}
					name="Intercom"
					description="Read conversations and reply"
					status={status}
					skipLabel="Zendesk only for now"
					onSkip={() => setStatus('skipped')}
					onConnect={() => {
						setStatus('connecting');
						window.setTimeout(() => setStatus('connected'), 800);
					}}
				/>
				<button type="button" className="self-start text-xs text-link underline" onClick={() => setStatus('idle')}>
					Reset
				</button>
			</div>
		);
	},
};

export const AgentDraft: Story = {
	name: 'Agent draft card',
	render: function DraftStory() {
		const [chosen, setChosen] = useState<string | undefined>();
		return (
			<div className="max-w-2xl">
				<AgentDraftCard
					name="monday_numbers"
					schedule="Mondays at 9:00"
					tools={[
						{ id: 'metabase', label: 'Metabase', icon: <Mark letter="M" color="#509EE3" /> },
						{ id: 'slack', label: 'Slack', icon: <Mark letter="S" color="#B0489E" /> },
						{ id: 'notion', label: 'Notion', icon: <Mark letter="N" color="currentColor" /> },
					]}
					steps={[
						'Run the weekly-metrics question in Metabase',
						'Post the deltas to #metrics',
						'File the post under Reports / Weekly in Notion',
					]}
					actions={[
						{ id: 'create', label: 'Create agent', chosenLabel: 'Agent created' },
						{ id: 'later', label: 'Not now' },
					]}
					chosenActionId={chosen}
					onAction={setChosen}
				/>
			</div>
		);
	},
};

export const Usage: Story = {
	name: 'Usage notice in a prompt tray',
	render: function UsageStory() {
		const [open, setOpen] = useState(true);
		return (
			<div className="flex max-w-2xl flex-col gap-4">
				{[62, 80, 96].map((percent) => (
					<PromptInputTray
						key={percent}
						tone={usageTone(percent)}
						header={open ? <UsageNotice percent={percent} onAction={() => {}} onDismiss={() => setOpen(false)} /> : null}
					>
						<PromptInput className="bg-card">
							<PromptInputTextarea placeholder="Add a follow-up" />
						</PromptInput>
					</PromptInputTray>
				))}
			</div>
		);
	},
};

export const Attachments: Story = {
	name: 'Prompt attachments',
	render: () => (
		<div className="max-w-2xl">
			<PromptInput className="bg-card">
				<PromptInputAttachments>
					<PromptInputAttachment name="Q3 discovery brief.pdf" meta="PDF · 2.4 MB" onRemove={() => {}} />
					<PromptInputAttachment name="tickets-week-38.csv" meta="Uploading 64%" status="uploading" onRemove={() => {}} />
					<PromptInputAttachment name="board-deck-final.key" meta="Too large (max 25 MB)" status="error" onRemove={() => {}} />
				</PromptInputAttachments>
				<PromptInputTextarea placeholder="Describe what to do with these files…" />
			</PromptInput>
		</div>
	),
};

const MODEL_LEVELS = [
	{ id: 'low', label: 'Low', description: 'Fastest replies; light reasoning.' },
	{ id: 'medium', label: 'Medium', description: 'Balanced reasoning for most tasks.' },
	{ id: 'high', label: 'High', description: 'Deliberate reasoning for hard problems.' },
];

const MODELS: AiModel[] = [
	{ id: 'auto', name: 'Auto', provider: 'Router', description: 'Routes each message to the best-value model.' },
	{ id: 'claude-5', name: 'Claude 5', provider: 'Anthropic', icon: <Mark letter="A" color="#D97757" />, levels: MODEL_LEVELS, defaultLevel: 'medium', pricing: { input: 5, output: 25, cachedInput: 0.5 }, contextWindow: 200_000, tags: ['new'] },
	{ id: 'sonnet-5', name: 'Sonnet 5', provider: 'Anthropic', icon: <Mark letter="A" color="#D97757" />, levels: MODEL_LEVELS, defaultLevel: 'medium', pricing: { input: 3, output: 15 }, contextWindow: 1_000_000 },
	{ id: 'gpt-5', name: 'GPT-5', provider: 'OpenAI', icon: <Mark letter="O" color="#10A37F" />, levels: MODEL_LEVELS, defaultLevel: 'medium', pricing: { input: 1.25, output: 10 }, contextWindow: 400_000 },
	{ id: 'scout', name: 'Llama 4 Scout', provider: 'Meta', icon: <Mark letter="M" color="#0866FF" />, pricing: { input: 0, output: 0 }, tags: ['free'] },
	{ id: 'legacy', name: 'GPT-4.1', provider: 'OpenAI', icon: <Mark letter="O" color="#10A37F" />, pricing: { input: 2, output: 8 }, disabled: true, disabledReason: 'Retired here' },
];

export const ModelPicker: Story = {
	name: 'Model selector',
	render: function ModelPickerStory() {
		const [value, setValue] = useState<ModelSelection>({ modelId: 'claude-5', levelId: 'medium' });
		return (
			<div className="flex max-w-2xl flex-col gap-3">
				<PromptInput className="bg-card">
					<PromptInputTextarea placeholder="Ask the agent…" />
					<div className="flex items-center px-1">
						<ModelSelector
							models={MODELS}
							value={value}
							onValueChange={setValue}
							side="bottom"
							pinnedIds={['auto']}
							recentIds={['claude-5']}
							recommendedIds={['sonnet-5', 'scout']}
						/>
					</div>
				</PromptInput>
				<code className="font-mono text-xs text-muted-foreground">{JSON.stringify(value)}</code>
			</div>
		);
	},
};

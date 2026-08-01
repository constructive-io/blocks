import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowUp, Paperclip, Square } from 'lucide-react';
import { useState } from 'react';

import {
	AgentLoader,
	ApprovalCard,
	ChatContainer,
	ChatContainerContent,
	CodeBlock,
	ContextCard,
	ContextCards,
	ContextRing,
	DiffTable,
	FeedbackBar,
	FileUpload,
	InlineDiff,
	Markdown,
	Message,
	MessageContent,
	PlanTracker,
	PromptInput,
	PromptInputAction,
	PromptInputActions,
	PromptInputBody,
	PromptInputTextarea,
	PromptSuggestion,
	PromptSuggestions,
	Reasoning,
	RecommendationCard,
	ResponseStream,
	ScrollButton,
	Source,
	Sources,
	Steps,
	Step,
	StreamingText,
	SystemMessage,
	TaskList,
	TaskRow,
	TextShimmer,
	ThinkingTrace,
	Tool,
	ToolGroup,
} from '../../components/ai';
import { Button } from '../../components/button';

const meta: Meta = {
	title: 'AI/Overview',
	parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Loaders: Story = {
	render: () => (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center gap-6">
				<AgentLoader variant="drive" label="Churning" />
				<AgentLoader variant="dots" label="Planning" />
				<AgentLoader variant="orbit" label="Searching" showElapsed={false} />
			</div>
			<div className="flex flex-wrap items-center gap-6">
				<AgentLoader variant="circular" />
				<AgentLoader variant="bounce-dots" />
				<AgentLoader variant="typing" />
				<AgentLoader variant="wave" />
				<AgentLoader variant="text-shimmer" label="Thinking" />
				<TextShimmer>Streaming status</TextShimmer>
				<ContextRing usage={{ tokens: 48_000, percent: 42, contextWindow: 128_000 }} />
				<ContextRing usage={{ tokens: 110_000, percent: 88, contextWindow: 128_000 }} />
			</div>
		</div>
	),
};

export const ComposerWithPlan: Story = {
	render: function ComposerStory() {
		const [value, setValue] = useState('');
		const [loading, setLoading] = useState(false);
		return (
			<div className="mx-auto w-full max-w-xl">
				<PlanTracker
					streaming={loading}
					plan={{
						steps: [
							{ label: 'Read flavor briefs', status: 'done' },
							{ label: 'Compare seasonal demand', status: 'in_progress' },
							{ label: 'Draft reorder plan', status: 'pending' },
						],
					}}
				/>
				<PromptInput
					value={value}
					onValueChange={setValue}
					isLoading={loading}
					className="rounded-t-none"
					onSubmit={() => {
						if (!value.trim()) return;
						setLoading(true);
						window.setTimeout(() => {
							setLoading(false);
							setValue('');
						}, 1200);
					}}
				>
					<PromptInputBody>
						<PromptInputTextarea placeholder="Ask the agent…" />
						<PromptInputActions className="justify-between">
							<div className="flex items-center gap-1">
								<PromptInputAction tooltip="Attach">
									<Button type="button" size="icon-sm" variant="ghost" aria-label="Attach">
										<Paperclip className="size-4" />
									</Button>
								</PromptInputAction>
								<ContextRing
									usage={{ tokens: 62_000, percent: 55, contextWindow: 128_000 }}
									size={22}
								/>
							</div>
							{loading ? (
								<Button
									type="button"
									size="icon-sm"
									variant="secondary"
									aria-label="Stop"
									onClick={() => setLoading(false)}
								>
									<Square className="size-3.5 fill-current" />
								</Button>
							) : (
								<Button
									type="button"
									size="icon-sm"
									aria-label="Send"
									disabled={!value.trim()}
									onClick={() => {
										if (!value.trim()) return;
										setLoading(true);
										window.setTimeout(() => {
											setLoading(false);
											setValue('');
										}, 1200);
									}}
								>
									<ArrowUp className="size-4" />
								</Button>
							)}
						</PromptInputActions>
					</PromptInputBody>
				</PromptInput>
			</div>
		);
	},
};

export const ReasoningAndTools: Story = {
	render: () => (
		<div className="mx-auto flex max-w-xl flex-col gap-4">
			<Reasoning isStreaming={false} durationMs={4200} content="Weekend demand carries pistachio, so it churns first." />
			<ThinkingTrace
				mode="coding"
				isStreaming={false}
				durationMs={2800}
				rows={[
					{ primary: 'Read', secondary: 'flavors.ts', mono: true },
					{ primary: 'Edit', secondary: 'ChurnSchedule.tsx', mono: true, add: 74, del: 41 },
					{ primary: 'Run', secondary: 'npm run freeze', mono: true },
				]}
			/>
			<ToolGroup label="4 tool calls, 2 messages">
				<Tool name="Thinking" status="success" summary="Planning the churn schedule…" variant="row" detail={[
					{ text: 'Weekend demand carries pistachio.' },
					{ text: 'Two evening freezer windows remain.' },
				]} />
				<Tool
					name="Write"
					status="success"
					summary="ChurnSchedule.tsx"
					variant="row"
					detail={[
						{ text: '+ const windows = slots.filter((s) => s.temp <= -12)', tone: 'add' },
					]}
					diff={{ file: 'ChurnSchedule.tsx', add: 74, del: 41 }}
				/>
				<Tool name="bash" status="running" summary="npm run freeze" variant="row" />
			</ToolGroup>
			<Tool
				name="edit"
				status="output-available"
				summary="menu.ts"
				variant="card"
				input={{ path: 'menu.ts' }}
				output={{ ok: true }}
			/>
			<InlineDiff
				source={{
					fileName: 'menu.ts',
					before: 'const hero = "vanilla"\n',
					after: 'const hero = "pistachio"\nconst backup = "mint"\n',
				}}
			/>
		</div>
	),
};

export const HitlAndRecommendations: Story = {
	render: () => (
		<div className="mx-auto flex max-w-xl flex-col gap-4">
			<ApprovalCard
				title="Delete table customers?"
				description="This cannot be undone. Related policies will be detached."
				destructive
				confirmLabel="Delete"
				skipLabel="Skip"
			/>
			<ApprovalCard
				questions={[
					{
						id: 'count',
						prompt: 'How many flavors should we launch?',
						type: 'single',
						options: [
							{ id: '3', label: 'Three (core line)' },
							{ id: '5', label: 'Five (full case)' },
							{ id: '1', label: 'Just one hero' },
						],
					},
					{
						id: 'market',
						prompt: 'Which market do we enter first?',
						type: 'single',
						options: [
							{ id: 'trucks', label: 'Food trucks' },
							{ id: 'grocery', label: 'Grocery freezers' },
						],
					},
				]}
			/>
			<RecommendationCard
				body={
					<>
						Reorder waffle cones from <code className="rounded bg-muted px-1 font-mono text-[12px]">cone_king</code> with lead time{' '}
						<code className="rounded bg-muted px-1 font-mono text-[12px]">7_days</code>.
					</>
				}
				confidence={0.86}
				confidenceLabel="High confidence"
				alternatives={[
					{ id: 'a', label: 'Switch to vanilla_madagascar', badge: 'Needs review' },
					{ id: 'b', label: 'Full restock across every SKU', badge: 'No signal' },
				]}
			/>
		</div>
	),
};

export const TasksAndContext: Story = {
	render: () => (
		<div className="mx-auto flex max-w-xl flex-col gap-6">
			<TaskList>
				<TaskRow
					index={0}
					status="completed"
					label="Verified vendor records"
					meta="12 suppliers"
					details={[
						{ label: 'Matched tax and contact IDs', meta: '12/12' },
						{ label: 'Flagged stale records', meta: '0' },
					]}
				/>
				<TaskRow index={1} status="running" label="Build reorder task list" meta="7 SKUs" progress={66} />
				<TaskRow index={2} status="failed" label="Draft supplier emails" meta="2 messages" onRetry={() => undefined} />
			</TaskList>
			<ContextCards count={2}>
				<ContextCard
					index={0}
					title="Vendor onboarding rule"
					meta="290 characters"
					body="Cold-chain certification must be verified before a new dairy can be added to the reorder workflow."
					sourceType="PDF"
					sourceName="Dairy Onboarding SOP.pdf"
				/>
				<ContextCard
					index={1}
					title="Seasonal demand row"
					meta="1,250 characters"
					body="Q4 velocity table: pistachio +18%, vanilla +6%, rocky road -11%."
					sourceType="CSV"
					sourceName="Sales Velocity Export.csv"
				/>
			</ContextCards>
			<Steps title="Agent steps" defaultOpen>
				<Step status="done" title="Read POS export" description="3 files" />
				<Step status="running" title="Score stockout risk" description="68%" />
				<Step status="pending" title="Draft supplier emails" />
			</Steps>
		</div>
	),
};

export const StreamingAndSources: Story = {
	render: () => (
		<div className="mx-auto max-w-xl space-y-6">
			<StreamingText
				text="Mint chip is up 12% with stronger weekend peaks. Cone inventory should be checked before a waffle-bowl special."
				sources={[
					{ id: '1', title: 'Scoop Data', href: 'https://example.com', description: 'Sales index' },
					{ id: '2', title: 'Trends Index', href: 'https://example.com' },
				]}
				followUps={['Which flavors sell best in winter', 'Compare gelato and soft serve margins']}
			/>
			<Sources label="10 sources">
				<Source title="Scoop Data" href="https://example.com" description="Market data" />
				<Source title="Trends Index" href="https://example.com" />
			</Sources>
			<PromptSuggestions>
				<PromptSuggestion>Forecast summer demand</PromptSuggestion>
				<PromptSuggestion>Find waffle cone suppliers</PromptSuggestion>
			</PromptSuggestions>
			<FileUpload multiple />
		</div>
	),
};

export const FullTranscript: Story = {
	render: () => (
		<div className="relative mx-auto h-[520px] w-full max-w-xl rounded-xl border border-border">
			<ChatContainer className="h-full">
				<ChatContainerContent>
					<Message from="user">
						<MessageContent>Compare mint chip to last summer.</MessageContent>
					</Message>
					<Message from="assistant">
						<div className="flex w-full flex-col gap-2">
							<Reasoning
								isStreaming={false}
								durationMs={4000}
								content="Pulled three summers of mint chip sales for comparison."
							/>
							<MessageContent markdown>
								{`Mint chip is up **12%** with stronger weekend peaks.\n\n- Check cone inventory\n- Draft reorder for pistachio`}
							</MessageContent>
							<FeedbackBar copyText="Mint chip is up 12%" />
						</div>
					</Message>
					<SystemMessage title="No API key" variant="warning">
						Add a provider key in settings to continue.
					</SystemMessage>
					<CodeBlock
						language="TypeScript"
						filename="churn.ts"
						code={`export function schedule(windows: Slot[]) {\n  return windows.filter((w) => w.temp <= -12)\n}\n`}
					/>
				</ChatContainerContent>
				<ScrollButton />
			</ChatContainer>
		</div>
	),
};

export const StreamingDemo: Story = {
	render: () => (
		<div className="mx-auto max-w-xl space-y-4">
			<ResponseStream
				markdown
				text={`Summer demand spikes for stone-fruit flavors — peach and apricot lead.\n\nI should check **cone inventory** before promoting a waffle-bowl special.`}
			/>
			<Markdown>{`Inline \`code\` and a [link](https://constructive.io).`}</Markdown>
			<DiffTable
				title="Proposed menu cleanup"
				animate
				columns={[
					{ id: 'f', header: 'Flavor', cell: (r) => r.flavor },
					{ id: 'c', header: 'Category', cell: (r) => r.category },
				]}
				rows={[
					{ id: '1', flavor: 'Rocky Road', category: 'Classic', removed: true },
					{ id: '2', flavor: 'Mint Chip', category: 'Classic' },
				]}
				addedRows={[{ id: 'a', cells: ['Pistachio', 'Seasonal'] }]}
			/>
		</div>
	),
};

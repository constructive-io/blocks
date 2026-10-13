import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';

import {
	AgentDraftCard,
	ApprovalCard,
	AskCard,
	ChainOfThought,
	ChainOfThoughtStep,
	CodeBlock,
	ConnectPrompt,
	ContextCard,
	ContextCards,
	ContextRing,
	DiffTable,
	FeedbackBar,
	FileUpload,
	InlineDiff,
	Message,
	MessageAvatar,
	MessageContent,
	ModelSelector,
	PlanTracker,
	PromptInput,
	PromptInputActions,
	PromptInputAttachment,
	PromptInputAttachments,
	PromptInputTextarea,
	PromptInputTray,
	PromptSuggestion,
	PromptSuggestions,
	Reasoning,
	RecommendationCard,
	Source,
	Sources,
	TaskList,
	TaskRow,
	ThinkingTrace,
	Tool,
	ToolGroup,
	ToolTrace,
	UsageNotice,
	usageTone,
	type AiModel,
	type ModelSelection,
} from '../../components/ai';
import { TooltipProvider } from '../../components/tooltip';
import { pickDataset } from './dataset';
import { emails, identifiers, labels, manyRows, names } from './worst-case';

const meta: Meta = {
	title: 'Break UI/AI',
	parameters: { layout: 'padded', breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

const URL_LONG = 'https://example.com/api/v2/customers/cus_Qnorthwind/invoices/in_1QnwSepAbCdEfGhIjKlMnOpQ/lines/il_1QnwSepLine0001/adjustments?expand[]=customer&expand[]=subscription';
const MCP_TOOL = 'mcp__plugin_context7_context7__resolve-library-id';
const MCP_TOOL_2 = 'mcp__claude-in-chrome__read_console_messages';
const LONG_PATH = 'packages/ui/src/components/billing-account/overview-view-with-a-very-long-file-name-for-the-quarterly-board-pack.tsx';
const LONG_LINE = `const reconciliation = await warehouse.query("select movement, count(distinct account_id) as accounts, sum(mrr_delta) as mrr_delta from analytics.mrr_movements where week = '2026-09-15' and source_url = '${URL_LONG}' group by movement order by mrr_delta desc");`;

const MARKDOWN_WORST = [
	'Here is the doc: ' + URL_LONG,
	'',
	'Net revenue = A * B * C, and 2 * 3 = 6. Globs: src/**/*.test.ts and *.md files.',
	'',
	'- first item with `inline_code_that_is_extremely_long_and_has_no_break_points_at_all_so_it_must_be_broken_by_the_renderer`',
	'- second item',
	'',
	'| Plan | Price | Seats |',
	'| --- | --- | --- |',
	'| Pro | $25 | 10 |',
	'',
	'#### A fourth-level heading',
	'',
	'<script>alert(1)</script> &amp; **bold** and [a link](' + URL_LONG + ')',
	'',
	'```ts',
	LONG_LINE,
	'```',
	'',
	'Line one',
	'Line two without a blank line between',
].join('\n');

/** A column of the width the component lives in: chat column, side panel, or a phone. */
function Column({ width = 640, children }: { width?: number; children: React.ReactNode }) {
	return (
		<TooltipProvider>
			<div className="flex flex-col gap-6" style={{ width: `min(100%, ${width}px)` }}>
				{children}
			</div>
		</TooltipProvider>
	);
}

function Scene({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<section aria-label={label} className="flex flex-col gap-2">
			<p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
			{children}
		</section>
	);
}

/* ------------------------------------------------------------------ *
 * Chat transcript
 * ------------------------------------------------------------------ */

const demoMessage = 'Revenue grew 18% to **$142.6M**. See `mrr_movements` for the bridge.';

export const Transcript: StoryObj = {
	render: (_args, context) => {
		const worst = pickDataset(context, { demo: false, worst: true }) as boolean;
		const text = worst ? MARKDOWN_WORST : demoMessage;
		return (
			<Column width={640}>
				<Scene label="user message (plain text with a URL and a newline)">
					<Message from="user">
						<MessageContent>{worst ? `Why did this fail?\n\nTraceback (most recent call last):\n  File "/srv/app/jobs/reconcile.py", line 128\n${URL_LONG}` : 'Why did this fail?'}</MessageContent>
					</Message>
				</Scene>
				<Scene label="assistant message (markdown)">
					<Message from="assistant">
						<MessageAvatar fallback={worst ? names.emojiFirst : 'AI'} />
						<MessageContent markdown>{text}</MessageContent>
					</Message>
				</Scene>
				<Scene label="assistant message, 2,000 characters">
					<Message from="assistant">
						<MessageAvatar src={worst ? 'https://example.invalid/missing-avatar.png' : undefined} fallback={worst ? 'J' : 'AI'} />
						<MessageContent markdown>{worst ? labels.longDescription.repeat(4) : demoMessage}</MessageContent>
					</Message>
				</Scene>
				<Scene label="feedback bar with copy text">
					<FeedbackBar copyText={text} />
				</Scene>
				<Scene label="sources">
					<Sources label={`Sources (${worst ? 14 : 3})`}>
						{manyRows(worst ? 14 : 3, (index) => (
							<Source
								key={index}
								title={worst ? 'Quarterly reconciliation of enterprise seat licenses across the EMEA and APAC regions' : 'Stripe docs'}
								description={worst ? labels.longDescription : 'Billing'}
								href={worst ? `${URL_LONG}#${index}` : 'https://stripe.com/docs'}
								favicon={worst && index % 2 ? 'https://example.invalid/favicon.ico' : undefined}
								domain={worst && index === 0 ? 'sap-erp-production-eu-west-1-internal-gateway.corp.northwind-industries-holdings.example.com' : undefined}
							/>
						))}
					</Sources>
				</Scene>
				<Scene label="prompt suggestions">
					<PromptSuggestions label="Ask next">
						<PromptSuggestion>{worst ? labels.longDescription.slice(0, 220) : 'Show the bridge'}</PromptSuggestion>
						<PromptSuggestion>{worst ? URL_LONG : 'Split by cohort'}</PromptSuggestion>
						<PromptSuggestion>J</PromptSuggestion>
					</PromptSuggestions>
				</Scene>
			</Column>
		);
	},
};

/* ------------------------------------------------------------------ *
 * Code and diffs
 * ------------------------------------------------------------------ */

const BEFORE = 'if (x) {\n  foo();\n}\n';
const AFTER = 'if (x) {\n  foo();\n  foo();\n}\n';

export const CodeAndDiffs: StoryObj = {
	render: (_args, context) => {
		const worst = pickDataset(context, { demo: false, worst: true }) as boolean;
		const dataset = (context.globals.dataset as string | undefined) ?? 'demo';
		const huge = dataset === 'huge';
		const code = huge ? manyRows(5_000, (index) => `const line${index} = ${index};`).join('\n') : worst ? `${LONG_LINE}\n${'\t'.repeat(40)}indented();\n\r\nmixed endings\r\n${'x'.repeat(400)}` : 'const a = 1;\nconst b = 2;';
		return (
			<Column width={560}>
				<Scene label="code block">
					<CodeBlock code={code} language={worst ? 'unknown-language' : 'ts'} filename={worst ? LONG_PATH : 'a.ts'} />
				</Scene>
				<Scene label="code block, empty">
					<CodeBlock code="" language="ts" filename="empty.ts" />
				</Scene>
				<Scene label="inline diff, duplicate line added">
					<InlineDiff source={{ before: BEFORE, after: AFTER, fileName: worst ? LONG_PATH : 'a.ts' }} />
				</Scene>
				<Scene label="inline diff, identical">
					<InlineDiff source={{ before: BEFORE, after: BEFORE, fileName: 'same.ts' }} />
				</Scene>
				<Scene label="inline diff, long lines">
					<InlineDiff source={{ before: `${LONG_LINE}\nkept`, after: `${LONG_LINE}x\nkept\n${identifiers.snakeIdentifier}_${identifiers.snakeIdentifier}`, fileName: 'long.ts' }} />
				</Scene>
				<Scene label="diff table">
					<DiffTable
						columns={[
							{ id: 'plan', header: 'Plan', cell: (row: { id: string; removed?: boolean; plan: string; price: string }) => row.plan },
							{ id: 'price', header: 'Price', cell: (row) => row.price },
							{ id: 'note', header: 'Note', cell: () => (worst ? URL_LONG : 'n/a') },
						]}
						rows={[
							{ id: '1', plan: worst ? 'Enterprise-Plus-Dedicated-Cluster' : 'Pro', price: worst ? '$12,345,678.90' : '$25', removed: true },
							{ id: '2', plan: names.cjk, price: '$0' },
						]}
						addedRows={[{ id: 'a', cells: [worst ? 'Enterprise-Plus-Dedicated-Cluster' : 'Pro', '$13,000,000.00', URL_LONG] }]}
					/>
				</Scene>
			</Column>
		);
	},
};

/* ------------------------------------------------------------------ *
 * Tool calls and traces
 * ------------------------------------------------------------------ */

const bigJson = { query: LONG_LINE, rows: manyRows(60, (index) => ({ id: index, name: names.longHyphenated, email: emails.long })), nested: { deep: { deeper: { deepest: URL_LONG } } } };

export const ToolsAndTraces: StoryObj = {
	render: (_args, context) => {
		const worst = pickDataset(context, { demo: false, worst: true }) as boolean;
		const name = worst ? MCP_TOOL : 'read_file';
		const summary = worst ? LONG_PATH : 'a.ts';
		return (
			<Column width={380}>
				<Scene label="tool chip">
					<Tool variant="chip" name={name} status="success" summary={summary} />
				</Scene>
				<Scene label="tool row">
					<Tool variant="row" name={name} status="running" summary={summary} detail={[{ text: LONG_PATH }, { text: URL_LONG, tone: 'add' }]} defaultOpen />
				</Scene>
				<Scene label="tool card, error">
					<Tool
						variant="card"
						name={worst ? MCP_TOOL_2 : 'read_file'}
						status="error"
						summary={summary}
						input={worst ? bigJson : { path: 'a.ts' }}
						output={worst ? URL_LONG : 'ok'}
						errorText={worst ? `${identifiers.snakeIdentifier}_${identifiers.snakeIdentifier}: ${URL_LONG}` : 'Not found'}
						diff={worst ? [{ file: LONG_PATH, add: 12_345, del: 678 }, { file: identifiers.cameraFile, add: 1, del: 0 }] : { file: 'a.ts', add: 1, del: 1 }}
						defaultOpen
					/>
				</Scene>
				<Scene label="tool group">
					<ToolGroup label={worst ? `${12_345} tool calls, ${1} messages` : '2 tool calls'}>
						<Tool variant="row" name={name} status="success" summary={summary} />
						<Tool variant="row" name={MCP_TOOL_2} status="success" summary={summary} />
					</ToolGroup>
				</Scene>
				<Scene label="tool trace">
					<ToolTrace
						title={worst ? 'Read tools for the quarterly board reporting and variance commentary agent' : 'Read tools'}
						steps={manyRows(worst ? 12 : 3, (index) => ({
							id: `s${index}`,
							label: worst ? (index % 2 ? 'Snowflake Query mrr_movements_by_cohort_and_region_for_every_legal_entity' : identifiers.snakeIdentifier) : 'Stripe Read invoices',
							status: index < 2 ? 'done' : index === 2 ? 'running' : 'pending',
						}))}
					/>
				</Scene>
				<Scene label="chain of thought">
					<ChainOfThought>
						<ChainOfThoughtStep title={worst ? labels.longDescription.slice(0, 200) : 'Load metric definitions'} description={worst ? URL_LONG : 'Reads the definitions'} status="done" />
						<ChainOfThoughtStep title={worst ? identifiers.snakeIdentifier + '_' + identifiers.snakeIdentifier : 'Build the bridge'} status="running" />
						<ChainOfThoughtStep title="Write the summary" status="pending" />
					</ChainOfThought>
				</Scene>
				<Scene label="task list">
					<TaskList>
						<TaskRow label={worst ? labels.longDescription.slice(0, 160) : 'Pull data'} meta={worst ? URL_LONG : '3 tables'} status="running" progress={worst ? 142 : 40} />
						<TaskRow label="Negative progress" status="running" progress={-5} />
						<TaskRow label={worst ? identifiers.snakeIdentifier + '_' + identifiers.snakeIdentifier : 'Done'} status="failed" onRetry={() => {}} details={manyRows(worst ? 12 : 2, (index) => ({ label: worst ? URL_LONG : `Detail ${index}`, meta: worst ? '12,345,678 ms' : '3 ms' }))} defaultOpen />
						<TaskRow label="Completed" status="completed" />
					</TaskList>
				</Scene>
				<Scene label="plan tracker">
					<PlanTracker
						defaultOpen
						plan={{
							steps: manyRows(worst ? 30 : 4, (index) => ({
								label: worst ? (index % 3 ? labels.longDescription.slice(0, 120) : identifiers.snakeIdentifier + '_' + identifiers.snakeIdentifier) : `Step ${index + 1}`,
								status: index < 3 ? 'done' : index === 3 ? 'in_progress' : 'pending',
							})),
						}}
					/>
				</Scene>
				<Scene label="thinking trace">
					<ThinkingTrace
						mode="coding"
						durationMs={worst ? 3_600_000 * 5 : 4200}
						rows={manyRows(worst ? 12 : 3, (index) => ({ primary: worst ? LONG_PATH : 'a.ts', secondary: worst ? URL_LONG : 'edited', mono: true, add: worst ? 12_345 : 3, del: worst ? 678 : 1 }))}
						open
					/>
				</Scene>
				<Scene label="reasoning">
					<Reasoning content={worst ? `${labels.longDescription}\n\n${URL_LONG}` : 'Thinking about the bridge.'} durationMs={worst ? 3_600_000 : 4200} markdown open />
				</Scene>
			</Column>
		);
	},
};

/* ------------------------------------------------------------------ *
 * Human-in-the-loop cards
 * ------------------------------------------------------------------ */

export const Cards: StoryObj = {
	render: (_args, context) => {
		const worst = pickDataset(context, { demo: false, worst: true }) as boolean;
		return (
			<Column width={420}>
				<Scene label="approval card">
					<ApprovalCard
						title={worst ? 'Post the quarterly board reporting and variance commentary summary to #board-reporting-and-variance-commentary?' : 'Post to #revenue?'}
						description={worst ? labels.longDescription + ' ' + URL_LONG : 'Goes to 42 people.'}
						confirmLabel={worst ? 'Post to #board-reporting-and-variance-commentary-for-multinational-holding-companies' : 'Post'}
						skipLabel={worst ? 'Keep as a draft in Revenue / Weekly for later review' : 'Skip'}
						preview={worst ? <pre className="text-xs">{URL_LONG}</pre> : undefined}
					/>
				</Scene>
				<Scene label="approval card, questions">
					<ApprovalCard
						questions={[
							{
								id: 'q',
								prompt: worst ? labels.longDescription : 'Which channel?',
								type: 'multiple',
								options: manyRows(worst ? 12 : 3, (index) => ({ id: `o${index}`, label: worst ? URL_LONG : `Option ${index}`, description: worst ? labels.longDescription : undefined })),
							},
						]}
						destructive
					/>
				</Scene>
				<Scene label="ask card">
					<AskCard
						questions={[{ id: 'a', question: worst ? labels.longDescription : 'How?', options: [{ id: 'x', label: worst ? URL_LONG : 'Comment' }, { id: 'y', label: 'J' }, { id: 'z', label: worst ? identifiers.snakeIdentifier + '_' + identifiers.snakeIdentifier : 'Both' }] }]}
					/>
				</Scene>
				<Scene label="recommendation card">
					<RecommendationCard
						title={worst ? labels.longDescription.slice(0, 120) : 'Recommended'}
						body={worst ? labels.longDescription + ' ' + URL_LONG : 'Use the Team plan.'}
						confidence={worst ? 1.42 : 0.92}
						alternatives={manyRows(worst ? 6 : 2, (index) => ({ id: `r${index}`, label: worst ? URL_LONG : `Alt ${index}`, description: worst ? labels.longDescription : undefined, badge: worst ? 'Needs review from the compliance team' : 'Beta' }))}
						acceptLabel={worst ? 'Accept the recommendation and apply it to every legal entity in the group' : 'Accept'}
					/>
				</Scene>
				<Scene label="agent draft card">
					<AgentDraftCard
						name={worst ? 'Quarterly Board Reporting and Variance Commentary Agent for Multinational Holding Companies' : 'Weekly KPIs'}
						schedule={worst ? 'First business day of every quarter, 07:30 AM, after the ledger close completes' : 'Mondays 9am'}
						tools={manyRows(worst ? 12 : 3, (index) => ({ id: `t${index}`, label: worst ? 'Microsoft Dynamics 365 Business Central (On-Premises)' : 'Slack' }))}
						steps={manyRows(worst ? 8 : 3, () => (worst ? URL_LONG : 'Post the summary'))}
						actions={[{ id: 'create', label: worst ? 'Create the quarterly board reporting agent and enable every schedule' : 'Create' }, { id: 'edit', label: 'Edit', variant: 'outline' }]}
					/>
				</Scene>
				<Scene label="connect prompt">
					<ConnectPrompt
						name={worst ? 'Microsoft Dynamics 365 Business Central (On-Premises, Customer Managed)' : 'Slack'}
						description={worst ? labels.longDescription : 'Channels'}
						connectLabel={worst ? 'Connect Microsoft Dynamics 365 Business Central' : 'Connect'}
						skipLabel={worst ? 'Continue without Microsoft Dynamics for now' : 'Skip'}
						onSkip={() => {}}
					/>
				</Scene>
				<Scene label="context cards">
					<ContextCards label="Context" count={worst ? 12_345 : 2}>
						<ContextCard title={worst ? 'Quarterly reconciliation of enterprise seat licenses across the EMEA and APAC regions' : 'Notes'} body={worst ? labels.longDescription + ' ' + URL_LONG : 'Short'} meta={worst ? '12,345,678 characters' : '2 KB'} sourceType={worst ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'PDF'} sourceName={worst ? identifiers.fileName : 'a.pdf'} />
						<ContextCard title="J" body="" />
					</ContextCards>
				</Scene>
				<Scene label="usage notice (percent edge cases)">
					<div className="flex flex-col gap-2">
						{[worst ? 142 : 40, worst ? -5 : 80, worst ? Number.NaN : 95, worst ? Infinity : 100].map((percent, index) => (
							<PromptInputTray key={index} tone={usageTone(percent)} header={<UsageNotice percent={percent} onAction={() => {}} onDismiss={() => {}} message={worst && index === 0 ? labels.longDescription : undefined} />}>
								<div className="h-8" />
							</PromptInputTray>
						))}
					</div>
				</Scene>
				<Scene label="context ring (usage edge cases)">
					<div className="flex flex-wrap items-center gap-4">
						{[
							{ tokens: 999_500, percent: 99.95, contextWindow: 1_048_576 },
							{ tokens: 9_960, percent: 5, contextWindow: 200_000 },
							{ tokens: 12_345_678_900, percent: 142, contextWindow: 1_000_000_000 },
							{ tokens: 0, percent: -5, contextWindow: 0 },
							{ tokens: 48_000, contextWindow: 128_000 },
							{ tokens: Number.NaN, percent: Number.NaN, contextWindow: 1 },
						].map((usage, index) => (
							<span key={index} className="inline-flex items-center gap-1 text-xs tabular-nums">
								<ContextRing usage={usage} />
								{index}
							</span>
						))}
					</div>
				</Scene>
			</Column>
		);
	},
};

/* ------------------------------------------------------------------ *
 * Composer and model picker
 * ------------------------------------------------------------------ */

const REASONING = [
	{ id: 'low', label: 'Low' },
	{ id: 'high', label: 'High thinking with an extended budget for hard problems that need deliberate reasoning' },
];

const worstModels: AiModel[] = [
	{ id: 'm1', name: 'Meta Llama 4 Scout 17B 16E Instruct (FP8, fine-tuned for regional compliance review)', provider: 'A Very Long Provider Name Incorporated International', description: labels.longDescription, pricing: { input: 1234.5678, output: 98765.4321, cachedInput: 0.0000001 }, contextWindow: 1_048_576, tags: ['new', 'free', 'beta', 'preview', 'deprecated'], levels: REASONING, defaultLevel: 'high' },
	{ id: 'm2', name: 'Gemini 2.5 Pro', provider: 'Google', pricing: { input: 1.25, output: 10 }, contextWindow: 2_097_152 },
	{ id: 'm3', name: 'Tiny', provider: 'X', pricing: { input: 0, output: 0 }, contextWindow: 0 },
	{ id: 'm4', name: '王秀英模型', provider: '百度', contextWindow: 131_072 },
	{ id: 'm5', name: names.rtl, provider: 'ARB', contextWindow: 500 },
	{ id: 'm6', name: 'Unpriced', provider: 'Y' },
	{ id: 'm7', name: 'Retired', provider: 'Z', disabled: true, disabledReason: labels.longDescription },
	...manyRows(100, (index): AiModel => ({ id: `bulk-${index}`, name: `Model ${index + 1}`, provider: `Provider ${index % 12}`, pricing: { input: index / 10, output: index / 3 }, contextWindow: 128_000 + index * 1000 })),
];

export const Composer: StoryObj = {
	render: function ComposerStory(_args, context) {
		const worst = pickDataset(context, { demo: false, worst: true }) as boolean;
		const [value, setValue] = React.useState(worst ? labels.longDescription.repeat(3) : '');
		const [model, setModel] = React.useState<ModelSelection>({ modelId: worst ? 'm1' : 'm2' });
		return (
			<Column width={worst ? 420 : 420}>
				<Scene label="composer with attachments and a long model name">
					<PromptInputTray tone={usageTone(worst ? 142 : 40)} header={<UsageNotice percent={worst ? 142 : 40} onAction={() => {}} onDismiss={() => {}} />}>
						<PromptInput value={value} onValueChange={setValue} className="rounded-xl p-1.5">
							<PromptInputAttachments>
								<PromptInputAttachment name={worst ? identifiers.cameraFile : 'a.pdf'} meta="HEIC · 4.2 MB" onRemove={() => {}} />
								<PromptInputAttachment name={worst ? 'Q3_Board_Deck_FINAL_revised_v12_approved_by_legal_EMEA_APAC_consolidated_with_appendices.pdf' : 'b.pdf'} meta={worst ? URL_LONG : 'PDF'} status="error" onRemove={() => {}} />
								<PromptInputAttachment name={worst ? names.emojiFirst + '.png' : 'c.png'} status="uploading" previewUrl={worst ? 'https://example.invalid/missing.png' : undefined} onRemove={() => {}} />
							</PromptInputAttachments>
							<PromptInputTextarea aria-label="Message" placeholder="Ask anything" />
							<PromptInputActions className="justify-between px-0">
								<ModelSelector models={worstModels} value={model} onValueChange={setModel} triggerClassName="h-7 px-1.5" />
								<button type="button" className="rounded-md border px-2 text-xs">
									Send
								</button>
							</PromptInputActions>
						</PromptInput>
					</PromptInputTray>
				</Scene>
				<Scene label="file upload">
					<FileUpload
						files={worst ? [new File(['x'], identifiers.cameraFile), new File(['x'], 'Q3_Board_Deck_FINAL_revised_v12_approved_by_legal_EMEA_APAC_consolidated_with_appendices_and_a_very_long_tail.pdf'), new File([''], names.emojiFirst + '.txt')] : []}
						multiple
					/>
				</Scene>
			</Column>
		);
	},
};

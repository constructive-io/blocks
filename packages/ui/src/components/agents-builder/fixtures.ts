import { DEMO_FALLBACK_REPLY, DEMO_FOLLOW_UP_REPLY, DEMO_RECOMMENDATIONS } from './demo-conversations';
import { DEMO_INBOX } from './demo-inbox';
import { DEMO_CLOCK, DEMO_SCHEDULES } from './demo-schedules';
import { DEMO_INTEGRATIONS } from './demo-integrations';
import type {
	AgentBlueprint,
	AgentRunScript,
	AgentsBuilderData,
	AgentSummary,
	HeroHighlight,
	IntegrationCategory,
	ModelOption,
	Skill,
	StarterPack,
} from './types';

export { DEMO_CLOCK, DEMO_FALLBACK_REPLY, DEMO_FOLLOW_UP_REPLY, DEMO_INBOX, DEMO_INTEGRATIONS, DEMO_RECOMMENDATIONS, DEMO_SCHEDULES };

// Demo workspace for docs, Storybook, and local exploration. Replace every
// collection with host data; nothing here is fetched or persisted.

export const DEMO_CATEGORIES: IntegrationCategory[] = [
	{ id: 'data', label: 'Warehouses and databases' },
	{ id: 'revenue', label: 'Revenue and CRM' },
	{ id: 'code-ci', label: 'Code and CI' },
	{ id: 'issues', label: 'Issues and planning' },
	{ id: 'docs', label: 'Docs and knowledge' },
	{ id: 'customer-voice', label: 'Customer voice' },
	{ id: 'analytics', label: 'Analytics' },
	{ id: 'monitoring', label: 'Monitoring' },
	{ id: 'communication', label: 'Communication' },
];

const REASONING = [
	{ id: 'low', label: 'Low', description: 'Fastest replies; light reasoning.' },
	{ id: 'medium', label: 'Medium', description: 'Balanced reasoning for most tasks.' },
	{ id: 'high', label: 'High', description: 'Deliberate reasoning for hard problems; slower.' },
];

export const DEMO_MODELS: ModelOption[] = [
	{ id: 'auto', name: 'Auto', provider: 'Router', description: 'Routes each message to the best-value model.' },
	{
		id: 'claude-5',
		name: 'Claude 5',
		provider: 'Anthropic',
		integrationId: 'claude',
		levels: REASONING,
		defaultLevel: 'medium',
		pricing: { input: 5, output: 25, cachedInput: 0.5 },
		contextWindow: 200_000,
		tags: ['new'],
	},
	{
		id: 'opus-5',
		name: 'Opus 5',
		provider: 'Anthropic',
		integrationId: 'claude',
		levels: [...REASONING, { id: 'max', label: 'Max', description: 'Extended thinking budget; billed as output.', pricing: { input: 15, output: 90, cachedInput: 1.5 } }],
		defaultLevel: 'high',
		pricing: { input: 15, output: 75, cachedInput: 1.5 },
		contextWindow: 200_000,
	},
	{
		id: 'sonnet-5',
		name: 'Sonnet 5',
		provider: 'Anthropic',
		integrationId: 'claude',
		levels: REASONING,
		defaultLevel: 'medium',
		pricing: { input: 3, output: 15, cachedInput: 0.3 },
		contextWindow: 1_000_000,
	},
	{
		id: 'haiku-4-5',
		name: 'Haiku 4.5',
		provider: 'Anthropic',
		integrationId: 'claude',
		pricing: { input: 1, output: 5, cachedInput: 0.1 },
		contextWindow: 200_000,
	},
	{
		id: 'gpt-5',
		name: 'GPT-5',
		provider: 'OpenAI',
		integrationId: 'gpt',
		levels: [{ id: 'minimal', label: 'Minimal' }, ...REASONING],
		defaultLevel: 'medium',
		pricing: { input: 1.25, output: 10, cachedInput: 0.125 },
		contextWindow: 400_000,
	},
	{
		id: 'gpt-5-mini',
		name: 'GPT-5 mini',
		provider: 'OpenAI',
		integrationId: 'gpt',
		levels: REASONING,
		defaultLevel: 'low',
		pricing: { input: 0.25, output: 2, cachedInput: 0.025 },
		contextWindow: 400_000,
	},
	{
		id: 'scout',
		name: 'Llama 4 Scout',
		provider: 'Meta',
		description: 'Open weights, hosted in your region.',
		pricing: { input: 0, output: 0 },
		contextWindow: 128_000,
		tags: ['free'],
	},
	{
		id: 'o-legacy',
		name: 'GPT-4.1',
		provider: 'OpenAI',
		integrationId: 'gpt',
		pricing: { input: 2, output: 8 },
		contextWindow: 1_000_000,
		disabled: true,
		disabledReason: 'Retired in this workspace',
	},
];

export const DEMO_AGENTS: AgentSummary[] = [
	{ id: 'revenue-analyst', name: 'Revenue Analyst', running: true },
	{ id: 'churn-radar', name: 'Churn Radar' },
	{ id: 'data-quality-monitor', name: 'Data Quality Monitor', running: true },
	{ id: 'schema-steward', name: 'Schema Steward' },
	{ id: 'metrics-librarian', name: 'Metrics Librarian' },
	{ id: 'forecast-planner', name: 'Forecast Planner' },
	{ id: 'board-report-writer', name: 'Board Report Writer' },
	{ id: 'query-optimizer', name: 'Query Optimizer' },
	{ id: 'cohort-builder', name: 'Cohort Builder' },
	{ id: 'access-auditor', name: 'Access Auditor' },
	{ id: 'pipeline-doctor', name: 'Pipeline Doctor' },
	{ id: 'dashboard-curator', name: 'Dashboard Curator' },
	{ id: 'anomaly-watch', name: 'Anomaly Watch' },
];

export const DEMO_SKILLS: Skill[] = [
	{
		id: 'metric-definitions',
		name: 'metric-definitions',
		description: 'Answering "what does this metric mean" - resolves to the one canonical definition.',
		type: 'Governance',
		agentIds: ['revenue-analyst', 'metrics-librarian', 'board-report-writer', 'forecast-planner'],
		author: { name: 'Mira' },
		updatedAt: '2026-09-22T09:00:00Z',
		updatedLabel: '2d ago',
	},
	{
		id: 'cohort-analysis',
		name: 'cohort-analysis',
		description: 'Splitting a change by signup cohort, plan or region - shows where it concentrates.',
		type: 'Analysis',
		agentIds: ['churn-radar'],
		author: { name: 'Theo' },
		updatedAt: '2026-09-24T03:00:00Z',
		updatedLabel: '6h ago',
	},
	{
		id: 'sql-review',
		name: 'sql-review',
		description: 'Reviewing a query or dbt model - flags fan-out joins, missing filters, cost.',
		type: 'Modeling',
		agentIds: ['query-optimizer', 'schema-steward', 'data-quality-monitor', 'revenue-analyst', 'pipeline-doctor'],
		inlineAgentLimit: 2,
		author: { name: 'Mira' },
		updatedAt: '2026-09-17T09:00:00Z',
		updatedLabel: '1w ago',
	},
	{
		id: 'schema-migration',
		name: 'schema-migration',
		description: 'Drafting or reviewing a Postgres migration - checks locks, RLS and backfills.',
		type: 'Modeling',
		agentIds: ['schema-steward', 'access-auditor', 'pipeline-doctor', 'data-quality-monitor'],
		author: { name: 'Ines' },
		updatedAt: '2026-09-17T08:59:00Z',
		updatedLabel: '1w ago',
	},
	{
		id: 'anomaly-detection',
		name: 'anomaly-detection',
		description: 'Checking a metric for breaks - seasonality-aware, explains what moved.',
		type: 'Analysis',
		agentIds: ['anomaly-watch', 'data-quality-monitor'],
		author: { name: 'Jonas' },
		updatedAt: '2026-09-24T09:00:00Z',
		updatedLabel: 'Just now',
	},
	{
		id: 'board-report',
		name: 'board-report',
		description:
			'Use when a metrics pack is due - pulls the agreed KPIs, writes the commentary and checks every number against its source.',
		type: 'Workflow',
		agentIds: [
			'board-report-writer',
			'revenue-analyst',
			'forecast-planner',
			'metrics-librarian',
			'dashboard-curator',
			'churn-radar',
			'cohort-builder',
		],
		author: { name: 'Jonas' },
		updatedAt: '2026-09-24T05:00:00Z',
		updatedLabel: '4h ago',
	},
];

export const DEMO_STARTER_PACKS: StarterPack[] = [
	{
		id: 'revenue-analytics',
		icon: 'lightbulb',
		title: 'Revenue analytics',
		description: 'MRR bridge, cohort splits, churn signals, board commentary',
		skillCount: 9,
		installs: '1.2k',
	},
	{
		id: 'data-modeling',
		icon: 'code',
		title: 'Data modeling',
		description: 'dbt review, SQL linting, schema migrations, lineage checks',
		skillCount: 5,
		installs: '3.6k',
	},
	{
		id: 'governance-and-quality',
		icon: 'server',
		title: 'Governance and quality',
		description: 'Freshness checks, RLS audits, metric definitions, PII scan',
		skillCount: 6,
		installs: '870',
	},
];

export const DEMO_AGENT: AgentBlueprint = {
	id: 'revenue-analyst',
	name: 'Revenue Analyst',
	title: 'Revenue Analyst Agent',
	tagline: 'Explains every move in MRR, every week',
	instructions: {
		heading: 'Revenue Analyst Agent',
		meta: 'Full system prompt. Version 2.3 · owner: Mira · last change: one-off invoices excluded from MRR, matching finance.',
		paragraphs: [
			'You are the Revenue Analyst. Every Monday you explain how MRR moved in the week before: new, expansion, contraction and churn, the accounts behind each, and whether the move is a trend or a one-off.',
			'Use metric-definitions for every number. MRR is recurring revenue only; annual plans are spread monthly; refunds net in the week they happen. When a source disagrees with the definition, say which one you used and why.',
			'Split any movement over 1% by cohort, plan and region before explaining it. Check a large churn against the CRM: a cancellation with a signed renewal is a billing change, not churn.',
			'Write for a CFO with two minutes. Link every figure to the query that produced it. Never post outside #revenue without approval, and never contact a customer.',
		],
	},
	schedule: { when: 'Mon 07:30 AM', label: 'weekly review', cron: 'cron 30 7 * * 1', zone: 'UTC' },
	trigger: { integrationId: 'stripe', label: 'Stripe webhook', conditions: ['type=churn', 'mrr>5000'] },
	channelsNotice: 'Set an agent identity to configure channels',
	memory: ['metric-definitions', 'fy26-targets'],
	tools: [
		{ id: 'snowflake-query', label: 'Snowflake Query mrr_movements', integrationId: 'snowflake' },
		{ id: 'stripe-subscriptions', label: 'Stripe List subscriptions', integrationId: 'stripe' },
		{ id: 'postgres-accounts', label: 'Postgres Read accounts', integrationId: 'postgres' },
		{ id: 'dbt-runs', label: 'dbt Read model runs', integrationId: 'dbt' },
		{ id: 'amplitude-cohorts', label: 'Amplitude Read cohorts', integrationId: 'amplitude' },
		{ id: 'slack-history', label: 'Slack History #revenue', integrationId: 'slack' },
	],
	subagents: ['mrr_bridge', 'cohort_splitter', 'anomaly_checker', 'narrative_writer'],
	skills: ['metric-definitions', 'cohort-analysis', 'sql-review'],
};

export const DEMO_RUN: AgentRunScript = {
	command: { verb: 'Run', skill: 'revenue-review', scope: 'for Sep 15–21' },
	reasoning: {
		seconds: 14,
		text: 'MRR moved −2.1% week on week, the first drop in eleven weeks. Before narrating anything I need the bridge (new, expansion, contraction, churn) so the explanation is not just the headline. metric-definitions says MRR excludes one-off invoices and spreads annual plans monthly; the Stripe dashboard does neither, which is usually where "the numbers disagree" comes from. If one account dominates churn, check the CRM before calling it churn.',
	},
	plan: [
		'Load metric definitions and targets',
		'Pull subscription and usage data',
		'Build the MRR bridge',
		'Split by cohort and check anomalies',
		'Write the summary',
		'Post to #revenue',
	],
	paragraphs: [
		'Starting the weekly revenue review for Sep 15–21. Reading metric-definitions first, so MRR means what finance means by it: recurring only, annual plans spread monthly, refunds netted in the week they happen.',
		'fy26-targets puts the quarter at $1.42M exit MRR and we were 3% ahead last Monday. This week’s dip only matters if it is not a one-off, so that gets checked before anything is written up.',
	],
	steps: DEMO_AGENT.tools,
	query: {
		name: 'mrr_bridge.sql',
		sql: [
			'select movement,',
			'       count(distinct account_id) as accounts,',
			'       sum(mrr_delta)             as mrr_delta',
			'from analytics.mrr_movements',
			"where week = '2026-09-15'",
			'group by movement',
			'order by mrr_delta desc;',
		].join('\n'),
		columns: ['Movement', 'Accounts', 'MRR Δ'],
		rows: [
			['New', '38', '+$41,200'],
			['Expansion', '61', '+$22,850'],
			['Contraction', '24', '−$9,400'],
			['Churn', '9', '−$83,150'],
		],
		caption: 'Net −$28,500 (−2.1%) · 4 rows · 312 ms',
	},
	groups: [
		{ id: 'subagents', label: 'Sub-agents', items: DEMO_AGENT.subagents },
		{ id: 'skills', label: 'Skills', items: DEMO_AGENT.skills },
	],
	findings: {
		paragraphs: [
			'The dip is one account, not a trend. Churn is −$83.2k and $71.4k of it is Halcyon Logistics, which moved to annual invoicing through procurement: Stripe shows a cancellation, but a signed renewal sits in HubSpot. Without it, net MRR is +$42.9k (+3.1%), in line with the last eight weeks.',
			'Worth watching: contraction doubled in the 2025-Q2 cohort (11 accounts, −$6.1k), all on the Team plan after the seat-minimum change. Early, but it is the same shape as last spring’s churn.',
		],
		sources: [
			{ title: 'mrr_movements', description: 'Snowflake · analytics.mrr_movements, refreshed 07:02 UTC' },
			{ title: 'Halcyon renewal', description: 'HubSpot deal · Renewal FY27, closed won' },
			{ title: 'Pricing log', description: 'Notion · Seat minimum change, Aug 28' },
		],
	},
	approval: {
		title: 'Post the summary to #revenue?',
		description: 'Goes to 42 people. Halcyon is flagged as a billing change, not churn.',
		preview:
			'Weekly revenue · Sep 15–21. Net MRR −2.1%, but +3.1% without Halcyon Logistics (moved to annual invoicing, renewal signed). Watch: Team-plan contraction in the 2025-Q2 cohort after the seat-minimum change.',
		confirmLabel: 'Post to #revenue',
		skipLabel: 'Keep as draft',
		steps: [
			{ id: 'slack-post', label: 'Slack Post #revenue', integrationId: 'slack' },
			{ id: 'notion-file', label: 'Notion File under Revenue / Weekly', integrationId: 'notion' },
		],
		approvedText:
			'Posted to #revenue and filed under Revenue / Weekly. Halcyon is on the exceptions list now, so next week’s bridge will not count it twice.',
		skippedText: 'Kept as a draft in Revenue / Weekly. Say the word and it goes to #revenue as it is.',
	},
	thinking: { seconds: 60, tokens: 3200 },
};

export const DEMO_HERO_HIGHLIGHTS: HeroHighlight[] = [
	{ integrationId: 'dbt', text: 'Refreshed 23 models after the last run' },
	{ integrationId: 'slack', text: 'Posted 8 summaries to #revenue' },
	{ integrationId: 'github', text: 'Reviewed 14 migrations before merge' },
];

export const AGENTS_BUILDER_DEMO: AgentsBuilderData = {
	workspace: { name: 'Constructive', appName: 'Constructive' },
	models: DEMO_MODELS,
	modelSections: { pinnedIds: ['auto'], recentIds: ['claude-5', 'gpt-5'], recommendedIds: ['sonnet-5', 'haiku-4-5', 'scout'] },
	integrations: DEMO_INTEGRATIONS,
	categories: DEMO_CATEGORIES,
	featuredIntegrationIds: ['postgres', 'snowflake', 'stripe', 'dbt', 'hubspot', 'slack', 'notion', 'github'],
	agents: DEMO_AGENTS,
	inbox: DEMO_INBOX,
	schedules: DEMO_SCHEDULES,
	clock: DEMO_CLOCK,
	skills: DEMO_SKILLS,
	starterPacks: DEMO_STARTER_PACKS,
	recommendations: DEMO_RECOMMENDATIONS,
	fallbackReply: DEMO_FALLBACK_REPLY,
	followUpReply: DEMO_FOLLOW_UP_REPLY,
	agent: DEMO_AGENT,
	run: DEMO_RUN,
	heroHighlights: DEMO_HERO_HIGHLIGHTS,
	usage: { percent: 80 },
};

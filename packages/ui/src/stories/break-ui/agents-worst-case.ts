/**
 * Worst-case Agents Builder workspace, shaped exactly like
 * `AGENTS_BUILDER_DEMO`. Names, subjects, URLs, and prompts are the lengths and
 * scripts real teams produce: a 70-character agent name, a CJK agent, an
 * emoji-first author, a contact that is only an email, a pasted URL with no
 * break opportunity, an app named in Cyrillic.
 */
import {
	AGENTS_BUILDER_DEMO,
	type AgentBlueprint,
	type AgentRunScript,
	type AgentSchedule,
	type AgentsBuilderData,
	type AgentSummary,
	type ConversationBeat,
	type InboxThread,
	type Integration,
	type ModelOption,
	type Skill,
	type StarterPack,
	type ToolStep,
} from '../../components/agents-builder';
import { emails, identifiers, labels, manyRows, names } from './worst-case';

const REPEAT = (text: string, count: number) => Array.from({ length: count }, () => text).join(' ');

const LONG_PROMPT =
	'You are the quarterly board reporting agent for a multinational holding company. Pull the agreed KPIs from the warehouse, reconcile them against the ledger exports in the finance workspace, explain every variance above two percent with the originating invoice and the approver, and never post outside the board channel without a human approving the draft. ' +
	'When a number cannot be reproduced from its source, say so plainly instead of rounding it. Link every figure to the query that produced it, and keep the commentary under four hundred words so the CFO can read it between meetings.';

const UNBROKEN_URL = 'https://example.com/workspaces/acme/projects/q3-launch/docs/9f8e7d6c5b4a3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f?tab=comments&filter=unresolved&owner=bartholomew.fitzgerald@northwind-industries-holdings.example.com';

/* ------------------------------------------------------------------ *
 * Agents (sidebar roster, schedules, skills)
 * ------------------------------------------------------------------ */

export const worstAgents: AgentSummary[] = [
	{ id: 'revenue-analyst', name: 'Revenue Analyst', running: true },
	{ id: 'board-reporting', name: 'Aleksandra Wiśniewska-Kowalczyk, Quarterly Board Reporting and Variance Commentary Agent', running: true },
	{ id: 'cjk', name: names.cjk },
	{ id: 'emoji', name: names.emojiFirst },
	{ id: 'rtl', name: names.rtl },
	{ id: 'one-letter', name: names.oneLetter },
	{ id: 'spaces', name: names.extraSpaces },
	{ id: 'lowercase', name: names.lowercase },
	{ id: 'snake', name: identifiers.snakeIdentifier },
	{ id: 'email-name', name: emails.long },
	{ id: 'vietnamese', name: names.vietnamese },
	{ id: 'zwj', name: names.zwjEmoji },
	{ id: 'churn-radar', name: 'Churn Radar' },
];

/* ------------------------------------------------------------------ *
 * Models
 * ------------------------------------------------------------------ */

export const worstModels: ModelOption[] = [
	...AGENTS_BUILDER_DEMO.models,
	{
		id: 'long-model',
		name: 'Meta Llama 4 Scout 17B 16E Instruct (FP8, fine-tuned for regional compliance review)',
		provider: 'A Very Long Provider Name Incorporated International',
		description: labels.longDescription,
		pricing: { input: 1234.5678, output: 98765.4321, cachedInput: 0.0000001 },
		contextWindow: 10_000_000,
		tags: ['new', 'free'],
	},
	{ id: 'zero-context', name: 'Tiny', provider: 'X', pricing: { input: 0, output: 0 }, contextWindow: 0 },
];

/* ------------------------------------------------------------------ *
 * Integrations
 * ------------------------------------------------------------------ */

const tools = (count: number): Integration['tools'] =>
	manyRows(count, (index) => ({ id: `tool-${index}`, name: index % 3 === 0 ? 'Read the outstanding balances for every customer ledger across every legal entity' : `Run tool number ${index + 1}`, access: index % 4 === 0 ? 'write' : 'read' }));

export const worstIntegrations: Integration[] = [
	...AGENTS_BUILDER_DEMO.integrations,
	{
		id: 'dynamics',
		name: 'Microsoft Dynamics 365 Business Central (On-Premises, Customer Managed)',
		description: 'Read general ledger entries, post journals, and reconcile bank statements across every company in the tenant, including consolidations and intercompany eliminations',
		categoryId: 'revenue',
		connected: true,
		vendor: 'Microsoft Corporation International',
		authDomain: 'login.microsoftonline.com',
		color: '#0078d4',
		tools: tools(25),
	},
	{ id: 'dingtalk', name: '钉钉 DingTalk', description: '连接钉钉工作台，读取审批流程和考勤数据', categoryId: 'communication', connected: false, vendor: 'Alibaba', authDomain: 'login.dingtalk.com', color: '#3296fa', tools: tools(3) },
	{ id: 'vk', name: 'ВКонтакте', description: 'Сообщества, сообщения и статистика', categoryId: 'communication', connected: false, vendor: 'VK', authDomain: 'id.vk.com', color: '#0077ff', tools: tools(2) },
	{ id: 'evernote', name: 'Évernote', description: 'Notes and notebooks', categoryId: 'docs', connected: false, vendor: 'Bending Spoons', authDomain: 'evernote.com', color: '#00a82d', tools: tools(2) },
	{ id: 'a', name: 'A', description: '', categoryId: 'docs', connected: false, vendor: 'A', authDomain: 'a.co', tools: [] },
	{ id: 'rtl-app', name: names.rtl, description: 'تطبيق للتقارير', categoryId: 'analytics', connected: false, vendor: 'RTL', authDomain: 'example.sa', tools: tools(2) },
	{ id: 'emoji-app', name: '🦊 Fox Analytics', description: labels.markup, categoryId: 'analytics', connected: false, vendor: 'Fox', authDomain: 'example.com', tools: tools(2) },
	{ id: 'long-domain', name: 'Legacy ERP', description: UNBROKEN_URL, categoryId: 'revenue', connected: false, vendor: 'SAP', authDomain: 'sap-erp-production-eu-west-1-internal-gateway.corp.northwind-industries-holdings.example.com', tools: tools(1) },
];

export const worstCategories = [
	...AGENTS_BUILDER_DEMO.categories.slice(0, 3),
	{ id: 'communication', label: 'Communication, collaboration, and customer engagement platforms' },
	{ id: 'docs', label: 'Docs and knowledge' },
	{ id: 'analytics', label: 'Analytics' },
];

/* ------------------------------------------------------------------ *
 * Skills
 * ------------------------------------------------------------------ */

const agentIds = (count: number) => manyRows(count, (index) => worstAgents[index % worstAgents.length]!.id);

export const worstSkills: Skill[] = [
	{
		id: 'long-skill',
		name: 'quarterly-board-reporting-with-variance-commentary-and-source-linking-v2-final',
		description: labels.longDescription,
		type: 'Workflow',
		agentIds: agentIds(30),
		author: { name: names.longHyphenated },
		updatedAt: '2026-09-24T09:00:00Z',
		updatedLabel: 'Just now',
	},
	{ id: 'emoji-author', name: 'sql-review', description: 'Reviewing a query or dbt model', type: 'Modeling', agentIds: ['revenue-analyst'], author: { name: names.emojiFirst }, updatedAt: '2026-09-22T09:00:00Z', updatedLabel: '2d ago' },
	{ id: 'lower-author', name: 'cohort_analysis_for_enterprise_accounts_with_multi_year_contracts', description: 'Splitting a change by signup cohort', type: 'Analysis', agentIds: [], author: { name: names.lowercase }, updatedAt: '2026-09-17T09:00:00Z', updatedLabel: '1w ago' },
	{ id: 'space-author', name: 'x', description: '', type: 'Governance', agentIds: agentIds(2), author: { name: names.extraSpaces }, updatedAt: '2026-09-17T09:00:00Z', updatedLabel: '1w ago' },
	{ id: 'empty-author', name: 'metric-definitions', description: UNBROKEN_URL, type: 'Governance', agentIds: agentIds(4), author: { name: '' }, updatedAt: '2026-09-24T03:00:00Z', updatedLabel: '6h ago' },
	{ id: 'cjk-author', name: '指标定义', description: '解析"这个指标是什么意思"，并指向唯一的权威定义。', type: 'Governance', agentIds: agentIds(3), author: { name: names.cjk }, updatedAt: '2026-09-24T03:00:00Z', updatedLabel: '6h ago' },
	{ id: 'rtl-author', name: 'rtl-skill', description: 'وصف المهارة', type: 'Analysis', agentIds: agentIds(1), author: { name: names.rtl }, updatedAt: '2026-09-24T03:00:00Z', updatedLabel: '6h ago' },
	...AGENTS_BUILDER_DEMO.skills.slice(0, 2),
];

export const worstStarterPacks: StarterPack[] = [
	{ id: 'one', icon: 'lightbulb', title: 'Revenue analytics, board reporting, and variance commentary for multinational holding companies', description: labels.longDescription, skillCount: 1, installs: '1' },
	{ id: 'two', icon: 'code', title: 'Data modeling', description: '', skillCount: 0, installs: '12.3M' },
	{ id: 'three', icon: 'server', title: 'Governance and quality', description: 'Freshness checks, RLS audits, metric definitions, PII scan', skillCount: 1_284, installs: '870' },
];

/* ------------------------------------------------------------------ *
 * Inbox
 * ------------------------------------------------------------------ */

const demoThread = AGENTS_BUILDER_DEMO.inbox[0]!;

export const worstInbox: InboxThread[] = [
	{
		id: 'long-contact',
		contact: { name: 'Aleksandra Wiśniewska-Kowalczyk', org: 'Northwind Industries Holdings International (EMEA Procurement)', handle: emails.long },
		channel: 'email',
		subject: 'Re: Re: Fwd: Q3 board metrics pack — FINAL (revised) v12 [approved by legal] please confirm the figures before Thursday',
		time: '12:45 PM',
		unread: true,
		status: 'needs-you',
		agentId: 'board-reporting',
		messages: [
			{ id: 'm1', kind: 'message', from: 'contact', time: '9:38', text: `Here is the link you asked for: ${UNBROKEN_URL}` },
			{ id: 'm2', kind: 'message', from: 'contact', time: '9:39', text: 'Also the ledger: ' + identifiers.snakeIdentifier + '_' + identifiers.snakeIdentifier, attachment: { name: identifiers.fileName, meta: '12.4 MB · 3,284 rows' } },
			{ id: 'm3', kind: 'message', from: 'agent', time: '9:41', text: LONG_PROMPT },
			{ id: 'm4', kind: 'message', from: 'you', time: '9:42', text: UNBROKEN_URL },
			{ id: 'm5', kind: 'message', from: 'contact', time: '9:43', text: labels.markup, attachment: { name: identifiers.cameraFile, meta: '4000 × 200' } },
			{
				id: 'a1',
				kind: 'activity',
				agentId: 'board-reporting',
				text: 'Checked both numbers against the metric definition and the ledger export, then traced the variance to a late-booked invoice',
				steps: manyRows(6, (index) => ({ id: `s${index}`, label: index % 2 ? 'Stripe Read invoices for the customer across every legal entity and subsidiary' : identifiers.snakeIdentifier, integrationId: 'stripe' })),
			},
		],
		draft: { confidence: 0.996, text: UNBROKEN_URL + ' ' + LONG_PROMPT, sources: ['Stripe · 14,284 invoices', 'analytics.mrr_movements', 'metric-definitions', identifiers.snakeIdentifier] },
		suggestions: ['Send the reconciliation', 'Book 15 min to walk through it', identifiers.url, LONG_PROMPT.slice(0, 160)],
	},
	{ id: 'email-name', contact: { name: emails.long, handle: emails.long }, channel: 'email', time: 'Tue', status: 'working', agentId: 'snake', activity: 'Pulling the quarterly numbers from the warehouse and the ledger exports for every entity', messages: [{ id: 'm1', kind: 'message', from: 'contact', time: '9:12', text: 'Hi' }] },
	{ id: 'cjk', contact: { name: names.cjk, org: '王氏集团', handle: '+86 138 0013 8000' }, channel: 'sms', time: '9:41', status: 'done', agentId: 'cjk', messages: [{ id: 'm1', kind: 'message', from: 'contact', time: '9:38', text: '我们的仪表板显示本月 MRR 下降了 12%，但 Stripe 显示持平。董事会材料应该相信哪一个？' }] },
	{ id: 'emoji', contact: { name: names.emojiFirst, org: '🦊', handle: '@fox' }, channel: 'slack', subject: '🔥🔥🔥 orders_daily failed freshness 🔥🔥🔥', time: '8:55', unread: true, status: 'needs-you', agentId: 'emoji', messages: [{ id: 'm1', kind: 'message', from: 'contact', time: '8:55', text: '👩🏽‍💻👩🏽‍💻👩🏽‍💻' }], approval: { title: 'Merge the fix and rerun orders_daily across all 1,284 downstream dashboards in every workspace?', description: LONG_PROMPT, confirmLabel: 'Merge and rerun every downstream job', doneText: 'Done.' } },
	{ id: 'rtl', contact: { name: names.rtl, org: 'شركة', handle: 'noor@example.sa' }, channel: 'email', subject: 'تقرير الربع الثالث', time: '8:20', status: 'working', agentId: 'rtl', messages: [{ id: 'm1', kind: 'message', from: 'contact', time: '8:20', text: 'مرحبا، هل يمكننا الحصول على حزمة مقاييس الربع الثالث بحلول يوم الخميس؟' }] },
	{ id: 'spaces', contact: { name: names.extraSpaces, handle: 'sam' }, channel: 'sms', time: '7:02', status: 'needs-you', agentId: 'spaces', messages: [{ id: 'm1', kind: 'message', from: 'contact', time: '7:02', text: 'ok' }] },
	{ id: 'one', contact: { name: 'J', handle: 'j@example.com' }, channel: 'email', time: '6:30', status: 'done', agentId: 'one-letter', messages: [{ id: 'm1', kind: 'message', from: 'contact', time: '6:30', text: '' }] },
	demoThread,
];

/* ------------------------------------------------------------------ *
 * Schedules
 * ------------------------------------------------------------------ */

const ok = (count: number): AgentSchedule['history'] => Array.from({ length: count }, () => 'success');

export const worstSchedules: AgentSchedule[] = [
	{
		id: 'long-schedule',
		agentId: 'board-reporting',
		name: 'Quarterly board reporting and variance commentary for every legal entity in the group',
		cadence: 'First business day of every quarter, 07:30, after the ledger close completes',
		cron: '30 7 1-3 1,4,7,10 1-5',
		zone: 'America/Argentina/ComodRivadavia',
		active: true,
		running: true,
		nextRun: 'Running now',
		deliversTo: '#board-reporting-and-variance-commentary-for-multinational-holding-companies',
		integrationIds: ['snowflake', 'stripe', 'slack', 'postgres', 'dbt', 'github', 'notion', 'hubspot'],
		history: [...ok(5), 'failed', 'skipped', ...ok(20)],
		today: ['00:00', '00:05', '00:10', '23:55', '12:00', '12:01', '12:02'],
		lastRun: { status: 'failed', when: 'Tue 10:00', duration: '2h 48m 12s', summary: LONG_PROMPT + ' ' + UNBROKEN_URL },
		steps: manyRows(8, (index): ToolStep => ({ id: `s${index}`, label: index % 2 ? 'Snowflake Query a very long table name that keeps going' : identifiers.snakeIdentifier, integrationId: 'snowflake' })),
	},
	{ id: 'paused', agentId: 'cjk', name: names.cjk, cadence: 'Every minute', cron: '* * * * *', zone: 'UTC', active: false, pausedNote: LONG_PROMPT, deliversTo: 'Inbox', integrationIds: [], history: [], today: [], steps: [] },
	{ id: 'none-today', agentId: 'emoji', name: names.emojiFirst, cadence: 'Weekly', cron: '0 0 * * 0', zone: 'UTC', active: true, nextRun: 'in 6d', deliversTo: '#revenue', integrationIds: ['slack'], history: ok(14), today: [], steps: [{ id: 's', label: 'Slack Post', integrationId: 'slack' }] },
];

/* ------------------------------------------------------------------ *
 * The agent and its run
 * ------------------------------------------------------------------ */

const agent: AgentBlueprint = {
	...AGENTS_BUILDER_DEMO.agent,
	id: 'revenue-analyst',
	name: 'Aleksandra Wiśniewska-Kowalczyk, Quarterly Board Reporting and Variance Commentary Agent',
	title: 'Quarterly Board Reporting and Variance Commentary Agent for Multinational Holding Companies',
	tagline: labels.longDescription,
	instructions: {
		heading: 'Quarterly Board Reporting and Variance Commentary Agent for Multinational Holding Companies',
		meta: `Full system prompt. Version 12.3.4-rc.7+build.1284 · owner: ${names.longHyphenated} · last change: ${labels.longDescription.slice(0, 160)}`,
		paragraphs: [LONG_PROMPT, UNBROKEN_URL, REPEAT(LONG_PROMPT, 4), '```sql\nselect * from analytics.mrr_movements where week = $1 -- ' + UNBROKEN_URL + '\n```'],
	},
	schedule: { when: 'First business day of every quarter, 07:30 AM', label: 'quarterly board reporting', cron: 'cron 30 7 1-3 1,4,7,10 1-5', zone: 'America/Argentina/ComodRivadavia' },
	trigger: { integrationId: 'stripe', label: 'Stripe webhook for invoices with a total above one hundred thousand dollars', conditions: manyRows(12, (index) => `type=invoice.payment_failed&customer.metadata.region=emea&amount_due>${100_000 * (index + 1)}&billing_reason=subscription_cycle`) },
	channelsNotice: LONG_PROMPT,
	memory: ['metric-definitions', 'fy26-targets', identifiers.snakeIdentifier, UNBROKEN_URL, ...manyRows(8, (index) => `memory-item-with-a-long-name-${index + 1}`)],
	tools: manyRows(24, (index): ToolStep => ({ id: `tool-${index}`, label: index % 2 ? 'Snowflake Query mrr_movements_by_cohort_and_region_for_every_legal_entity' : identifiers.snakeIdentifier, integrationId: index % 3 ? 'snowflake' : 'stripe' })),
	subagents: manyRows(16, (index) => (index % 2 ? 'cohort_splitter_for_enterprise_accounts_with_multi_year_contracts' : `sub-agent-${index + 1}`)),
	skills: manyRows(16, (index) => (index % 2 ? 'quarterly-board-reporting-with-variance-commentary-v2-final' : `skill-${index + 1}`)),
};

const run: AgentRunScript = {
	...AGENTS_BUILDER_DEMO.run,
	command: { verb: 'Run', skill: 'quarterly-board-reporting-with-variance-commentary-and-source-linking', scope: 'for the quarter ending Sep 30, 2026 across every legal entity in the group' },
	reasoning: { seconds: 1284, text: LONG_PROMPT + ' ' + UNBROKEN_URL },
	plan: manyRows(16, (index) => (index % 3 ? 'Pull subscription and usage data for every legal entity' : LONG_PROMPT.slice(0, 200))),
	paragraphs: [LONG_PROMPT, `See ${UNBROKEN_URL}`, labels.markup],
	steps: agent.tools,
	query: {
		name: 'quarterly_revenue_bridge_with_cohort_split_and_variance_commentary_for_every_legal_entity.sql',
		sql: [
			'select movement, count(distinct account_id) as accounts, sum(mrr_delta) as mrr_delta, sum(mrr_delta) filter (where cohort = \'2025-Q2\') as cohort_2025_q2_delta, sum(mrr_delta) filter (where plan = \'enterprise-plus-dedicated-cluster\') as enterprise_delta',
			...manyRows(30, (index) => `  -- line ${index + 1} of a long generated query that keeps going for a while`),
			'from analytics.mrr_movements',
			`where week = '2026-09-15' and source_url = '${UNBROKEN_URL}'`,
			'group by movement order by mrr_delta desc;',
		].join('\n'),
		columns: ['Movement', 'Accounts', 'MRR Δ', 'Cohort 2025-Q2 Δ', 'Enterprise Plus Dedicated Cluster Δ', 'Region', 'Owner', 'Notes', 'Last updated'],
		rows: manyRows(40, (index) => [index % 2 ? 'New' : identifiers.snakeIdentifier, String(index * 1284), index % 2 ? '+$41,200' : '−$12,345,678.90', '+$9,400', '−$83,150', 'EMEA', names.longHyphenated, UNBROKEN_URL, '2026-09-24T09:00:00Z']),
		caption: `Net −$28,500 (−2.1%) · 40 rows · 312 ms · ${LONG_PROMPT.slice(0, 120)}`,
	},
	groups: [
		{ id: 'subagents', label: 'Sub-agents', items: agent.subagents },
		{ id: 'skills', label: 'Skills', items: agent.skills },
	],
	findings: {
		paragraphs: [LONG_PROMPT, UNBROKEN_URL],
		sources: manyRows(10, (index) => ({ title: index % 2 ? 'mrr_movements_by_cohort_and_region_for_every_legal_entity_in_the_group' : 'Halcyon renewal', description: index % 3 ? UNBROKEN_URL : 'HubSpot deal · Renewal FY27, closed won', domain: 'sap-erp-production-eu-west-1-internal-gateway.corp.northwind-industries-holdings.example.com' })),
	},
	approval: {
		title: 'Post the quarterly board reporting and variance commentary summary to #board-reporting-and-variance-commentary?',
		description: LONG_PROMPT,
		preview: LONG_PROMPT + ' ' + UNBROKEN_URL,
		confirmLabel: 'Post to #board-reporting-and-variance-commentary-for-multinational-holding-companies',
		skipLabel: 'Keep as a draft in Revenue / Weekly for later review',
		steps: agent.tools.slice(0, 3),
		approvedText: LONG_PROMPT,
		skippedText: LONG_PROMPT,
	},
	thinking: { seconds: 3600, tokens: 12_345_678 },
};

/* ------------------------------------------------------------------ *
 * Chat beats (replies to the first message and to follow-ups)
 * ------------------------------------------------------------------ */

export const worstReply: ConversationBeat[] = [
	{ kind: 'say', text: `Here is the doc: ${UNBROKEN_URL}` },
	{ kind: 'say', text: `${labels.markup}\n\n${'x'.repeat(0)}${identifiers.snakeIdentifier}_${identifiers.snakeIdentifier}_${identifiers.snakeIdentifier}` },
	{ kind: 'steps', steps: agent.tools.slice(0, 4) },
	{
		kind: 'ask',
		questions: [
			{
				id: 'q1',
				question: 'How do you want the quarterly board reporting and variance commentary delivered to every legal entity in the group?',
				options: [
					{ id: 'a', label: 'Post to #board-reporting-and-variance-commentary-for-multinational-holding-companies', then: [{ kind: 'say', text: 'Done.' }] },
					{ id: 'b', label: 'J', then: [{ kind: 'say', text: 'Done.' }] },
					{ id: 'c', label: UNBROKEN_URL, then: [{ kind: 'say', text: 'Done.' }] },
				],
			},
		],
	},
	{
		kind: 'agent',
		draft: {
			name: 'Quarterly Board Reporting and Variance Commentary Agent for Multinational Holding Companies',
			schedule: 'First business day of every quarter, 07:30 AM, after the ledger close completes',
			integrationIds: ['snowflake', 'stripe', 'slack', 'dynamics', 'dingtalk', 'vk', 'evernote', 'postgres'],
			steps: [LONG_PROMPT.slice(0, 200), UNBROKEN_URL, 'Short step'],
		},
		options: [
			{ id: 'create', label: 'Create the quarterly board reporting agent and enable every schedule', chosenLabel: 'Created', then: [{ kind: 'say', text: 'Done.' }] },
			{ id: 'edit', label: 'Edit', chosenLabel: 'Edited', then: [{ kind: 'say', text: 'Done.' }] },
		],
	},
];

export const worstRecommendations = [
	{ id: 'r1', icon: 'file' as const, parts: ['Review the quarterly board reporting and variance commentary draft for every legal entity in the group using', { integrationIds: ['snowflake', 'stripe', 'slack', 'dynamics'] }, identifiers.snakeIdentifier], prompt: LONG_PROMPT, reply: worstReply },
	{ id: 'r2', icon: 'refresh' as const, parts: [UNBROKEN_URL], prompt: 'Short', reply: worstReply },
	{ id: 'r3', icon: 'file-search' as const, parts: [names.cjk, { integrationIds: ['dingtalk', 'vk'] }], prompt: '汇总', reply: worstReply },
];

export const worstAgentsBuilder: AgentsBuilderData = {
	...AGENTS_BUILDER_DEMO,
	workspace: { name: 'Wiśniewska-Kowalczyk Industrial Holdings', appName: 'Wiśniewska-Kowalczyk Industrial Holdings International' },
	models: worstModels,
	modelSections: { pinnedIds: ['auto', 'long-model'], recentIds: ['long-model', 'zero-context', 'claude-5'], recommendedIds: ['sonnet-5', 'haiku-4-5', 'scout'] },
	integrations: worstIntegrations,
	categories: worstCategories,
	featuredIntegrationIds: ['dynamics', 'dingtalk', 'vk', 'evernote', 'a', 'postgres', 'snowflake', 'stripe', 'dbt', 'hubspot', 'slack', 'notion', 'github'],
	agents: worstAgents,
	inbox: worstInbox,
	schedules: worstSchedules,
	skills: worstSkills,
	starterPacks: worstStarterPacks,
	recommendations: worstRecommendations,
	fallbackReply: worstReply,
	followUpReply: worstReply,
	agent,
	run,
	heroHighlights: [
		{ integrationId: 'dynamics', text: 'Refreshed 12,345 models after the last run across every legal entity in the group' },
		{ integrationId: 'slack', text: UNBROKEN_URL },
		{ integrationId: 'github', text: '1 migration reviewed' },
	],
	usage: { percent: 142 },
};

export const emptyAgentsBuilder: AgentsBuilderData = {
	...AGENTS_BUILDER_DEMO,
	integrations: [],
	categories: [],
	featuredIntegrationIds: [],
	agents: [],
	inbox: [],
	schedules: [],
	skills: [],
	starterPacks: [],
	recommendations: [],
	heroHighlights: [],
	models: [],
	modelSections: undefined,
	usage: { percent: 0 },
};

export const oneAgentsBuilder: AgentsBuilderData = {
	...AGENTS_BUILDER_DEMO,
	agents: AGENTS_BUILDER_DEMO.agents.slice(0, 1),
	inbox: AGENTS_BUILDER_DEMO.inbox.slice(0, 1),
	schedules: AGENTS_BUILDER_DEMO.schedules.slice(0, 1),
	skills: AGENTS_BUILDER_DEMO.skills.slice(0, 1),
	starterPacks: AGENTS_BUILDER_DEMO.starterPacks.slice(0, 1),
	integrations: AGENTS_BUILDER_DEMO.integrations.slice(0, 1),
	recommendations: AGENTS_BUILDER_DEMO.recommendations.slice(0, 1),
	heroHighlights: AGENTS_BUILDER_DEMO.heroHighlights.slice(0, 1),
	featuredIntegrationIds: AGENTS_BUILDER_DEMO.featuredIntegrationIds.slice(0, 1),
};

export const hugeAgentsBuilder: AgentsBuilderData = {
	...AGENTS_BUILDER_DEMO,
	agents: manyRows(1_000, (index): AgentSummary => ({ id: `agent-${index}`, name: `Agent ${index + 1}`, running: index % 7 === 0 })),
	skills: manyRows(1_000, (index): Skill => ({
		id: `skill-${index}`,
		name: `skill-${index + 1}`,
		description: 'Reviewing a query or dbt model',
		type: (['Analysis', 'Modeling', 'Governance', 'Workflow'] as const)[index % 4]!,
		agentIds: ['revenue-analyst', 'churn-radar'],
		author: { name: names.longHyphenated },
		updatedAt: '2026-09-22T09:00:00Z',
		updatedLabel: `${index}h ago`,
	})),
	inbox: manyRows(1_000, (index): InboxThread => ({ ...demoThread, id: `thread-${index}`, contact: { ...demoThread.contact, name: `Contact ${index + 1}` }, time: '9:41' })),
	integrations: manyRows(1_000, (index): Integration => ({ ...AGENTS_BUILDER_DEMO.integrations[2]!, id: `app-${index}`, name: `App ${index + 1}`, connected: index % 5 === 0, categoryId: 'data' })),
	schedules: manyRows(200, (index): AgentSchedule => ({ ...AGENTS_BUILDER_DEMO.schedules[0]!, id: `sched-${index}`, name: `Schedule ${index + 1}`, running: false })),
};

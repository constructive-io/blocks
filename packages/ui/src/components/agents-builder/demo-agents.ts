import type { AgentBlueprint, AgentDetail, AgentRunScript } from './types';

// Roster agents the demo opens on its own: each blueprint and its latest run.

const CHURN_RADAR: AgentBlueprint = {
	id: 'churn-radar',
	name: 'Churn Radar',
	title: 'Churn Radar Agent',
	tagline: 'Finds accounts going quiet before they renew',
	instructions: {
		heading: 'Churn Radar Agent',
		meta: 'Full system prompt. Version 1.6 · owner: Theo · last change: billing changes dropped before scoring.',
		paragraphs: [
			'You are Churn Radar. Every weekday you score the accounts renewing in the next 90 days on how their usage moved over the last 30, and hand customer success a short list of the ones that need a call.',
			'A 25% drop in active usage is a flag; 40% is high. Weigh seat cuts and open support tickets, but never score on revenue alone: a large account holding steady is not at risk.',
			'Check every Stripe cancellation against billing-exceptions and the CRM before counting it. A move to annual invoicing or to a reseller is a billing change, not churn.',
			'Post the list to #customer-success with each account’s owner. Never contact a customer, and never change a subscription.',
		],
	},
	schedule: { when: 'Weekdays 10:00 AM', label: 'at-risk scan', cron: 'cron 0 10 * * 1-5', zone: 'UTC' },
	trigger: { integrationId: 'stripe', label: 'Stripe webhook', conditions: ['type=subscription.updated', 'seats_delta<0'] },
	channelsNotice: 'Set an agent identity to configure channels',
	memory: ['risk-thresholds', 'billing-exceptions'],
	tools: [
		{ id: 'snowflake-usage', label: 'Snowflake Query usage_30d', integrationId: 'snowflake' },
		{ id: 'stripe-renewals', label: 'Stripe List upcoming renewals', integrationId: 'stripe' },
		{ id: 'hubspot-owners', label: 'HubSpot Read account owners', integrationId: 'hubspot' },
		{ id: 'zendesk-tickets', label: 'Zendesk Read open tickets', integrationId: 'zendesk' },
		{ id: 'amplitude-seats', label: 'Amplitude Read active seats', integrationId: 'amplitude' },
	],
	subagents: ['usage_scorer', 'renewal_matcher', 'billing_change_filter', 'owner_router'],
	skills: ['churn-scoring', 'cohort-analysis'],
};

const CHURN_RADAR_RUN: AgentRunScript = {
	command: { verb: 'Run', skill: 'at-risk-scan', scope: 'for Sep 24' },
	reasoning: {
		seconds: 11,
		text: 'Kestrel Bank cut 12 seats in Stripe this morning, which is what started this run. A seat cut alone is not risk; usage falling ahead of a renewal is. So score everyone renewing in the next 90 days on 30-day usage, then drop billing changes like Halcyon before anything reaches customer success.',
	},
	plan: [
		'Load risk thresholds and exceptions',
		'Pull usage, renewals and owners',
		'Score accounts renewing in 90 days',
		'Drop billing changes and route owners',
		'Write the at-risk list',
	],
	paragraphs: [
		'Starting the at-risk scan for Sep 24. Kestrel Bank cut 12 seats in Stripe at 08:52, which started this run early; the scan still covers every account renewing before Dec 23, not only Kestrel.',
		'risk-thresholds flags a 25% usage drop over 30 days and calls 40% high. billing-exceptions lists accounts whose Stripe cancellations are invoicing changes, so those come off before anyone is asked to call.',
	],
	steps: CHURN_RADAR.tools,
	query: {
		name: 'at_risk_accounts.sql',
		sql: [
			'select a.name             as account,',
			'       u.usage_change_30d,',
			'       r.renews_on,',
			'       r.mrr,',
			'       s.risk',
			'from analytics.usage_30d u',
			'join billing.upcoming_renewals r using (account_id)',
			'join analytics.accounts a using (account_id)',
			'join analytics.churn_scores s using (account_id)',
			'where r.renews_on < current_date + 90',
			'  and u.usage_change_30d <= -0.25',
			'  and not r.billing_change',
			'order by s.score desc;',
		].join('\n'),
		columns: ['Account', 'Usage 30d', 'Renews', 'MRR', 'Risk'],
		rows: [
			['Brightline Freight', '−52%', 'Nov 14', '$9,800', 'High'],
			['Corvid Labs', '−47%', 'Dec 2', '$7,200', 'High'],
			['Pelican Dental', '−41%', 'Nov 30', '$6,450', 'High'],
			['Kestrel Bank', '−33%', 'Oct 19', '$12,600', 'Medium'],
			['Orchard Schools', '−29%', 'Dec 18', '$4,150', 'Medium'],
		],
		caption: '$40,200 MRR renewing by Dec 23 · 5 rows · 486 ms',
	},
	groups: [
		{ id: 'subagents', label: 'Sub-agents', items: CHURN_RADAR.subagents },
		{ id: 'skills', label: 'Skills', items: CHURN_RADAR.skills },
	],
	findings: {
		paragraphs: [
			'Five accounts renewing by Dec 23 lost 25% or more of their usage, $40.2k MRR between them. The three high-risk ones were on Tuesday’s list. Kestrel Bank is new and renews first, Oct 19: 19 of its 58 seats stopped logging in after Sep 8.',
			'Kestrel’s admin contact in HubSpot has bounced since Sep 9, so the drop likely follows a champion leaving. Halcyon Logistics is left off: its Stripe cancellation is the move to annual invoicing, already on billing-exceptions.',
		],
		sources: [
			{ title: 'usage_30d', description: 'Snowflake · analytics.usage_30d, refreshed 09:00 UTC' },
			{ title: 'Upcoming renewals', description: 'Stripe · 112 subscriptions renewing by Dec 23' },
			{ title: 'Kestrel Bank', description: 'HubSpot company · admin contact bounced Sep 9' },
		],
	},
	thinking: { seconds: 48, tokens: 2700 },
};

const DATA_QUALITY_MONITOR: AgentBlueprint = {
	id: 'data-quality-monitor',
	name: 'Data Quality Monitor',
	title: 'Data Quality Monitor Agent',
	tagline: 'Catches late tables before the dashboards do',
	instructions: {
		heading: 'Data Quality Monitor Agent',
		meta: 'Full system prompt. Version 2.0 · owner: Jonas · last change: late tables traced to a change before alerting.',
		paragraphs: [
			'You are the Data Quality Monitor. Every hour you check the 14 tables in freshness-slas against their SLA and say which are late, by how much, and why.',
			'Read freshness from the load column each table declares. When a column is renamed upstream, map it in column-mappings and say so; never skip a table to make a check pass.',
			'Trace anything late to the dbt run, merge or upstream incident behind it before alerting. An alert without a cause is a page someone has to repeat.',
			'Post to #data-alerts only. Never rerun a job or merge a fix without approval.',
		],
	},
	schedule: { when: 'Every hour', label: 'freshness checks', cron: 'cron 0 * * * *', zone: 'UTC' },
	trigger: { integrationId: 'dbt', label: 'dbt job finished', conditions: ['status=error', 'job=nightly'] },
	channelsNotice: 'Set an agent identity to configure channels',
	memory: ['freshness-slas', 'column-mappings'],
	tools: [
		{ id: 'dbt-runs', label: 'dbt Read model runs', integrationId: 'dbt' },
		{ id: 'postgres-slas', label: 'Postgres Read freshness SLAs', integrationId: 'postgres' },
		{ id: 'postgres-freshness', label: 'Postgres Check loaded_at on 14 tables', integrationId: 'postgres' },
		{ id: 'github-merges', label: 'GitHub Read merged PRs · warehouse', integrationId: 'github' },
		{ id: 'datadog-monitors', label: 'Datadog Read ingestion monitors', integrationId: 'datadog' },
	],
	subagents: ['freshness_checker', 'lineage_tracer', 'change_matcher'],
	skills: ['anomaly-detection', 'sql-review', 'schema-migration'],
};

const DATA_QUALITY_MONITOR_RUN: AgentRunScript = {
	command: { verb: 'Run', skill: 'freshness-check', scope: 'for Sep 24 · 08:00' },
	reasoning: {
		seconds: 8,
		text: 'The 08:00 freshness check is due. Fourteen tables, each with its own SLA in freshness-slas, from 1h for payments to 6h for invoices. Read the newest load per table, compare it with the SLA, and if anything is late, match it to the dbt run or merge behind it before posting, so the alert says why and not only what.',
	},
	plan: [
		'Read the overnight dbt runs',
		'Check freshness against each SLA',
		'Rank tables by age',
		'Trace anything late to its change',
		'Summarise for #data-alerts',
	],
	paragraphs: [
		'Starting the 08:00 freshness check. Reading the overnight dbt runs first, so a late table can be tied to the job that should have loaded it rather than reported on its own.',
		'freshness-slas covers 14 tables. Each check reads the newest value of the table’s load column against its SLA; anything late gets traced to the change behind it before an alert goes to #data-alerts.',
	],
	steps: DATA_QUALITY_MONITOR.tools,
	query: {
		name: 'table_freshness.sql',
		sql: [
			'select table_name,',
			'       max_loaded_at,',
			'       now() - max_loaded_at as age,',
			'       sla',
			'from monitoring.table_freshness',
			'order by age desc',
			'limit 5;',
		].join('\n'),
		columns: ['Table', 'Last loaded', 'Age', 'SLA'],
		rows: [
			['invoices', '07:45 UTC', '1h 33m', '6h'],
			['payments', '08:47 UTC', '31m', '1h'],
			['subscriptions', '08:58 UTC', '20m', '2h'],
			['orders_daily', '09:06 UTC', '12m', '2h'],
			['events_hourly', '09:10 UTC', '8m', '1h'],
		],
		caption: '14 of 14 tables inside SLA · 5 rows · 208 ms',
	},
	groups: [
		{ id: 'subagents', label: 'Sub-agents', items: DATA_QUALITY_MONITOR.subagents },
		{ id: 'skills', label: 'Skills', items: DATA_QUALITY_MONITOR.skills },
	],
	findings: {
		paragraphs: [
			'All 14 tables are inside their SLA. The 08:00 check failed because PR #412 renamed orders_daily.loaded_at to ingested_at. The check now reads ingested_at for orders_daily, which last loaded at 09:06 UTC, 12 minutes ago against a 2h SLA.',
			'The oldest load is invoices at 1h 33m, well inside its 6h SLA. column-mappings now records the rename, so the next column change on orders shows up as a mapping to confirm instead of a failed run.',
		],
		sources: [
			{ title: 'table_freshness', description: 'Postgres · monitoring.table_freshness, 14 tables' },
			{ title: 'PR #412', description: 'GitHub · Rename order columns, merged Sep 24' },
			{ title: 'orders_daily', description: 'dbt Cloud · last build 09:06 UTC' },
		],
	},
	failure: {
		stepId: 'postgres-freshness',
		message: 'Column orders_daily.loaded_at no longer exists.',
		log: [
			'08:00:41 UTC  freshness  analytics.orders_daily  ERROR',
			'ERROR:  column "loaded_at" does not exist',
			'LINE 1: select max(loaded_at) as last_loaded from analytics.orders_daily',
			'                   ^',
			'HINT:  Perhaps you meant to reference the column "orders_daily.ingested_at".',
		].join('\n'),
		retryLabel: 'Retry run',
	},
	thinking: { seconds: 35, tokens: 1900 },
};

const SCHEMA_STEWARD: AgentBlueprint = {
	id: 'schema-steward',
	name: 'Schema Steward',
	title: 'Schema Steward Agent',
	tagline: 'Keeps every migration in the right schema',
	instructions: {
		heading: 'Schema Steward Agent',
		meta: 'Full system prompt. Version 1.4 · owner: Ines · last change: billing tables live in billing with RLS on.',
		paragraphs: [
			'You are the Schema Steward. Nightly, you compare production with the migrations on main; on every pull request that touches migrations/, you check the new migration before it merges.',
			'Every table belongs to a domain schema. Tables holding customer or billing data need RLS on and grants only to their service role; public is for shared lookups.',
			'Use schema-migration to check locks, backfills and RLS. When the branch has a migrated preview database, read it instead of parsing the SQL.',
			'Comment on the pull request and file drift in Linear · Data platform. Ask before suggesting a schema the author did not choose, and never push to someone else’s branch.',
		],
	},
	schedule: { when: 'Daily 02:00 AM', label: 'nightly drift check', cron: 'cron 0 2 * * *', zone: 'UTC' },
	trigger: { integrationId: 'github', label: 'GitHub pull request', conditions: ['path=migrations/**', 'base=main'] },
	channelsNotice: 'Set an agent identity to configure channels',
	memory: ['schema-conventions', 'drift-history'],
	tools: [
		{ id: 'github-pr', label: 'GitHub Read pull request #427', integrationId: 'github' },
		{ id: 'github-migrations', label: 'GitHub Read migrations on main', integrationId: 'github' },
		{ id: 'postgres-schema', label: 'Postgres List schemas', integrationId: 'postgres' },
		{ id: 'postgres-grants', label: 'Postgres Read grants and RLS policies', integrationId: 'postgres' },
		{ id: 'dbt-sources', label: 'dbt Read sources', integrationId: 'dbt' },
	],
	subagents: ['migration_reader', 'drift_differ', 'grant_auditor', 'lock_checker'],
	skills: ['schema-migration', 'sql-review'],
};

const SCHEMA_STEWARD_RUN: AgentRunScript = {
	command: { verb: 'Run', skill: 'migration-review', scope: 'for PR #427' },
	reasoning: {
		seconds: 16,
		text: 'PR #427 adds a migration that creates three billing_ tables. Every other billing table lives in the billing schema with RLS on and only billing_service granted; if these land in public, app_user can read invoices across tenants. Check main and production for the convention first, then ask, since where the tables live is the author’s call.',
	},
	plan: [
		'Read the migration in PR #427',
		'Compare with main and production',
		'Check schemas, grants and RLS',
		'Review locks and backfills',
		'Write up the drift',
		'Ask where the tables belong',
	],
	paragraphs: [
		'Reviewing PR #427 (feat/usage-billing) against the schema rules. Its migration, 0142_usage_billing.sql, creates three tables and grants nothing explicitly, so where they land is the first thing to check.',
		'Main and production matched at last night’s drift check, so anything new comes from this branch. The preview database already has the migration applied, which shows the real result instead of a guess from the SQL.',
	],
	steps: SCHEMA_STEWARD.tools,
	query: {
		name: 'billing_tables.sql',
		sql: [
			'select c.relname        as table_name,',
			'       n.nspname        as schema,',
			'       c.relrowsecurity as rls,',
			"       string_agg(g.grantee, ', ') as grants",
			'from pg_class c',
			'join pg_namespace n on n.oid = c.relnamespace',
			'left join information_schema.role_table_grants g',
			'  on g.table_schema = n.nspname and g.table_name = c.relname',
			"where c.relkind = 'r'",
			"  and (c.relname like 'billing_%' or n.nspname = 'billing')",
			'group by 1, 2, 3',
			'order by 2 desc, 1;',
		].join('\n'),
		columns: ['Table', 'Schema', 'RLS', 'Grants'],
		rows: [
			['billing_credits', 'public', 'off', 'app_user'],
			['billing_invoices', 'public', 'off', 'app_user'],
			['billing_line_items', 'public', 'off', 'app_user'],
			['payment_methods', 'billing', 'on', 'billing_service'],
			['subscriptions', 'billing', 'on', 'billing_service'],
		],
		caption: '3 of 5 billing tables outside billing · 5 rows · 94 ms',
	},
	groups: [
		{ id: 'subagents', label: 'Sub-agents', items: SCHEMA_STEWARD.subagents },
		{ id: 'skills', label: 'Skills', items: SCHEMA_STEWARD.skills },
	],
	findings: {
		paragraphs: [
			'Three new tables, billing_invoices, billing_line_items and billing_credits, land in public with RLS off and a grant to app_user. The other billing tables live in billing with RLS on, so as written any signed-in user could read every tenant’s invoices.',
			'The rest of the migration is safe: no locks on existing tables and no backfill. Moving the tables is a two-line change, but it changes what the app queries, so it is Leo’s call where they belong.',
		],
		sources: [
			{ title: 'PR #427', description: 'GitHub · feat/usage-billing, 0142_usage_billing.sql' },
			{ title: 'Schema conventions', description: 'Notion · Data platform / Schemas' },
			{ title: 'Preview database', description: 'Postgres · pr-427 branch, migrated 08:51 UTC' },
		],
	},
	question: {
		title: 'Which schema should own the new billing tables?',
		questions: [
			{
				id: 'owner-schema',
				question: 'Where should billing_invoices, billing_line_items and billing_credits live?',
				options: [
					{
						id: 'billing',
						label: 'Move them to billing',
						reply: 'Moving all three to billing, next to subscriptions and payment_methods. The comment on #427 has the edited migration ready to commit.',
					},
					{
						id: 'public',
						label: 'Keep them in public',
						reply: 'Keeping them in public as Leo wrote them. The comment still asks for RLS, since app_user can read every row as it stands.',
					},
					{
						id: 'usage-billing',
						label: 'New usage_billing schema',
						reply: 'Proposing a usage_billing schema with its own service role. It is a bigger change, so it goes on #427 as a suggestion.',
					},
				],
			},
			{
				id: 'rls',
				question: 'Turn on row-level security in the same migration?',
				options: [
					{ id: 'same-pr', label: 'Yes, in this PR', reply: 'RLS goes into 0142 itself, so the tables never exist without it.' },
					{
						id: 'follow-up',
						label: 'In a follow-up PR',
						reply: 'Filed the RLS work in Linear and linked it from #427, so it cannot merge unnoticed.',
					},
				],
			},
		],
		steps: [
			{ id: 'github-comment', label: 'GitHub Comment on PR #427', integrationId: 'github' },
			{ id: 'linear-issue', label: 'Linear Create issue · Data platform', integrationId: 'linear' },
		],
		answeredText:
			'Commented on PR #427 with the change and filed it in Linear · Data platform. Tonight’s drift check flags it again if it merges as is.',
		skippedText: 'Left PR #427 without a comment. The three tables stay on tonight’s drift report until someone picks a schema.',
	},
	thinking: { seconds: 52, tokens: 3000 },
};

const METRICS_LIBRARIAN: AgentBlueprint = {
	id: 'metrics-librarian',
	name: 'Metrics Librarian',
	title: 'Metrics Librarian Agent',
	tagline: 'One name for every metric, the one finance uses',
	instructions: {
		heading: 'Metrics Librarian Agent',
		meta: 'Full system prompt. Version 1.2 · owner: Mira · last change: old names kept as aliases for 90 days.',
		paragraphs: [
			'You are the Metrics Librarian. You keep metric names in dbt, Metabase and Notion matching the finance glossary, which is the source of truth.',
			'When the glossary changes, rename the dbt metric to the glossary term and keep the old name as an alias for 90 days. Count every Metabase question on the old name first.',
			'A rename never changes what a metric counts. If the glossary definition differs from dbt, stop and raise it in #data-team instead of renaming.',
			'Open renames as pull requests and record each one in Metrics / Glossary.',
		],
	},
	schedule: { when: 'Fri 04:00 PM', label: 'weekly glossary sync', cron: 'cron 0 16 * * 5', zone: 'UTC' },
	trigger: { integrationId: 'notion', label: 'Notion page updated', conditions: ['page=Finance / Glossary', 'status=approved'] },
	channelsNotice: 'Set an agent identity to configure channels',
	memory: ['metric-definitions', 'finance-glossary'],
	tools: [
		{ id: 'notion-glossary', label: 'Notion Read Finance / Glossary', integrationId: 'notion' },
		{ id: 'dbt-metrics', label: 'dbt Read metric definitions', integrationId: 'dbt' },
		{ id: 'metabase-questions', label: 'Metabase List questions by metric', integrationId: 'metabase' },
		{ id: 'github-pr', label: 'GitHub Open PR · metric renames', integrationId: 'github' },
		{ id: 'notion-metrics', label: 'Notion Update Metrics / Glossary', integrationId: 'notion' },
	],
	subagents: ['glossary_reader', 'name_differ', 'usage_counter', 'alias_writer'],
	skills: ['metric-definitions', 'glossary-sync'],
};

const METRICS_LIBRARIAN_RUN: AgentRunScript = {
	command: { verb: 'Run', skill: 'glossary-sync', scope: 'for Sep 23' },
	reasoning: {
		seconds: 9,
		text: 'Finance approved the new glossary, which is what the paused sync was waiting on. Three dbt metric names no longer match it. A rename is safe only if nothing downstream breaks, so count every Metabase question on the old names, keep aliases, and confirm each definition is unchanged before touching a name.',
	},
	plan: [
		'Read the approved glossary',
		'Compare dbt metric names',
		'Count questions on each old name',
		'Rename with 90-day aliases',
		'Update Metrics / Glossary',
	],
	paragraphs: [
		'Syncing metric names with the finance glossary Ana approved on Sep 23. Reading the glossary first, then the five revenue metrics in dbt it covers, so each name is compared with the term finance signs off on.',
		'Renames are cheap in dbt and expensive in dashboards. Every Metabase question on an old name gets counted before anything changes, and the old names stay as aliases for 90 days so nothing goes blank.',
	],
	steps: METRICS_LIBRARIAN.tools,
	query: {
		name: 'metric_names.sql',
		sql: [
			'select m.name      as dbt_metric,',
			'       g.term      as glossary_term,',
			'       count(q.id) as questions,',
			"       case when m.name = g.term then 'match' else 'rename' end as status",
			'from governance.dbt_metrics m',
			'join governance.finance_glossary g using (metric_key)',
			'left join governance.metabase_questions q using (metric_key)',
			'group by 1, 2',
			'order by status desc, questions desc;',
		].join('\n'),
		columns: ['dbt metric', 'Glossary term', 'Questions', 'Status'],
		rows: [
			['nrr', 'net_revenue_retention', '14', 'Rename'],
			['gross_churn', 'gross_revenue_churn', '9', 'Rename'],
			['active_customers', 'paying_accounts', '6', 'Rename'],
			['mrr', 'mrr', '31', 'Match'],
			['arr', 'arr', '12', 'Match'],
		],
		caption: '3 renames · 29 questions affected · 5 rows · 141 ms',
	},
	groups: [
		{ id: 'subagents', label: 'Sub-agents', items: METRICS_LIBRARIAN.subagents },
		{ id: 'skills', label: 'Skills', items: METRICS_LIBRARIAN.skills },
	],
	findings: {
		paragraphs: [
			'Renamed 3 metrics to match the finance glossary: nrr, gross_churn and active_customers are now net_revenue_retention, gross_revenue_churn and paying_accounts in PR #431. The old names stay as aliases until Dec 22, so all 29 Metabase questions keep working.',
			'Each glossary term has the same definition as the metric it replaces, so no number changes. Metrics / Glossary in Notion lists the old names under each term until the aliases drop.',
		],
		sources: [
			{ title: 'Finance glossary', description: 'Notion · Finance / Glossary, approved Sep 23' },
			{ title: 'PR #431', description: 'GitHub · Rename 3 metrics to glossary terms' },
			{ title: 'Metabase', description: '29 questions on the renamed metrics' },
		],
	},
	thinking: { seconds: 41, tokens: 2300 },
};

const FORECAST_PLANNER: AgentBlueprint = {
	id: 'forecast-planner',
	name: 'Forecast Planner',
	title: 'Forecast Planner Agent',
	tagline: 'Forecasts MRR with a range, every month',
	instructions: {
		heading: 'Forecast Planner Agent',
		meta: 'Full system prompt. Version 3.1 · owner: Sana · last change: signed renewals treated as kept.',
		paragraphs: [
			'You are the Forecast Planner. On the 1st of each month you forecast MRR to the end of the next quarter, month by month, with an 80% range and the gap to the FY26 plan.',
			'Fit on MRR history as metric-definitions defines it. Count pipeline at stage-weighted odds and treat signed renewals as kept, whatever Stripe shows.',
			'Explain every move from last month’s forecast larger than $5k, and name the cohort or deal behind it.',
			'Post to #finance. Never change the plan, and never share a forecast outside finance without approval.',
		],
	},
	schedule: { when: '1st 08:00 AM', label: 'monthly forecast', cron: 'cron 0 8 1 * *', zone: 'UTC' },
	trigger: { integrationId: 'hubspot', label: 'HubSpot deal stage', conditions: ['stage=closed_won', 'amount>50000'] },
	channelsNotice: 'Set an agent identity to configure channels',
	memory: ['metric-definitions', 'fy26-plan'],
	tools: [
		{ id: 'snowflake-history', label: 'Snowflake Query mrr_history', integrationId: 'snowflake' },
		{ id: 'hubspot-pipeline', label: 'HubSpot Read pipeline', integrationId: 'hubspot' },
		{ id: 'stripe-renewals', label: 'Stripe List upcoming renewals', integrationId: 'stripe' },
		{ id: 'google-drive-plan', label: 'Google Drive Read FY26 operating plan', integrationId: 'google-drive' },
		{ id: 'notion-pricing', label: 'Notion Read Pricing log', integrationId: 'notion' },
	],
	subagents: ['history_loader', 'pipeline_weigher', 'scenario_builder', 'variance_explainer'],
	skills: ['metric-definitions', 'scenario-modeling', 'board-report'],
};

const FORECAST_PLANNER_RUN: AgentRunScript = {
	command: { verb: 'Run', skill: 'monthly-forecast', scope: 'for Oct–Dec' },
	reasoning: {
		seconds: 18,
		text: 'Last month put Q4 exit MRR at $1.46M, 2.8% above plan. Since then Halcyon moved to annual invoicing and the 2025-Q2 Team cohort started contracting. Halcyon’s renewal is signed, so it should not move the forecast; the contraction should, if it holds. Refit on actuals through Sep 23, weigh the pipeline, then compare with the plan month by month.',
	},
	plan: [
		'Load MRR history and the FY26 plan',
		'Pull pipeline and renewals',
		'Fit the forecast by month',
		'Run scenarios and explain variance',
		'Write the forecast for #finance',
	],
	paragraphs: [
		'Starting the monthly forecast for Oct–Dec. Loading MRR history through Sep 23 and the FY26 operating plan, so each month is set against the number finance committed to, not against last month’s forecast.',
		'metric-definitions spreads annual plans monthly, so Halcyon’s move to annual invoicing nets to zero here. Pipeline counts only at stage-weighted odds, and renewals signed in HubSpot are treated as kept.',
	],
	steps: FORECAST_PLANNER.tools,
	query: {
		name: 'mrr_forecast.sql',
		sql: [
			'select month,',
			'       forecast_mrr,',
			'       lower_80,',
			'       upper_80,',
			'       forecast_mrr / plan_mrr - 1 as vs_plan',
			'from planning.mrr_forecast',
			'where run_date = current_date',
			'order by month;',
		].join('\n'),
		columns: ['Month', 'Forecast MRR', '80% range', 'vs plan'],
		rows: [
			['Sep', '$1.400M', '$1.394M–$1.406M', '+2.0%'],
			['Oct', '$1.412M', '$1.391M–$1.433M', '+1.7%'],
			['Nov', '$1.431M', '$1.395M–$1.467M', '+1.9%'],
			['Dec', '$1.452M', '$1.401M–$1.503M', '+2.3%'],
		],
		caption: 'Dec exit $1.452M (±3.5%) · 4 rows · 1.2 s',
	},
	groups: [
		{ id: 'subagents', label: 'Sub-agents', items: FORECAST_PLANNER.subagents },
		{ id: 'skills', label: 'Skills', items: FORECAST_PLANNER.skills },
	],
	findings: {
		paragraphs: [
			'Q4 exit MRR is forecast at $1.452M (80% range $1.401M–$1.503M), 2.3% above plan and $8k below last month’s $1.46M. The $8k is the Team-plan contraction in the 2025-Q2 cohort, carried forward at its September rate.',
			'Halcyon nets to zero: its renewal is signed and annual billing is spread monthly. Weighted enterprise pipeline is $188k new MRR across 14 deals, unchanged since Sep 1, so the range widens with time, not with new risk.',
		],
		sources: [
			{ title: 'mrr_history', description: 'Snowflake · finance.mrr_history, through Sep 23' },
			{ title: 'Q4 pipeline', description: 'HubSpot · 14 open deals, stage-weighted' },
			{ title: 'FY26 operating plan', description: 'Google Drive · Finance / Plans' },
		],
	},
	thinking: { seconds: 74, tokens: 4100 },
};

export const DEMO_AGENT_DETAILS: AgentDetail[] = [
	{ agent: CHURN_RADAR, run: CHURN_RADAR_RUN },
	{ agent: DATA_QUALITY_MONITOR, run: DATA_QUALITY_MONITOR_RUN },
	{ agent: SCHEMA_STEWARD, run: SCHEMA_STEWARD_RUN },
	{ agent: METRICS_LIBRARIAN, run: METRICS_LIBRARIAN_RUN },
	{ agent: FORECAST_PLANNER, run: FORECAST_PLANNER_RUN },
];

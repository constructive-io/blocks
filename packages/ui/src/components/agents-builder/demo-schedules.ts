import type { AgentSchedule, ScheduleRunStatus } from './types';

// Scheduled runs for the demo workspace. The clock is fixed so the timeline
// renders identically on the server and the client.

export const DEMO_CLOCK = { now: '09:18', label: 'Wed, Sep 24' };

const pad = (value: number) => String(value).padStart(2, '0');

/** Run times across a day at a fixed interval, in minutes. */
function every(minutes: number, from = 0): string[] {
	const times: string[] = [];
	for (let at = from; at < 24 * 60; at += minutes) times.push(`${pad(Math.floor(at / 60))}:${pad(at % 60)}`);
	return times;
}

const ok = (count: number): ScheduleRunStatus[] => Array.from({ length: count }, () => 'success');

export const DEMO_SCHEDULES: AgentSchedule[] = [
	{
		id: 'freshness-checks',
		agentId: 'data-quality-monitor',
		name: 'Freshness checks',
		cadence: 'Every hour',
		cron: '0 * * * *',
		zone: 'UTC',
		active: true,
		running: true,
		nextRun: 'Running now',
		deliversTo: '#data-alerts',
		integrationIds: ['dbt', 'postgres', 'slack'],
		history: [...ok(9), 'failed', ...ok(3), 'failed'],
		today: every(60),
		lastRun: {
			status: 'failed',
			when: '08:00',
			duration: '48s',
			summary: 'orders_daily missed its 2h SLA after a column rename upstream. The fix is waiting for approval in the Inbox.',
		},
		steps: [
			{ id: 'dbt-runs', label: 'dbt Read model runs', integrationId: 'dbt' },
			{ id: 'postgres-freshness', label: 'Postgres Check loaded_at on 14 tables', integrationId: 'postgres' },
			{ id: 'slack-alert', label: 'Slack Post #data-alerts', integrationId: 'slack' },
		],
	},
	{
		id: 'kpi-anomalies',
		agentId: 'anomaly-watch',
		name: 'KPI anomaly scan',
		cadence: 'Every 15 minutes',
		cron: '*/15 * * * *',
		zone: 'UTC',
		active: true,
		nextRun: 'in 12m',
		deliversTo: 'Inbox',
		integrationIds: ['snowflake', 'amplitude'],
		history: [...ok(6), 'skipped', ...ok(7)],
		today: every(15),
		lastRun: { status: 'success', when: '09:15', duration: '6s', summary: 'All 12 KPIs inside their seasonal bands.' },
		steps: [
			{ id: 'snowflake-kpis', label: 'Snowflake Query kpi_minutely', integrationId: 'snowflake' },
			{ id: 'amplitude-events', label: 'Amplitude Read event volumes', integrationId: 'amplitude' },
		],
	},
	{
		id: 'at-risk-accounts',
		agentId: 'churn-radar',
		name: 'At-risk accounts',
		cadence: 'Weekdays · 10:00',
		cron: '0 10 * * 1-5',
		zone: 'UTC',
		active: true,
		nextRun: 'in 42m',
		deliversTo: '#customer-success',
		integrationIds: ['snowflake', 'stripe', 'hubspot'],
		history: [...ok(11), 'skipped', ...ok(2)],
		today: ['10:00'],
		lastRun: {
			status: 'success',
			when: 'Tue 10:00',
			duration: '2m 04s',
			summary: '3 enterprise accounts flagged: usage down 40%+ over 30 days with renewals inside 90 days.',
		},
		steps: [
			{ id: 'snowflake-usage', label: 'Snowflake Query usage_30d', integrationId: 'snowflake' },
			{ id: 'stripe-renewals', label: 'Stripe List upcoming renewals', integrationId: 'stripe' },
			{ id: 'hubspot-owners', label: 'HubSpot Read account owners', integrationId: 'hubspot' },
		],
	},
	{
		id: 'weekly-revenue',
		agentId: 'revenue-analyst',
		name: 'Weekly revenue review',
		cadence: 'Mondays · 07:30',
		cron: '30 7 * * 1',
		zone: 'UTC',
		active: true,
		nextRun: 'Mon 07:30',
		deliversTo: '#revenue',
		integrationIds: ['snowflake', 'stripe', 'slack'],
		history: ok(14),
		today: [],
		lastRun: {
			status: 'success',
			when: 'Mon 07:30',
			duration: '1m 12s',
			summary: 'Net MRR −2.1%, +3.1% without Halcyon Logistics. Posted to #revenue after approval.',
		},
		steps: [
			{ id: 'snowflake-mrr', label: 'Snowflake Query mrr_movements', integrationId: 'snowflake' },
			{ id: 'stripe-subscriptions', label: 'Stripe List subscriptions', integrationId: 'stripe' },
			{ id: 'slack-post', label: 'Slack Post #revenue', integrationId: 'slack' },
		],
	},
	{
		id: 'migration-drift',
		agentId: 'schema-steward',
		name: 'Migration drift check',
		cadence: 'Nightly · 02:00',
		cron: '0 2 * * *',
		zone: 'UTC',
		active: true,
		nextRun: 'Tonight 02:00',
		deliversTo: 'Linear · Data platform',
		integrationIds: ['postgres', 'github', 'linear'],
		history: [...ok(4), 'failed', ...ok(9)],
		today: ['02:00'],
		lastRun: { status: 'success', when: '02:00', duration: '31s', summary: 'Production matches main. No unapplied migrations.' },
		steps: [
			{ id: 'postgres-schema', label: 'Postgres List schemas', integrationId: 'postgres' },
			{ id: 'github-migrations', label: 'GitHub Read migrations on main', integrationId: 'github' },
		],
	},
	{
		id: 'q3-board-pack',
		agentId: 'board-report-writer',
		name: 'Board metrics pack',
		cadence: 'Quarterly · 1st, 10:00',
		cron: '0 10 1 */3 *',
		zone: 'UTC',
		active: true,
		nextRun: 'Oct 1',
		deliversTo: 'Notion · Board',
		integrationIds: ['snowflake', 'notion'],
		history: ok(4),
		today: [],
		lastRun: { status: 'success', when: 'Jul 1', duration: '6m 40s', summary: 'Q2 pack filed with 18 KPIs, each linked to its query.' },
		steps: [
			{ id: 'snowflake-kpis', label: 'Snowflake Query board_kpis', integrationId: 'snowflake' },
			{ id: 'notion-pack', label: 'Notion Create Board / Q3 pack', integrationId: 'notion' },
		],
	},
	{
		id: 'definitions-sync',
		agentId: 'metrics-librarian',
		name: 'Metric definitions sync',
		cadence: 'Fridays · 16:00',
		cron: '0 16 * * 5',
		zone: 'UTC',
		active: false,
		pausedNote: 'Paused by Mira · waiting on finance sign-off',
		deliversTo: 'Notion · Metrics',
		integrationIds: ['dbt', 'notion'],
		history: [...ok(8), 'skipped', 'skipped'],
		today: [],
		lastRun: { status: 'skipped', when: 'Sep 12', duration: '—', summary: 'Skipped while paused.' },
		steps: [
			{ id: 'dbt-metrics', label: 'dbt Read metric definitions', integrationId: 'dbt' },
			{ id: 'notion-metrics', label: 'Notion Update Metrics / Glossary', integrationId: 'notion' },
		],
	},
	{
		id: 'monthly-forecast',
		agentId: 'forecast-planner',
		name: 'Monthly forecast',
		cadence: '1st of the month · 08:00',
		cron: '0 8 1 * *',
		zone: 'UTC',
		active: false,
		pausedNote: 'Paused until the FY27 plan is locked',
		deliversTo: '#finance',
		integrationIds: ['snowflake', 'hubspot', 'slack'],
		history: ok(6),
		today: [],
		lastRun: { status: 'success', when: 'Sep 1', duration: '3m 18s', summary: 'Q4 exit MRR forecast $1.46M (±4%), 2.8% above plan.' },
		steps: [
			{ id: 'snowflake-history', label: 'Snowflake Query mrr_history', integrationId: 'snowflake' },
			{ id: 'hubspot-pipeline', label: 'HubSpot Read pipeline', integrationId: 'hubspot' },
		],
	},
];

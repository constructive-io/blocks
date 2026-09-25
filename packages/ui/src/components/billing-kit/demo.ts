/**
 * Demo catalog shared by the billing templates, their stories, and the docs.
 * Prices and quantities are illustrative only. The meter taxonomy mirrors the
 * platform catalog (universal, seven category pools, and task meters).
 */

import type { EntitlementGroup } from './catalog';
import type { EntitlementRow } from './plan';
import { type BillingProviderDescriptor, STRIPE_PROVIDER } from './providers';
import type { Balance, CodeRedemption, CreditCode, CreditPack, Meter, Plan, RedeemResult } from './types';

/** The fixed clock every demo is rendered at, so server and client agree. */
export const DEMO_NOW = '2026-09-24T15:00:00.000Z';
export const DEMO_PERIOD = { start: '2026-09-01T00:00:00.000Z', end: '2026-10-01T00:00:00.000Z' } as const;

const usd = (amountMinor: number) => ({ amountMinor, currency: 'usd' });

/** Deterministic daily series: a gentle weekly rhythm around `base`, rising by `trend` per day. */
export function demoDaily(days: number, base: number, trend = 0, seed = 1) {
	return Array.from({ length: days }, (_, day) => {
		const weekly = [0.62, 1.04, 1.12, 1.08, 1.1, 0.96, 0.58][(day + seed) % 7]!;
		const wobble = 1 + (((day * 37 + seed * 17) % 11) - 5) / 60;
		return Math.max(0, Math.round((base + trend * day) * weekly * wobble));
	});
}

/* ------------------------------------------------------------------ *
 * Providers
 * ------------------------------------------------------------------ */

/** Placeholder descriptors that show how a host registers more providers. */
export const DEMO_PROVIDERS: BillingProviderDescriptor[] = [
	STRIPE_PROVIDER,
	{
		id: 'paddle',
		name: 'Paddle',
		description: 'Merchant of record: handles sales tax and VAT, with hosted checkout and a customer portal.',
		brandColor: '#1d2a3a',
		monogram: 'P',
		availability: 'coming_soon',
		features: ['hostedCheckout', 'customerPortal', 'invoices', 'refunds', 'testMode'],
		credentials: [{ name: 'PADDLE_API_KEY', label: 'API key', kind: 'secret', placeholder: 'pdl_…' }],
	},
	{
		id: 'lemon-squeezy',
		name: 'Lemon Squeezy',
		description: 'Merchant of record for digital products, with checkout overlays and license keys.',
		brandColor: '#7047eb',
		monogram: 'L',
		availability: 'coming_soon',
		features: ['hostedCheckout', 'customerPortal', 'invoices', 'testMode'],
		credentials: [{ name: 'LEMON_SQUEEZY_API_KEY', label: 'API key', kind: 'secret' }],
	},
];

/* ------------------------------------------------------------------ *
 * Platform catalog
 * ------------------------------------------------------------------ */

const pool = (slug: string, displayName: string, aggregation: Meter['aggregation'] = 'cumulative'): Meter => ({
	slug,
	displayName,
	unit: 'credits',
	meterType: 'usage_pool',
	aggregation,
	creditCost: 1,
	categoryMeter: 'universal',
	periodInterval: 'month',
	active: true,
});

const task = (
	slug: string,
	displayName: string,
	categoryMeter: string,
	unit: string,
	creditCost: number | null,
	extra: Partial<Meter> = {},
): Meter => ({
	slug,
	displayName,
	unit,
	meterType: 'quota',
	aggregation: 'cumulative',
	creditCost,
	categoryMeter,
	periodInterval: 'month',
	active: true,
	...extra,
});

export const PLATFORM_METERS: Meter[] = [
	{ ...pool('universal', 'Universal credits'), categoryMeter: null, description: 'The backstop every pool falls back to.' },
	pool('compute', 'Compute'),
	pool('inference', 'Inference'),
	pool('storage', 'Storage', 'peak'),
	pool('database', 'Database'),
	pool('transfer', 'Transfer'),
	pool('messaging', 'Messaging'),
	pool('infrastructure', 'Infrastructure', 'peak'),
	task('reads', 'Read operations', 'database', 'operations', 1, { description: 'Rows read across every table, from pg_stat counters swept daily.' }),
	task('writes', 'Write operations', 'database', 'operations', 5, { description: 'Rows inserted, updated, or deleted, swept daily.' }),
	task('storage_gb', 'Table storage', 'storage', 'gigabytes', 10, { aggregation: 'peak', description: 'Relation sizes summed per table, at the month’s peak.' }),
	task('object_storage_gb', 'Object storage', 'storage', 'gigabytes', 10, { aggregation: 'peak', description: 'Bytes held in buckets, at the largest single day.' }),
	task('transfer_gb', 'Egress', 'transfer', 'gigabytes', 8, { description: 'Bytes served by the static gateway. CDN cache hits are not counted.' }),
	task('compute_seconds', 'Function time', 'compute', 'seconds', 1),
	task('llm_input_tokens', 'Model input tokens', 'inference', 'tokens', 1),
	task('llm_output_tokens', 'Model output tokens', 'inference', 'tokens', 3),
	task('embedding_tokens', 'Embedding tokens', 'inference', 'tokens', 1),
	task('emails', 'Emails', 'messaging', 'messages', 2),
	task('sms', 'SMS', 'messaging', 'messages', 5),
	task('notifications', 'Notifications', 'messaging', 'messages', 1),
	task('databases', 'Databases', 'infrastructure', 'databases', 100, { aggregation: 'peak', periodInterval: null }),
	task('seats', 'Team seats', 'infrastructure', 'seats', 50, { aggregation: 'peak', periodInterval: null }),
];

export const PLATFORM_PLANS: Plan[] = [
	{
		id: 'plan-free',
		name: 'free',
		displayName: 'Free',
		description: 'For learning, side projects, and trying ideas.',
		prices: [{ id: 'price-free-month', interval: 'month', usageType: 'licensed', amount: usd(0), active: true, externalId: 'price_1QfreeMonthly', syncState: 'synced' }],
		meterLimits: { universal: 10_000, reads: 10_000, writes: 5_000, storage_gb: 1, object_storage_gb: 5, emails: 500, sms: 100, llm_input_tokens: 100_000, llm_output_tokens: 50_000 },
		caps: { functions: 0, function_triggers: 0, branching: 0, sso: 0, custom_domains: 0, log_retention_days: 3 },
		limits: { databases: 2, seats: 3, orgs: 1 },
		highlights: ['2 databases', 'Community support'],
		active: true,
		fallback: true,
		externalId: 'prod_Qfree',
		syncState: 'synced',
	},
	{
		id: 'plan-pro',
		name: 'pro',
		displayName: 'Pro',
		description: 'For one product in production.',
		prices: [
			{ id: 'price-pro-month', interval: 'month', usageType: 'licensed', amount: usd(2_500), active: true, externalId: 'price_1QproMonthly', syncState: 'synced' },
			{ id: 'price-pro-year', interval: 'year', usageType: 'licensed', amount: usd(25_000), active: true, externalId: 'price_1QproYearly', syncState: 'synced' },
			{ id: 'price-pro-metered', interval: 'month', usageType: 'metered', amount: usd(0), active: true, externalId: 'price_1QproCredits', syncState: 'synced' },
		],
		meterLimits: { universal: 50_000, reads: 1_000_000, writes: 500_000, storage_gb: 50, object_storage_gb: 500, emails: 5_000, sms: 1_000, llm_input_tokens: 10_000_000, llm_output_tokens: 5_000_000 },
		caps: { functions: 1, function_triggers: 0, branching: 1, sso: 0, custom_domains: 1, log_retention_days: 14 },
		limits: { databases: 5, seats: 10, orgs: 1 },
		highlights: ['Cloud functions', 'Database branching', 'Usage past the allowance billed per credit'],
		active: true,
		externalId: 'prod_Qpro',
		syncState: 'synced',
	},
	{
		id: 'plan-team',
		name: 'team',
		displayName: 'Team',
		description: 'For teams running several apps with shared seats.',
		prices: [
			{ id: 'price-team-month', interval: 'month', usageType: 'licensed', amount: usd(9_900), active: true, externalId: 'price_1QteamMonthly', syncState: 'synced' },
			{ id: 'price-team-year', interval: 'year', usageType: 'licensed', amount: usd(99_000), active: true, externalId: 'price_1QteamYearly', syncState: 'pending' },
			{ id: 'price-team-metered', interval: 'month', usageType: 'metered', amount: usd(0), active: true, externalId: 'price_1QteamCredits', syncState: 'synced' },
			{ id: 'price-team-month-2025', interval: 'month', usageType: 'licensed', amount: usd(7_900), active: false, externalId: 'price_1Qteam2025', syncState: 'synced' },
		],
		meterLimits: { universal: 100_000, reads: 5_000_000, writes: 2_000_000, storage_gb: 200, object_storage_gb: 2_000, emails: 20_000, sms: 2_000, llm_input_tokens: 40_000_000, llm_output_tokens: 20_000_000 },
		caps: { functions: 1, function_triggers: 1, branching: 1, sso: 0, custom_domains: 5, log_retention_days: 30 },
		limits: { databases: 10, seats: 25, orgs: 3 },
		highlights: ['Everything in Pro', 'Trigger functions', 'Shared seats across 3 orgs'],
		recommended: true,
		active: true,
		externalId: 'prod_Qteam',
		syncState: 'synced',
	},
	{
		id: 'plan-enterprise',
		name: 'enterprise',
		displayName: 'Enterprise',
		description: 'Custom limits, SSO, and a named contact.',
		prices: [],
		meterLimits: { universal: -1, reads: -1, writes: -1, storage_gb: -1, object_storage_gb: -1, emails: -1, sms: -1, llm_input_tokens: -1, llm_output_tokens: -1 },
		caps: { functions: 1, function_triggers: 1, branching: 1, sso: 1, custom_domains: 50, log_retention_days: 365 },
		limits: { databases: -1, seats: -1, orgs: -1 },
		highlights: ['SSO and audit exports', 'Unlimited databases', 'Uptime commitment'],
		contactSales: true,
		active: true,
		externalId: 'prod_Qenterprise',
		syncState: 'synced',
	},
];

export const PLATFORM_COMPARISON_ROWS: EntitlementRow[] = [
	{ kind: 'limit', key: 'databases', label: 'Databases' },
	{ kind: 'limit', key: 'seats', label: 'Seats' },
	{ kind: 'meter', key: 'universal', label: 'Monthly credits' },
	{ kind: 'meter', key: 'writes', label: 'Write operations' },
	{ kind: 'meter', key: 'object_storage_gb', label: 'Object storage', unit: 'GB' },
	{ kind: 'cap', key: 'functions', label: 'Cloud functions' },
	{ kind: 'cap', key: 'function_triggers', label: 'Trigger functions' },
	{ kind: 'cap', key: 'branching', label: 'Branching' },
	{ kind: 'cap', key: 'sso', label: 'SSO' },
	{ kind: 'cap', key: 'log_retention_days', label: 'Log retention', unit: 'days' },
];

export const PLATFORM_ENTITLEMENT_GROUPS: EntitlementGroup[] = [
	{
		title: 'Limits',
		rows: [
			{ kind: 'limit', key: 'databases', label: 'Databases' },
			{ kind: 'limit', key: 'seats', label: 'Seats' },
			{ kind: 'limit', key: 'orgs', label: 'Organizations' },
		],
	},
	{
		title: 'Meter allowances',
		rows: [
			{ kind: 'meter', key: 'universal', label: 'Universal credits' },
			{ kind: 'meter', key: 'reads', label: 'Read operations' },
			{ kind: 'meter', key: 'writes', label: 'Write operations' },
			{ kind: 'meter', key: 'storage_gb', label: 'Table storage (GB)' },
			{ kind: 'meter', key: 'object_storage_gb', label: 'Object storage (GB)' },
			{ kind: 'meter', key: 'emails', label: 'Emails' },
			{ kind: 'meter', key: 'sms', label: 'SMS' },
			{ kind: 'meter', key: 'llm_input_tokens', label: 'Model input tokens' },
			{ kind: 'meter', key: 'llm_output_tokens', label: 'Model output tokens' },
		],
	},
	{
		title: 'Features',
		rows: [
			{ kind: 'cap', key: 'functions', label: 'Cloud functions' },
			{ kind: 'cap', key: 'function_triggers', label: 'Trigger functions' },
			{ kind: 'cap', key: 'branching', label: 'Branching' },
			{ kind: 'cap', key: 'sso', label: 'SSO' },
			{ kind: 'cap', key: 'custom_domains', label: 'Custom domains' },
			{ kind: 'cap', key: 'log_retention_days', label: 'Log retention (days)' },
		],
	},
];

export const PLATFORM_PACKS: CreditPack[] = [
	{ id: 'pack-10k', slug: 'credits-10k', displayName: 'Top-up', description: 'A little headroom for a busy week.', amount: 10_000, meterSlug: 'universal', creditType: 'permanent', price: usd(1_000), active: true },
	{
		id: 'pack-50k',
		slug: 'credits-50k',
		displayName: 'Boost',
		description: 'Covers a launch or a heavy migration month.',
		amount: 50_000,
		meterSlug: 'universal',
		creditType: 'permanent',
		price: usd(4_500),
		expiresAfterDays: 180,
		active: true,
		featured: true,
	},
	{ id: 'pack-250k', slug: 'credits-250k', displayName: 'Scale', description: 'For sustained growth between plan changes.', amount: 250_000, meterSlug: 'universal', creditType: 'permanent', price: usd(20_000), expiresAfterDays: 365, active: true },
	{ id: 'pack-legacy', slug: 'credits-5k-2025', displayName: 'Starter bundle (2025)', amount: 5_000, meterSlug: 'universal', creditType: 'permanent', price: usd(400), active: false },
];

const meter = (key: string) => ({ kind: 'meter' as const, key });
const limit = (key: string) => ({ kind: 'limit' as const, key });

export const PLATFORM_CODES: CreditCode[] = [
	{
		id: 'code-hackweek',
		code: 'HACKWEEK-2026',
		note: 'Hack week, Oct 2026',
		items: [
			{ target: meter('compute'), amount: 25_000, creditType: 'permanent', expiresAfterDays: 30 },
			{ target: meter('llm_input_tokens'), amount: 2_000_000, creditType: 'permanent', expiresAfterDays: 30 },
		],
		maxRedemptions: 300,
		redemptions: 118,
		expiresAt: '2026-10-31T23:59:59.000Z',
		active: true,
		createdAt: '2026-09-01T10:00:00.000Z',
	},
	{
		id: 'code-launch',
		code: 'LAUNCH-2026',
		note: 'Launch week',
		items: [{ target: meter('universal'), amount: 5_000, creditType: 'permanent', expiresAfterDays: 60 }],
		maxRedemptions: 500,
		redemptions: 412,
		expiresAt: '2026-10-31T23:59:59.000Z',
		active: true,
		createdAt: '2026-08-01T09:00:00.000Z',
	},
	{
		id: 'code-seats',
		code: 'TEAM-SEATS',
		note: 'Sales-assisted trials',
		items: [{ target: limit('seats'), amount: 5, creditType: 'permanent' }],
		maxRedemptions: 50,
		redemptions: 9,
		active: true,
		createdAt: '2026-07-14T09:00:00.000Z',
	},
	{
		id: 'code-edu',
		code: 'CAMPUS',
		note: 'Student program',
		items: [{ target: meter('compute'), amount: 10_000, creditType: 'period' }],
		maxRedemptions: null,
		redemptions: 1_284,
		active: true,
		createdAt: '2026-02-01T09:00:00.000Z',
	},
	{
		id: 'code-summit-1',
		code: 'SUMMIT-7KQM-X3TP',
		batch: 'SUMMIT-4HD2',
		items: [{ target: meter('compute'), amount: 15_000, creditType: 'permanent', expiresAfterDays: 90 }],
		maxRedemptions: 1,
		redemptions: 1,
		active: true,
		createdAt: '2026-09-18T09:00:00.000Z',
	},
	{
		id: 'code-summit-2',
		code: 'SUMMIT-P9WN-4RLE',
		batch: 'SUMMIT-4HD2',
		items: [{ target: meter('compute'), amount: 15_000, creditType: 'permanent', expiresAfterDays: 90 }],
		maxRedemptions: 1,
		redemptions: 0,
		active: true,
		createdAt: '2026-09-18T09:00:00.000Z',
	},
	{
		id: 'code-partner',
		code: 'PARTNER-BETA',
		note: 'Paused while the partner deal is renegotiated',
		items: [{ target: meter('universal'), amount: 50_000, creditType: 'permanent' }],
		maxRedemptions: 20,
		redemptions: 6,
		active: false,
		createdAt: '2026-06-02T09:00:00.000Z',
	},
	{
		id: 'code-hack-2025',
		code: 'HACKWEEK',
		note: 'Hack week, 2025',
		items: [{ target: meter('compute_seconds'), amount: 36_000, creditType: 'permanent' }],
		maxRedemptions: 120,
		redemptions: 120,
		expiresAt: '2026-08-01T23:59:59.000Z',
		active: true,
		createdAt: '2025-10-01T09:00:00.000Z',
	},
];

export const PLATFORM_CODE_REDEMPTIONS: CodeRedemption[] = [
	{
		id: 'redemption-1',
		codeId: 'code-hackweek',
		code: 'HACKWEEK-2026',
		accountId: 'cus-quill',
		accountName: 'Quill & Co',
		redeemedAt: '2026-09-23T16:40:00.000Z',
		items: PLATFORM_CODES[0]!.items.map((item) => ({ ...item, expiresAt: '2026-10-23T16:40:00.000Z' })),
	},
	{
		id: 'redemption-2',
		codeId: 'code-hackweek',
		code: 'HACKWEEK-2026',
		accountId: 'cus-oak',
		accountName: 'Oak Street Studio',
		redeemedAt: '2026-09-21T11:05:00.000Z',
		items: PLATFORM_CODES[0]!.items.map((item) => ({ ...item, expiresAt: '2026-10-21T11:05:00.000Z' })),
	},
	{
		id: 'redemption-3',
		codeId: 'code-launch',
		code: 'LAUNCH-2026',
		accountId: 'cus-northwind',
		accountName: 'Northwind Labs',
		redeemedAt: '2026-08-12T10:00:00.000Z',
		items: [{ ...PLATFORM_CODES[1]!.items[0]!, expiresAt: '2026-10-08T00:00:00.000Z' }],
	},
	{
		id: 'redemption-4',
		codeId: 'code-summit-1',
		code: 'SUMMIT-7KQM-X3TP',
		accountId: 'cus-theo',
		accountName: 'Theo Park',
		redeemedAt: '2026-09-19T14:22:00.000Z',
		items: [{ ...PLATFORM_CODES[4]!.items[0]!, expiresAt: '2026-12-18T14:22:00.000Z' }],
	},
];

/**
 * A stand-in for the host's redemption call, for demos and tests: it applies
 * the same checks the database does (exists, live, not expired, under its
 * limit, once per account) and resolves each grant's expiry from `now`.
 */
export function demoCodeRedeemer(options: { codes: CreditCode[]; accountId: string; accountName?: string; redeemed?: Iterable<string>; now: string }) {
	const redeemed = new Set([...(options.redeemed ?? [])].map((code) => code.toUpperCase()));
	let sequence = 0;
	return async (raw: string): Promise<RedeemResult> => {
		const value = raw.replace(/\s+/g, '').toUpperCase();
		const code = options.codes.find((candidate) => candidate.code.toUpperCase() === value);
		if (!code) return { status: 'refused', reason: 'not_found' };
		if (!code.active) return { status: 'refused', reason: 'inactive' };
		if (code.expiresAt && code.expiresAt < options.now) return { status: 'refused', reason: 'expired' };
		if (code.maxRedemptions !== null && code.redemptions >= code.maxRedemptions) return { status: 'refused', reason: 'exhausted' };
		if (redeemed.has(value)) return { status: 'refused', reason: 'already_redeemed' };
		redeemed.add(value);
		sequence += 1;
		const at = new Date(options.now).getTime();
		return {
			status: 'redeemed',
			redemption: {
				id: `demo-redemption-${sequence}`,
				codeId: code.id,
				code: code.code,
				accountId: options.accountId,
				accountName: options.accountName,
				redeemedAt: options.now,
				items: code.items.map((item) => ({
					...item,
					expiresAt: item.expiresAfterDays ? new Date(at + item.expiresAfterDays * 86_400_000).toISOString() : undefined,
				})),
			},
		};
	};
}

/** Builds a balance from a plan allowance, usage, and credits on top. */
export function demoBalance(meterSlug: string, planLimit: number, currentUsage: number, extra: Partial<Balance> = {}): Balance {
	const purchasedCredits = (extra.periodCredits ?? 0) + (extra.rolloverCredits ?? 0) + (extra.purchasedCredits ?? 0);
	return {
		meterSlug,
		planLimit,
		currentUsage,
		periodCredits: 0,
		rolloverCredits: 0,
		...extra,
		purchasedCredits,
		effectiveLimit: planLimit < 0 ? -1 : planLimit + purchasedCredits,
	};
}

/* ------------------------------------------------------------------ *
 * Tenant catalog: an app selling its own meters to its customers
 * ------------------------------------------------------------------ */

export const TENANT_METERS: Meter[] = [
	{ ...pool('universal', 'Studio credits'), categoryMeter: null },
	pool('sessions', 'Sessions'),
	pool('ai', 'AI assist'),
	task('coaching_sessions', 'Coaching sessions', 'sessions', 'sessions', 40, { description: 'Live video sessions booked through the app.' }),
	task('video_minutes', 'Recorded minutes', 'sessions', 'minutes', 1),
	task('ai_summaries', 'Session summaries', 'ai', 'summaries', 12),
	task('ai_messages', 'Assistant messages', 'ai', 'messages', 2),
	task('clients', 'Active clients', 'sessions', 'clients', null, { aggregation: 'peak', periodInterval: null }),
];

export const TENANT_PLANS: Plan[] = [
	{
		id: 'tplan-basic',
		name: 'basic',
		displayName: 'Basic',
		description: 'For coaches starting out with a handful of clients.',
		prices: [{ id: 'tprice-basic-month', interval: 'month', usageType: 'licensed', amount: usd(0), active: true, syncState: 'unsynced' }],
		meterLimits: { universal: 500, coaching_sessions: 8, video_minutes: 240, ai_summaries: 8, ai_messages: 100 },
		caps: { branded_booking: 0, group_sessions: 0, calendar_sync: 1 },
		limits: { clients: 5 },
		highlights: ['5 active clients', 'Calendar sync'],
		active: true,
		fallback: true,
		syncState: 'unsynced',
	},
	{
		id: 'tplan-plus',
		name: 'plus',
		displayName: 'Plus',
		description: 'For busy practices with recurring clients.',
		prices: [
			{ id: 'tprice-plus-month', interval: 'month', usageType: 'licensed', amount: usd(1_900), active: true, syncState: 'unsynced' },
			{ id: 'tprice-plus-year', interval: 'year', usageType: 'licensed', amount: usd(19_000), active: true, syncState: 'unsynced' },
		],
		meterLimits: { universal: 3_000, coaching_sessions: 60, video_minutes: 2_400, ai_summaries: 60, ai_messages: 1_500 },
		caps: { branded_booking: 1, group_sessions: 0, calendar_sync: 1 },
		limits: { clients: 40 },
		highlights: ['40 active clients', 'Branded booking page', 'AI session summaries'],
		recommended: true,
		active: true,
		syncState: 'unsynced',
	},
	{
		id: 'tplan-studio',
		name: 'studio',
		displayName: 'Studio',
		description: 'For studios with several coaches and group classes.',
		prices: [
			{ id: 'tprice-studio-month', interval: 'month', usageType: 'licensed', amount: usd(5_900), active: true, syncState: 'unsynced' },
			{ id: 'tprice-studio-metered', interval: 'month', usageType: 'metered', amount: usd(0), active: true, syncState: 'unsynced' },
		],
		meterLimits: { universal: 12_000, coaching_sessions: -1, video_minutes: 12_000, ai_summaries: 400, ai_messages: 10_000 },
		caps: { branded_booking: 1, group_sessions: 1, calendar_sync: 1 },
		limits: { clients: -1 },
		highlights: ['Unlimited clients', 'Group sessions', 'Usage past the allowance billed per credit'],
		active: true,
		syncState: 'unsynced',
	},
];

export const TENANT_COMPARISON_ROWS: EntitlementRow[] = [
	{ kind: 'limit', key: 'clients', label: 'Active clients' },
	{ kind: 'meter', key: 'coaching_sessions', label: 'Sessions / month' },
	{ kind: 'meter', key: 'ai_summaries', label: 'AI summaries' },
	{ kind: 'meter', key: 'universal', label: 'Studio credits' },
	{ kind: 'cap', key: 'branded_booking', label: 'Branded booking' },
	{ kind: 'cap', key: 'group_sessions', label: 'Group sessions' },
];

export const TENANT_ENTITLEMENT_GROUPS: EntitlementGroup[] = [
	{ title: 'Limits', rows: [{ kind: 'limit', key: 'clients', label: 'Active clients' }] },
	{
		title: 'Meter allowances',
		rows: [
			{ kind: 'meter', key: 'universal', label: 'Studio credits' },
			{ kind: 'meter', key: 'coaching_sessions', label: 'Coaching sessions' },
			{ kind: 'meter', key: 'video_minutes', label: 'Recorded minutes' },
			{ kind: 'meter', key: 'ai_summaries', label: 'Session summaries' },
			{ kind: 'meter', key: 'ai_messages', label: 'Assistant messages' },
		],
	},
	{
		title: 'Features',
		rows: [
			{ kind: 'cap', key: 'calendar_sync', label: 'Calendar sync' },
			{ kind: 'cap', key: 'branded_booking', label: 'Branded booking' },
			{ kind: 'cap', key: 'group_sessions', label: 'Group sessions' },
		],
	},
];

export const TENANT_CODES: CreditCode[] = [
	{
		id: 'tcode-welcome',
		code: 'WELCOME',
		note: 'New coach onboarding',
		items: [{ target: meter('ai_summaries'), amount: 20, creditType: 'permanent', expiresAfterDays: 60 }],
		maxRedemptions: 100,
		redemptions: 7,
		active: true,
		createdAt: '2026-09-02T09:00:00.000Z',
	},
];

export const TENANT_PACKS: CreditPack[] = [
	{ id: 'tpack-1k', slug: 'studio-1k', displayName: 'Session pack', description: 'Room for about 25 extra sessions.', amount: 1_000, meterSlug: 'universal', creditType: 'permanent', price: usd(1_200), active: true },
	{ id: 'tpack-5k', slug: 'studio-5k', displayName: 'Busy season', amount: 5_000, meterSlug: 'universal', creditType: 'permanent', price: usd(5_000), expiresAfterDays: 120, active: true, featured: true },
];

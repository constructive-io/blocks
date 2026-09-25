import {
	DEMO_NOW,
	DEMO_PERIOD,
	demoBalance,
	demoCodeRedeemer,
	demoDaily,
	PLATFORM_CODE_REDEMPTIONS,
	PLATFORM_CODES,
	PLATFORM_COMPARISON_ROWS,
	PLATFORM_METERS,
	PLATFORM_PACKS,
	PLATFORM_PLANS,
	TENANT_CODES,
	TENANT_COMPARISON_ROWS,
	TENANT_METERS,
	TENANT_PACKS,
	TENANT_PLANS,
} from '../billing-kit/demo';
import type { Balance, CreditGrant, FeatureCap, Invoice, LedgerEntry, LimitCounter, Subscription } from '../billing-kit/types';
import { STRIPE_PROVIDER } from '../billing-kit/providers';
import type { BillingAccountData } from './types';

const usd = (amountMinor: number) => ({ amountMinor, currency: 'usd' });
const DAYS = 24;

const balances: Balance[] = [
	demoBalance('universal', 100_000, 88_450, { rolloverCredits: 3_200, purchasedCredits: 42_600, daily: demoDaily(DAYS, 3_300, 40, 2), nextExpiresAt: '2026-10-08T00:00:00.000Z' }),
	demoBalance('database', -1, 0),
	demoBalance('reads', 5_000_000, 3_120_400, { daily: demoDaily(DAYS, 118_000, 900, 1) }),
	demoBalance('writes', 2_000_000, 1_742_900, { daily: demoDaily(DAYS, 64_000, 1_200, 3) }),
	demoBalance('storage', 12_000, 2_140),
	demoBalance('storage_gb', 200, 38),
	demoBalance('object_storage_gb', 2_000, 612, { daily: demoDaily(DAYS, 590, 2, 4) }),
	demoBalance('inference', 40_000, 25_800),
	demoBalance('llm_input_tokens', 40_000_000, 21_600_000, { daily: demoDaily(DAYS, 840_000, 8_000, 5) }),
	demoBalance('llm_output_tokens', 20_000_000, 12_900_000, { daily: demoDaily(DAYS, 510_000, 6_000, 6) }),
	demoBalance('embedding_tokens', 10_000_000, 2_300_000),
	demoBalance('messaging', 6_000, 5_730),
	demoBalance('emails', 20_000, 9_410, { daily: demoDaily(DAYS, 380, 3, 1) }),
	demoBalance('sms', 2_000, 2_000, { daily: demoDaily(DAYS, 84, 1, 2), fallbackCredits: 1_150 }),
	demoBalance('notifications', 50_000, 18_300),
	demoBalance('compute', 30_000, 8_900),
	demoBalance('compute_seconds', 360_000, 88_200, { daily: demoDaily(DAYS, 3_500, 20, 3) }),
	demoBalance('transfer', 20_000, 6_300),
	demoBalance('transfer_gb', 500, 171),
];

const grants: CreditGrant[] = [
	{ id: 'grant-code', meterSlug: 'universal', amount: 5_000, remaining: 1_200, creditType: 'permanent', source: 'code', reason: 'LAUNCH-2026', createdAt: '2026-08-12T10:00:00.000Z', expiresAt: '2026-10-08T00:00:00.000Z' },
	{ id: 'grant-boost', meterSlug: 'universal', amount: 50_000, remaining: 31_400, creditType: 'permanent', source: 'purchase', reason: 'Boost pack', createdAt: '2026-07-30T18:22:00.000Z', expiresAt: '2027-01-26T00:00:00.000Z' },
	{ id: 'grant-goodwill', meterSlug: 'universal', amount: 10_000, remaining: 10_000, creditType: 'permanent', source: 'admin', reason: 'Goodwill after the Sep 12 incident', createdAt: '2026-09-13T09:05:00.000Z' },
	{ id: 'grant-rollover', meterSlug: 'universal', amount: 3_200, remaining: 3_200, creditType: 'rollover', source: 'rollover', reason: 'Unused August allowance', createdAt: '2026-09-01T00:00:00.000Z' },
	{ id: 'grant-plan', meterSlug: 'universal', amount: 100_000, remaining: 11_550, creditType: 'period', source: 'plan', reason: 'Team plan allowance', createdAt: '2026-09-01T00:00:00.000Z' },
];

const ledger: LedgerEntry[] = [
	{ id: 'l1', at: '2026-09-24T14:12:00.000Z', meterSlug: 'sms', delta: 38, usageAfter: 2_000, ledgerClass: 'usage', entryType: 'increment', note: 'Verification codes · auth-prod' },
	{ id: 'l2', at: '2026-09-24T14:12:00.000Z', meterSlug: 'universal', delta: 190, usageAfter: 88_450, ledgerClass: 'usage', entryType: 'credit_deduction', note: '38 SMS past the allowance at 5 credits each' },
	{ id: 'l3', at: '2026-09-24T09:40:00.000Z', meterSlug: 'writes', delta: 71_200, usageAfter: 1_742_900, ledgerClass: 'usage', entryType: 'increment', note: 'Daily sweep · 4 databases' },
	{ id: 'l4', at: '2026-09-24T09:40:00.000Z', meterSlug: 'reads', delta: 131_800, usageAfter: 3_120_400, ledgerClass: 'usage', entryType: 'increment', note: 'Daily sweep · 4 databases' },
	{ id: 'l5', at: '2026-09-23T21:03:00.000Z', meterSlug: 'llm_output_tokens', delta: 640_000, usageAfter: 12_900_000, ledgerClass: 'usage', entryType: 'increment', note: 'support-assistant' },
	{ id: 'l6', at: '2026-09-23T11:18:00.000Z', meterSlug: 'sms', delta: 12, usageAfter: 1_962, ledgerClass: 'usage', entryType: 'refused', note: 'Rate window hit: 50 per hour for the account' },
	{ id: 'l7', at: '2026-09-22T16:47:00.000Z', meterSlug: 'universal', delta: 1_600, usageAfter: 84_990, ledgerClass: 'usage', entryType: 'credits_consumed', note: 'Drawn from LAUNCH-2026' },
	{ id: 'l8', at: '2026-09-22T08:30:00.000Z', meterSlug: 'databases', delta: 1, usageAfter: 7, ledgerClass: 'usage', entryType: 'increment', note: 'analytics-staging created' },
	{ id: 'l9', at: '2026-09-13T09:05:00.000Z', meterSlug: 'universal', delta: 10_000, usageAfter: 51_200, ledgerClass: 'grant', entryType: 'credit_purchase', note: 'Goodwill after the Sep 12 incident' },
	{ id: 'l10', at: '2026-09-09T13:20:00.000Z', meterSlug: 'universal', delta: 250, usageAfter: 29_400, ledgerClass: 'adjustment', entryType: 'adjustment', note: 'Duplicate egress sample corrected' },
	{ id: 'l11', at: '2026-09-01T00:00:00.000Z', meterSlug: 'universal', delta: 3_200, usageAfter: 0, ledgerClass: 'grant', entryType: 'rollover', note: 'Unused August allowance carried over' },
	{ id: 'l12', at: '2026-09-01T00:00:00.000Z', meterSlug: 'universal', delta: 96_800, usageAfter: 0, ledgerClass: 'usage', entryType: 'reset', note: 'August closed' },
	{ id: 'l13', at: '2026-09-01T00:00:00.000Z', meterSlug: 'universal', delta: 100_000, usageAfter: 0, ledgerClass: 'grant', entryType: 'plan_grant', note: 'Team plan allowance' },
	{ id: 'l14', at: '2026-08-31T23:59:00.000Z', meterSlug: 'universal', delta: 800, usageAfter: 96_800, ledgerClass: 'adjustment', entryType: 'expired', note: 'HACKWEEK credits expired' },
];

const invoices: Invoice[] = [
	{
		id: 'inv-0924',
		number: 'NW-2026-0009',
		status: 'paid',
		amountDue: usd(11_342),
		amountPaid: usd(11_342),
		periodStart: '2026-08-01T00:00:00.000Z',
		periodEnd: '2026-09-01T00:00:00.000Z',
		createdAt: '2026-09-01T00:04:00.000Z',
		paidAt: '2026-09-01T00:05:00.000Z',
		billingReason: 'subscription_cycle',
		lines: [
			{ label: 'Team plan', amount: usd(9_900), detail: 'Sep 1 – Oct 1' },
			{ label: 'Usage past the allowance', amount: usd(1_442), detail: '144,200 credits in August' },
		],
		hostedUrl: 'https://example.com/invoices/NW-2026-0009',
		pdfUrl: 'https://example.com/invoices/NW-2026-0009.pdf',
		externalId: 'in_1QnwSep',
	},
	{
		id: 'inv-0730',
		number: 'NW-2026-0008',
		status: 'paid',
		amountDue: usd(4_500),
		amountPaid: usd(4_500),
		periodStart: '2026-07-30T00:00:00.000Z',
		periodEnd: '2026-07-30T00:00:00.000Z',
		createdAt: '2026-07-30T18:22:00.000Z',
		paidAt: '2026-07-30T18:22:00.000Z',
		billingReason: 'credit_pack',
		lines: [{ label: 'Boost pack', amount: usd(4_500), detail: '50,000 credits' }],
		hostedUrl: 'https://example.com/invoices/NW-2026-0008',
		externalId: 'in_1QnwBoost',
	},
	{
		id: 'inv-0801',
		number: 'NW-2026-0007',
		status: 'paid',
		amountDue: usd(9_900),
		amountPaid: usd(9_900),
		periodStart: '2026-07-01T00:00:00.000Z',
		periodEnd: '2026-08-01T00:00:00.000Z',
		createdAt: '2026-08-01T00:03:00.000Z',
		paidAt: '2026-08-01T00:03:00.000Z',
		billingReason: 'subscription_cycle',
		lines: [{ label: 'Team plan', amount: usd(9_900), detail: 'Aug 1 – Sep 1' }],
		hostedUrl: 'https://example.com/invoices/NW-2026-0007',
		pdfUrl: 'https://example.com/invoices/NW-2026-0007.pdf',
		externalId: 'in_1QnwAug',
	},
	{
		id: 'inv-0615',
		number: 'NW-2026-0006',
		status: 'paid',
		amountDue: usd(5_871),
		amountPaid: usd(5_871),
		periodStart: '2026-06-15T00:00:00.000Z',
		periodEnd: '2026-07-01T00:00:00.000Z',
		createdAt: '2026-06-15T10:41:00.000Z',
		paidAt: '2026-06-15T10:41:00.000Z',
		billingReason: 'subscription_update',
		lines: [
			{ label: 'Team plan (prorated)', amount: usd(5_280), detail: 'Jun 15 – Jul 1' },
			{ label: 'Pro plan credit', amount: usd(-1_333), detail: 'Unused time' },
			{ label: 'Usage past the allowance', amount: usd(1_924) },
		],
		hostedUrl: 'https://example.com/invoices/NW-2026-0006',
		externalId: 'in_1QnwJun',
	},
];

const limits: LimitCounter[] = [
	{ name: 'databases', label: 'Databases', used: 7, max: 10, softMax: 8, unit: 'databases' },
	{ name: 'seats', label: 'Seats', used: 18, max: 25, unit: 'seats' },
	{ name: 'orgs', label: 'Organizations', used: 1, max: 3, unit: 'orgs' },
];

const caps: FeatureCap[] = [
	{ name: 'functions', label: 'Cloud functions', description: 'Write PL/pgSQL and SQL functions that deploy into your databases.', value: 1, kind: 'switch' },
	{ name: 'function_triggers', label: 'Trigger functions', description: 'Attach functions to table writes.', value: 1, kind: 'switch' },
	{ name: 'branching', label: 'Branching', description: 'Copy a database to try a migration safely.', value: 1, kind: 'switch' },
	{ name: 'custom_domains', label: 'Custom domains', value: 5, kind: 'number', unit: 'domains' },
	{ name: 'log_retention_days', label: 'Log retention', value: 30, kind: 'number', unit: 'days' },
	{ name: 'sso', label: 'SSO', description: 'SAML and OIDC sign-in for your team.', value: 0, kind: 'switch' },
];

const subscription: Subscription = {
	id: 'sub-northwind',
	planId: 'plan-team',
	priceId: 'price-team-month',
	status: 'active',
	lifecycle: 'active',
	startedAt: '2026-06-15T10:41:00.000Z',
	currentPeriodStart: DEMO_PERIOD.start,
	currentPeriodEnd: DEMO_PERIOD.end,
	externalId: 'sub_1QnwTeam',
};

/** Northwind Labs on the Team plan: busy, healthy, with SMS already drawing credits. */
export const BILLING_ACCOUNT_DEMO: BillingAccountData = {
	scope: 'platform',
	workspace: { name: 'Constructive' },
	accounts: [
		{ id: 'acct-northwind', name: 'Northwind Labs', kind: 'organization', role: 'owner', planName: 'Team' },
		{ id: 'acct-personal', name: 'Mira Sato', kind: 'personal', role: 'owner', planName: 'Free' },
		{ id: 'acct-acme', name: 'Acme Research', kind: 'organization', role: 'member', planName: 'Pro' },
	],
	accountId: 'acct-northwind',
	provider: STRIPE_PROVIDER,
	providerMode: 'live',
	currency: 'usd',
	creditsPerCent: 1,
	plans: PLATFORM_PLANS,
	comparisonRows: PLATFORM_COMPARISON_ROWS,
	meters: PLATFORM_METERS,
	balances,
	subscription,
	nextInvoice: usd(9_900),
	grants,
	packs: PLATFORM_PACKS,
	ledger,
	invoices,
	redemptions: PLATFORM_CODE_REDEMPTIONS.filter((redemption) => redemption.accountId === 'cus-northwind'),
	adjustments: [{ id: 'refund-1', kind: 'refund', status: 'succeeded', amount: usd(1_200), creditAmount: 1_200, reason: 'Duplicate top-up', createdAt: '2026-07-31T09:00:00.000Z', externalId: 're_1Qnw' }],
	limits,
	caps,
	alerts: [
		{ id: 'alert-universal', target: 'universal', kind: 'percent', threshold: 80, enabled: true },
		{ id: 'alert-writes', target: 'writes', kind: 'percent', threshold: 90, enabled: true },
		{ id: 'alert-databases', target: 'databases', kind: 'percent', threshold: 100, enabled: false },
	],
	rateWindows: [
		{ id: 'rw-sms-entity', meterSlug: 'sms', window: '1 hour', scope: 'entity', maxRequests: 500, lockout: '5 minutes' },
		{ id: 'rw-sms-actor', meterSlug: 'sms', window: '1 hour', scope: 'actor_in_entity', maxRequests: 100, lockout: '5 minutes' },
		{ id: 'rw-writes', meterSlug: 'writes', window: '5 minutes', scope: 'entity', maxRequests: 20_000, lockout: '2 minutes', override: true },
	],
	databases: [
		{ id: 'db-prod', name: 'storefront-prod', region: 'us-east', suspendedAt: null, suspendedReason: null },
		{ id: 'db-auth', name: 'auth-prod', region: 'us-east', suspendedAt: null, suspendedReason: null },
		{ id: 'db-analytics', name: 'analytics-staging', region: 'eu-west', suspendedAt: null, suspendedReason: null },
	],
};

export type BillingAccountScenario = 'active' | 'grace' | 'suspended' | 'checkout-pending' | 'scheduled-change' | 'review-required' | 'free' | 'member' | 'tenant';

export const BILLING_ACCOUNT_SCENARIOS: { id: BillingAccountScenario; label: string; description: string }[] = [
	{ id: 'active', label: 'Active', description: 'Team plan in good standing, one meter drawing credits.' },
	{ id: 'grace', label: 'Payment overdue', description: 'The renewal failed; the grace period runs for 6 more days.' },
	{ id: 'suspended', label: 'Suspended', description: 'Grace ended with no capacity left; two databases stopped serving.' },
	{ id: 'checkout-pending', label: 'Checkout pending', description: 'Waiting for the provider to confirm an upgrade.' },
	{ id: 'scheduled-change', label: 'Scheduled downgrade', description: 'Moving to Pro at the end of the period.' },
	{ id: 'review-required', label: 'Needs review', description: 'A provider change could not be confirmed.' },
	{ id: 'free', label: 'Free, no subscription', description: 'A personal account on the free fallback plan.' },
	{ id: 'member', label: 'Member view', description: 'A member who can read billing but not change it.' },
	{ id: 'tenant', label: 'Tenant app', description: 'A customer of a coaching app built on Constructive.' },
];

const scenarios = new Map<BillingAccountScenario, BillingAccountData>();

/**
 * A demo account for a scenario. Every variant shares the same catalog and
 * clock, and each scenario is built once, so rendering it again passes the
 * template the same object and keeps its local state.
 */
export function billingAccountScenario(id: BillingAccountScenario): BillingAccountData {
	let data = scenarios.get(id);
	if (!data) {
		data = buildScenario(id);
		scenarios.set(id, data);
	}
	return data;
}

function buildScenario(id: BillingAccountScenario): BillingAccountData {
	const base = BILLING_ACCOUNT_DEMO;
	switch (id) {
		case 'active':
			return base;
		case 'grace':
			return {
				...base,
				subscription: { ...subscription, status: 'past_due', lifecycle: 'grace', pastDueSince: '2026-09-23T00:00:00.000Z', graceDeadlineAt: '2026-09-30T00:00:00.000Z' },
				invoices: [
					{
						id: 'inv-open',
						number: 'NW-2026-0010',
						status: 'open',
						amountDue: usd(9_900),
						amountPaid: usd(0),
						periodStart: DEMO_PERIOD.start,
						periodEnd: DEMO_PERIOD.end,
						createdAt: '2026-09-23T00:02:00.000Z',
						billingReason: 'subscription_cycle',
						lines: [{ label: 'Team plan', amount: usd(9_900), detail: 'Card declined twice' }],
						hostedUrl: 'https://example.com/invoices/NW-2026-0010',
					},
					...invoices,
				],
			};
		case 'suspended': {
			const exhausted = balances.map((balance) => (balance.meterSlug === 'universal' ? { ...balance, currentUsage: balance.effectiveLimit } : balance));
			return {
				...billingAccountScenario('grace'),
				subscription: { ...subscription, status: 'unpaid', lifecycle: 'suspended', pastDueSince: '2026-09-10T00:00:00.000Z', graceDeadlineAt: '2026-09-17T00:00:00.000Z' },
				balances: exhausted,
				databases: base.databases!.map((database, index) =>
					index < 2 ? { ...database, suspendedAt: '2026-09-17T06:00:00.000Z', suspendedReason: 'billing' as const } : database,
				),
			};
		}
		case 'checkout-pending':
			return { ...base, lifecycle: 'checkout_pending' };
		case 'scheduled-change':
			return {
				...base,
				subscription: { ...subscription, scheduledChange: { planId: 'plan-pro', priceId: 'price-pro-month', effectiveAt: DEMO_PERIOD.end, state: 'scheduled' } },
			};
		case 'review-required':
			return { ...base, subscription: { ...subscription, lifecycle: 'review_required' } };
		case 'free':
			return {
				...base,
				accountId: 'acct-personal',
				subscription: undefined,
				lifecycle: 'unsubscribed',
				nextInvoice: undefined,
				balances: [
					demoBalance('universal', 10_000, 6_120, { daily: demoDaily(DAYS, 250, 2, 4) }),
					demoBalance('database', -1, 0),
					demoBalance('reads', 10_000, 7_900),
					demoBalance('writes', 5_000, 4_380),
					demoBalance('storage', 100, 12),
					demoBalance('object_storage_gb', 5, 1.4),
				],
				grants: [],
				ledger: ledger.slice(2, 5),
				invoices: [],
				adjustments: [],
				limits: [
					{ name: 'databases', label: 'Databases', used: 2, max: 2, unit: 'databases' },
					{ name: 'seats', label: 'Seats', used: 1, max: 3, unit: 'seats' },
				],
				caps: caps.map((cap) => ({ ...cap, value: cap.name === 'log_retention_days' ? 3 : 0 })),
				databases: [],
			};
		case 'member':
			return { ...base, accountId: 'acct-acme', subscription: { ...subscription, planId: 'plan-pro', priceId: 'price-pro-month' } };
		case 'tenant':
			return BILLING_ACCOUNT_TENANT_DEMO;
	}
}

/** A client of "Lumen", a coaching app that bills its own customers through its own provider account. */
export const BILLING_ACCOUNT_TENANT_DEMO: BillingAccountData = {
	scope: 'tenant',
	workspace: { name: 'Lumen' },
	accounts: [{ id: 'lumen-harbor', name: 'Harbor Coaching', kind: 'organization', role: 'owner', planName: 'Plus' }],
	accountId: 'lumen-harbor',
	provider: STRIPE_PROVIDER,
	providerMode: 'test',
	currency: 'usd',
	creditsPerCent: 1,
	plans: TENANT_PLANS,
	comparisonRows: TENANT_COMPARISON_ROWS,
	meters: TENANT_METERS,
	balances: [
		demoBalance('universal', 3_000, 2_210, { purchasedCredits: 1_000, daily: demoDaily(DAYS, 80, 1, 3) }),
		demoBalance('sessions', 2_400, 1_560),
		demoBalance('coaching_sessions', 60, 51, { daily: demoDaily(DAYS, 2, 0, 1) }),
		demoBalance('video_minutes', 2_400, 1_880),
		demoBalance('ai', 1_200, 610),
		demoBalance('ai_summaries', 60, 44),
		demoBalance('ai_messages', 1_500, 690),
	],
	subscription: { ...subscription, id: 'sub-harbor', planId: 'tplan-plus', priceId: 'tprice-plus-month', externalId: 'sub_1QharborPlus' },
	nextInvoice: usd(1_900),
	grants: [{ id: 'tg-1', meterSlug: 'universal', amount: 1_000, remaining: 1_000, creditType: 'permanent', source: 'purchase', reason: 'Session pack', createdAt: '2026-09-10T12:00:00.000Z' }],
	packs: TENANT_PACKS,
	ledger: [
		{ id: 't1', at: '2026-09-24T13:00:00.000Z', meterSlug: 'coaching_sessions', delta: 1, usageAfter: 51, ledgerClass: 'usage', entryType: 'increment', note: 'Session with J. Okafor' },
		{ id: 't2', at: '2026-09-24T13:55:00.000Z', meterSlug: 'ai_summaries', delta: 1, usageAfter: 44, ledgerClass: 'usage', entryType: 'increment', note: 'Summary drafted' },
		{ id: 't3', at: '2026-09-10T12:00:00.000Z', meterSlug: 'universal', delta: 1_000, usageAfter: 1_300, ledgerClass: 'grant', entryType: 'credit_purchase', note: 'Session pack' },
	],
	invoices: [
		{
			id: 'tinv-1',
			number: 'LUM-0412',
			status: 'paid',
			amountDue: usd(1_900),
			amountPaid: usd(1_900),
			periodStart: '2026-08-01T00:00:00.000Z',
			periodEnd: '2026-09-01T00:00:00.000Z',
			createdAt: '2026-09-01T00:01:00.000Z',
			billingReason: 'subscription_cycle',
			hostedUrl: 'https://example.com/invoices/LUM-0412',
		},
	],
	limits: [{ name: 'clients', label: 'Active clients', used: 31, max: 40, unit: 'clients' }],
	caps: [
		{ name: 'calendar_sync', label: 'Calendar sync', value: 1, kind: 'switch' },
		{ name: 'branded_booking', label: 'Branded booking', description: 'Your logo and colours on the booking page.', value: 1, kind: 'switch' },
		{ name: 'group_sessions', label: 'Group sessions', description: 'Run classes with up to 20 clients.', value: 0, kind: 'switch' },
	],
	alerts: [{ id: 'talert', target: 'coaching_sessions', kind: 'percent', threshold: 80, enabled: true }],
};

/**
 * A demo `onRedeemCode` for an account: the platform's codes (or the tenant
 * app's), refusing ones this account already redeemed. Try HACKWEEK-2026,
 * TEAM-SEATS, SUMMIT-P9WN-4RLE, or an expired, paused, or used-up code.
 */
export function demoRedeemCode(data: BillingAccountData) {
	return demoCodeRedeemer({
		codes: data.scope === 'tenant' ? TENANT_CODES : PLATFORM_CODES,
		accountId: data.accountId,
		accountName: data.accounts.find((account) => account.id === data.accountId)?.name,
		redeemed: (data.redemptions ?? []).map((redemption) => redemption.code),
		now: DEMO_NOW,
	});
}

export { DEMO_NOW };

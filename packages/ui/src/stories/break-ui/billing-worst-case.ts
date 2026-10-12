/**
 * Worst-case billing fixtures, shaped exactly like the demo catalog and
 * accounts in `components/billing-kit/demo.ts` and
 * `components/billing-account/fixtures.ts`. Every value is something a real
 * catalog, customer, or provider could hold: a 12-figure contract, a plan with
 * no description, a hyphenated plan slug, a meter pinned at 0 or past 100%, a
 * pool with a single meter, an org with sixty accounts.
 */
import { BILLING_ACCOUNT_DEMO, type BillingAccountData } from '../../components/billing-account';
import {
	type Balance,
	type CreditCode,
	type CreditGrant,
	type CreditPack,
	type CustomerSummary,
	type DatabaseStanding,
	DEMO_NOW,
	DEMO_PERIOD,
	DEMO_PROVIDERS,
	demoBalance,
	demoDaily,
	type FeatureCap,
	type Invoice,
	type LedgerEntry,
	type LimitCounter,
	type Meter,
	type Plan,
	PLATFORM_CODE_REDEMPTIONS,
	PLATFORM_COMPARISON_ROWS,
	PLATFORM_ENTITLEMENT_GROUPS,
	PLATFORM_METERS,
	type RefundOrDispute,
	STRIPE_PROVIDER,
	type Subscription,
	type UsageAlert,
} from '../../components/billing-kit';
import { BILLING_CONSOLE_DEMO, type BillingConsoleData } from '../../components/billing-console';
import { emails, identifiers, labels, manyRows, names } from './worst-case';

export { DEMO_NOW, DEMO_PERIOD };

const usd = (amountMinor: number) => ({ amountMinor, currency: 'usd' });

/* ------------------------------------------------------------------ *
 * Catalog
 * ------------------------------------------------------------------ */

export const worstMeters: Meter[] = [
	...PLATFORM_METERS.map((meter) => (meter.slug === 'transfer_gb' ? { ...meter, displayName: 'Outbound data transfer to the public internet (egress, including CDN origin pulls)', unit: 'gigabyte-hours' } : meter)),
	// A pool with exactly one meter under it ("1 meters").
	{ slug: 'analytics', displayName: 'Analytics', unit: 'credits', meterType: 'usage_pool', aggregation: 'cumulative', creditCost: 1, categoryMeter: 'universal', periodInterval: 'month', active: true },
	{ slug: 'analytics_events', displayName: 'Tracked events', unit: 'events', meterType: 'quota', aggregation: 'cumulative', creditCost: 1, categoryMeter: 'analytics', periodInterval: 'month', active: true },
	// A unit whose plural is not "singular + s".
	{ slug: 'slow_queries', displayName: 'Slow queries', unit: 'queries', meterType: 'quota', aggregation: 'cumulative', creditCost: 2, categoryMeter: 'database', periodInterval: 'month', active: true },
	// A very long pool name with no spaces to break on.
	{ slug: 'enterprise_dedicated', displayName: 'Enterprise-Dedicated-Cluster-Compute', unit: 'credits', meterType: 'usage_pool', aggregation: 'cumulative', creditCost: 1, categoryMeter: 'universal', periodInterval: 'month', active: true },
	{ slug: 'dedicated_vcpu_hours', displayName: 'Dedicated vCPU hours (reserved capacity)', unit: 'vCPU-hours', meterType: 'quota', aggregation: 'peak', creditCost: 24, categoryMeter: 'enterprise_dedicated', periodInterval: 'month', active: true, description: labels.longDescription },
];

export const worstPlans: Plan[] = [
	{
		id: 'plan-free',
		name: 'free',
		displayName: 'Free',
		prices: [{ id: 'price-free-month', interval: 'month', usageType: 'licensed', amount: usd(0), active: true, syncState: 'synced', externalId: 'price_1QfreeMonthly' }],
		meterLimits: { universal: 10_000, reads: 0, writes: 5_000 },
		caps: { functions: 0, sso: 0 },
		limits: { databases: 1, seats: 1, orgs: 1 },
		active: true,
		fallback: true,
		syncState: 'synced',
	},
	{
		id: 'plan-pro',
		name: 'pro',
		displayName: 'Pro',
		description: 'For one product in production.',
		prices: [
			{ id: 'price-pro-month', interval: 'month', usageType: 'licensed', amount: usd(2_500), active: true, syncState: 'synced', externalId: 'price_1QproMonthly' },
			{ id: 'price-pro-year', interval: 'year', usageType: 'licensed', amount: usd(25_000), active: true, syncState: 'failed', externalId: 'price_1QproYearly' },
			{ id: 'price-pro-metered', interval: 'month', usageType: 'metered', amount: usd(0), active: true, syncState: 'pending' },
		],
		meterLimits: { universal: 50_000, reads: 1_000_000, writes: 500_000 },
		caps: { functions: 1, sso: 0 },
		limits: { databases: 5, seats: 10, orgs: 1 },
		highlights: ['Cloud functions', 'SOC2-Type-II-and-ISO27001-certified-infrastructure-with-regional-failover'],
		active: true,
		syncState: 'synced',
	},
	{
		id: 'plan-enterprise-plus',
		name: 'enterprise-plus-dedicated-cluster',
		displayName: 'Enterprise-Plus-Dedicated-Cluster',
		description: labels.longDescription,
		prices: [
			{ id: 'price-ep-month', interval: 'month', usageType: 'licensed', amount: usd(1_234_567_890), discountPercent: 12, active: true, syncState: 'synced', externalId: 'price_1QenterprisePlusDedicatedClusterMonthly0001' },
			{ id: 'price-ep-year', interval: 'year', usageType: 'licensed', amount: usd(12_345_678_900), active: true, syncState: 'synced' },
			{ id: 'price-ep-metered', interval: 'month', usageType: 'metered', amount: usd(0), active: true, syncState: 'synced' },
		],
		meterLimits: { universal: 1_000_000_000, reads: -1, writes: 0, storage_gb: 1, object_storage_gb: 12_345 },
		caps: { functions: 1, sso: 1, log_retention_days: 3650 },
		limits: { databases: 1284, seats: -1, orgs: 1 },
		highlights: [
			'Dedicated cluster with a named technical account manager and quarterly architecture reviews',
			'99.99% uptime commitment backed by service credits',
			'SOC2-Type-II-and-ISO27001-certified-infrastructure-with-regional-failover',
		],
		recommended: true,
		active: true,
		externalId: 'prod_QenterprisePlusDedicatedCluster',
		syncState: 'synced',
	},
	{
		id: 'plan-business-critical',
		name: 'business-critical',
		displayName: 'Business Critical (Annual, Pre-paid, Multi-region)',
		description: 'Custom contract, negotiated per region.',
		prices: [],
		meterLimits: { universal: -1 },
		caps: { functions: 1, sso: 1 },
		limits: { databases: -1, seats: -1, orgs: -1 },
		highlights: ['Custom limits'],
		contactSales: true,
		active: true,
		syncState: 'unsynced',
	},
	{
		// A paid plan whose only price was retired: nothing active to show.
		id: 'plan-legacy',
		name: 'starter-2024',
		displayName: 'Starter 2024 (legacy)',
		description: 'Sold until 2024.',
		prices: [{ id: 'price-legacy-month', interval: 'month', usageType: 'licensed', amount: usd(1_900), active: false, syncState: 'synced' }],
		meterLimits: { universal: 20_000 },
		caps: {},
		limits: { databases: 3 },
		active: true,
		syncState: 'synced',
	},
];

export const worstComparisonRows = [
	...PLATFORM_COMPARISON_ROWS.slice(0, 4),
	{ kind: 'limit' as const, key: 'orgs', label: 'Organizations per billing account (including sandbox, staging and production)' },
	{ kind: 'meter' as const, key: 'object_storage_gb', label: 'Object storage', unit: 'GB' },
	{ kind: 'cap' as const, key: 'log_retention_days', label: 'Log retention', unit: 'days' },
];

/* ------------------------------------------------------------------ *
 * Balances, grants, ledger, limits
 * ------------------------------------------------------------------ */

export const worstBalances: Balance[] = [
	// 142% of the universal pool.
	demoBalance('universal', 1_000_000_000, 1_420_000_000, { rolloverCredits: 3_200, purchasedCredits: 0, daily: demoDaily(24, 3_300_000, 40_000, 2), nextExpiresAt: '2026-10-08T00:00:00.000Z', fallbackCredits: 1_284_000 }),
	// Pool pinned at zero usage.
	demoBalance('database', 12_000, 0),
	// Quota of zero with usage already recorded.
	demoBalance('storage_gb', 0, 3),
	// Unlimited.
	demoBalance('writes', -1, 71_200_000),
	// Exactly 100%.
	demoBalance('sms', 2_000, 2_000, { fallbackCredits: 1_150, daily: demoDaily(24, 84, 1, 2) }),
	// Negative usage after a decrement.
	demoBalance('emails', 20_000, -50),
	// 1.28 trillion of a 1 trillion allowance, on a long-named meter with a long unit.
	demoBalance('transfer', 5_000_000, 6_300_000),
	demoBalance('transfer_gb', 1_000_000_000_000, 1_284_000_000_000, { daily: demoDaily(24, 51_000_000_000, 90_000_000, 6) }),
	demoBalance('reads', 5_000_000, 3_120_400, { daily: demoDaily(24, 118_000, 900, 1) }),
	demoBalance('object_storage_gb', 2_000, 612),
	demoBalance('inference', 40_000, 25_800),
	demoBalance('llm_input_tokens', 40_000_000, 21_600_000),
	demoBalance('messaging', 6_000, 5_730),
	demoBalance('slow_queries', 10_000, 4_200),
	demoBalance('analytics', 100, 99),
	demoBalance('analytics_events', 100, 99),
	demoBalance('enterprise_dedicated', 1_234_567, 1_234_000),
	demoBalance('dedicated_vcpu_hours', 12_345, 12_001),
];

export const worstGrants: CreditGrant[] = [
	{
		id: 'grant-long-reason',
		meterSlug: 'universal',
		amount: 5_000,
		remaining: 1,
		creditType: 'permanent',
		source: 'code',
		reason: 'LAUNCH-2026-ENTERPRISE-ONBOARDING-ANNUAL-RENEWAL-CREDIT-ADJUSTMENT-EMEA',
		createdAt: '2026-08-12T10:00:00.000Z',
		expiresAt: '2026-10-08T00:00:00.000Z',
	},
	{ id: 'grant-big', meterSlug: 'universal', amount: 12_345_678, remaining: 12_345_678, creditType: 'permanent', source: 'purchase', reason: 'Boost pack', createdAt: '2026-07-30T18:22:00.000Z', expiresAt: '2027-01-26T00:00:00.000Z' },
	{ id: 'grant-empty', meterSlug: 'universal', amount: 10_000, remaining: 0, creditType: 'permanent', source: 'admin', reason: 'Goodwill after the Sep 12 incident, as agreed with the account owner during the quarterly business review', createdAt: '2026-09-13T09:05:00.000Z' },
	{ id: 'grant-zero-amount', meterSlug: 'universal', amount: 0, remaining: 0, creditType: 'period', source: 'plan', createdAt: '2026-09-01T00:00:00.000Z' },
	{ id: 'grant-other-meter', meterSlug: 'enterprise_dedicated', amount: 1_000, remaining: 1_000, creditType: 'rollover', source: 'rollover', reason: labels.markup, createdAt: '2026-09-01T00:00:00.000Z' },
	{ id: 'grant-no-reason', meterSlug: 'universal', amount: 3_200, remaining: 3_200, creditType: 'permanent', source: 'refund', createdAt: '2026-09-01T00:00:00.000Z', expiresAt: '2026-09-25T00:00:00.000Z' },
];

export const worstPacks: CreditPack[] = [
	{ id: 'pack-one', slug: 'single-credit', displayName: 'Single credit', amount: 1, meterSlug: 'universal', creditType: 'permanent', price: usd(1), expiresAfterDays: 1, active: true },
	{
		id: 'pack-long',
		slug: 'enterprise-annual-prepaid-commitment',
		displayName: 'Enterprise-Annual-Prepaid-Commitment-Pack',
		description: labels.longDescription,
		amount: 12_345_678_900,
		meterSlug: 'universal',
		creditType: 'permanent',
		price: usd(1_234_567_890),
		expiresAfterDays: 365,
		active: true,
		featured: true,
	},
	{ id: 'pack-free', slug: 'free-trial', displayName: 'Free trial credits', amount: 500, meterSlug: 'universal', creditType: 'permanent', price: usd(0), active: true },
	{ id: 'pack-below-rate', slug: 'below-rate', displayName: 'Below rate', amount: 100_000, meterSlug: 'universal', creditType: 'permanent', price: usd(5), active: true },
];

export const worstLedger: LedgerEntry[] = [
	{ id: 'l1', at: '2026-09-24T14:12:00.000Z', meterSlug: 'sms', delta: 38, usageAfter: 2_000, ledgerClass: 'usage', entryType: 'increment', note: identifiers.url },
	{ id: 'l2', at: '2026-09-24T14:12:00.000Z', meterSlug: 'universal', delta: 12_345_678_901, usageAfter: 1_420_000_000, ledgerClass: 'usage', entryType: 'credit_deduction', note: '38 SMS past the allowance at 5 credits each, charged against the Boost pack and then the Goodwill grant' },
	{ id: 'l3', at: '2026-09-24T09:40:00.000Z', meterSlug: 'writes', delta: 0, usageAfter: 71_200_000, ledgerClass: 'usage', entryType: 'unmetered', note: labels.markup },
	{ id: 'l4', at: '2026-09-24T09:40:00.000Z', meterSlug: 'a_meter_that_was_deleted_from_the_catalog', delta: 131_800, usageAfter: 3_120_400, ledgerClass: 'usage', entryType: 'increment', note: 'Daily sweep · 4 databases' },
	{ id: 'l5', at: '2026-09-23T21:03:00.000Z', meterSlug: 'transfer_gb', delta: 640_000, usageAfter: 1_284_000_000_000, ledgerClass: 'usage', entryType: 'increment', note: identifiers.snakeIdentifier },
	{ id: 'l6', at: '2026-09-23T11:18:00.000Z', meterSlug: 'sms', delta: 12, usageAfter: 1_962, ledgerClass: 'usage', entryType: 'refused', note: labels.multiline },
	{ id: 'l7', at: '1970-01-01T00:00:00.000Z', meterSlug: 'universal', delta: 1_600, usageAfter: 84_990, ledgerClass: 'usage', entryType: 'credits_consumed', note: 'Zero timestamp' },
	{ id: 'l8', at: '2026-09-22T08:30:00.000Z', meterSlug: 'universal', delta: 1, usageAfter: 7, ledgerClass: 'grant', entryType: 'credit_purchase', note: undefined },
];

export const worstLimits: LimitCounter[] = [
	{ name: 'databases', label: 'Databases per organization (including branches and read replicas)', used: 7, max: 10, softMax: 8, unit: 'databases' },
	{ name: 'seats', label: 'Seats', used: 1, max: 1, unit: 'seats' },
	{ name: 'orgs', label: 'Organizations', used: 1_284, max: 1_000, unit: 'organizations' },
	{ name: 'collaborators', label: 'External collaborators', used: 12, max: -1, unit: 'collaborators', window: 'rolling 30 days' },
	{ name: 'projects', label: 'Projects', used: 0, max: 0, unit: 'projects' },
];

export const worstCaps: FeatureCap[] = [
	{ name: 'functions', label: 'Cloud functions', description: labels.longDescription, value: 1, kind: 'switch' },
	{ name: 'sso', label: 'SAML single sign-on with just-in-time provisioning', value: 0, kind: 'switch' },
	{ name: 'custom_domains', label: 'Custom domains', value: 12_345, kind: 'number', unit: 'domains per environment' },
	{ name: 'log_retention_days', label: 'Log retention', value: 1, kind: 'number', unit: 'days' },
	{ name: 'audit_export', label: 'audit_log_export_to_customer_managed_object_storage', description: identifiers.url, value: 0, kind: 'switch' },
];

export const worstAlerts: UsageAlert[] = [
	{ id: 'a1', target: 'universal', kind: 'percent', threshold: 80, enabled: true },
	{ id: 'a2', target: 'transfer_gb', kind: 'percent', threshold: 100, enabled: true },
	{ id: 'a3', target: 'databases', kind: 'absolute', threshold: 1_000_000, enabled: false },
];

/* ------------------------------------------------------------------ *
 * Invoices
 * ------------------------------------------------------------------ */

export const worstInvoices: Invoice[] = [
	{
		id: 'inv-long',
		number: 'INV-2026-ENTERPRISE-EMEA-0000012345',
		status: 'open',
		amountDue: usd(1_234_567_890),
		amountPaid: usd(0),
		periodStart: '2026-09-01T00:00:00.000Z',
		periodEnd: '2026-10-01T00:00:00.000Z',
		createdAt: '2026-09-23T00:02:00.000Z',
		billingReason: 'subscription_cycle',
		lines: [
			{ label: 'Enterprise-Plus-Dedicated-Cluster plan, annual commitment (prepaid, EMEA region, 12 months)', amount: usd(1_234_000_000), detail: 'Sep 1, 2026 to Aug 31, 2027, billed in advance as agreed in order form OF-2026-0042' },
			{ label: 'Pro plan credit', amount: usd(-1_333), detail: 'Unused time' },
			{ label: labels.markup, amount: usd(0) },
		],
		hostedUrl: 'https://example.com/invoices/INV-2026-ENTERPRISE-EMEA-0000012345',
		pdfUrl: 'https://example.com/invoices/INV-2026-ENTERPRISE-EMEA-0000012345.pdf',
	},
	{ id: 'inv-credit', number: 'CN-0001', status: 'void', amountDue: usd(-4_250), amountPaid: usd(0), periodStart: '2026-08-01T00:00:00.000Z', periodEnd: '2026-08-01T00:00:00.000Z', createdAt: '2026-09-01T00:04:00.000Z', billingReason: 'manual' },
	{ id: 'inv-zero', number: '0', status: 'paid', amountDue: usd(0), amountPaid: usd(0), periodStart: '2026-08-01T00:00:00.000Z', periodEnd: '2026-09-01T00:00:00.000Z', createdAt: '2026-08-01T00:03:00.000Z', paidAt: '2026-08-01T00:03:00.000Z', billingReason: 'subscription_create', hostedUrl: 'https://example.com/i/0' },
	{ id: 'inv-uncollectible', number: 'NW-2026-0006', status: 'uncollectible', amountDue: usd(5_871), amountPaid: usd(0), periodStart: '2026-06-15T00:00:00.000Z', periodEnd: '2026-07-01T00:00:00.000Z', createdAt: '2026-06-15T10:41:00.000Z', billingReason: 'subscription_update', lines: [{ label: 'Team plan (prorated)', amount: usd(5_280) }] },
	{ id: 'inv-jpy', number: 'JP-2026-0003', status: 'paid', amountDue: { amountMinor: 12_345_678, currency: 'jpy' }, amountPaid: { amountMinor: 12_345_678, currency: 'jpy' }, periodStart: '2026-06-01T00:00:00.000Z', periodEnd: '2026-07-01T00:00:00.000Z', createdAt: '2026-07-01T00:03:00.000Z', paidAt: '2026-07-01T00:03:00.000Z', billingReason: 'credit_pack', hostedUrl: 'https://example.com/i/jp' },
	{ id: 'inv-kwd', number: 'KW-2026-0004', status: 'draft', amountDue: { amountMinor: 12_345_678_900, currency: 'kwd' }, amountPaid: { amountMinor: 0, currency: 'kwd' }, periodStart: '2026-06-01T00:00:00.000Z', periodEnd: '2026-07-01T00:00:00.000Z', createdAt: '2026-07-01T00:03:00.000Z', billingReason: 'subscription_cycle' },
];

export const worstAdjustments: RefundOrDispute[] = [
	{ id: 'refund-1', kind: 'refund', status: 'requires_action_from_the_card_issuer', amount: usd(-1_200), creditAmount: 1_200, reason: 'Duplicate top-up caused by a retried checkout session after the provider returned a timeout', createdAt: '2026-07-31T09:00:00.000Z' },
	{ id: 'dispute-1', kind: 'dispute', status: 'needs_response', amount: usd(1_234_567_890), reason: identifiers.url, createdAt: '2026-09-01T09:00:00.000Z', evidenceDueBy: '2026-10-01T09:00:00.000Z' },
];

export const worstSubscription: Subscription = {
	id: 'sub-worst',
	planId: 'plan-enterprise-plus',
	priceId: 'price-ep-year',
	status: 'active',
	lifecycle: 'active',
	startedAt: '2026-06-15T10:41:00.000Z',
	currentPeriodStart: '2026-01-01T00:00:00.000Z',
	currentPeriodEnd: '2027-01-01T00:00:00.000Z',
	scheduledChange: { planId: 'plan-business-critical', priceId: '', effectiveAt: '2027-01-01T00:00:00.000Z', state: 'scheduled' },
	externalId: 'sub_1QnwEnterprise',
};

/* ------------------------------------------------------------------ *
 * Accounts and the databases they own
 * ------------------------------------------------------------------ */

export const worstDatabases: DatabaseStanding[] = [
	{ id: 'db-1', name: 'storefront_prod_eu_west_1_primary_with_read_replicas', region: 'eu-west-1', suspendedAt: '2026-09-17T06:00:00.000Z', suspendedReason: 'billing' },
	...Array.from({ length: 14 }, (_, index) => ({
		id: `db-${index + 2}`,
		name: `tenant_${String(index + 1).padStart(3, '0')}_analytics_warehouse`,
		region: 'us-east-1',
		suspendedAt: '2026-09-17T06:00:00.000Z',
		suspendedReason: 'billing' as const,
	})),
];

const accountNames = [
	{ name: 'Northwind Industries Holdings International (EMEA Procurement)', kind: 'organization' as const, role: 'owner' as const, planName: 'Enterprise-Plus-Dedicated-Cluster' },
	{ name: names.cjk, kind: 'personal' as const, role: 'owner' as const, planName: 'Free' },
	{ name: names.rtl, kind: 'organization' as const, role: 'admin' as const, planName: 'Pro' },
	{ name: names.emojiFirst, kind: 'organization' as const, role: 'member' as const, planName: 'Team' },
	{ name: names.extraSpaces, kind: 'personal' as const, role: 'owner' as const },
	{ name: names.oneLetter, kind: 'organization' as const, role: 'member' as const, planName: 'Business Critical (Annual, Pre-paid, Multi-region)' },
	{ name: names.longHyphenated, kind: 'personal' as const, role: 'owner' as const, planName: 'Pro' },
	{ name: emails.long, kind: 'organization' as const, role: 'admin' as const, planName: 'Team' },
	{ name: names.vietnamese, kind: 'personal' as const, role: 'owner' as const, planName: 'Free' },
	{ name: names.particles, kind: 'organization' as const, role: 'member' as const, planName: 'Pro' },
];

export const worstAccounts = manyRows(60, (index) => {
	const base = accountNames[index % accountNames.length]!;
	return { id: `acct-${index}`, ...base, name: index < accountNames.length ? base.name : `${base.name} #${index}` };
});

export const worstPaymentMethod = { kind: 'bank_account' as const, label: 'SEPA Direct Debit', last4: '3000', detail: emails.plus };

/** The account on screen: sparse in some places, overloaded in others. */
export const worstAccount: BillingAccountData = {
	...BILLING_ACCOUNT_DEMO,
	workspace: { name: 'Wiśniewska-Kowalczyk Industrial Holdings' },
	accounts: worstAccounts,
	accountId: 'acct-0',
	provider: STRIPE_PROVIDER,
	paymentMethod: worstPaymentMethod,
	plans: worstPlans,
	comparisonRows: worstComparisonRows,
	meters: worstMeters,
	balances: worstBalances,
	subscription: worstSubscription,
	planId: undefined,
	nextInvoice: usd(1_234_567_890),
	grants: worstGrants,
	packs: worstPacks,
	ledger: worstLedger,
	invoices: worstInvoices,
	redemptions: PLATFORM_CODE_REDEMPTIONS.slice(0, 2).map((redemption) => ({
		...redemption,
		code: 'LAUNCH-2026-ENTERPRISE-ONBOARDING',
		items: [
			...redemption.items,
			{ target: { kind: 'meter' as const, key: 'enterprise_dedicated' }, amount: 12_345_678, creditType: 'rollover' as const },
			{ target: { kind: 'limit' as const, key: 'collaborators' }, amount: 1, creditType: 'period' as const },
			{ target: { kind: 'meter' as const, key: 'a_meter_that_was_deleted' }, amount: 0, creditType: 'permanent' as const },
		],
	})),
	adjustments: worstAdjustments,
	limits: worstLimits,
	caps: worstCaps,
	alerts: worstAlerts,
	databases: worstDatabases,
};

export const emptyAccount: BillingAccountData = {
	...BILLING_ACCOUNT_DEMO,
	accounts: [],
	accountId: 'none',
	provider: undefined,
	paymentMethod: undefined,
	plans: [],
	comparisonRows: [],
	meters: [],
	balances: [],
	subscription: undefined,
	planId: undefined,
	lifecycle: 'unsubscribed',
	nextInvoice: undefined,
	grants: [],
	packs: [],
	ledger: [],
	invoices: [],
	redemptions: [],
	adjustments: [],
	limits: [],
	caps: [],
	alerts: [],
	rateWindows: [],
	databases: [],
};

export const oneAccount: BillingAccountData = {
	...BILLING_ACCOUNT_DEMO,
	accounts: [{ id: 'acct-one', name: 'J', kind: 'personal', role: 'owner' }],
	accountId: 'acct-one',
	plans: BILLING_ACCOUNT_DEMO.plans.slice(0, 1),
	balances: BILLING_ACCOUNT_DEMO.balances.slice(0, 1),
	grants: BILLING_ACCOUNT_DEMO.grants.slice(0, 1),
	packs: BILLING_ACCOUNT_DEMO.packs.slice(0, 1),
	ledger: BILLING_ACCOUNT_DEMO.ledger.slice(0, 1),
	invoices: BILLING_ACCOUNT_DEMO.invoices.slice(0, 1),
	limits: BILLING_ACCOUNT_DEMO.limits.slice(0, 1),
	caps: BILLING_ACCOUNT_DEMO.caps.slice(0, 1),
	alerts: BILLING_ACCOUNT_DEMO.alerts.slice(0, 1),
	redemptions: [],
	adjustments: [],
	databases: [],
	subscription: BILLING_ACCOUNT_DEMO.subscription ? { ...BILLING_ACCOUNT_DEMO.subscription, planId: 'plan-free', priceId: 'price-free-month' } : undefined,
};

export const hugeAccount: BillingAccountData = {
	...BILLING_ACCOUNT_DEMO,
	accounts: manyRows(1_000, (index) => ({ id: `acct-${index}`, name: `Account ${index + 1} ${accountNames[index % accountNames.length]!.name}`, kind: 'organization' as const, role: 'owner' as const, planName: 'Team' })),
	accountId: 'acct-0',
	ledger: manyRows(1_000, (index): LedgerEntry => ({
		id: `huge-${index}`,
		at: new Date(Date.parse('2026-09-24T14:12:00.000Z') - index * 41 * 60_000).toISOString(),
		meterSlug: index % 2 ? 'writes' : 'reads',
		delta: 1_000 + index,
		usageAfter: 3_120_400 + index,
		ledgerClass: 'usage',
		entryType: 'increment',
		note: 'Daily sweep',
	})),
	invoices: manyRows(1_000, (index): Invoice => ({
		id: `huge-inv-${index}`,
		number: `NW-${String(index + 1).padStart(6, '0')}`,
		status: 'paid',
		amountDue: usd(9_900 + index),
		amountPaid: usd(9_900 + index),
		periodStart: '2026-08-01T00:00:00.000Z',
		periodEnd: '2026-09-01T00:00:00.000Z',
		createdAt: new Date(Date.parse('2026-09-01T00:00:00.000Z') - index * 86_400_000).toISOString(),
		billingReason: 'subscription_cycle',
		hostedUrl: `https://example.com/invoices/${index}`,
	})),
	grants: manyRows(300, (index): CreditGrant => ({ id: `huge-grant-${index}`, meterSlug: 'universal', amount: 1_000, remaining: 1_000 - index, creditType: 'permanent', source: 'purchase', reason: `Pack ${index + 1}`, createdAt: '2026-08-01T00:00:00.000Z', expiresAt: '2027-01-01T00:00:00.000Z' })),
};

/* ------------------------------------------------------------------ *
 * Console (operator side)
 * ------------------------------------------------------------------ */

const customerNames = [
	{ name: 'Northwind Industries Holdings International (EMEA Procurement)', email: emails.long },
	{ name: names.cjk, email: emails.short },
	{ name: names.rtl, email: undefined },
	{ name: names.emojiFirst, email: emails.plus },
	{ name: names.extraSpaces, email: emails.subdomains },
	{ name: names.oneLetter, email: 'j@example.com' },
	{ name: names.longHyphenated, email: undefined },
	{ name: emails.long, email: undefined },
];
const lifecycles = ['active', 'grace', 'suspended', 'review_required', 'checkout_pending', 'unsubscribed', 'ended', 'active'] as const;

export const worstCustomers: CustomerSummary[] = customerNames.map((entry, index) => ({
	id: `cus-${index}`,
	name: entry.name,
	email: entry.email,
	kind: index % 2 ? 'personal' : 'organization',
	planId: index === 0 ? 'plan-enterprise-plus' : index === 3 ? 'plan-business-critical' : index === 4 ? 'plan-missing-from-catalog' : 'plan-pro',
	lifecycle: lifecycles[index]!,
	mrr: index === 0 ? usd(1_234_567_890) : index === 2 ? usd(-4_250) : usd(index % 3 === 0 ? 0 : 2_500),
	usagePeak: [100, 142, 0, 64.5, 1, 999, -3, 82][index]!,
	since: index === 5 ? '1970-01-01T00:00:00.000Z' : '2026-06-15T10:41:00.000Z',
	externalId: index === 0 ? 'cus_QenterprisePlusDedicatedClusterEmeaProcurement0001' : `cus_Q${index}`,
	scheduledChange: index === 1 ? { planId: 'plan-enterprise-plus', priceId: 'price-ep-month', effectiveAt: '2026-10-01T00:00:00.000Z', state: 'scheduled' } : undefined,
	detail:
		index === 0
			? {
					balances: worstBalances.slice(0, 8),
					grants: worstGrants,
					overrides: [
						{ id: 'o1', limitName: 'databases_per_organization_including_branches_and_read_replicas', maxValue: 12_345, reason: labels.longDescription, expiresAt: '2026-10-15T00:00:00.000Z' },
						{ id: 'o2', limitName: 'seats', maxValue: -1 },
					],
					rateWindows: [{ id: 'rw1', meterSlug: 'writes', window: '5 minutes', scope: 'entity', maxRequests: 20_000, lockout: '2 minutes', override: true }],
					operations: [
						{ id: 'op1', action: 'schedule_plan_change_with_proration_and_provider_reconciliation', state: 'failed', createdAt: '2026-09-24T14:00:00.000Z', errorCode: `card_declined_${identifiers.snakeIdentifier}_${identifiers.snakeIdentifier}` },
						{ id: 'op2', action: 'sync_usage', state: 'uncertain', createdAt: '2026-09-23T14:00:00.000Z' },
					],
					invoices: worstInvoices.slice(0, 3),
				}
			: undefined,
}));

export const worstConsole: BillingConsoleData = {
	...BILLING_CONSOLE_DEMO,
	workspace: { name: 'Wiśniewska-Kowalczyk Industrial Holdings', databaseName: 'wisniewska_kowalczyk_industrial_holdings_platform_production_eu_west_1' },
	providers: DEMO_PROVIDERS,
	plans: worstPlans,
	meters: worstMeters,
	packs: worstPacks,
	customers: worstCustomers,
	standing: worstDatabases.map((database, index) => ({ ...database, ownerName: index === 0 ? 'Northwind Industries Holdings International (EMEA Procurement)' : undefined, note: index === 1 ? labels.longDescription : undefined })),
	revenueTrend: [usd(104_200), usd(1_129_000), usd(12_140_000), usd(133_000_000), usd(1_468_000_000), usd(12_345_678_90)],
	usageSync: { lastRunAt: null, reported: 1_284_000, pending: 12_345, failed: 1 },
	health: {
		checkedAt: '1970-01-01T00:00:00.000Z',
		ready: false,
		nextStep: labels.longDescription,
		checks: [
			{ id: 'stripe_secret', status: 'pass' },
			{ id: 'provider_mappings', status: 'fail', detail: `${identifiers.url} ${labels.longDescription}` },
			{ id: 'custom_check_that_the_provider_descriptor_has_no_copy_for', status: 'fail', detail: identifiers.snakeIdentifier },
			{ id: 'webhook_route', status: 'pending' },
			{ id: 'schedules', status: 'skipped' },
		],
	},
	entitlementGroups: PLATFORM_ENTITLEMENT_GROUPS,
};

export const worstCodes: CreditCode[] = [
	{
		id: 'code-long',
		code: 'LAUNCH-2026-ENTERPRISE-ONBOARDING',
		note: labels.longDescription,
		items: [
			{ target: { kind: 'meter', key: 'enterprise_dedicated' }, amount: 12_345_678, creditType: 'rollover', expiresAfterDays: 1 },
			{ target: { kind: 'meter', key: 'transfer_gb' }, amount: 1_284_000_000_000, creditType: 'permanent' },
			{ target: { kind: 'limit', key: 'collaborators' }, amount: 1, creditType: 'period' },
			{ target: { kind: 'meter', key: 'a_meter_that_was_deleted' }, amount: 0, creditType: 'permanent' },
		],
		maxRedemptions: 1,
		redemptions: 1,
		expiresAt: '2026-09-23T23:59:59.000Z',
		active: true,
		createdAt: '2026-09-01T10:00:00.000Z',
	},
	{ id: 'code-unlimited', code: 'ABC', items: [{ target: { kind: 'meter', key: 'universal' }, amount: 1, creditType: 'permanent' }], maxRedemptions: null, redemptions: 1_284, active: false },
	{ id: 'code-zero', code: 'ZERO', batch: 'SUMMIT-4HD2-WITH-A-VERY-LONG-BATCH-LABEL', items: [{ target: { kind: 'meter', key: 'universal' }, amount: 1, creditType: 'permanent' }], maxRedemptions: 0, redemptions: 0, active: true },
];

/** The console again, with the worst-case codes in front of the demo ones. */
export const worstConsoleWithCodes: BillingConsoleData = {
	...worstConsole,
	codes: [...worstCodes, ...BILLING_CONSOLE_DEMO.codes.slice(0, 3)],
	codeRedemptions: [
		...PLATFORM_CODE_REDEMPTIONS.slice(0, 3).map((redemption, index) => ({
			...redemption,
			id: `worst-redemption-${index}`,
			codeId: 'code-long',
			code: 'LAUNCH-2026-ENTERPRISE-ONBOARDING',
			accountName: index === 0 ? 'Northwind Industries Holdings International (EMEA Procurement)' : index === 1 ? emails.long : redemption.accountName,
		})),
	],
};

export const hugeCustomers: CustomerSummary[] = manyRows(1_284, (index) => {
	const base = worstCustomers[index % worstCustomers.length]!;
	return { ...base, id: `cus-huge-${index}`, name: index < worstCustomers.length ? base.name : `${base.name} ${index}` };
});

export const emptyConsole: BillingConsoleData = {
	...BILLING_CONSOLE_DEMO,
	connection: undefined,
	health: { checkedAt: null, ready: false, checks: [] },
	plans: [],
	meters: [],
	packs: [],
	codes: [],
	codeRedemptions: [],
	customers: [],
	standing: [],
	revenueTrend: [],
	entitlementGroups: [],
};

export const oneConsole: BillingConsoleData = {
	...BILLING_CONSOLE_DEMO,
	plans: BILLING_CONSOLE_DEMO.plans.slice(0, 1),
	packs: BILLING_CONSOLE_DEMO.packs.slice(0, 1),
	codes: BILLING_CONSOLE_DEMO.codes.slice(0, 1),
	codeRedemptions: [],
	customers: BILLING_CONSOLE_DEMO.customers.slice(0, 1),
	standing: BILLING_CONSOLE_DEMO.standing?.slice(0, 1),
	revenueTrend: BILLING_CONSOLE_DEMO.revenueTrend?.slice(0, 1),
	health: { ...BILLING_CONSOLE_DEMO.health, checks: BILLING_CONSOLE_DEMO.health.checks.slice(0, 1) },
};

export const hugeConsole: BillingConsoleData = {
	...BILLING_CONSOLE_DEMO,
	customers: hugeCustomers,
	codes: manyRows(500, (index): CreditCode => ({
		id: `code-huge-${index}`,
		code: `SUMMIT-${String(index).padStart(4, '0')}-X3TP`,
		batch: 'SUMMIT-4HD2',
		items: [{ target: { kind: 'meter', key: 'compute' }, amount: 15_000, creditType: 'permanent', expiresAfterDays: 90 }],
		maxRedemptions: 1,
		redemptions: index % 2,
		active: true,
		createdAt: '2026-09-18T09:00:00.000Z',
	})),
	standing: manyRows(300, (index): DatabaseStanding => ({
		id: `db-huge-${index}`,
		name: `tenant_${String(index).padStart(4, '0')}_analytics_warehouse`,
		ownerName: `Owner ${index}`,
		region: 'us-east-1',
		suspendedAt: index % 3 ? '2026-09-17T06:00:00.000Z' : null,
		suspendedReason: index % 3 ? 'billing' : null,
	})),
};

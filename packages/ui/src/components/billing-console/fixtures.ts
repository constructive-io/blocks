import {
	DEMO_NOW,
	DEMO_PROVIDERS,
	demoBalance,
	demoDaily,
	PLATFORM_CODE_REDEMPTIONS,
	PLATFORM_CODES,
	PLATFORM_ENTITLEMENT_GROUPS,
	PLATFORM_METERS,
	PLATFORM_PACKS,
	PLATFORM_PLANS,
	TENANT_CODES,
	TENANT_ENTITLEMENT_GROUPS,
	TENANT_METERS,
	TENANT_PACKS,
	TENANT_PLANS,
} from '../billing-kit/demo';
import { type BillingOperation, type CustomerDetail, type CustomerSummary } from '../billing-kit/types';
import type { BillingConsoleData } from './types';

const usd = (amountMinor: number) => ({ amountMinor, currency: 'usd' });

const operations = (prefix: string): BillingOperation[] => [
	{ id: `${prefix}-op3`, action: 'sync_usage', state: 'completed', createdAt: '2026-09-24T14:00:00.000Z', providerReference: 'mtrevt_1Q' },
	{ id: `${prefix}-op2`, action: 'schedule_plan_change', state: 'completed', createdAt: '2026-09-19T10:12:00.000Z', createdBy: 'mira@northwind.dev' },
	{ id: `${prefix}-op1`, action: 'sync_subscription', state: 'completed', createdAt: '2026-06-15T10:41:00.000Z' },
];

const northwindDetail: CustomerDetail = {
	balances: [
		demoBalance('universal', 100_000, 88_450, { rolloverCredits: 3_200, purchasedCredits: 42_600 }),
		demoBalance('writes', 2_000_000, 1_742_900),
		demoBalance('sms', 2_000, 2_000),
		demoBalance('llm_output_tokens', 20_000_000, 12_900_000),
		demoBalance('object_storage_gb', 2_000, 612),
		demoBalance('reads', 5_000_000, 3_120_400),
	],
	grants: [
		{ id: 'g1', meterSlug: 'universal', amount: 50_000, remaining: 31_400, creditType: 'permanent', source: 'purchase', reason: 'Boost pack', createdAt: '2026-07-30T18:22:00.000Z', expiresAt: '2027-01-26T00:00:00.000Z' },
		{ id: 'g2', meterSlug: 'universal', amount: 10_000, remaining: 10_000, creditType: 'permanent', source: 'admin', reason: 'Goodwill after the Sep 12 incident', createdAt: '2026-09-13T09:05:00.000Z' },
	],
	overrides: [{ id: 'o1', limitName: 'databases', maxValue: 12, reason: 'Migration window, approved by support', expiresAt: '2026-10-15T00:00:00.000Z' }],
	rateWindows: [
		{ id: 'rw1', meterSlug: 'writes', window: '5 minutes', scope: 'entity', maxRequests: 20_000, lockout: '2 minutes', override: true },
		{ id: 'rw2', meterSlug: 'sms', window: '1 hour', scope: 'entity', maxRequests: 500, lockout: '5 minutes' },
	],
	operations: operations('nw'),
	invoices: [
		{
			id: 'inv-nw-9',
			number: 'NW-2026-0009',
			status: 'paid',
			amountDue: usd(11_342),
			amountPaid: usd(11_342),
			periodStart: '2026-08-01T00:00:00.000Z',
			periodEnd: '2026-09-01T00:00:00.000Z',
			createdAt: '2026-09-01T00:04:00.000Z',
			billingReason: 'subscription_cycle',
			hostedUrl: 'https://example.com/invoices/NW-2026-0009',
		},
	],
};

const detail = (overrides: Partial<CustomerDetail> = {}): CustomerDetail => ({
	balances: [demoBalance('universal', 50_000, 21_400), demoBalance('writes', 500_000, 188_000), demoBalance('reads', 1_000_000, 402_000)],
	grants: [],
	overrides: [],
	rateWindows: [],
	operations: operations('c').slice(0, 1),
	invoices: [],
	...overrides,
});

const customers: CustomerSummary[] = [
	{
		id: 'cus-northwind',
		name: 'Northwind Labs',
		email: 'billing@northwind.dev',
		kind: 'organization',
		planId: 'plan-team',
		lifecycle: 'active',
		mrr: usd(9_900),
		usagePeak: 100,
		since: '2026-06-15T10:41:00.000Z',
		externalId: 'cus_Qnorthwind',
		detail: northwindDetail,
	},
	{
		id: 'cus-harbor',
		name: 'Harbor Analytics',
		email: 'ops@harbor.io',
		kind: 'organization',
		planId: 'plan-team',
		lifecycle: 'grace',
		mrr: usd(9_900),
		usagePeak: 64,
		since: '2026-02-02T00:00:00.000Z',
		externalId: 'cus_Qharbor',
		detail: detail({
			operations: [
				{ id: 'h-op2', action: 'sync_subscription', state: 'failed', createdAt: '2026-09-23T00:02:00.000Z', errorCode: 'card_declined' },
				...operations('h').slice(0, 1),
			],
		}),
	},
	{
		id: 'cus-quill',
		name: 'Quill & Co',
		email: 'hello@quill.co',
		kind: 'organization',
		planId: 'plan-pro',
		lifecycle: 'active',
		mrr: usd(2_500),
		usagePeak: 82,
		since: '2026-04-11T00:00:00.000Z',
		externalId: 'cus_Qquill',
		scheduledChange: { planId: 'plan-team', priceId: 'price-team-month', effectiveAt: '2026-10-01T00:00:00.000Z', state: 'scheduled' },
		detail: detail(),
	},
	{ id: 'cus-lumen', name: 'Lumen', email: 'finance@lumen.app', kind: 'organization', planId: 'plan-team', lifecycle: 'active', mrr: usd(9_900), usagePeak: 41, since: '2025-11-20T00:00:00.000Z', externalId: 'cus_Qlumen', detail: detail() },
	{ id: 'cus-ferro', name: 'Ferro Robotics', kind: 'organization', planId: 'plan-pro', lifecycle: 'review_required', mrr: usd(2_500), usagePeak: 33, since: '2026-08-30T00:00:00.000Z', externalId: 'cus_Qferro', detail: detail({ operations: [{ id: 'f-op', action: 'create_checkout', state: 'review_required', createdAt: '2026-09-20T08:00:00.000Z', errorCode: 'provider_timeout' }] }) },
	{ id: 'cus-mira', name: 'Mira Sato', email: 'mira@hey.com', kind: 'personal', planId: 'plan-free', lifecycle: 'unsubscribed', mrr: usd(0), usagePeak: 88, since: '2026-09-02T00:00:00.000Z' },
	{ id: 'cus-oak', name: 'Oak Street Studio', email: 'studio@oakstreet.dev', kind: 'organization', planId: 'plan-pro', lifecycle: 'active', mrr: usd(2_500), usagePeak: 27, since: '2026-03-09T00:00:00.000Z', externalId: 'cus_Qoak', detail: detail() },
	{ id: 'cus-tide', name: 'Tidepool Health', kind: 'organization', planId: 'plan-enterprise', lifecycle: 'active', mrr: usd(120_000), usagePeak: 18, since: '2025-09-01T00:00:00.000Z', externalId: 'cus_Qtide', detail: detail() },
	{ id: 'cus-kite', name: 'Kite Commerce', email: 'ap@kite.shop', kind: 'organization', planId: 'plan-pro', lifecycle: 'suspended', mrr: usd(2_500), usagePeak: 100, since: '2026-01-15T00:00:00.000Z', externalId: 'cus_Qkite', detail: detail() },
	{ id: 'cus-jonas', name: 'Jonas Weber', kind: 'personal', planId: 'plan-pro', lifecycle: 'ended', mrr: usd(0), usagePeak: 0, since: '2025-12-01T00:00:00.000Z', externalId: 'cus_Qjonas' },
	{ id: 'cus-basalt', name: 'Basalt Data', email: 'team@basalt.dev', kind: 'organization', planId: 'plan-team', lifecycle: 'checkout_pending', mrr: usd(0), usagePeak: 12, since: '2026-09-24T14:40:00.000Z' },
	{ id: 'cus-theo', name: 'Theo Park', kind: 'personal', planId: 'plan-free', lifecycle: 'unsubscribed', mrr: usd(0), usagePeak: 34, since: '2026-07-19T00:00:00.000Z' },
];

/** Constructive's own billing, run by the platform team: Stripe live, billing on, a few customers to chase. */
export const BILLING_CONSOLE_DEMO: BillingConsoleData = {
	scope: 'platform',
	workspace: { name: 'Constructive', databaseName: 'constructive_platform' },
	providers: DEMO_PROVIDERS,
	connection: {
		providerId: 'stripe',
		mode: 'live',
		accountLabel: 'Constructive, Inc.',
		accountId: 'acct_1QconstructiveHQ',
		credentials: {
			STRIPE_SECRET_KEY: { set: true, updatedAt: '2026-08-28T11:24:00.000Z' },
			STRIPE_WEBHOOK_SECRET: { set: true, updatedAt: '2026-08-28T11:30:00.000Z' },
			BILLING_PORTAL_RETURN_URL: { set: true },
		},
		connectedAt: '2026-08-28T11:24:00.000Z',
	},
	health: {
		checkedAt: '2026-09-24T06:00:00.000Z',
		ready: true,
		checks: [
			{ id: 'stripe_secret', status: 'pass' },
			{ id: 'stripe_account', status: 'pass', detail: 'Constructive, Inc. (acct_1QconstructiveHQ)' },
			{ id: 'stripe_mode', status: 'pass', detail: 'Live key, live mode.' },
			{ id: 'plan_catalog', status: 'pass' },
			{ id: 'provider_mappings', status: 'pass', detail: '4 plans and 9 prices mirrored; 1 price still syncing.' },
			{ id: 'webhook_route', status: 'pass' },
			{ id: 'webhook_signing_secret', status: 'pass' },
			{ id: 'schedules', status: 'pass' },
			{ id: 'billing_flag', status: 'pass' },
		],
	},
	settings: { enableBilling: true, creditsPerCent: 1, currency: 'usd' },
	usageSync: { lastRunAt: '2026-09-24T14:00:00.000Z', reported: 184, pending: 6, failed: 2 },
	plans: PLATFORM_PLANS,
	entitlementGroups: PLATFORM_ENTITLEMENT_GROUPS,
	meters: PLATFORM_METERS,
	packs: PLATFORM_PACKS,
	codes: PLATFORM_CODES,
	codeRedemptions: PLATFORM_CODE_REDEMPTIONS,
	customers,
	standing: [
		{ id: 'db-kite-prod', name: 'kite-prod', ownerName: 'Kite Commerce', region: 'us-east', suspendedAt: '2026-09-17T06:00:00.000Z', suspendedReason: 'billing' },
		{ id: 'db-kite-stage', name: 'kite-staging', ownerName: 'Kite Commerce', region: 'us-east', suspendedAt: '2026-09-17T06:00:00.000Z', suspendedReason: 'billing' },
		{ id: 'db-spam', name: 'free-sms-blast', ownerName: 'Unknown (personal)', region: 'eu-west', suspendedAt: '2026-09-21T19:30:00.000Z', suspendedReason: 'admin', note: 'Abuse report #4821' },
		{ id: 'db-harbor', name: 'harbor-warehouse', ownerName: 'Harbor Analytics', region: 'us-west', suspendedAt: null, suspendedReason: null, note: 'In grace until Sep 30' },
	],
	revenueTrend: [usd(104_200), usd(112_900), usd(121_400), usd(133_000), usd(146_800), usd(159_700)],
};

/** Lumen, a tenant app setting up billing for its own customers: Stripe test keys stored, webhook still missing. */
export const BILLING_CONSOLE_TENANT_DEMO: BillingConsoleData = {
	scope: 'tenant',
	workspace: { name: 'Lumen', databaseName: 'lumen_prod' },
	providers: DEMO_PROVIDERS,
	connection: {
		providerId: 'stripe',
		mode: 'test',
		accountLabel: 'Lumen Coaching (test)',
		accountId: 'acct_1QlumenTest',
		credentials: { STRIPE_SECRET_KEY: { set: true, updatedAt: '2026-09-23T17:02:00.000Z' }, STRIPE_WEBHOOK_SECRET: { set: false } },
		connectedAt: '2026-09-23T17:02:00.000Z',
	},
	health: {
		checkedAt: '2026-09-24T09:15:00.000Z',
		ready: false,
		nextStep: 'Add the webhook signing secret from your Stripe dashboard, then run the check again.',
		checks: [
			{ id: 'stripe_secret', status: 'pass' },
			{ id: 'stripe_account', status: 'pass', detail: 'Lumen Coaching (test)' },
			{ id: 'stripe_mode', status: 'pass', detail: 'Test key, test mode.' },
			{ id: 'plan_catalog', status: 'pass' },
			{ id: 'provider_mappings', status: 'fail', detail: '3 plans and 6 prices have not been mirrored yet.' },
			{ id: 'webhook_route', status: 'pass' },
			{ id: 'webhook_signing_secret', status: 'fail', detail: 'No STRIPE_WEBHOOK_SECRET stored for this database.' },
			{ id: 'schedules', status: 'pass' },
			{ id: 'billing_flag', status: 'skipped', detail: 'Turned on after every other check passes.' },
		],
	},
	settings: { enableBilling: false, creditsPerCent: 1, currency: 'usd' },
	usageSync: { lastRunAt: null, reported: 0, pending: 0, failed: 0 },
	plans: TENANT_PLANS,
	entitlementGroups: TENANT_ENTITLEMENT_GROUPS,
	meters: TENANT_METERS,
	packs: TENANT_PACKS,
	codes: TENANT_CODES,
	codeRedemptions: [],
	customers: [
		{
			id: 'tc-harbor',
			name: 'Harbor Coaching',
			email: 'dana@harborcoaching.com',
			kind: 'organization',
			planId: 'tplan-plus',
			lifecycle: 'active',
			mrr: usd(1_900),
			usagePeak: 85,
			since: '2026-05-04T00:00:00.000Z',
			detail: detail({ balances: [demoBalance('universal', 3_000, 2_210, { purchasedCredits: 1_000 }), demoBalance('coaching_sessions', 60, 51)] }),
		},
		{ id: 'tc-still', name: 'Stillwater Yoga', kind: 'organization', planId: 'tplan-studio', lifecycle: 'active', mrr: usd(5_900), usagePeak: 38, since: '2026-06-18T00:00:00.000Z', detail: detail() },
		{ id: 'tc-ines', name: 'Ines Duarte', kind: 'personal', planId: 'tplan-basic', lifecycle: 'unsubscribed', mrr: usd(0), usagePeak: 60, since: '2026-09-01T00:00:00.000Z' },
	],
	revenueTrend: [usd(0), usd(1_900), usd(3_800), usd(5_700), usd(7_800)],
};

export { DEMO_NOW, demoDaily };

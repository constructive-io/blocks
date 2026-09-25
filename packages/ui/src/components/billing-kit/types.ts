/**
 * Billing contracts shared by the Constructive billing templates.
 *
 * The vocabulary follows the Constructive billing modules: plans with licensed
 * and metered prices, meters grouped into category pools that fall back to a
 * universal credit pool, balances, credit grants, credit packs and codes,
 * limits and feature caps, the append-only ledger, the provider lifecycle, and
 * database standing. Hosts map their GraphQL (or any API) into these shapes;
 * nothing here knows about a provider SDK, a router, or a session store.
 *
 * Conventions:
 * - Money is an integer in the currency's smallest unit (`amountMinor`).
 * - A limit of `-1` means unlimited, as in the database.
 * - Timestamps are ISO 8601 strings; dates render in the host's time zone.
 */

/** Which billing plane a workspace shows: Constructive's own, or a tenant app's. */
export type BillingScope = 'platform' | 'tenant';

export type Money = {
	amountMinor: number;
	/** ISO 4217 code, lower or upper case. */
	currency: string;
};

/* ------------------------------------------------------------------ *
 * Catalog
 * ------------------------------------------------------------------ */

export type BillingInterval = 'month' | 'year' | 'one_time';

/** `licensed` is a flat amount per interval; `metered` bills burned credits as overage. */
export type UsageType = 'licensed' | 'metered';

export type PlanPrice = {
	id: string;
	interval: BillingInterval;
	usageType: UsageType;
	/** Metered prices carry 0: the per-credit charge derives from the credit rate. */
	amount: Money;
	discountPercent?: number;
	active: boolean;
	/** The provider's price id once the catalog has synced. */
	externalId?: string;
	syncState?: SyncState;
};

export type Plan = {
	id: string;
	/** Stable slug, e.g. `pro`. */
	name: string;
	displayName: string;
	description?: string;
	prices: PlanPrice[];
	/** Billing quota per meter slug (`plan_meter_limits`). */
	meterLimits: Record<string, number>;
	/** Feature caps (`plan_caps`): 0 off, 1 on, above 1 a numeric setting. */
	caps: Record<string, number>;
	/** Counted limits (`plan_limits`), e.g. databases or seats. */
	limits: Record<string, number>;
	/** Short selling points shown in comparisons. */
	highlights?: string[];
	recommended?: boolean;
	/** Priced by sales rather than checkout. */
	contactSales?: boolean;
	active: boolean;
	/** The free fallback plan an overdue subscription is downgraded to. */
	fallback?: boolean;
	externalId?: string;
	syncState?: SyncState;
};

export type MeterType = 'quota' | 'boolean' | 'usage_pool';
export type MeterAggregation = 'cumulative' | 'peak';

export type Meter = {
	slug: string;
	displayName: string;
	/** Plural unit label, e.g. `operations`, `gigabytes`, `credits`. */
	unit: string;
	meterType: MeterType;
	aggregation: MeterAggregation;
	/** Universal credits per unit when the meter's own quota runs out. `null` disables the fallback. */
	creditCost: number | null;
	/** Parent pool in the waterfall; `null` falls straight through to `universal`. */
	categoryMeter: string | null;
	periodInterval: 'month' | 'year' | null;
	rolloverCap?: number | null;
	description?: string;
	active: boolean;
};

export type CreditType = 'permanent' | 'period' | 'rollover';

export type CreditPack = {
	id: string;
	slug: string;
	displayName: string;
	description?: string;
	/** Credits granted. */
	amount: number;
	meterSlug: string;
	creditType: CreditType;
	/** Advertised price; the charge derives from `credits_per_cent`. */
	price: Money;
	expiresAfterDays?: number;
	active: boolean;
	featured?: boolean;
};

/**
 * What a code item credits: a billing meter (`meter_credits`, e.g. the
 * compute pool) or a counted limit (`limit_credits`, e.g. seats). Limits
 * only take `permanent` or `period` credits.
 */
export type CreditTarget = { kind: 'meter' | 'limit'; key: string };

export type CreditCodeItem = {
	target: CreditTarget;
	amount: number;
	creditType: CreditType;
	/** Days the granted credits last after redemption; absent means they keep. */
	expiresAfterDays?: number;
};

export type CreditCode = {
	id: string;
	/** Case-insensitive and unique; shown upper-case. */
	code: string;
	items: CreditCodeItem[];
	/** `null` means unlimited. Each billing account can redeem a code once. */
	maxRedemptions: number | null;
	redemptions: number;
	expiresAt?: string;
	/** Admin toggle; a paused code refuses redemptions without being deleted. */
	active: boolean;
	/** Internal note, e.g. the campaign it belongs to. */
	note?: string;
	/** Codes created together by a bulk run share a batch. */
	batch?: string;
	createdAt?: string;
};

/** What an operator submits to create or edit a code. */
export type CreditCodeDraft = Pick<CreditCode, 'code' | 'items' | 'maxRedemptions' | 'expiresAt' | 'active' | 'note' | 'batch'>;

/** One billing account redeeming one code. */
export type CodeRedemption = {
	id: string;
	codeId: string;
	code: string;
	accountId: string;
	accountName?: string;
	redeemedAt: string;
	/** What the redemption granted, with each grant's expiry resolved. */
	items: (CreditCodeItem & { expiresAt?: string })[];
};

export type RedeemRefusal = 'not_found' | 'inactive' | 'expired' | 'exhausted' | 'already_redeemed' | 'not_eligible';

/**
 * The host's answer to a redemption. A refusal carries the reason (and an
 * optional message to show instead of the standard copy).
 */
export type RedeemResult = { status: 'redeemed'; redemption: CodeRedemption } | { status: 'refused'; reason: RedeemRefusal; message?: string };

/* ------------------------------------------------------------------ *
 * An account's state
 * ------------------------------------------------------------------ */

export type Balance = {
	meterSlug: string;
	currentUsage: number;
	/** From the plan; negative means unlimited. */
	planLimit: number;
	/** Credits applied on top of the plan (period, rollover and permanent). */
	purchasedCredits: number;
	/** `planLimit + purchasedCredits`; negative means unlimited. */
	effectiveLimit: number;
	periodCredits: number;
	rolloverCredits: number;
	nextExpiresAt?: string;
	/** Daily usage for the current period, oldest first. */
	daily?: number[];
	/** Credits this meter drew from its pool or the universal pool this period. */
	fallbackCredits?: number;
};

export type CreditGrantSource = 'plan' | 'purchase' | 'code' | 'admin' | 'rollover' | 'refund';

export type CreditGrant = {
	id: string;
	meterSlug: string;
	amount: number;
	/** Unconsumed part; equals `amount` until drawn down. */
	remaining: number;
	creditType: CreditType;
	source: CreditGrantSource;
	reason?: string;
	createdAt: string;
	expiresAt?: string;
};

export type LedgerClass = 'usage' | 'grant' | 'adjustment' | 'refund';

export type LedgerEntryType =
	| 'increment'
	| 'decrement'
	| 'credit_purchase'
	| 'plan_grant'
	| 'reset'
	| 'adjustment'
	| 'credit_deduction'
	| 'credits_consumed'
	| 'expired'
	| 'rollover'
	| 'refused'
	| 'unmetered';

export type LedgerEntry = {
	id: string;
	at: string;
	meterSlug: string;
	delta: number;
	usageAfter: number;
	ledgerClass: LedgerClass;
	entryType: LedgerEntryType;
	/** Human context: a reason, a receipt, a database name. */
	note?: string;
};

/** A counted limit such as databases, seats, or organizations. */
export type LimitCounter = {
	name: string;
	label: string;
	used: number;
	/** `-1` means unlimited. */
	max: number;
	/** Non-blocking warning threshold. */
	softMax?: number;
	unit: string;
	/** Time-windowed limits reset; shown next to the counter. */
	window?: string;
};

/** A feature cap resolved for the account: 0 off, 1 on, above 1 a numeric setting. */
export type FeatureCap = {
	name: string;
	label: string;
	description?: string;
	value: number;
	kind: 'switch' | 'number';
	unit?: string;
};

export type UsageAlert = {
	id: string;
	/** A meter slug or a limit name. */
	target: string;
	kind: 'percent' | 'absolute';
	threshold: number;
	enabled: boolean;
};

/* ------------------------------------------------------------------ *
 * Subscription and provider lifecycle
 * ------------------------------------------------------------------ */

/** Provider-observed subscription status, normalized. */
export type ProviderStatus =
	| 'active'
	| 'trialing'
	| 'past_due'
	| 'unpaid'
	| 'canceled'
	| 'incomplete'
	| 'incomplete_expired'
	| 'paused';

/** Per-account lifecycle derived from provider observations. */
export type BillingLifecycle =
	| 'unsubscribed'
	| 'checkout_pending'
	| 'active'
	| 'grace'
	| 'suspended'
	| 'ended'
	| 'review_required';

export type ScheduledChange = {
	planId: string;
	priceId: string;
	effectiveAt: string;
	state: 'preparing' | 'scheduled';
};

export type Subscription = {
	id: string;
	planId: string;
	priceId?: string;
	status: ProviderStatus;
	lifecycle: BillingLifecycle;
	startedAt: string;
	currentPeriodStart: string;
	currentPeriodEnd: string;
	cancelAt?: string;
	pastDueSince?: string;
	graceDeadlineAt?: string;
	scheduledChange?: ScheduledChange;
	externalId?: string;
};

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export type InvoiceLine = { label: string; amount: Money; detail?: string };

export type Invoice = {
	id: string;
	number: string;
	status: InvoiceStatus;
	amountDue: Money;
	amountPaid: Money;
	periodStart: string;
	periodEnd: string;
	createdAt: string;
	paidAt?: string;
	billingReason: 'subscription_cycle' | 'subscription_create' | 'subscription_update' | 'credit_pack' | 'manual';
	lines?: InvoiceLine[];
	hostedUrl?: string;
	pdfUrl?: string;
	externalId?: string;
};

export type RefundOrDispute = {
	id: string;
	kind: 'refund' | 'dispute';
	status: string;
	amount: Money;
	/** Credits reversed along with the money, if any. */
	creditAmount?: number;
	reason?: string;
	createdAt: string;
	evidenceDueBy?: string;
	externalId?: string;
};

/* ------------------------------------------------------------------ *
 * Database standing (platform)
 * ------------------------------------------------------------------ */

export type SuspensionReason = 'billing' | 'admin';

export type DatabaseStanding = {
	id: string;
	name: string;
	ownerName?: string;
	region?: string;
	suspendedAt: string | null;
	suspendedReason: SuspensionReason | null;
	/** Why an admin placed a hold. */
	note?: string;
};

/* ------------------------------------------------------------------ *
 * Accounts and customers
 * ------------------------------------------------------------------ */

export type BillingAccountKind = 'personal' | 'organization';

export type BillingAccountRef = {
	id: string;
	name: string;
	kind: BillingAccountKind;
	/** The viewer's role; only owners and admins manage billing. */
	role?: 'owner' | 'admin' | 'member';
	/** Plan display name, shown in the switcher. */
	planName?: string;
};

export type PlanOverride = {
	id: string;
	limitName: string;
	maxValue: number;
	reason?: string;
	expiresAt?: string;
};

export type RateScope = 'entity' | 'actor_in_entity';

export type RateWindow = {
	id: string;
	meterSlug: string;
	window: string;
	scope: RateScope;
	/** `-1` means no throttle. */
	maxRequests: number;
	lockout: string;
	/** True when this row overrides the plan's window. */
	override?: boolean;
};

export type BillingOperationState = 'reserved' | 'provider_pending' | 'completed' | 'failed' | 'uncertain' | 'review_required';

export type BillingOperation = {
	id: string;
	action: string;
	state: BillingOperationState;
	createdAt: string;
	createdBy?: string;
	errorCode?: string;
	providerReference?: string;
};

export type CustomerSummary = {
	id: string;
	name: string;
	email?: string;
	kind: BillingAccountKind;
	planId: string;
	lifecycle: BillingLifecycle;
	/** Monthly recurring revenue at the current price. */
	mrr: Money;
	/** Highest share of any meter or limit used this period, 0 to 100+. */
	usagePeak: number;
	since: string;
	externalId?: string;
	scheduledChange?: ScheduledChange;
	/** Present when the host loaded the detail; the table works without it. */
	detail?: CustomerDetail;
};

export type CustomerDetail = {
	balances: Balance[];
	grants: CreditGrant[];
	overrides: PlanOverride[];
	rateWindows: RateWindow[];
	operations: BillingOperation[];
	invoices: Invoice[];
};

/* ------------------------------------------------------------------ *
 * Provider
 * ------------------------------------------------------------------ */

export type SyncState = 'synced' | 'pending' | 'failed' | 'unsynced';

export type ProviderMode = 'test' | 'live';

export type ProviderCredentialState = {
	/** Whether a value is stored. Values never travel to the browser. */
	set: boolean;
	updatedAt?: string;
};

export type ProviderConnection = {
	providerId: string;
	mode: ProviderMode;
	/** Display label for the connected account, e.g. its business name. */
	accountLabel?: string;
	accountId?: string;
	credentials: Record<string, ProviderCredentialState>;
	connectedAt?: string;
};

export type ReadinessStatus = 'pass' | 'fail' | 'pending' | 'skipped';

export type ReadinessCheck = {
	id: string;
	status: ReadinessStatus;
	/** Provider-specific detail, e.g. a missing webhook route. */
	detail?: string;
};

/** The latest `billing:doctor` verdict. `enable_billing` needs a green one under 24 hours old. */
export type BillingHealth = {
	checkedAt: string | null;
	ready: boolean;
	checks: ReadinessCheck[];
	nextStep?: string;
};

export type UsageSyncStatus = {
	lastRunAt: string | null;
	reported: number;
	pending: number;
	failed: number;
};

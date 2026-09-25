import type {
	BillingHealth,
	BillingInterval,
	BillingLifecycle,
	BillingOperationState,
	CreditGrantSource,
	CreditType,
	InvoiceStatus,
	LedgerEntryType,
	Money,
	ProviderStatus,
	ReadinessStatus,
	RedeemRefusal,
	SuspensionReason,
	SyncState,
} from './types';

export type BillingFormatOptions = {
	locale: string;
	/** IANA zone used for every date, so server and client render the same text. */
	timeZone: string;
};

export const DEFAULT_FORMAT: BillingFormatOptions = { locale: 'en-US', timeZone: 'UTC' };

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary';

export type Presentation = { label: string; tone: Tone; description?: string };

export const isUnlimited = (limit: number) => limit < 0;

/* ------------------------------------------------------------------ *
 * Cached Intl formatters
 * ------------------------------------------------------------------ */

// Intl constructors are slow and every list row formats several values, so
// each distinct option set is built once per module.
const formatters = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat | Intl.ListFormat>();

function cached<T extends Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat | Intl.ListFormat>(key: string, create: () => T): T {
	let formatter = formatters.get(key) as T | undefined;
	if (!formatter) {
		formatter = create();
		formatters.set(key, formatter);
	}
	return formatter;
}

export function numberFormat(locale: string, options: Intl.NumberFormatOptions) {
	return cached(`n|${locale}|${JSON.stringify(options)}`, () => new Intl.NumberFormat(locale, options));
}

export function dateFormat(locale: string, options: Intl.DateTimeFormatOptions) {
	return cached(`d|${locale}|${JSON.stringify(options)}`, () => new Intl.DateTimeFormat(locale, options));
}

/** "a, b, and c" in the given locale. */
export function formatList(items: string[], locale: string) {
	return cached(`l|${locale}`, () => new Intl.ListFormat(locale, { type: 'conjunction' })).format(items);
}

/* ------------------------------------------------------------------ *
 * Numbers and money
 * ------------------------------------------------------------------ */

function fractionDigits(currency: string, locale: string) {
	try {
		return numberFormat(locale, { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
	} catch {
		return 2;
	}
}

/**
 * Formats minor-unit money. Whole amounts drop their decimals (`$49`, not
 * `$49.00`) unless `precise` is set, which invoices and ledgers want.
 */
export function formatMoney(money: Money, options: BillingFormatOptions & { precise?: boolean; compact?: boolean }) {
	const currency = money.currency.toUpperCase();
	const digits = fractionDigits(currency, options.locale);
	const major = money.amountMinor / 10 ** digits;
	const whole = Number.isInteger(major);
	try {
		return numberFormat(options.locale, {
			style: 'currency',
			currency,
			notation: options.compact ? 'compact' : 'standard',
			minimumFractionDigits: options.compact ? 0 : options.precise || !whole ? digits : 0,
			maximumFractionDigits: options.compact ? 1 : digits,
		}).format(major);
	} catch {
		return `${currency} ${major.toFixed(digits)}`;
	}
}

/** Plain or compact count: `12,480` or `12.5K`. */
export function formatQuantity(value: number, options: Pick<BillingFormatOptions, 'locale'> & { compact?: boolean }) {
	return numberFormat(options.locale, {
		notation: options.compact ? 'compact' : 'standard',
		maximumFractionDigits: options.compact ? 1 : Number.isInteger(value) ? 0 : 2,
	}).format(value);
}

/** Share of a limit used, or `null` when the limit is unlimited. Zero limits count as fully used once anything is used. */
export function usageRatio(used: number, limit: number): number | null {
	if (isUnlimited(limit)) return null;
	if (limit === 0) return used > 0 ? Infinity : 0;
	return used / limit;
}

export type UsageLevel = 'ok' | 'warning' | 'exhausted' | 'over';

/** Warning at the soft threshold (80% by default), exhausted at 100%, over past it. */
export function usageLevel(used: number, limit: number, soft = 0.8): UsageLevel {
	const ratio = usageRatio(used, limit);
	if (ratio === null) return 'ok';
	if (ratio > 1) return 'over';
	if (ratio >= 1) return 'exhausted';
	return ratio >= soft ? 'warning' : 'ok';
}

export function formatPercent(ratio: number, locale: string) {
	if (!Number.isFinite(ratio)) return '100%+';
	return numberFormat(locale, { style: 'percent', maximumFractionDigits: ratio < 0.1 && ratio > 0 ? 1 : 0 }).format(ratio);
}

/* ------------------------------------------------------------------ *
 * Dates
 * ------------------------------------------------------------------ */

export function formatDate(iso: string, options: BillingFormatOptions & { style?: 'short' | 'medium' | 'long'; withTime?: boolean }) {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	const style = options.style ?? 'medium';
	return dateFormat(options.locale, {
		timeZone: options.timeZone,
		month: style === 'long' ? 'long' : 'short',
		day: 'numeric',
		year: style === 'short' ? undefined : 'numeric',
		hour: options.withTime ? 'numeric' : undefined,
		minute: options.withTime ? '2-digit' : undefined,
	}).format(date);
}

/** Clock time only, e.g. "2:12 PM". */
export function formatTime(iso: string, options: BillingFormatOptions) {
	return dateFormat(options.locale, { timeZone: options.timeZone, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

/** Calendar day in a time zone, as a sortable `YYYY-MM-DD` key. */
export function dayKey(iso: string, timeZone: string) {
	return dateFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

export const DAY = 86_400_000;

/**
 * Whether a readiness verdict still counts. `enable_billing` refuses to turn
 * on without a passing verdict from the last 24 hours.
 */
export function isHealthFresh(health: Pick<BillingHealth, 'checkedAt'>, now: string) {
	return health.checkedAt ? new Date(now).getTime() - new Date(health.checkedAt).getTime() < DAY : false;
}

/** Whole days from `now` to `iso`; negative in the past. */
export function daysUntil(iso: string, now: string) {
	return Math.round((new Date(iso).getTime() - new Date(now).getTime()) / DAY);
}

/** "in 3 days", "tomorrow", "2 days ago". */
export function formatRelativeDays(iso: string, now: string, locale: string) {
	return cached(`r|${locale}`, () => new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })).format(daysUntil(iso, now), 'day');
}

/** Share of the period elapsed at `now`, clamped to 0..1. */
export function periodProgress(start: string, end: string, now: string) {
	const from = new Date(start).getTime();
	const to = new Date(end).getTime();
	return Math.min(1, Math.max(0, (new Date(now).getTime() - from) / (to - from)));
}

export const INTERVAL_SUFFIX: Record<BillingInterval, string> = { month: '/mo', year: '/yr', one_time: ' once' };
export const INTERVAL_LABEL: Record<BillingInterval, string> = { month: 'Monthly', year: 'Yearly', one_time: 'One time' };

/* ------------------------------------------------------------------ *
 * Presentations
 * ------------------------------------------------------------------ */

export const LIFECYCLE: Record<BillingLifecycle, Presentation> = {
	unsubscribed: { label: 'No plan', tone: 'neutral', description: 'Pick a plan to start billing.' },
	checkout_pending: { label: 'Checkout pending', tone: 'info', description: 'Waiting for the provider to confirm payment.' },
	active: { label: 'Active', tone: 'success', description: 'Payments are current.' },
	grace: { label: 'Payment overdue', tone: 'warning', description: 'The last payment failed. Service continues through the grace period.' },
	suspended: { label: 'Suspended', tone: 'danger', description: 'The grace period ended with nothing left on the balance.' },
	ended: { label: 'Ended', tone: 'neutral', description: 'The subscription was canceled.' },
	review_required: { label: 'Needs review', tone: 'warning', description: 'A provider change could not be confirmed and needs an operator.' },
};

export const PROVIDER_STATUS: Record<ProviderStatus, Presentation> = {
	active: { label: 'Active', tone: 'success' },
	trialing: { label: 'Trial', tone: 'info' },
	past_due: { label: 'Past due', tone: 'warning' },
	unpaid: { label: 'Unpaid', tone: 'danger' },
	canceled: { label: 'Canceled', tone: 'neutral' },
	incomplete: { label: 'Incomplete', tone: 'neutral' },
	incomplete_expired: { label: 'Expired', tone: 'neutral' },
	paused: { label: 'Paused', tone: 'neutral' },
};

export const INVOICE_STATUS: Record<InvoiceStatus, Presentation> = {
	draft: { label: 'Draft', tone: 'neutral' },
	open: { label: 'Open', tone: 'warning' },
	paid: { label: 'Paid', tone: 'success' },
	void: { label: 'Void', tone: 'neutral' },
	uncollectible: { label: 'Uncollectible', tone: 'danger' },
};

export const LEDGER_ENTRY: Record<LedgerEntryType, Presentation> = {
	increment: { label: 'Usage', tone: 'neutral' },
	decrement: { label: 'Released', tone: 'neutral' },
	credit_purchase: { label: 'Credits added', tone: 'success' },
	plan_grant: { label: 'Plan allowance', tone: 'primary' },
	reset: { label: 'Period reset', tone: 'neutral' },
	adjustment: { label: 'Adjustment', tone: 'info' },
	credit_deduction: { label: 'Drew from pool', tone: 'warning' },
	credits_consumed: { label: 'Credits used', tone: 'warning' },
	expired: { label: 'Credits expired', tone: 'danger' },
	rollover: { label: 'Rolled over', tone: 'primary' },
	refused: { label: 'Refused', tone: 'danger' },
	unmetered: { label: 'Unmetered', tone: 'neutral' },
};

export const CREDIT_TYPE: Record<CreditType, Presentation> = {
	permanent: { label: 'Permanent', tone: 'primary', description: 'Kept until used or until it expires.' },
	period: { label: 'This period', tone: 'neutral', description: 'Resets at the end of the billing period.' },
	rollover: { label: 'Rollover', tone: 'info', description: 'Unused credits carry into the next period, up to the cap.' },
};

export const CREDIT_SOURCE: Record<CreditGrantSource, string> = {
	plan: 'Plan',
	purchase: 'Purchase',
	code: 'Code',
	admin: 'Granted',
	rollover: 'Rollover',
	refund: 'Refund',
};

export const REDEEM_REFUSAL: Record<RedeemRefusal, Presentation> = {
	not_found: { label: 'Not found', tone: 'danger', description: 'That code doesn’t exist. Check for typos; codes ignore case and spaces.' },
	inactive: { label: 'Paused', tone: 'warning', description: 'This code is paused right now. Try again later or ask whoever shared it.' },
	expired: { label: 'Expired', tone: 'neutral', description: 'This code has expired.' },
	exhausted: { label: 'Used up', tone: 'neutral', description: 'This code has reached its redemption limit.' },
	already_redeemed: { label: 'Already redeemed', tone: 'neutral', description: 'This account has already redeemed this code.' },
	not_eligible: { label: 'Not eligible', tone: 'warning', description: 'This code can’t be used on this account.' },
};

export const SUSPENSION_REASON: Record<SuspensionReason, Presentation> = {
	billing: { label: 'Billing', tone: 'warning', description: 'Lifts on its own once the balance has capacity again.' },
	admin: { label: 'Admin hold', tone: 'danger', description: 'Only a platform admin can lift it.' },
};

export const OPERATION_STATE: Record<BillingOperationState, Presentation> = {
	reserved: { label: 'Reserved', tone: 'neutral' },
	provider_pending: { label: 'With provider', tone: 'info' },
	completed: { label: 'Completed', tone: 'success' },
	failed: { label: 'Failed', tone: 'danger' },
	uncertain: { label: 'Uncertain', tone: 'warning' },
	review_required: { label: 'Needs review', tone: 'warning' },
};

export const SYNC_STATE: Record<SyncState, Presentation> = {
	synced: { label: 'Synced', tone: 'success' },
	pending: { label: 'Syncing', tone: 'info' },
	failed: { label: 'Sync failed', tone: 'danger' },
	unsynced: { label: 'Not synced', tone: 'neutral' },
};

export const READINESS: Record<ReadinessStatus, Presentation> = {
	pass: { label: 'Passed', tone: 'success' },
	fail: { label: 'Failed', tone: 'danger' },
	pending: { label: 'Checking', tone: 'info' },
	skipped: { label: 'Skipped', tone: 'neutral' },
};

/** Humanizes a slug for fallbacks: `object_storage_gb` → `Object storage gb`. */
export function humanize(value: string) {
	const text = value.replace(/[-_]+/g, ' ').trim();
	return text ? text[0]!.toUpperCase() + text.slice(1) : value;
}

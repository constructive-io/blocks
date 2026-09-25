import { humanize } from './format';
import type { ProviderMode } from './types';

/**
 * What a payment provider can do. Components hide or explain an action when
 * the active provider lacks the feature, instead of assuming Stripe.
 */
export type ProviderFeature =
	| 'hostedCheckout'
	| 'customerPortal'
	| 'scheduledChanges'
	| 'meteredUsage'
	| 'invoices'
	| 'refunds'
	| 'disputes'
	| 'testMode';

export type ProviderCredentialField = {
	/** Secret or config name the host stores it under, e.g. `STRIPE_SECRET_KEY`. */
	name: string;
	label: string;
	/** Secrets are write-only: the UI shows whether one is set, never its value. */
	kind: 'secret' | 'config';
	placeholder?: string;
	help?: string;
	/** Expected prefix, checked before the host is called (e.g. `sk_`). */
	prefix?: string | string[];
	optional?: boolean;
};

export type ProviderObjectKind = 'account' | 'customer' | 'subscription' | 'invoice' | 'price' | 'product';

export type ProviderCheckCopy = { label: string; help?: string };

export type BillingProviderDescriptor = {
	id: string;
	name: string;
	description: string;
	/** Tile colour for the monogram mark. */
	brandColor: string;
	/** One or two letters for the mark; hosts may pass a real logo through `mark`. */
	monogram: string;
	availability: 'available' | 'coming_soon';
	features: readonly ProviderFeature[];
	credentials: readonly ProviderCredentialField[];
	/** Copy for provider-specific readiness checks, keyed by check id. */
	checks?: Readonly<Record<string, ProviderCheckCopy>>;
	/** Deep link into the provider's own dashboard. */
	dashboardUrl?: (kind: ProviderObjectKind, id: string, mode: ProviderMode) => string | undefined;
	docsUrl?: string;
};

/** Readiness checks every provider shares, in the order the checklist shows them. */
export const PLATFORM_CHECKS: Readonly<Record<string, ProviderCheckCopy>> = {
	plan_catalog: { label: 'Plan catalog', help: 'At least one active plan has an active price.' },
	provider_mappings: { label: 'Catalog mirrored', help: 'Every active plan and price has a provider id.' },
	webhook_route: { label: 'Webhook endpoint', help: 'An inbound route receives provider events for this database.' },
	webhook_signing_secret: { label: 'Webhook signing secret', help: 'Deliveries are verified before anything is recorded.' },
	schedules: { label: 'Scheduled jobs', help: 'Usage sync, the overdue sweep, and the daily check are registered.' },
	billing_flag: { label: 'Billing switch', help: 'Billing stays off until you turn it on below.' },
};

const STRIPE_DASHBOARD = 'https://dashboard.stripe.com';

const STRIPE_PATHS: Record<ProviderObjectKind, string> = {
	account: 'settings/account',
	customer: 'customers',
	subscription: 'subscriptions',
	invoice: 'invoices',
	price: 'prices',
	product: 'products',
};

/** Built-in Stripe descriptor, matching what the Constructive billing functions implement today. */
export const STRIPE_PROVIDER: BillingProviderDescriptor = {
	id: 'stripe',
	name: 'Stripe',
	description: 'Hosted checkout, customer portal, subscription schedules, and usage-based billing on one credits meter.',
	brandColor: '#635bff',
	monogram: 'S',
	availability: 'available',
	features: ['hostedCheckout', 'customerPortal', 'scheduledChanges', 'meteredUsage', 'invoices', 'refunds', 'disputes', 'testMode'],
	credentials: [
		{
			name: 'STRIPE_SECRET_KEY',
			label: 'Secret key',
			kind: 'secret',
			placeholder: 'sk_test_…',
			prefix: ['sk_test_', 'sk_live_', 'rk_test_', 'rk_live_'],
			help: 'A secret or restricted key. The mode follows the key prefix.',
		},
		{
			name: 'STRIPE_WEBHOOK_SECRET',
			label: 'Webhook signing secret',
			kind: 'secret',
			placeholder: 'whsec_…',
			prefix: 'whsec_',
			help: 'Shown on the webhook endpoint in your Stripe dashboard.',
		},
		{
			name: 'BILLING_PORTAL_RETURN_URL',
			label: 'Portal return URL',
			kind: 'config',
			placeholder: 'https://app.example.com/billing',
			optional: true,
		},
	],
	checks: {
		stripe_secret: { label: 'Secret key', help: 'A secret key is stored for this database.' },
		stripe_account: { label: 'Account reachable', help: 'The key opens the expected Stripe account.' },
		stripe_mode: { label: 'Mode matches', help: 'Test keys in test mode, live keys in live mode.' },
	},
	dashboardUrl: (kind, id, mode) =>
		`${STRIPE_DASHBOARD}${mode === 'test' ? '/test' : ''}/${STRIPE_PATHS[kind]}${kind === 'account' ? '' : `/${encodeURIComponent(id)}`}`,
};

export function hasFeature(provider: BillingProviderDescriptor | undefined, feature: ProviderFeature) {
	return Boolean(provider?.features.includes(feature));
}

/** Copy for a readiness check: the provider's own first, then the shared set, then the raw id. */
export function checkCopy(provider: BillingProviderDescriptor | undefined, id: string): ProviderCheckCopy {
	return provider?.checks?.[id] ?? PLATFORM_CHECKS[id] ?? { label: humanize(id) };
}

/** Validates a credential against its declared prefix before anything is sent. */
export function credentialError(field: ProviderCredentialField, value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) return field.optional ? null : `Enter the ${field.label.toLowerCase()}.`;
	const prefixes = field.prefix === undefined ? [] : Array.isArray(field.prefix) ? field.prefix : [field.prefix];
	if (prefixes.length > 0 && !prefixes.some((prefix) => trimmed.startsWith(prefix))) {
		return `Expected a value starting with ${prefixes.map((prefix) => `“${prefix}”`).join(' or ')}.`;
	}
	return null;
}

/** Test or live, read off a credential prefix when the provider encodes it there. */
export function modeFromCredential(value: string): ProviderMode | null {
	if (/_test_/.test(value)) return 'test';
	if (/_live_/.test(value)) return 'live';
	return null;
}

import type { WorkspaceTheme } from '../workspace-kit/menu';
import type { EntitlementGroup } from '../billing-kit/catalog';
import type { GrantCreditsRequest } from '../billing-kit/customers';
import type { BillingHealth, BillingScope, CodeRedemption, CreditCode, CreditCodeDraft, CreditPack, CustomerSummary, DatabaseStanding, Meter, Money, Plan, PlanOverride, PlanPrice, ProviderConnection, UsageSyncStatus } from '../billing-kit/types';
import type { BillingProviderDescriptor } from '../billing-kit/providers';

export type BillingConsoleView = 'overview' | 'catalog' | 'customers' | 'provider' | 'standing';

export type BillingConsoleTheme = WorkspaceTheme;

export type BillingConsoleSettings = {
	/** `database_settings.enable_billing`. Turning it on needs a green readiness check under 24 hours old. */
	enableBilling: boolean;
	/** `database_settings.credits_per_cent`: universal credits one cent buys. */
	creditsPerCent: number;
	currency: string;
};

/**
 * Everything the operator console renders for one billing module: the
 * platform's own, or a tenant database billing its customers.
 */
export type BillingConsoleData = {
	scope: BillingScope;
	workspace: {
		name: string;
		/** The database whose billing module this is, shown under the name. */
		databaseName?: string;
	};
	/** Every provider the host supports; `availability` marks the ones still to come. */
	providers: BillingProviderDescriptor[];
	/** The active provider connection; absent until one is connected. */
	connection?: ProviderConnection;
	health: BillingHealth;
	settings: BillingConsoleSettings;
	usageSync: UsageSyncStatus;
	plans: Plan[];
	entitlementGroups: EntitlementGroup[];
	meters: Meter[];
	packs: CreditPack[];
	codes: CreditCode[];
	/** Recent redemptions, shown on each code's detail. */
	codeRedemptions?: CodeRedemption[];
	customers: CustomerSummary[];
	/** Platform scope: databases with a suspension or hold (and any the operator watches). */
	standing?: DatabaseStanding[];
	/** Monthly recurring revenue by month, oldest first, for the overview trend. */
	revenueTrend?: Money[];
};

export type EntitlementChange = { planId: string; kind: 'limit' | 'meter' | 'cap'; key: string; value: number };

/** Controls the console renders but the host owns. */
export type BillingConsoleAction =
	| { type: 'toggle-plan'; planId: string; active: boolean }
	| { type: 'toggle-price'; planId: string; priceId: string; active: boolean }
	| { type: 'add-price'; planId: string }
	| { type: 'new-plan' }
	| { type: 'toggle-meter'; meterSlug: string; active: boolean }
	| { type: 'toggle-pack'; packId: string; active: boolean }
	| { type: 'new-pack' }
	| { type: 'toggle-code'; codeId: string; active: boolean }
	| { type: 'open-customer'; customerId: string }
	| { type: 'remove-override'; customerId: string; overrideId: string }
	| { type: 'cancel-scheduled-change'; customerId: string }
	| { type: 'workspace-menu'; item: 'settings' | 'docs' | 'log-out' };

export type { CreditCodeDraft, GrantCreditsRequest, PlanOverride, PlanPrice };

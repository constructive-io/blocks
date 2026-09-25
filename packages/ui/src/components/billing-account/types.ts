import type { WorkspaceTheme } from '../workspace-kit/menu';
import type { EntitlementRow } from '../billing-kit/plan';
import type { PlanChangeRequest } from '../billing-kit/plan-change-dialog';
import type {
	Balance,
	BillingAccountRef,
	BillingLifecycle,
	BillingScope,
	CodeRedemption,
	CreditGrant,
	CreditPack,
	DatabaseStanding,
	FeatureCap,
	Invoice,
	LedgerEntry,
	LimitCounter,
	Meter,
	Money,
	Plan,
	ProviderMode,
	RateWindow,
	RedeemResult,
	RefundOrDispute,
	Subscription,
	UsageAlert,
} from '../billing-kit/types';
import type { BillingProviderDescriptor } from '../billing-kit/providers';

export type BillingAccountView = 'overview' | 'usage' | 'plans' | 'credits' | 'invoices' | 'activity';

export type BillingAccountTheme = WorkspaceTheme;

/**
 * Everything the account template renders, for one billing account (a
 * personal account or an organization). Map it from the billing tables the
 * account can read: plans and prices, meters, balances, credit grants, the
 * ledger, the provider mirror, and limits.
 */
export type BillingAccountData = {
	scope: BillingScope;
	/** Product or app name shown in the sidebar, e.g. "Constructive" or a tenant app. */
	workspace: { name: string };
	accounts: BillingAccountRef[];
	/** The account on screen. */
	accountId: string;
	/** The active payment provider. Actions it cannot perform are hidden or explained. */
	provider?: BillingProviderDescriptor;
	providerMode?: ProviderMode;
	currency: string;
	/** Universal credits one cent buys (`database_settings.credits_per_cent`). */
	creditsPerCent: number;
	plans: Plan[];
	/** Rows the plan comparison and the change preview show. */
	comparisonRows: EntitlementRow[];
	meters: Meter[];
	balances: Balance[];
	subscription?: Subscription;
	/** The current plan when there is no provider subscription to read it from. */
	planId?: string;
	/** Defaults to the subscription's lifecycle, or `unsubscribed` without one. */
	lifecycle?: BillingLifecycle;
	/** Estimated next invoice, including metered usage so far. */
	nextInvoice?: Money;
	grants: CreditGrant[];
	packs: CreditPack[];
	ledger: LedgerEntry[];
	invoices: Invoice[];
	/** Codes this account redeemed, for the history on the credits view. */
	redemptions?: CodeRedemption[];
	adjustments?: RefundOrDispute[];
	limits: LimitCounter[];
	caps: FeatureCap[];
	alerts: UsageAlert[];
	rateWindows?: RateWindow[];
	/** Platform scope: the databases this account owns, for standing notices. */
	databases?: DatabaseStanding[];
};

/** Controls the template renders but the host owns. */
export type BillingAccountAction =
	| { type: 'switch-account'; accountId: string }
	| { type: 'open-portal' }
	| { type: 'open-invoice'; invoiceId: string }
	| { type: 'pay-invoice'; invoiceId: string }
	| { type: 'cancel-scheduled-change' }
	| { type: 'contact-sales'; planId: string }
	| { type: 'contact-support' }
	| { type: 'account-menu'; item: 'account-settings' | 'support' | 'log-out' };

export type { CodeRedemption, PlanChangeRequest, RedeemResult };

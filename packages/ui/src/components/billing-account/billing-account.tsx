'use client';

import * as React from 'react';

import { useControllableState } from '../../lib/use-controllable-state';
import { RedeemCodeDialog, targetDescriber } from '../billing-kit/codes';
import { BillingFormatProvider } from '../billing-kit/context';
import { humanize } from '../billing-kit/format';
import { PlanChangeDialog, type PlanChangeRequest } from '../billing-kit/plan-change-dialog';
import type { BillingLifecycle, CreditPack, Plan, RedeemResult, Subscription, UsageAlert } from '../billing-kit/types';
import { MeterDetailSheet } from '../billing-kit/usage';
import { WorkspaceShell } from '../workspace-kit/shell';
import { useLatest } from '../workspace-kit/use-latest';
import { BillingActivityView } from './activity-view';
import { BillingAccountContext, type BillingAccountContextValue } from './billing-account-context';
import { BillingCreditsView } from './credits-view';
import { BillingInvoicesView } from './invoices-view';
import { BillingOverviewView } from './overview-view';
import { BillingPlansView } from './plans-view';
import { BillingAccountSidebar } from './sidebar';
import type { BillingAccountAction, BillingAccountData, BillingAccountTheme, BillingAccountView } from './types';
import { applyRedemption, type RedeemableState } from './redemption';
import { BillingUsageView } from './usage-view';

type BillingAccountProps = {
	data: BillingAccountData;
	/** Controlled view. Pair with `onViewChange` to sync with a router. */
	view?: BillingAccountView;
	defaultView?: BillingAccountView;
	onViewChange?: (view: BillingAccountView) => void;
	/** Views the host can back, e.g. only `overview` and `plans` without balances or a ledger. Defaults to all six. */
	views?: BillingAccountView[];
	/**
	 * Makes a plan change. `request.checkout` means the host should open the
	 * provider's hosted checkout; resolve once it has been handed off. Reject
	 * with an Error to keep the preview open with its message.
	 */
	onChangePlan?: (request: PlanChangeRequest) => Promise<void> | void;
	/** Starts a credit-pack purchase, usually a hosted checkout. */
	onBuyCredits?: (pack: CreditPack) => Promise<void> | void;
	/**
	 * Redeems a normalised code for this account. Resolve with the result: the
	 * redemption (what it granted) or a typed refusal. Without it, redeeming is
	 * hidden.
	 */
	onRedeemCode?: (code: string) => Promise<RedeemResult>;
	/** Opens the redeem dialog prefilled, e.g. from a `?code=` promo link. */
	initialRedeemCode?: string;
	onAlertsChange?: (alerts: UsageAlert[]) => void;
	/** Receives every control the template renders but does not own. */
	onAction?: (action: BillingAccountAction) => void;
	theme?: BillingAccountTheme;
	onThemeChange?: (theme: BillingAccountTheme) => void;
	/** Formatting. Pass `now` from the server so relative dates hydrate identically. */
	locale?: string;
	timeZone?: string;
	now?: string;
	defaultSidebarCollapsed?: boolean;
	className?: string;
};

const ALL_VIEWS: BillingAccountView[] = ['overview', 'usage', 'plans', 'credits', 'invoices', 'activity'];

type LocalState = RedeemableState & {
	subscription?: Subscription;
	lifecycle?: BillingLifecycle;
	planId?: string;
	alerts: UsageAlert[];
};

const initialState = (data: BillingAccountData): LocalState => ({
	subscription: data.subscription,
	lifecycle: data.lifecycle ?? data.subscription?.lifecycle,
	planId: data.planId ?? data.subscription?.planId ?? data.plans.find((plan) => plan.fallback)?.id,
	alerts: data.alerts,
	balances: data.balances,
	grants: data.grants,
	limits: data.limits,
	ledger: data.ledger,
	redemptions: data.redemptions ?? [],
});

/**
 * Billing Account template: the customer side of Constructive billing. An
 * account switcher and six views (overview, usage, plans, credits, invoices,
 * activity) over one account's plans, meters, credits, ledger, and invoices.
 * The template owns navigation, previews, and optimistic local state; the host
 * owns every purchase, provider hand-off, and persistence call.
 */
function BillingAccount({
	data,
	view: viewProp,
	defaultView = 'overview',
	onViewChange,
	views = ALL_VIEWS,
	onChangePlan,
	onBuyCredits,
	onRedeemCode,
	initialRedeemCode,
	onAlertsChange,
	onAction,
	theme: themeProp,
	onThemeChange,
	locale,
	timeZone,
	now,
	defaultSidebarCollapsed,
	className,
}: BillingAccountProps) {
	const viewsKey = views.join('|');
	// Hosts often pass `views` inline; key it by content so the context stays stable.
	const stableViews = React.useMemo(() => viewsKey.split('|') as BillingAccountView[], [viewsKey]);
	const [requestedView, setView] = useControllableState<BillingAccountView>({ prop: viewProp, defaultProp: defaultView, onChange: onViewChange });
	const view = stableViews.includes(requestedView) ? requestedView : (stableViews[0] ?? 'overview');
	const [theme, setTheme] = useControllableState<BillingAccountTheme>({ prop: themeProp, defaultProp: 'system', onChange: onThemeChange });
	const [local, setLocal] = React.useState<LocalState>(() => initialState(data));
	const [source, setSource] = React.useState(data);
	if (source !== data) {
		setSource(data);
		setLocal(initialState(data));
	}
	const [target, setTarget] = React.useState<{ plan: Plan; interval: 'month' | 'year' } | null>(null);
	const [dialogOpen, setDialogOpen] = React.useState(false);
	// The sheet keeps its last meter while closing so its exit animation has content.
	const [meterSlug, setMeterSlug] = React.useState<string | null>(null);
	const [meterOpen, setMeterOpen] = React.useState(false);
	const [pendingPackId, setPendingPackId] = React.useState<string | undefined>();
	const [redeemOpen, setRedeemOpen] = React.useState(Boolean(initialRedeemCode));
	// A new promo link (a changed prefill) reopens the dialog, adjusted during render.
	const [lastPrefill, setLastPrefill] = React.useState(initialRedeemCode);
	if (lastPrefill !== initialRedeemCode) {
		setLastPrefill(initialRedeemCode);
		if (initialRedeemCode) setRedeemOpen(true);
	}

	const handlers = useLatest({ onAction, onAlertsChange, onBuyCredits, onRedeemCode });

	const plan = data.plans.find((candidate) => candidate.id === local.planId);
	const lifecycle: BillingLifecycle = local.lifecycle ?? 'unsubscribed';
	const account = data.accounts.find((candidate) => candidate.id === data.accountId);
	const canManage = account?.role !== 'member';
	const canRedeem = canManage && Boolean(onRedeemCode);
	// Views read the account's live state: host data plus redemptions shown since it arrived.
	const shownData = React.useMemo<BillingAccountData>(
		() => ({ ...data, balances: local.balances, grants: local.grants, limits: local.limits, ledger: local.ledger, redemptions: local.redemptions }),
		[data, local.balances, local.grants, local.ledger, local.limits, local.redemptions],
	);
	const describeTarget = React.useMemo(() => targetDescriber(data.meters, local.limits), [data.meters, local.limits]);

	const context = React.useMemo<BillingAccountContextValue>(() => {
		const planNames = new Map(data.plans.map((candidate) => [candidate.id, candidate.displayName]));
		const meterBySlug = new Map(data.meters.map((meter) => [meter.slug, meter]));
		const emit = (action: BillingAccountAction) => {
			if (action.type === 'cancel-scheduled-change') {
				setLocal((current) => (current.subscription ? { ...current, subscription: { ...current.subscription, scheduledChange: undefined } } : current));
			}
			handlers.current.onAction?.(action);
		};
		return {
			data: shownData,
			view,
			views: stableViews,
			setView,
			emit,
			theme,
			setTheme,
			plan,
			subscription: local.subscription,
			lifecycle,
			alerts: local.alerts,
			setAlerts: (alerts) => {
				setLocal((current) => ({ ...current, alerts }));
				handlers.current.onAlertsChange?.(alerts);
			},
			canManage,
			planName: (id) => planNames.get(id) ?? humanize(id),
			meterBySlug,
			meterName: (slug) => meterBySlug.get(slug)?.displayName ?? humanize(slug),
			choosePlan: (next, interval = 'month') => {
				if (next.contactSales) {
					emit({ type: 'contact-sales', planId: next.id });
					return;
				}
				setTarget({ plan: next, interval });
				setDialogOpen(true);
			},
			buyPack: async (pack) => {
				setPendingPackId(pack.id);
				try {
					await handlers.current.onBuyCredits?.(pack);
				} finally {
					setPendingPackId(undefined);
				}
			},
			pendingPackId,
			canRedeem,
			openRedeem: () => setRedeemOpen(true),
			describeTarget,
			redeemCode: async (code) => {
				const result = (await handlers.current.onRedeemCode?.(code)) ?? ({ status: 'refused', reason: 'not_eligible' } as const);
				if (result.status === 'redeemed') setLocal((current) => ({ ...current, ...applyRedemption(current, result.redemption) }));
				return result;
			},
			openMeter: (slug) => {
				setMeterSlug(slug);
				setMeterOpen(true);
			},
		};
	}, [canManage, canRedeem, data, describeTarget, handlers, lifecycle, local.alerts, local.subscription, pendingPackId, plan, setTheme, setView, shownData, stableViews, theme, view]);

	const confirmChange = async (request: PlanChangeRequest) => {
		await onChangePlan?.(request);
		setLocal((current) => {
			if (request.checkout) return { ...current, lifecycle: 'checkout_pending' };
			const subscription = current.subscription;
			if (request.timing === 'period_end' && subscription) {
				return {
					...current,
					subscription: {
						...subscription,
						scheduledChange: { planId: request.plan.id, priceId: request.price?.id ?? '', effectiveAt: subscription.currentPeriodEnd, state: 'scheduled' },
					},
				};
			}
			return {
				...current,
				planId: request.plan.id,
				subscription: subscription ? { ...subscription, planId: request.plan.id, priceId: request.price?.id, scheduledChange: undefined } : subscription,
			};
		});
	};

	const meter = meterSlug ? data.meters.find((candidate) => candidate.slug === meterSlug) : undefined;

	return (
		<BillingFormatProvider locale={locale} timeZone={timeZone} now={now}>
			<BillingAccountContext.Provider value={context}>
				<WorkspaceShell
					slot="billing-account"
					className={className}
					defaultSidebarCollapsed={defaultSidebarCollapsed}
					sidebar={({ mode, collapsed, onCollapsedChange, onNavigate }) => (
						<BillingAccountSidebar drawer={mode === 'drawer'} collapsed={collapsed} onCollapsedChange={onCollapsedChange} onNavigate={mode === 'drawer' ? onNavigate : undefined} />
					)}
				>
					{view === 'overview' ? <BillingOverviewView /> : null}
					{view === 'usage' ? <BillingUsageView /> : null}
					{view === 'plans' ? <BillingPlansView /> : null}
					{view === 'credits' ? <BillingCreditsView /> : null}
					{view === 'invoices' ? <BillingInvoicesView /> : null}
					{view === 'activity' ? <BillingActivityView /> : null}
				</WorkspaceShell>
				<PlanChangeDialog
					open={dialogOpen}
					onOpenChange={setDialogOpen}
					currentPlan={plan}
					targetPlan={target?.plan}
					interval={target?.interval ?? 'month'}
					subscription={local.subscription}
					rows={data.comparisonRows}
					limits={local.limits}
					balances={local.balances}
					provider={data.provider}
					onConfirm={confirmChange}
				/>
				<MeterDetailSheet
					open={meterOpen}
					onOpenChange={setMeterOpen}
					meter={meter}
					balance={local.balances.find((balance) => balance.meterSlug === meterSlug)}
					pool={meter?.categoryMeter ? data.meters.find((candidate) => candidate.slug === meter.categoryMeter) : undefined}
					rateWindows={data.rateWindows}
					periodEnd={local.subscription?.currentPeriodEnd}
				/>
				{canRedeem ? (
					<RedeemCodeDialog
						open={redeemOpen}
						onOpenChange={setRedeemOpen}
						initialCode={initialRedeemCode}
						accountName={account?.name}
						describe={describeTarget}
						onRedeem={context.redeemCode}
						onViewCredits={view !== 'credits' && stableViews.includes('credits') ? () => setView('credits') : undefined}
					/>
				) : null}
			</BillingAccountContext.Provider>
		</BillingFormatProvider>
	);
}

export { BillingAccount };
export type { BillingAccountProps };

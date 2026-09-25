'use client';

import { ArrowRight, Coins, LayoutDashboard, Lock, Ticket } from 'lucide-react';

import { Button } from '../button';
import { useBillingFormat } from '../billing-kit/context';
import { CreditWallet } from '../billing-kit/credits';
import { FeatureCapList, LimitList } from '../billing-kit/entitlements';
import { daysUntil } from '../billing-kit/format';
import { LedgerTimeline } from '../billing-kit/ledger';
import { CurrentPlanCard } from '../billing-kit/plan';
import { hasFeature } from '../billing-kit/providers';
import { Panel } from '../billing-kit/surface';
import { PoolGrid } from '../billing-kit/usage';
import { enterClass, staggerStyle, ViewFrame } from '../workspace-kit/primitives';
import { AccountBanner } from './account-banner';
import { useBillingAccount } from './billing-account-context';

/**
 * Where the account stands: the current notice, the plan and the credit
 * wallet side by side, the busiest pools, counted limits, the latest ledger
 * entries, and features. Sections without data are left out, so a host that
 * only maps plans and a subscription still gets a coherent page.
 */
export function BillingOverviewView() {
	const { data, views, plan, subscription, lifecycle, planName, setView, emit, canManage, canRedeem, openRedeem, openMeter } = useBillingAccount();
	const f = useBillingFormat();
	const universal = data.balances.find((balance) => balance.meterSlug === 'universal');
	const account = data.accounts.find((candidate) => candidate.id === data.accountId);
	const daysLeft = subscription ? Math.max(0, daysUntil(subscription.currentPeriodEnd, f.now)) : null;
	const recent = [...data.ledger].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
	const link = (target: (typeof views)[number], label: string) =>
		views.includes(target) ? (
			<Button size="xs" variant="ghost" onClick={() => setView(target)}>
				{label}
				<ArrowRight aria-hidden="true" />
			</Button>
		) : null;
	let step = 0;
	const next = () => staggerStyle(step++);

	return (
		<ViewFrame
			icon={LayoutDashboard}
			title="Overview"
			label={`${account?.name ?? 'Account'} billing overview`}
			actions={
				<>
					{canRedeem ? (
						<Button size="xs" variant="ghost" onClick={openRedeem}>
							<Ticket aria-hidden="true" />
							Redeem code
						</Button>
					) : null}
					{canManage && views.includes('credits') && data.packs.some((pack) => pack.active) ? (
						<Button size="xs" variant="outline" onClick={() => setView('credits')}>
							<Coins aria-hidden="true" />
							Buy credits
						</Button>
					) : null}
				</>
			}
		>
			{canManage ? null : (
				<p className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-[13px] text-muted-foreground">
					<Lock aria-hidden="true" className="size-3.5 shrink-0" />
					You can see {account?.name ?? 'this account'}’s billing. Only owners and admins can change it.
				</p>
			)}
			<AccountBanner />
			<div className={universal ? 'grid gap-4 @4xl/view:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]' : 'grid gap-4'}>
				{plan ? (
					<CurrentPlanCard
						className={enterClass}
						style={next()}
						plan={plan}
						subscription={subscription}
						lifecycle={lifecycle}
						nextInvoice={data.nextInvoice}
						planName={planName}
						actions={
							canManage ? (
								<>
									{hasFeature(data.provider, 'customerPortal') && subscription ? (
										<Button size="xs" variant="ghost" onClick={() => emit({ type: 'open-portal' })}>
											Payment method
										</Button>
									) : null}
									{views.includes('plans') ? (
										<Button size="xs" variant="outline" onClick={() => setView('plans')}>
											Change plan
										</Button>
									) : null}
								</>
							) : null
						}
					/>
				) : null}
				{universal ? (
					<CreditWallet className={enterClass} style={next()} balance={universal} grants={data.grants} creditsPerCent={data.creditsPerCent} currency={data.currency} />
				) : null}
			</div>

			{data.balances.length > 0 ? (
				<Panel
					className={enterClass}
					style={next()}
					title="Usage this period"
					description={daysLeft !== null ? `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} until the period resets.` : undefined}
					actions={link('usage', 'All usage')}
				>
					<PoolGrid meters={data.meters} balances={data.balances} onSelect={openMeter} />
				</Panel>
			) : null}

			{data.limits.length > 0 || recent.length > 0 ? (
				<div className={data.limits.length > 0 && recent.length > 0 ? 'grid gap-4 @4xl/view:grid-cols-2' : 'grid gap-4'}>
					{data.limits.length > 0 ? (
						<Panel className={enterClass} style={next()} title="Limits" description="Counted resources on your plan.">
							<LimitList limits={data.limits} />
						</Panel>
					) : null}
					{recent.length > 0 ? (
						<Panel className={enterClass} style={next()} title="Recent activity" actions={link('activity', 'Ledger')}>
							<LedgerTimeline entries={recent} meters={data.meters} surface="card" />
						</Panel>
					) : null}
				</div>
			) : null}

			{data.caps.length > 0 ? (
				<Panel className={enterClass} style={next()} title="Features" description={`What ${plan?.displayName ?? 'your plan'} turns on.`}>
					<FeatureCapList caps={data.caps} onUnlock={canManage && views.includes('plans') ? () => setView('plans') : undefined} />
				</Panel>
			) : null}
		</ViewFrame>
	);
}

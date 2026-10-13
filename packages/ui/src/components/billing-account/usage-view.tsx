'use client';

import { CalendarDays, Coins, Gauge, TrendingUp, TriangleAlert } from 'lucide-react';

import { useBillingFormat } from '../billing-kit/context';
import { FeatureCapList, LimitList, UsageAlertList } from '../billing-kit/entitlements';
import { daysUntil, isUnlimited, periodProgress, usageLevel } from '../billing-kit/format';
import { priceFor } from '../billing-kit/plan';
import { Bezel, Panel, SectionHeading, StatTile } from '../billing-kit/surface';
import { buildUsageTree, UsageTree } from '../billing-kit/usage';
import { enterClass, ViewFrame } from '../workspace-kit/primitives';
import { useBillingAccount } from './billing-account-context';

/**
 * Usage in depth: headline figures with a projection to period end, the
 * credit waterfall by pool, counted limits and features, and usage alerts.
 */
export function BillingUsageView() {
	const { data, views, plan, subscription, alerts, setAlerts, canManage, openMeter, meterName, meterBySlug, setView } = useBillingAccount();
	const f = useBillingFormat();
	const universal = data.balances.find((balance) => balance.meterSlug === 'universal');
	const progress = subscription ? periodProgress(subscription.currentPeriodStart, subscription.currentPeriodEnd, f.now) : 0;
	const daysLeft = subscription ? Math.max(0, daysUntil(subscription.currentPeriodEnd, f.now)) : null;
	const near = data.balances.filter(
		(balance) => meterBySlug.get(balance.meterSlug)?.meterType !== 'usage_pool' && usageLevel(balance.currentUsage, balance.effectiveLimit) !== 'ok',
	);
	const projected = universal && progress > 0.05 ? Math.round(universal.currentUsage / progress) : null;
	const overCredits = universal && projected !== null && !isUnlimited(universal.effectiveLimit) ? Math.max(0, projected - universal.effectiveLimit) : 0;
	const metered = plan ? priceFor(plan, 'month', 'metered') : undefined;
	const tree = buildUsageTree(data.meters, data.balances);
	const hasMeters = Boolean(tree && (tree.balance || tree.children.length > 0));
	const alertTargets = [
		...data.balances
			.filter((balance) => !isUnlimited(balance.effectiveLimit))
			.map((balance) => ({ value: balance.meterSlug, label: meterName(balance.meterSlug) })),
		...data.limits.filter((limit) => !isUnlimited(limit.max)).map((limit) => ({ value: limit.name, label: limit.label })),
	];

	return (
		<ViewFrame icon={Gauge} title="Usage" actions={subscription ? <span className="text-xs text-muted-foreground tabular-nums">{f.date(subscription.currentPeriodStart, 'short')} – {f.date(subscription.currentPeriodEnd, 'short')}</span> : null}>
			<Bezel className={enterClass} innerClassName="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-x-6 gap-y-5 p-4">
				<StatTile
					icon={Coins}
					label="Credits used"
					value={universal ? f.quantity(universal.currentUsage, true) : '—'}
					hint={universal ? (isUnlimited(universal.effectiveLimit) ? 'Unlimited' : `of ${f.quantity(universal.effectiveLimit, true)}`) : undefined}
				/>
				<StatTile
					icon={TrendingUp}
					label="Projected by reset"
					value={projected !== null ? f.quantity(projected, true) : '—'}
					hint={
						overCredits > 0
							? metered
								? `≈ ${f.money({ amountMinor: Math.ceil(overCredits / data.creditsPerCent), currency: data.currency })} in usage charges`
								: `${f.quantity(overCredits, true)} past the allowance`
							: 'Within the allowance'
					}
				/>
				<StatTile icon={TriangleAlert} label="Near the limit" value={near.length} hint={near.length ? near.map((balance) => meterName(balance.meterSlug)).slice(0, 2).join(', ') : 'All comfortable'} />
				<StatTile icon={CalendarDays} label="Days left" value={daysLeft ?? '—'} hint={subscription ? `Resets ${f.date(subscription.currentPeriodEnd, 'short')}` : undefined} />
			</Bezel>

			{hasMeters ? (
				<section aria-labelledby="usage-pools" className="flex flex-col gap-3">
					<SectionHeading id="usage-pools" title="Meters by pool" description="Each meter uses its own allowance first, then its pool, then universal credits." />
					<UsageTree meters={data.meters} balances={data.balances} onSelectMeter={openMeter} />
				</section>
			) : null}

			<div className={data.limits.length > 0 ? 'grid grid-cols-1 gap-4 @4xl/view:grid-cols-2' : 'grid grid-cols-1 gap-4'}>
				{data.limits.length > 0 ? (
					<Panel title="Limits" description="Checked when something is created, not billed.">
						<LimitList limits={data.limits} />
					</Panel>
				) : null}
				<Panel title="Alerts" description="Get notified before a meter or limit runs out.">
					<UsageAlertList alerts={alerts} targets={alertTargets} onChange={setAlerts} readOnly={!canManage} />
				</Panel>
			</div>
			{data.caps.length > 0 ? (
				<Panel title="Features">
					<FeatureCapList caps={data.caps} onUnlock={canManage && views.includes('plans') ? () => setView('plans') : undefined} />
				</Panel>
			) : null}
		</ViewFrame>
	);
}

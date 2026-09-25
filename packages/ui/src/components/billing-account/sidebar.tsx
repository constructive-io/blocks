'use client';

import { Activity, Coins, Gauge, Layers, LayoutDashboard, Receipt } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { useBillingFormat } from '../billing-kit/context';
import { daysUntil, isUnlimited, LIFECYCLE, usageLevel } from '../billing-kit/format';
import { PeriodTrack } from '../billing-kit/allowance';
import { NavCount, NavIcon, NavRow, NavSection, SidebarFrame } from '../workspace-kit/nav';
import { AccountMenu } from './account-menu';
import { useBillingAccount } from './billing-account-context';
import type { BillingAccountView } from './types';

type BillingAccountSidebarProps = {
	collapsed?: boolean;
	onCollapsedChange?: (collapsed: boolean) => void;
	drawer?: boolean;
	onNavigate?: () => void;
	className?: string;
};

/**
 * Account navigation: the account switcher, the six billing views with quiet
 * counts (meters near their limit, open invoices, credits left), and a footer
 * showing where the billing period stands.
 */
export function BillingAccountSidebar({ collapsed = false, onCollapsedChange, drawer = false, onNavigate, className }: BillingAccountSidebarProps) {
	const { data, view, views, setView, plan, subscription, lifecycle, meterBySlug } = useBillingAccount();
	const f = useBillingFormat();
	const railCollapsed = !drawer && collapsed;

	const pressing = data.balances.filter(
		(balance) => meterBySlug.get(balance.meterSlug)?.meterType !== 'usage_pool' && usageLevel(balance.currentUsage, balance.effectiveLimit) !== 'ok',
	).length;
	const openInvoices = data.invoices.filter((invoice) => invoice.status === 'open').length;
	const universal = data.balances.find((balance) => balance.meterSlug === 'universal');
	const creditsLeft = universal && !isUnlimited(universal.effectiveLimit) ? Math.max(0, universal.effectiveLimit - universal.currentUsage) : null;

	const go = (next: BillingAccountView) => () => {
		setView(next);
		onNavigate?.();
	};

	const row = (id: BillingAccountView, label: string, icon: typeof Gauge, trailing?: React.ReactNode, srExtra?: string) =>
		views.includes(id) ? (
		<NavRow
			key={id}
			label={srExtra ? `${label}, ${srExtra}` : label}
			labelNode={
				<>
					{label}
					{srExtra ? <span className="sr-only">, {srExtra}</span> : null}
				</>
			}
			collapsed={railCollapsed}
			active={view === id}
			leading={<NavIcon icon={icon} active={view === id} />}
			trailing={trailing}
			onClick={go(id)}
		/>
		) : null;
	const history = views.includes('invoices') || views.includes('activity');

	const attention = lifecycle === 'grace' || lifecycle === 'suspended' || lifecycle === 'review_required';
	const daysLeft = subscription ? Math.max(0, daysUntil(subscription.cancelAt ?? subscription.currentPeriodEnd, f.now)) : null;

	return (
		<SidebarFrame
			label="Billing"
			menu={<AccountMenu collapsed={railCollapsed} />}
			collapsed={collapsed}
			onCollapsedChange={onCollapsedChange}
			drawer={drawer}
			onClose={onNavigate}
			className={className}
			footer={
				railCollapsed ? null : (
					<section
						aria-label="Billing period"
						className={cn(
							'shrink-0 border-t border-sidebar-border p-3',
							attention ? 'bg-[linear-gradient(to_top,color-mix(in_oklab,var(--warning)_10%,transparent),transparent)]' : null,
						)}
					>
						<p className="flex items-center justify-between gap-2 text-sm">
							<span className="truncate font-medium text-foreground">{plan?.displayName ?? 'No plan'}</span>
							<span className={cn('text-xs', attention ? 'font-medium text-warning' : 'text-muted-foreground')}>{LIFECYCLE[lifecycle].label}</span>
						</p>
						{subscription && daysLeft !== null ? (
							<>
								<PeriodTrack start={subscription.currentPeriodStart} end={subscription.currentPeriodEnd} tone={attention ? 'warning' : 'default'} className="mt-3" />
								<p className="mt-2 flex items-baseline justify-between gap-2 text-xs text-muted-foreground tabular-nums">
									<span>
										{subscription.cancelAt ? 'Ends' : 'Renews'} {f.date(subscription.cancelAt ?? subscription.currentPeriodEnd, 'short')}
									</span>
									<span className={daysLeft <= 3 ? 'font-medium text-foreground' : undefined}>
										{daysLeft === 0 ? 'Today' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}
									</span>
								</p>
							</>
						) : (
							<p className="mt-1 text-pretty text-xs text-muted-foreground">Pick a plan to unlock more of {data.workspace.name}.</p>
						)}
					</section>
				)
			}
		>
			<nav aria-label="Billing views" className="flex w-full flex-col gap-3">
				<NavSection collapsed={railCollapsed}>
					{row('overview', 'Overview', LayoutDashboard)}
					{row(
						'usage',
						'Usage',
						Gauge,
						pressing > 0 ? <NavCount value={pressing} tone="warning" /> : null,
						pressing > 0 ? `${pressing} ${pressing === 1 ? 'meter' : 'meters'} near the limit` : undefined,
					)}
					{row('plans', 'Plans', Layers)}
					{row('credits', 'Credits', Coins, creditsLeft !== null ? <NavCount value={f.quantity(creditsLeft, true)} /> : null)}
				</NavSection>
				{history ? <hr className="border-sidebar-border" /> : null}
				{history ? (
				<NavSection title="History" collapsed={railCollapsed}>
					{row(
						'invoices',
						'Invoices',
						Receipt,
						openInvoices > 0 ? <NavCount value={openInvoices} tone="danger" /> : null,
						openInvoices > 0 ? `${openInvoices} open` : undefined,
					)}
					{row('activity', 'Activity', Activity)}
				</NavSection>
				) : null}
			</nav>
		</SidebarFrame>
	);
}

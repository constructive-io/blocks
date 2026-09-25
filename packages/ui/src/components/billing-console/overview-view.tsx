'use client';

import { ArrowRight, CircleCheck, Hourglass, LayoutDashboard, type LucideIcon, PackageCheck, PlugZap, RefreshCcw, ShieldAlert, TrendingUp, Users, Wallet } from 'lucide-react';

import { cn } from '../../lib/utils';
import { useBillingFormat } from '../billing-kit/context';
import { type Tone } from '../billing-kit/format';
import { Bezel, IconTile, Panel, StatTile } from '../billing-kit/surface';
import type { Money } from '../billing-kit/types';
import { enterClass, focusRingClass, staggerStyle, ViewFrame } from '../workspace-kit/primitives';
import { useBillingConsole } from './billing-console-context';
import type { BillingConsoleView } from './types';

const PLAN_COLORS = ['bg-foreground/25', 'bg-primary/70', 'bg-chart-3/80', 'bg-chart-4/80', 'bg-info/70', 'bg-success/70'];

type AttentionItem = { id: string; icon: LucideIcon; tone: Tone; title: string; detail: string; view: BillingConsoleView };

function sum(values: Money[]) {
	return values.reduce((total, money) => total + money.amountMinor, 0);
}

/** Revenue bars for the last months, the latest one emphasised and labelled. */
function RevenueBars({ trend }: { trend: Money[] }) {
	const f = useBillingFormat();
	const max = Math.max(1, ...trend.map((money) => money.amountMinor));
	return (
		<div role="img" aria-label={`Monthly recurring revenue over ${trend.length} months, now ${f.money(trend.at(-1)!)}`} className="flex h-28 items-end gap-2 pt-5">
			{trend.map((money, index) => {
				const last = index === trend.length - 1;
				return (
					<div key={index} className="relative flex h-full flex-1 items-end">
						<span className={cn('w-full rounded-[4px]', last ? 'bg-primary/80' : 'bg-foreground/[0.12]')} style={{ height: `${Math.max(4, (money.amountMinor / max) * 100)}%` }} />
						{last ? (
							<span className="absolute inset-x-0 text-center text-[11px] font-medium text-foreground tabular-nums" style={{ bottom: `calc(${(money.amountMinor / max) * 100}% + 4px)` }}>
								{f.money(money, { compact: true })}
							</span>
						) : null}
					</div>
				);
			})}
		</div>
	);
}

/**
 * The operator's morning view: revenue and its trend, the customer mix by
 * plan, and a short list of everything that needs a person.
 */
export function ConsoleOverviewView() {
	const { data, views, plans, health, standing, setView, settings } = useBillingConsole();
	const f = useBillingFormat();
	const mrr = sum(data.customers.map((customer) => customer.mrr));
	const atRisk = data.customers.filter((customer) => customer.lifecycle === 'grace' || customer.lifecycle === 'suspended');
	const trend = data.revenueTrend ?? [];
	const previous = trend.at(-2)?.amountMinor;
	const growth = previous ? (mrr - previous) / previous : null;
	const mix = plans
		.map((plan) => ({ plan, count: data.customers.filter((customer) => customer.planId === plan.id).length }))
		.filter((entry) => entry.count > 0);

	const items: AttentionItem[] = [];
	const failing = health.checks.filter((check) => check.status === 'fail');
	if (failing.length > 0 || !settings.enableBilling)
		items.push({
			id: 'readiness',
			icon: PlugZap,
			tone: failing.length ? 'danger' : 'warning',
			title: failing.length ? `${failing.length} readiness ${failing.length === 1 ? 'check fails' : 'checks fail'}` : 'Billing is switched off',
			detail: health.nextStep ?? 'Run the readiness check, then turn billing on.',
			view: 'provider',
		});
	if (atRisk.length > 0)
		items.push({
			id: 'overdue',
			icon: Hourglass,
			tone: 'warning',
			title: `${atRisk.length} ${atRisk.length === 1 ? 'customer is' : 'customers are'} overdue`,
			detail: `${f.money({ amountMinor: sum(atRisk.map((customer) => customer.mrr)), currency: settings.currency })} a month at risk. The overdue sweep downgrades them after the grace period.`,
			view: 'customers',
		});
	const review = data.customers.filter((customer) => customer.lifecycle === 'review_required');
	if (review.length > 0)
		items.push({ id: 'review', icon: ShieldAlert, tone: 'warning', title: `${review.length} provider ${review.length === 1 ? 'change needs' : 'changes need'} review`, detail: review.map((customer) => customer.name).join(', '), view: 'customers' });
	const syncing = plans.flatMap((plan) => [plan, ...plan.prices]).filter((item) => item.syncState === 'pending' || item.syncState === 'failed');
	if (syncing.length > 0)
		items.push({ id: 'sync', icon: RefreshCcw, tone: 'info', title: `${syncing.length} catalog ${syncing.length === 1 ? 'item is' : 'items are'} still syncing`, detail: 'Checkout uses the provider copy, so wait for these before announcing a price.', view: 'catalog' });
	if (data.usageSync.failed > 0)
		items.push({ id: 'usage-sync', icon: RefreshCcw, tone: 'danger', title: `${data.usageSync.failed} usage reports failed`, detail: 'They stay pending and are retried with the same idempotent id.', view: 'provider' });
	const suspended = standing.filter((database) => database.suspendedReason);
	if (suspended.length > 0)
		items.push({ id: 'standing', icon: ShieldAlert, tone: 'danger', title: `${suspended.length} ${suspended.length === 1 ? 'database is' : 'databases are'} suspended`, detail: suspended.map((database) => database.name).join(', '), view: 'standing' });

	const attention = items.filter((item) => views.includes(item.view));

	return (
		<ViewFrame icon={LayoutDashboard} title="Overview">
			<Bezel className={enterClass} innerClassName="grid grid-cols-2 gap-x-6 gap-y-5 p-4 @3xl/view:grid-cols-4">
				<StatTile icon={Wallet} label="Monthly recurring" value={f.money({ amountMinor: mrr, currency: settings.currency })} hint={growth !== null ? `${growth >= 0 ? '+' : ''}${f.percent(growth)} vs last month` : undefined} />
				<StatTile icon={Users} label="Customers" value={f.quantity(data.customers.length)} hint={`${data.customers.filter((customer) => customer.mrr.amountMinor > 0).length} paying`} />
				<StatTile icon={Hourglass} label="At risk" value={f.money({ amountMinor: sum(atRisk.map((customer) => customer.mrr)), currency: settings.currency })} hint={`${atRisk.length} overdue`} />
				<StatTile icon={PackageCheck} label="Active plans" value={plans.filter((plan) => plan.active).length} hint={`${plans.reduce((total, plan) => total + plan.prices.filter((price) => price.active).length, 0)} live prices`} />
			</Bezel>

			<div className="grid gap-4 @4xl/view:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
				<Panel className={enterClass} style={staggerStyle(1)} title="Needs attention" description={attention.length ? undefined : 'Nothing right now.'}>
					{attention.length === 0 ? (
						<p className="flex items-center gap-2 text-[13px] text-muted-foreground">
							<CircleCheck aria-hidden="true" className="size-4 text-success" />
							Payments, catalog, and standing are all in order.
						</p>
					) : (
						<ul className="flex flex-col gap-1">
							{attention.map((item) => (
								<li key={item.id}>
									<button
										type="button"
										onClick={() => setView(item.view)}
										className={cn('-mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-left hover:bg-overlay-hover', focusRingClass)}
									>
										<IconTile icon={item.icon} tone={item.tone} />
										<span className="min-w-0 flex-1">
											<span className="block text-[13px] font-medium text-foreground">{item.title}</span>
											<span className="block text-pretty text-xs text-muted-foreground">{item.detail}</span>
										</span>
										<ArrowRight aria-hidden="true" className="mt-1.5 size-3.5 shrink-0 text-subtle-foreground" />
									</button>
								</li>
							))}
						</ul>
					)}
				</Panel>
				<div className="flex flex-col gap-4">
					{trend.length > 1 ? (
						<Panel className={enterClass} style={staggerStyle(2)} title="Revenue" description={`Last ${trend.length} months`} actions={<TrendingUp aria-hidden="true" className="size-3.5 text-muted-foreground" />}>
							<RevenueBars trend={[...trend.slice(0, -1), { amountMinor: mrr, currency: settings.currency }]} />
						</Panel>
					) : null}
					<Panel className={enterClass} style={staggerStyle(3)} title="Customers by plan">
						<div aria-hidden="true" className="flex h-2 gap-px overflow-hidden rounded-full bg-foreground/[0.07]">
							{mix.map((entry, index) => (
								<span key={entry.plan.id} className={PLAN_COLORS[index % PLAN_COLORS.length]} style={{ width: `${(entry.count / data.customers.length) * 100}%` }} />
							))}
						</div>
						<ul className="mt-3 flex flex-col gap-1.5 text-[13px]">
							{mix.map((entry, index) => (
								<li key={entry.plan.id} className="flex items-center gap-2">
									<span aria-hidden="true" className={cn('size-2 rounded-[3px]', PLAN_COLORS[index % PLAN_COLORS.length])} />
									<span className="flex-1 text-foreground">{entry.plan.displayName}</span>
									<span className="text-muted-foreground tabular-nums">{entry.count}</span>
								</li>
							))}
						</ul>
					</Panel>
				</div>
			</div>
		</ViewFrame>
	);
}

'use client';

import { Check, Minus, Sparkles } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Segmented, ToneBadge } from '../workspace-kit/primitives';
import { PeriodTrack } from './allowance';
import { useBillingFormat } from './context';
import { INTERVAL_SUFFIX, isUnlimited } from './format';
import { LifecycleBadge } from './status';
import { Bezel, dashedRule } from './surface';
import type { BillingInterval, BillingLifecycle, Money, Plan, PlanPrice, Subscription } from './types';

/* ------------------------------------------------------------------ *
 * Price helpers
 * ------------------------------------------------------------------ */

/** The active price for an interval and usage type. */
export function priceFor(plan: Plan, interval: BillingInterval, usageType: PlanPrice['usageType'] = 'licensed') {
	return plan.prices.find((price) => price.active && price.interval === interval && price.usageType === usageType);
}

/** Percent saved by paying yearly instead of twelve monthly payments, or null. */
export function yearlySavings(plan: Plan) {
	const monthly = priceFor(plan, 'month');
	const yearly = priceFor(plan, 'year');
	if (!monthly || !yearly || monthly.amount.amountMinor === 0) return null;
	const saved = 1 - yearly.amount.amountMinor / (monthly.amount.amountMinor * 12);
	return saved > 0.005 ? Math.round(saved * 100) : null;
}

/** The largest yearly saving across a catalog, for the interval switch. */
export function catalogSavings(plans: Plan[]) {
	return plans.reduce<number | null>((best, plan) => {
		const saved = yearlySavings(plan);
		return saved !== null && (best === null || saved > best) ? saved : best;
	}, null);
}

type PriceTagProps = {
	plan: Plan;
	interval: BillingInterval;
	size?: 'md' | 'lg';
	/** Keeps the usage-note line even when empty, so side-by-side prices align. */
	reserveNote?: boolean;
	className?: string;
};

/** "$49/mo", "Free", or "Custom", with a quiet note when usage is billed on top. */
export function PriceTag({ plan, interval, size = 'md', reserveNote = false, className }: PriceTagProps) {
	const f = useBillingFormat();
	const price = priceFor(plan, interval) ?? priceFor(plan, 'month');
	const metered = priceFor(plan, price?.interval ?? interval, 'metered');
	const big = size === 'lg' ? 'text-3xl' : 'text-2xl';
	let figure: React.ReactNode;
	if (plan.contactSales) figure = <span className={cn(big, 'font-semibold tracking-tight')}>Custom</span>;
	else if (!price || price.amount.amountMinor === 0) figure = <span className={cn(big, 'font-semibold tracking-tight')}>Free</span>;
	else {
		const perMonth = price.interval === 'year' && interval === 'year';
		const shown: Money = perMonth ? { ...price.amount, amountMinor: Math.round(price.amount.amountMinor / 12) } : price.amount;
		figure = (
			<>
				<span className={cn(big, 'font-semibold tracking-tight')}>{f.money(shown)}</span>
				<span className="text-[13px] text-muted-foreground">{perMonth ? '/mo, billed yearly' : INTERVAL_SUFFIX[price.interval]}</span>
			</>
		);
	}
	return (
		<div className={cn('flex flex-col gap-0.5', className)}>
			<div className="flex items-baseline gap-1 text-foreground tabular-nums">{figure}</div>
			{metered && !plan.contactSales ? (
				<span className="text-xs text-muted-foreground">Plus usage past the allowance</span>
			) : reserveNote ? (
				<span aria-hidden="true" className="text-xs">
					&nbsp;
				</span>
			) : null}
		</div>
	);
}

type IntervalSwitchProps = {
	value: 'month' | 'year';
	onChange: (value: 'month' | 'year') => void;
	/** Best yearly saving, shown next to the switch. */
	savings?: number | null;
	className?: string;
};

export function IntervalSwitch({ value, onChange, savings, className }: IntervalSwitchProps) {
	return (
		<div className={cn('flex items-center gap-2', className)}>
			<Segmented
				label="Billing interval"
				value={value}
				onChange={onChange}
				options={[
					{ value: 'month', label: 'Monthly' },
					{ value: 'year', label: 'Yearly' },
				]}
			/>
			{savings ? <ToneBadge tone="success">Save up to {savings}%</ToneBadge> : null}
		</div>
	);
}

/* ------------------------------------------------------------------ *
 * Current plan
 * ------------------------------------------------------------------ */

type CurrentPlanCardProps = {
	plan: Plan;
	subscription?: Subscription;
	lifecycle: BillingLifecycle;
	/** Estimated next invoice, including metered usage so far. */
	nextInvoice?: Money;
	/** Plan display name for a scheduled change. */
	planName?: (planId: string) => string;
	actions?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
};

/**
 * The plan an account is on: name and status, price, where the period stands,
 * the estimated next invoice, and room for the next actions.
 */
export function CurrentPlanCard({ plan, subscription, lifecycle, nextInvoice, planName, actions, className, style }: CurrentPlanCardProps) {
	const f = useBillingFormat();
	const price = subscription?.priceId ? plan.prices.find((candidate) => candidate.id === subscription.priceId) : priceFor(plan, 'month');
	const interval = price?.interval === 'year' ? 'year' : 'month';
	const change = subscription?.scheduledChange;
	return (
		<Bezel className={className} style={style} innerClassName="flex flex-col">
			<div className="@container flex flex-col gap-4 p-4">
				<div className="flex flex-col gap-3 @md:flex-row @md:items-start @md:justify-between">
					<div className="min-w-0">
						<p className="text-xs text-muted-foreground">Current plan</p>
						<h2 className="mt-0.5 flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
							{plan.displayName}
							<LifecycleBadge lifecycle={lifecycle} />
						</h2>
						{plan.description ? <p className="mt-1 text-pretty text-[13px] text-muted-foreground">{plan.description}</p> : null}
					</div>
					<PriceTag plan={plan} interval={interval} className="@md:items-end @md:text-right" />
				</div>
				{subscription ? (
					<div className="flex flex-col gap-2">
						<PeriodTrack start={subscription.currentPeriodStart} end={subscription.currentPeriodEnd} tone={lifecycle === 'grace' ? 'warning' : 'default'} />
						<div className="flex justify-between text-xs text-muted-foreground tabular-nums">
							<span>{f.date(subscription.currentPeriodStart, 'short')}</span>
							<span>
								{subscription.cancelAt ? 'Ends' : change ? `${planName?.(change.planId) ?? 'Changes'} from` : 'Renews'}{' '}
								{f.date(subscription.cancelAt ?? change?.effectiveAt ?? subscription.currentPeriodEnd, 'short')}
							</span>
						</div>
					</div>
				) : null}
			</div>
			{nextInvoice || actions ? (
				<div className={cn('flex flex-wrap items-center justify-between gap-3 border-t bg-muted/50 px-4 py-2.5', dashedRule)}>
					{nextInvoice ? (
						<p className="text-xs text-muted-foreground">
							Next invoice <span className="font-medium text-foreground tabular-nums">{f.money(nextInvoice, { precise: true })}</span>
						</p>
					) : (
						<span />
					)}
					{actions ? <div className="flex items-center gap-2">{actions}</div> : null}
				</div>
			) : null}
		</Bezel>
	);
}

/* ------------------------------------------------------------------ *
 * Comparison
 * ------------------------------------------------------------------ */

export type EntitlementRow = {
	kind: 'limit' | 'meter' | 'cap';
	key: string;
	label: string;
	unit?: string;
};

function EntitlementValue({ plan, row }: { plan: Plan; row: EntitlementRow }) {
	const f = useBillingFormat();
	const source = row.kind === 'limit' ? plan.limits : row.kind === 'meter' ? plan.meterLimits : plan.caps;
	const value = source[row.key];
	if (value === undefined || value === 0) {
		return (
			<span className="inline-flex items-center gap-1 text-subtle-foreground">
				<Minus aria-hidden="true" className="size-3.5" />
				<span className="sr-only">Not included</span>
			</span>
		);
	}
	if (row.kind === 'cap' && value === 1) {
		return (
			<span className="inline-flex items-center gap-1 text-foreground">
				<Check aria-hidden="true" className="size-3.5" />
				<span className="sr-only">Included</span>
			</span>
		);
	}
	if (isUnlimited(value)) return <span className="text-foreground">Unlimited</span>;
	return (
		<span className="text-foreground tabular-nums">
			{f.quantity(value, true)}
			{row.unit ? <span className="text-muted-foreground"> {row.unit}</span> : null}
		</span>
	);
}

const WIDE_COLUMNS: Record<number, string> = { 3: '@5xl/view:grid-cols-3', 4: '@5xl/view:grid-cols-4' };

type PlanComparisonProps = {
	plans: Plan[];
	currentPlanId?: string;
	interval: 'month' | 'year';
	rows: EntitlementRow[];
	/** Called with the chosen plan and the licensed price for the interval (absent for contact-sales plans). */
	onSelect?: (plan: Plan, price: PlanPrice | undefined) => void;
	/** Plan waiting on a host call; its button shows a busy state. */
	pendingPlanId?: string;
	/** Hides actions, e.g. for members who cannot manage billing. */
	readOnly?: boolean;
	className?: string;
};

/**
 * Plans side by side: price, selling points, one call to action, and the
 * entitlement rows that differ between them. Cards stack in narrow
 * containers; the order of `plans` is the upgrade order.
 */
export function PlanComparison({ plans, currentPlanId, interval, rows, onSelect, pendingPlanId, readOnly, className }: PlanComparisonProps) {
	const currentIndex = plans.findIndex((plan) => plan.id === currentPlanId);
	return (
		<ul className={cn('grid gap-3 @2xl/view:grid-cols-2', WIDE_COLUMNS[Math.min(plans.length, 4)], className)}>
			{plans.map((plan, index) => {
				const current = plan.id === currentPlanId;
				const price = priceFor(plan, interval) ?? priceFor(plan, 'month');
				const direction = currentIndex === -1 || index > currentIndex ? 'up' : 'down';
				const label = current ? 'Current plan' : plan.contactSales ? 'Talk to sales' : direction === 'up' ? `Upgrade to ${plan.displayName}` : `Switch to ${plan.displayName}`;
				return (
					<li key={plan.id} className="flex">
						<Bezel muted={!plan.recommended} className={cn('flex w-full', plan.recommended && 'border-primary/25 bg-primary/[0.06]')} innerClassName="flex flex-col">
							<div className="flex flex-col gap-3 p-4">
								<div className="flex items-center justify-between gap-2">
									<h3 className="text-sm font-medium text-foreground">{plan.displayName}</h3>
									{plan.recommended ? (
										<ToneBadge tone="primary">
											<Sparkles aria-hidden="true" />
											Popular
										</ToneBadge>
									) : current ? (
										<ToneBadge tone="neutral">Current</ToneBadge>
									) : null}
								</div>
								<PriceTag plan={plan} interval={interval} reserveNote />
								<p className="line-clamp-2 min-h-10 text-pretty text-[13px] text-muted-foreground">{plan.description}</p>
								{readOnly ? null : (
									<Button
										size="sm"
										variant={current ? 'outline' : plan.recommended ? 'default' : 'outline'}
										disabled={current || pendingPlanId !== undefined}
										aria-busy={pendingPlanId === plan.id || undefined}
										onClick={() => onSelect?.(plan, plan.contactSales ? undefined : price)}
									>
										{pendingPlanId === plan.id ? 'Opening…' : label}
									</Button>
								)}
							</div>
							{plan.highlights?.length ? (
								<ul className={cn('flex flex-col gap-1.5 border-t px-4 py-3 text-[13px] text-foreground', dashedRule)}>
									{plan.highlights.map((highlight) => (
										<li key={highlight} className="flex gap-2">
											<Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
											{highlight}
										</li>
									))}
								</ul>
							) : null}
							{rows.length ? (
								<dl className={cn('mt-auto flex flex-col border-t bg-muted/40 px-4 py-2 text-[13px]', dashedRule)}>
									{rows.map((row) => (
										<div key={`${row.kind}:${row.key}`} className="flex items-center justify-between gap-3 py-1">
											<dt className="text-muted-foreground">{row.label}</dt>
											<dd>
												<EntitlementValue plan={plan} row={row} />
											</dd>
										</div>
									))}
								</dl>
							) : null}
						</Bezel>
					</li>
				);
			})}
		</ul>
	);
}

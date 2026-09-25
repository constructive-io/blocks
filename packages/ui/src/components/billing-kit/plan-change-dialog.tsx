'use client';

import { ArrowDownRight, ArrowRight, ArrowUpRight, ExternalLink, TriangleAlert } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPopup, DialogTitle } from '../dialog';
import { focusRingClass } from '../workspace-kit/primitives';
import { useBillingFormat } from './context';
import { isUnlimited } from './format';
import { type EntitlementRow, priceFor } from './plan';
import { hasFeature, type BillingProviderDescriptor } from './providers';
import { dashedRule } from './surface';
import type { Balance, LimitCounter, Plan, PlanPrice, Subscription } from './types';

export type PlanChangeTiming = 'now' | 'period_end';

export type PlanChangeRequest = {
	plan: Plan;
	price: PlanPrice | undefined;
	timing: PlanChangeTiming;
	/** True when the change has to go through the provider's hosted checkout. */
	checkout: boolean;
};

type PlanChangeDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentPlan?: Plan;
	targetPlan?: Plan;
	interval: 'month' | 'year';
	subscription?: Subscription;
	rows: EntitlementRow[];
	limits?: LimitCounter[];
	balances?: Balance[];
	provider?: BillingProviderDescriptor;
	/** Resolve to close the dialog; reject with an Error to show its message and stay open. */
	onConfirm: (request: PlanChangeRequest) => Promise<void> | void;
};

type Diff = { row: EntitlementRow; from: number | undefined; to: number | undefined; direction: 'up' | 'down' };

function valueOf(plan: Plan | undefined, row: EntitlementRow) {
	if (!plan) return undefined;
	return (row.kind === 'limit' ? plan.limits : row.kind === 'meter' ? plan.meterLimits : plan.caps)[row.key];
}

/** Orders values with unlimited (-1) above every finite number. */
const rank = (value: number | undefined) => (value === undefined ? 0 : isUnlimited(value) ? Infinity : value);

function diffPlans(from: Plan | undefined, to: Plan, rows: EntitlementRow[]): Diff[] {
	return rows.flatMap((row) => {
		const before = valueOf(from, row);
		const after = valueOf(to, row);
		if (rank(before) === rank(after)) return [];
		return [{ row, from: before, to: after, direction: rank(after) > rank(before) ? 'up' : 'down' } as Diff];
	});
}

/**
 * A move to a cheaper monthly price is a downgrade; with no prices to compare
 * (free to free, custom plans), the entitlement diff decides.
 */
function isDowngrade(from: Plan | undefined, to: Plan | undefined, diffs: Diff[]) {
	if (!from || !to) return false;
	const before = priceFor(from, 'month')?.amount.amountMinor;
	const after = priceFor(to, 'month')?.amount.amountMinor;
	if (before !== undefined && after !== undefined && before !== after) return after < before;
	const down = diffs.filter((diff) => diff.direction === 'down').length;
	return down > diffs.length - down;
}

function Value({ value, row }: { value: number | undefined; row: EntitlementRow }) {
	const f = useBillingFormat();
	if (value === undefined || value === 0) return <span className="text-subtle-foreground">{row.kind === 'cap' ? 'Off' : 'None'}</span>;
	if (row.kind === 'cap' && value === 1) return <>On</>;
	if (isUnlimited(value)) return <>Unlimited</>;
	return <>{f.quantity(value, true)}</>;
}

/**
 * Previews a plan change before anything is sent: what goes up or down, what
 * the account already uses beyond the new plan, and when the change applies.
 * Upgrades default to now; downgrades default to the end of the period when
 * the provider can schedule changes.
 */
export function PlanChangeDialog({
	open,
	onOpenChange,
	currentPlan,
	targetPlan,
	interval,
	subscription,
	rows,
	limits = [],
	balances = [],
	provider,
	onConfirm,
}: PlanChangeDialogProps) {
	const f = useBillingFormat();
	const [timing, setTiming] = React.useState<PlanChangeTiming>('now');
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const timingId = React.useId();

	const diffs = React.useMemo(() => (targetPlan ? diffPlans(currentPlan, targetPlan, rows) : []), [currentPlan, rows, targetPlan]);
	const price = targetPlan ? (priceFor(targetPlan, interval) ?? priceFor(targetPlan, 'month')) : undefined;
	const downgrade = isDowngrade(currentPlan, targetPlan, diffs);
	const canSchedule = Boolean(subscription) && hasFeature(provider, 'scheduledChanges');
	const paid = Boolean(price && price.amount.amountMinor > 0);
	const checkout = paid && (!subscription || subscription.lifecycle === 'unsubscribed' || subscription.lifecycle === 'ended') && hasFeature(provider, 'hostedCheckout');

	// Each opening (or a new target) starts from its own default, set during render so the wrong timing never paints.
	const session = open ? (targetPlan?.id ?? '') : null;
	const [lastSession, setLastSession] = React.useState<string | null>(null);
	if (session !== lastSession) {
		setLastSession(session);
		if (session !== null) {
			setTiming(downgrade && canSchedule ? 'period_end' : 'now');
			setError(null);
			setBusy(false);
		}
	}

	const conflicts = React.useMemo(() => {
		if (!targetPlan) return { limits: [] as string[], meters: [] as string[] };
		const limitConflicts = limits.flatMap((limit) => {
			const max = targetPlan.limits[limit.name];
			return max !== undefined && !isUnlimited(max) && limit.used > max
				? [`${f.quantity(limit.used)} ${limit.unit} in use; ${targetPlan.displayName} allows ${f.quantity(max)}.`]
				: [];
		});
		const meterRows = new Map(rows.filter((row) => row.kind === 'meter').map((row) => [row.key, row]));
		const meterConflicts = balances.flatMap((balance) => {
			const max = targetPlan.meterLimits[balance.meterSlug];
			const row = meterRows.get(balance.meterSlug);
			return row && max !== undefined && !isUnlimited(max) && balance.currentUsage > max ? [row.label.toLowerCase()] : [];
		});
		return { limits: limitConflicts, meters: meterConflicts };
	}, [balances, f, limits, rows, targetPlan]);
	const meterNote =
		timing === 'now' && conflicts.meters.length > 0 && targetPlan
			? `This period is already past ${targetPlan.displayName}’s allowance for ${f.list(conflicts.meters)}, so the rest of the period draws from credits.`
			: null;

	if (!targetPlan) return null;

	const confirm = async () => {
		setBusy(true);
		setError(null);
		try {
			await onConfirm({ plan: targetPlan, price, timing, checkout });
			onOpenChange(false);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : 'The change could not be made. Try again.');
		} finally {
			setBusy(false);
		}
	};

	const periodEnd = subscription ? f.date(subscription.currentPeriodEnd) : null;

	return (
		<Dialog open={open} onOpenChange={(next) => (busy ? undefined : onOpenChange(next))}>
			<DialogPopup className="max-w-md">
				<DialogHeader className="gap-1.5 pb-3">
					<DialogTitle className="text-base font-medium">
						{currentPlan ? `${downgrade ? 'Switch' : 'Upgrade'} to ${targetPlan.displayName}` : `Start ${targetPlan.displayName}`}
					</DialogTitle>
					<DialogDescription className="text-[13px]">
						{price && paid
							? `${f.money(price.amount)} ${interval === 'year' && price.interval === 'year' ? 'per year' : 'per month'}${priceFor(targetPlan, price.interval, 'metered') ? ', plus usage past the allowance' : ''}.`
							: 'No charge.'}
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-4 px-6 pb-5">
					{diffs.length > 0 ? (
						<ul aria-label="What changes" className="flex flex-col rounded-lg border border-border px-3 py-1 text-[13px]">
							{diffs.map((diff, index) => (
								<li key={`${diff.row.kind}:${diff.row.key}`} className={cn('flex items-center gap-2 py-1.5', index > 0 && cn('border-t', dashedRule))}>
									{diff.direction === 'up' ? (
										<ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0 text-success" />
									) : (
										<ArrowDownRight aria-hidden="true" className="size-3.5 shrink-0 text-warning" />
									)}
									<span className="min-w-0 flex-1 truncate text-muted-foreground">{diff.row.label}</span>
									<span className="flex items-center gap-1.5 text-foreground tabular-nums">
										<span className="text-muted-foreground">
											<Value value={diff.from} row={diff.row} />
										</span>
										<ArrowRight aria-hidden="true" className="size-3 text-subtle-foreground" />
										<span className="font-medium">
											<Value value={diff.to} row={diff.row} />
										</span>
										<span className="sr-only">{diff.direction === 'up' ? '(increase)' : '(decrease)'}</span>
									</span>
								</li>
							))}
						</ul>
					) : null}

					{conflicts.limits.length > 0 || meterNote ? (
						<div role="note" className="flex gap-2 rounded-lg bg-warning/10 px-3 py-2.5 text-[13px] text-foreground">
							<TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-warning" />
							<div className="flex flex-col gap-1.5 text-pretty">
								{conflicts.limits.length > 0 ? (
									<>
										<ul className="flex flex-col gap-0.5">
											{conflicts.limits.map((conflict) => (
												<li key={conflict}>{conflict}</li>
											))}
										</ul>
										<p className="text-muted-foreground">Existing ones keep working, but new ones are refused until you are under the limit.</p>
									</>
								) : null}
								{meterNote ? <p className={conflicts.limits.length > 0 ? 'text-muted-foreground' : undefined}>{meterNote}</p> : null}
							</div>
						</div>
					) : null}

					{canSchedule && !checkout ? (
						<fieldset className="flex flex-col gap-2">
							<legend id={timingId} className="mb-2 text-xs text-muted-foreground">
								When should it apply?
							</legend>
							{(
								[
									{ value: 'now', title: 'Right away', detail: downgrade ? 'Unused time is credited to the next invoice.' : 'You pay the difference for the rest of this period.' },
									{ value: 'period_end', title: `At the end of the period${periodEnd ? `, ${periodEnd}` : ''}`, detail: 'Keep your current plan until then; cancel any time before.' },
								] as const
							).map((option) => (
								<label
									key={option.value}
									className={cn(
										'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[13px] has-[:checked]:border-primary/40 has-[:checked]:bg-primary/[0.05]',
										'has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
									)}
								>
									<input
										type="radio"
										name={timingId}
										value={option.value}
										checked={timing === option.value}
										onChange={() => setTiming(option.value)}
										className={cn('mt-0.5 accent-primary', focusRingClass)}
									/>
									<span className="min-w-0">
										<span className="block font-medium text-foreground">{option.title}</span>
										<span className="block text-muted-foreground">{option.detail}</span>
									</span>
								</label>
							))}
						</fieldset>
					) : null}

					{checkout ? (
						<p className="flex items-start gap-2 text-[13px] text-muted-foreground">
							<ExternalLink aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
							You’ll finish payment on {provider?.name ?? 'the provider'}’s secure checkout. Nothing is charged until you confirm there.
						</p>
					) : null}

					{error ? (
						<p role="alert" className="text-[13px] text-destructive">
							{error}
						</p>
					) : null}
				</div>
				<DialogFooter>
					<Button variant="outline" size="sm" disabled={busy} onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button size="sm" disabled={busy} aria-busy={busy || undefined} onClick={confirm}>
						{busy ? 'Working…' : checkout ? 'Continue to checkout' : timing === 'period_end' ? 'Schedule change' : downgrade ? 'Switch now' : 'Upgrade now'}
					</Button>
				</DialogFooter>
			</DialogPopup>
		</Dialog>
	);
}

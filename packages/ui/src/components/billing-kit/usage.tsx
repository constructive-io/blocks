'use client';

import { ChevronRight, Infinity as InfinityIcon, Layers } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../sheet';
import { focusRingClass, ToneBadge } from '../workspace-kit/primitives';
import { AllowanceBar, Sparkline, UsageFigure } from './allowance';
import { useBillingFormat } from './context';
import { daysUntil, isUnlimited, usageLevel, usageRatio } from './format';
import { dashedRule, KeyValueList, Panel } from './surface';
import type { Balance, Meter, RateWindow } from './types';

export const UNIVERSAL_METER = 'universal';

export type UsageNode = {
	meter: Meter;
	balance?: Balance;
	children: UsageNode[];
};

/**
 * Arranges meters into the credit waterfall: `universal` at the root, the
 * category pools under it, and task meters under their pool. Meters without a
 * pool hang off `universal`. Only meters with a balance (or a child with one)
 * are kept unless `includeEmpty` is set.
 */
export function buildUsageTree(meters: Meter[], balances: Balance[], includeEmpty = false): UsageNode | null {
	const balanceBySlug = new Map(balances.map((balance) => [balance.meterSlug, balance]));
	const nodes = new Map<string, UsageNode>(meters.map((meter) => [meter.slug, { meter, balance: balanceBySlug.get(meter.slug), children: [] as UsageNode[] }]));
	const root = nodes.get(UNIVERSAL_METER);
	if (!root) return null;
	for (const node of nodes.values()) {
		if (node === root) continue;
		const parent = nodes.get(node.meter.categoryMeter ?? UNIVERSAL_METER) ?? root;
		parent.children.push(node);
	}
	const keep = (node: UsageNode): boolean => includeEmpty || Boolean(node.balance) || node.children.some(keep);
	const prune = (node: UsageNode): UsageNode => ({ ...node, children: node.children.filter(keep).map(prune) });
	return prune(root);
}

/** Pools first, then meters, each ordered by how close they are to their limit. */
function pressure(node: UsageNode) {
	const balance = node.balance;
	if (!balance) return -1;
	return usageRatio(balance.currentUsage, balance.effectiveLimit) ?? -0.5;
}

type MeterRowProps = {
	node: UsageNode;
	depth: number;
	onSelect?: (slug: string) => void;
};

function MeterRow({ node, depth, onSelect }: MeterRowProps) {
	const f = useBillingFormat();
	const { meter, balance } = node;
	const used = balance?.currentUsage ?? 0;
	const limit = balance?.effectiveLimit ?? -1;
	const level = usageLevel(used, limit);
	const content = (
		<>
			<span className="flex min-w-0 flex-1 flex-col gap-1.5">
				<span className="flex min-w-0 items-center gap-2">
					<span className="truncate text-[13px] text-foreground">{meter.displayName}</span>
					{balance?.fallbackCredits ? (
						<span className="hidden text-xs whitespace-nowrap text-muted-foreground tabular-nums @xl/view:inline">
							drew {f.quantity(balance.fallbackCredits, true)} credits
						</span>
					) : null}
					{level === 'warning' ? <span className="sr-only">, nearing its limit</span> : null}
					{level === 'exhausted' || level === 'over' ? <span className="sr-only">, limit reached</span> : null}
				</span>
				<AllowanceBar used={used} limit={limit} label={meter.displayName} size="sm" planMarker={balance?.planLimit} />
			</span>
			<span className="flex w-36 shrink-0 flex-col items-end gap-0.5">
				<UsageFigure used={used} limit={limit} unit={meter.unit} className="text-xs" />
				{meter.creditCost ? <span className="text-[11px] text-subtle-foreground tabular-nums">{meter.creditCost} cr / unit after</span> : null}
			</span>
			{onSelect ? <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-subtle-foreground" /> : null}
		</>
	);
	const className = cn('flex w-full items-center gap-4 py-2.5 pr-1 text-left', depth > 1 && 'pl-5');
	return (
		<li className={cn('border-t', dashedRule)}>
			{onSelect ? (
				<button type="button" onClick={() => onSelect(meter.slug)} className={cn(className, 'cursor-pointer rounded-md hover:bg-overlay-hover', focusRingClass)}>
					{content}
				</button>
			) : (
				<div className={className}>{content}</div>
			)}
		</li>
	);
}

type UsageTreeProps = {
	meters: Meter[];
	balances: Balance[];
	onSelectMeter?: (slug: string) => void;
	/** Pools start open; pass the slugs to start closed. */
	defaultCollapsed?: string[];
	className?: string;
};

/**
 * The credit waterfall as a list: each category pool with its own bar, the
 * meters that draw from it, and the universal backstop they all fall back to.
 */
export function UsageTree({ meters, balances, onSelectMeter, defaultCollapsed = [], className }: UsageTreeProps) {
	const tree = React.useMemo(() => buildUsageTree(meters, balances), [balances, meters]);
	const [collapsed, setCollapsed] = React.useState<ReadonlySet<string>>(() => new Set(defaultCollapsed));
	if (!tree) return null;
	const pools = tree.children.filter((node) => node.children.length > 0).sort((a, b) => pressure(b) - pressure(a));
	const loose = tree.children.filter((node) => node.children.length === 0);
	const universal = tree.balance;

	return (
		<div className={cn('flex flex-col gap-3', className)}>
			{universal ? (
				<div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-dashed border-foreground/15 px-4 py-3">
					<span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
						<Layers aria-hidden="true" className="size-3.5" />
					</span>
					<div className="min-w-0 flex-1 basis-48">
						<p className="text-[13px] font-medium text-foreground">Universal credits</p>
						<p className="text-xs text-muted-foreground">Every pool falls back here once its own allowance runs out.</p>
					</div>
					<div className="flex w-full flex-col gap-1.5 @xl/view:w-56">
						<AllowanceBar used={universal.currentUsage} limit={universal.effectiveLimit} label="Universal credits" planMarker={universal.planLimit} />
						<UsageFigure used={universal.currentUsage} limit={universal.effectiveLimit} unit="credits" className="self-end text-xs" />
					</div>
				</div>
			) : null}
			<ul className="grid gap-3 @4xl/view:grid-cols-2">
				{pools.map((pool) => {
					const open = !collapsed.has(pool.meter.slug);
					const panelId = `${pool.meter.slug}-meters`;
					const used = pool.balance?.currentUsage ?? 0;
					const limit = pool.balance?.effectiveLimit ?? -1;
					return (
						<li key={pool.meter.slug}>
							<Panel bodyClassName="px-4 pb-1 pt-0">
								<button
									type="button"
									aria-expanded={open}
									aria-controls={panelId}
									onClick={() =>
										setCollapsed((current) => {
											const next = new Set(current);
											if (next.has(pool.meter.slug)) next.delete(pool.meter.slug);
											else next.add(pool.meter.slug);
											return next;
										})
									}
									className={cn('-mx-1 flex w-[calc(100%+0.5rem)] cursor-pointer items-center gap-3 rounded-md px-1 py-3 text-left', focusRingClass)}
								>
									<ChevronRight
										aria-hidden="true"
										className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform duration-(--duration-fast) motion-reduce:transition-none', open && 'rotate-90')}
									/>
									<span className="flex min-w-0 flex-1 flex-col gap-1.5">
										<span className="flex items-center gap-2">
											<span className="text-sm font-medium text-foreground">{pool.meter.displayName}</span>
											<span className="text-xs text-muted-foreground tabular-nums">{pool.children.length} meters</span>
										</span>
										<AllowanceBar used={used} limit={limit} label={`${pool.meter.displayName} pool`} planMarker={pool.balance?.planLimit} />
									</span>
									<span className="w-28 shrink-0 text-right">
										{isUnlimited(limit) ? (
											<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
												<InfinityIcon aria-hidden="true" className="size-3.5" />
												Unlimited
											</span>
										) : (
											<UsageFigure used={used} limit={limit} unit="cr" className="text-xs" />
										)}
									</span>
								</button>
								<ul id={panelId} hidden={!open} className="pb-2">
									{[...pool.children]
										.sort((a, b) => pressure(b) - pressure(a))
										.map((child) => (
											<MeterRow key={child.meter.slug} node={child} depth={1} onSelect={onSelectMeter} />
										))}
								</ul>
							</Panel>
						</li>
					);
				})}
			</ul>
			{loose.length > 0 ? (
				<Panel title="Other meters" bodyClassName="pb-1">
					<ul>
						{loose.map((node) => (
							<MeterRow key={node.meter.slug} node={node} depth={1} onSelect={onSelectMeter} />
						))}
					</ul>
				</Panel>
			) : null}
		</div>
	);
}

type PoolGridProps = {
	meters: Meter[];
	balances: Balance[];
	onSelect?: (slug: string) => void;
	/** Maximum pools shown; the busiest come first. */
	limit?: number;
	className?: string;
};

/** Compact tiles of the category pools, busiest first, for an overview. */
export function PoolGrid({ meters, balances, onSelect, limit = 6, className }: PoolGridProps) {
	const f = useBillingFormat();
	const tree = React.useMemo(() => buildUsageTree(meters, balances), [balances, meters]);
	const pools = (tree?.children ?? []).filter((node) => node.balance).sort((a, b) => pressure(b) - pressure(a)).slice(0, limit);
	return (
		<ul className={cn('grid grid-cols-1 gap-2 @md/view:grid-cols-2 @4xl/view:grid-cols-3', className)}>
			{pools.map((pool) => {
				const balance = pool.balance!;
				const ratio = usageRatio(balance.currentUsage, balance.effectiveLimit);
				const level = usageLevel(balance.currentUsage, balance.effectiveLimit);
				const body = (
					<>
						<span className="flex items-center justify-between gap-2">
							<span className="truncate text-[13px] text-foreground">{pool.meter.displayName}</span>
							<span
								className={cn(
									'text-xs tabular-nums',
									level === 'warning' ? 'font-medium text-warning' : level === 'ok' ? 'text-muted-foreground' : 'font-medium text-destructive',
								)}
							>
								{ratio === null ? 'Unlimited' : f.percent(ratio)}
							</span>
						</span>
						<AllowanceBar used={balance.currentUsage} limit={balance.effectiveLimit} label={pool.meter.displayName} size="sm" />
					</>
				);
				const className = 'flex w-full flex-col gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-left';
				return (
					<li key={pool.meter.slug}>
						{onSelect ? (
							<button type="button" onClick={() => onSelect(pool.meter.slug)} className={cn(className, 'cursor-pointer hover:bg-muted/50', focusRingClass)}>
								{body}
							</button>
						) : (
							<div className={className}>{body}</div>
						)}
					</li>
				);
			})}
		</ul>
	);
}

type MeterDetailSheetProps = {
	meter?: Meter;
	balance?: Balance;
	/** The pool this meter falls back to, for the waterfall copy. */
	pool?: Meter;
	rateWindows?: RateWindow[];
	periodEnd?: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

/**
 * One meter in depth: daily usage this period, how the allowance is built
 * (plan, credits, effective limit), the waterfall it falls back to, and any
 * request windows that throttle it.
 */
export function MeterDetailSheet({ meter, balance, pool, rateWindows = [], periodEnd, open, onOpenChange }: MeterDetailSheetProps) {
	const f = useBillingFormat();
	if (!meter) return null;
	const used = balance?.currentUsage ?? 0;
	const limit = balance?.effectiveLimit ?? -1;
	const remaining = isUnlimited(limit) ? null : Math.max(0, limit - used);
	const daysLeft = periodEnd ? Math.max(0, daysUntil(periodEnd, f.now)) : 0;
	const windows = rateWindows.filter((window) => window.meterSlug === meter.slug);
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-[26rem] max-w-[92vw] gap-0 p-0 sm:max-w-[26rem]">
				<div className="flex flex-col gap-1 border-b border-border px-5 pt-5 pb-4">
					<SheetTitle className="text-base font-medium">{meter.displayName}</SheetTitle>
					<SheetDescription className="text-[13px]">
						{meter.description ?? `Measured in ${meter.unit}, ${meter.aggregation === 'peak' ? 'at its peak' : 'summed'} ${meter.periodInterval ? `each ${meter.periodInterval}` : 'without reset'}.`}
					</SheetDescription>
				</div>
				<div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 [&>*]:shrink-0">
					<div className="flex flex-col gap-2">
						<div className="flex items-baseline justify-between">
							<UsageFigure used={used} limit={limit} unit={meter.unit} compact={false} className="text-sm" />
							{remaining !== null ? <span className="text-xs text-muted-foreground tabular-nums">{f.quantity(remaining, true)} left</span> : null}
						</div>
						<AllowanceBar used={used} limit={limit} label={meter.displayName} planMarker={balance?.planLimit} />
					</div>
					{balance?.daily?.length ? (
						<div className="flex flex-col gap-2">
							<p className="text-xs text-muted-foreground">Daily usage this period</p>
							<Sparkline values={balance.daily} remaining={daysLeft} label={`Daily ${meter.displayName.toLowerCase()} for the last ${balance.daily.length} days`} className="h-14" />
						</div>
					) : null}
					{balance ? (
						<KeyValueList
							items={[
								{ label: 'Plan allowance', value: isUnlimited(balance.planLimit) ? 'Unlimited' : f.quantity(balance.planLimit) },
								{ label: 'Credits applied', value: `+${f.quantity(balance.purchasedCredits)}` },
								...(balance.rolloverCredits ? [{ label: 'Rolled over', value: f.quantity(balance.rolloverCredits) }] : []),
								{ label: 'Effective limit', value: isUnlimited(balance.effectiveLimit) ? 'Unlimited' : f.quantity(balance.effectiveLimit) },
								...(balance.nextExpiresAt ? [{ label: 'Next credits expire', value: f.date(balance.nextExpiresAt) }] : []),
							]}
						/>
					) : null}
					<div className={cn('rounded-lg bg-muted/60 px-3 py-2.5 text-[13px] text-muted-foreground')}>
						{meter.meterType === 'usage_pool' ? (
							<>Meters in this pool draw from it once their own allowance runs out; when the pool is empty they fall back to Universal credits.</>
						) : meter.creditCost ? (
							<>
								When the allowance runs out, each {meter.unit.replace(/s$/, '')} costs{' '}
								<span className="font-medium text-foreground tabular-nums">{meter.creditCost}</span> {meter.creditCost === 1 ? 'credit' : 'credits'} from{' '}
								{pool && pool.slug !== UNIVERSAL_METER ? (
									<>
										<span className="text-foreground">{pool.displayName}</span>, then from Universal credits.
									</>
								) : (
									'Universal credits.'
								)}
							</>
						) : (
							<>This meter never draws credits: usage past the limit is refused.</>
						)}
					</div>
					{windows.length > 0 ? (
						<div className="flex flex-col gap-2">
							<p className="text-xs text-muted-foreground">Request windows</p>
							<ul className="flex flex-col gap-1.5 text-[13px]">
								{windows.map((window) => (
									<li key={window.id} className="flex items-center justify-between gap-3">
										<span className="text-muted-foreground">
											{window.scope === 'entity' ? 'Whole account' : 'Per member'} · {window.window}
										</span>
										<span className="flex items-center gap-2 text-foreground tabular-nums">
											{isUnlimited(window.maxRequests) ? 'No limit' : `${f.quantity(window.maxRequests)} requests`}
											{window.override ? <ToneBadge tone="primary">Override</ToneBadge> : null}
										</span>
									</li>
								))}
							</ul>
						</div>
					) : null}
				</div>
			</SheetContent>
		</Sheet>
	);
}

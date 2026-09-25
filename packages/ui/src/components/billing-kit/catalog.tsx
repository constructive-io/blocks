'use client';

import { Infinity as InfinityIcon, Lock, Plus } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Switch } from '../switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';
import { focusRingClass, ToneBadge } from '../workspace-kit/primitives';
import { useBillingFormat } from './context';
import { humanize, INTERVAL_LABEL, isUnlimited } from './format';
import type { EntitlementRow } from './plan';
import { type BillingProviderDescriptor } from './providers';
import { ExternalRef, SyncBadge } from './provider';
import { TableSurface, tableHeadClass, tableRowClass } from './surface';
import type { CreditPack, Meter, Plan, PlanPrice, ProviderMode } from './types';

/** Keeps the switch's 40px hit area without making dense rows taller. */
const tableSwitchClass = '-my-3';

/* ------------------------------------------------------------------ *
 * Entitlement matrix
 * ------------------------------------------------------------------ */

export type EntitlementGroup = { title: string; rows: EntitlementRow[] };

type EntitlementMatrixProps = {
	plans: Plan[];
	groups: EntitlementGroup[];
	/** When set, cells become editable and report every change. */
	onChange?: (planId: string, row: EntitlementRow, value: number) => void;
	/** Cells that differ from the saved catalog, keyed `planId:kind:key`. */
	dirty?: ReadonlySet<string>;
	className?: string;
};

export const entitlementKey = (planId: string, row: Pick<EntitlementRow, 'kind' | 'key'>) => `${planId}:${row.kind}:${row.key}`;

function readValue(plan: Plan, row: EntitlementRow) {
	return (row.kind === 'limit' ? plan.limits : row.kind === 'meter' ? plan.meterLimits : plan.caps)[row.key];
}

function MatrixCell({ plan, row, numeric, onChange, dirty }: { plan: Plan; row: EntitlementRow; numeric: boolean; onChange?: EntitlementMatrixProps['onChange']; dirty: boolean }) {
	const f = useBillingFormat();
	const value = readValue(plan, row);
	const label = `${row.label} for ${plan.displayName}`;
	const [draft, setDraft] = React.useState<string | null>(null);

	if (row.kind === 'cap' && !numeric) {
		return onChange ? (
			<Switch className={tableSwitchClass} aria-label={label} checked={(value ?? 0) > 0} onCheckedChange={(checked) => onChange(plan.id, row, checked ? 1 : 0)} />
		) : (
			<span className="text-foreground">{(value ?? 0) > 0 ? 'On' : <span className="text-subtle-foreground">Off</span>}</span>
		);
	}

	const shown = value === undefined ? '—' : isUnlimited(value) ? '∞' : f.quantity(value, true);
	if (!onChange) return <span className={cn('tabular-nums', value === undefined ? 'text-subtle-foreground' : 'text-foreground')}>{shown}</span>;

	const commit = () => {
		if (draft === null) return;
		const trimmed = draft.trim().toLowerCase();
		const next = trimmed === '' || trimmed === '∞' || trimmed === 'unlimited' ? -1 : Number(trimmed.replace(/[, _]/g, ''));
		if (Number.isFinite(next) && next >= -1) onChange(plan.id, row, Math.round(next));
		setDraft(null);
	};

	return (
		<span className="flex items-center justify-end gap-1">
			<input
				aria-label={label}
				inputMode="numeric"
				value={draft ?? (value === undefined ? '' : isUnlimited(value) ? '∞' : f.quantity(value))}
				placeholder="—"
				onFocus={(event) => {
					setDraft(value === undefined ? '' : isUnlimited(value) ? '∞' : String(value));
					const input = event.currentTarget;
					requestAnimationFrame(() => input.select());
				}}
				onChange={(event) => setDraft(event.target.value)}
				onBlur={commit}
				onKeyDown={(event) => {
					if (event.key === 'Enter') event.currentTarget.blur();
					if (event.key === 'Escape') {
						setDraft(null);
						event.currentTarget.blur();
					}
				}}
				className={cn(
					'h-7 w-24 rounded-md border bg-transparent px-2 text-right text-[13px] tabular-nums outline-none',
					'border-transparent hover:border-border focus:border-border focus:bg-card focus:ring-[3px] focus:ring-ring/50',
					dirty && 'border-primary/30 bg-primary/[0.06]',
				)}
			/>
			<Tooltip>
				<TooltipTrigger
					render={
						<button
							type="button"
							aria-label={`Make ${label} unlimited`}
							aria-pressed={value !== undefined && isUnlimited(value)}
							onClick={() => onChange(plan.id, row, value !== undefined && isUnlimited(value) ? 0 : -1)}
							className={cn(
								'grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-overlay-hover hover:text-foreground aria-pressed:text-primary',
								focusRingClass,
							)}
						>
							<InfinityIcon aria-hidden="true" className="size-3.5" />
						</button>
					}
				/>
				<TooltipContent>Unlimited</TooltipContent>
			</Tooltip>
		</span>
	);
}

/**
 * Plans across, entitlements down: counted limits, meter allowances, and
 * feature caps, grouped. Numbers edit in place (type `∞` or use the toggle for
 * unlimited); caps are switches. Saving is the host's job: this reports each
 * change and highlights the cells passed in `dirty`.
 */
export function EntitlementMatrix({ plans, groups, onChange, dirty, className }: EntitlementMatrixProps) {
	return (
		<TableSurface className={className} minWidth={`${14 + plans.length * 9}rem`}>
			<thead className={tableHeadClass}>
				<tr>
					<th scope="col" className="sticky left-0 z-10 w-56 bg-[color-mix(in_oklab,var(--muted)_60%,var(--card))]">
						Entitlement
					</th>
					{plans.map((plan) => (
						<th key={plan.id} scope="col" className="text-right">
							<span className="text-foreground">{plan.displayName}</span>
						</th>
					))}
				</tr>
			</thead>
			{groups.map((group) => (
				<tbody key={group.title}>
					<tr className="border-t border-border bg-muted/30">
						<th scope="rowgroup" colSpan={plans.length + 1} className="px-4 py-1.5 text-left text-xs font-medium text-muted-foreground">
							{group.title}
						</th>
					</tr>
					{group.rows.map((row) => (
						<tr key={`${row.kind}:${row.key}`} className={tableRowClass}>
							<th scope="row" className="sticky left-0 z-10 bg-card px-4 py-2 text-left font-normal">
								<span className="block text-foreground">{row.label}</span>
								<span className="block font-mono text-[11px] text-subtle-foreground">{row.key}</span>
							</th>
							{plans.map((plan) => (
								<td key={plan.id} className="text-right">
									<MatrixCell
										plan={plan}
										row={row}
										numeric={row.kind !== 'cap' || plans.some((candidate) => (readValue(candidate, row) ?? 0) > 1 || isUnlimited(readValue(candidate, row) ?? 0))}
										onChange={onChange}
										dirty={Boolean(dirty?.has(entitlementKey(plan.id, row)))}
									/>
								</td>
							))}
						</tr>
					))}
				</tbody>
			))}
		</TableSurface>
	);
}

/* ------------------------------------------------------------------ *
 * Plans and prices
 * ------------------------------------------------------------------ */

type PlanPriceTableProps = {
	plans: Plan[];
	provider?: BillingProviderDescriptor;
	mode?: ProviderMode;
	/** Subscriber count per plan id. */
	subscribers?: Record<string, number>;
	onTogglePlan?: (plan: Plan, active: boolean) => void;
	onTogglePrice?: (plan: Plan, price: PlanPrice, active: boolean) => void;
	onAddPrice?: (plan: Plan) => void;
	className?: string;
};

/**
 * Every plan with its prices and how each mirrors to the provider. Prices are
 * immutable once they exist, so a new amount is a new row and old rows are
 * retired, never edited.
 */
export function PlanPriceTable({ plans, provider, mode = 'live', subscribers, onTogglePlan, onTogglePrice, onAddPrice, className }: PlanPriceTableProps) {
	const f = useBillingFormat();
	return (
		<TableSurface className={className} minWidth="48rem">
			<thead className={tableHeadClass}>
				<tr>
					<th scope="col">Plan / price</th>
					<th scope="col">Billing</th>
					<th scope="col" className="text-right">
						Amount
					</th>
					<th scope="col">Provider</th>
					<th scope="col" className="text-right">
						Active
					</th>
				</tr>
			</thead>
			{plans.map((plan) => (
				<tbody key={plan.id}>
					<tr className="border-t border-border bg-muted/30 [&_td]:px-4 [&_td]:py-2">
						<td colSpan={2}>
							<span className="flex flex-wrap items-center gap-2">
								<span className="font-medium text-foreground">{plan.displayName}</span>
								<span className="font-mono text-[11px] text-subtle-foreground">{plan.name}</span>
								{plan.fallback ? <ToneBadge tone="neutral">Free fallback</ToneBadge> : null}
								{subscribers?.[plan.id] !== undefined ? (
									<span className="text-xs text-muted-foreground tabular-nums">{f.quantity(subscribers[plan.id]!)} subscribers</span>
								) : null}
							</span>
						</td>
						<td className="text-right">
							{onAddPrice ? (
								<Button size="xs" variant="ghost" onClick={() => onAddPrice(plan)}>
									<Plus aria-hidden="true" />
									Price
								</Button>
							) : null}
						</td>
						<td>
							<span className="flex flex-wrap items-center gap-2">
								{plan.syncState ? <SyncBadge state={plan.syncState} /> : null}
								{plan.externalId ? <ExternalRef provider={provider} kind="product" id={plan.externalId} mode={mode} /> : null}
							</span>
						</td>
						<td className="text-right">
							<Switch
								className={tableSwitchClass}
								aria-label={`${plan.active ? 'Retire' : 'Offer'} ${plan.displayName}`}
								checked={plan.active}
								disabled={!onTogglePlan}
								onCheckedChange={(active) => onTogglePlan?.(plan, active)}
							/>
						</td>
					</tr>
					{plan.prices.map((price) => (
						<tr key={price.id} className={cn(tableRowClass, !price.active && 'text-muted-foreground')}>
							<td className="pl-9!">
								<span className="flex items-center gap-2">
									<span className={price.active ? 'text-foreground' : undefined}>{INTERVAL_LABEL[price.interval]}</span>
									{price.discountPercent ? <ToneBadge tone="success">−{price.discountPercent}%</ToneBadge> : null}
								</span>
							</td>
							<td>
								<ToneBadge tone={price.usageType === 'metered' ? 'violet' : 'neutral'}>{price.usageType === 'metered' ? 'Usage (credits)' : 'Flat'}</ToneBadge>
							</td>
							<td className="text-right tabular-nums">
								{price.usageType === 'metered' ? (
									<Tooltip>
										<TooltipTrigger render={<span className="inline-flex items-center gap-1 text-muted-foreground" tabIndex={0} />}>
											<Lock aria-hidden="true" className="size-3" />
											Per credit
										</TooltipTrigger>
										<TooltipContent>Charged at the database credit rate, so the row itself carries 0.</TooltipContent>
									</Tooltip>
								) : (
									<span className={price.active ? 'font-medium text-foreground' : undefined}>{f.money(price.amount, { precise: true })}</span>
								)}
							</td>
							<td>
								<span className="flex flex-wrap items-center gap-2">
									{price.syncState ? <SyncBadge state={price.syncState} /> : null}
									{price.externalId ? <ExternalRef provider={provider} kind="price" id={price.externalId} mode={mode} /> : null}
								</span>
							</td>
							<td className="text-right">
								<Switch
									className={tableSwitchClass}
									aria-label={`${price.active ? 'Retire' : 'Offer'} the ${INTERVAL_LABEL[price.interval].toLowerCase()} ${plan.displayName} price`}
									checked={price.active}
									disabled={!onTogglePrice}
									onCheckedChange={(active) => onTogglePrice?.(plan, price, active)}
								/>
							</td>
						</tr>
					))}
				</tbody>
			))}
		</TableSurface>
	);
}

/* ------------------------------------------------------------------ *
 * Meters
 * ------------------------------------------------------------------ */

type MeterCatalogTableProps = {
	meters: Meter[];
	onToggle?: (meter: Meter, active: boolean) => void;
	className?: string;
};

/** The meter catalog grouped by pool: unit, credit cost, reset, rollover cap, and aggregation. */
export function MeterCatalogTable({ meters, onToggle, className }: MeterCatalogTableProps) {
	const f = useBillingFormat();
	const pools = meters.filter((meter) => meter.meterType === 'usage_pool' && meter.slug !== 'universal');
	const groups = [
		...pools.map((pool) => ({ pool, rows: meters.filter((meter) => meter.categoryMeter === pool.slug && meter.meterType !== 'usage_pool') })),
		{ pool: undefined, rows: meters.filter((meter) => meter.meterType !== 'usage_pool' && (!meter.categoryMeter || meter.categoryMeter === 'universal')) },
	].filter((group) => group.rows.length > 0);
	return (
		<TableSurface className={className} minWidth="46rem">
			<thead className={tableHeadClass}>
				<tr>
					<th scope="col">Meter</th>
					<th scope="col">Unit</th>
					<th scope="col" className="text-right">
						Credit cost
					</th>
					<th scope="col">Resets</th>
					<th scope="col">Counts</th>
					<th scope="col" className="text-right">
						Active
					</th>
				</tr>
			</thead>
			{groups.map(({ pool, rows }) => (
				<tbody key={pool?.slug ?? 'loose'}>
					<tr className="border-t border-border bg-muted/30">
						<th scope="rowgroup" colSpan={6} className="px-4 py-1.5 text-left text-xs font-medium text-muted-foreground">
							{pool ? `${pool.displayName} pool` : 'Straight to universal'}
						</th>
					</tr>
					{rows.map((meter) => (
						<tr key={meter.slug} className={cn(tableRowClass, !meter.active && 'text-muted-foreground')}>
							<th scope="row" className="px-4 py-2 text-left font-normal">
								<span className="block text-foreground">{meter.displayName}</span>
								<span className="block font-mono text-[11px] text-subtle-foreground">{meter.slug}</span>
							</th>
							<td className="text-muted-foreground">{meter.unit}</td>
							<td className="text-right tabular-nums">
								{meter.creditCost === null ? <span className="text-subtle-foreground">No fallback</span> : meter.creditCost === 0 ? 'Free' : `${f.quantity(meter.creditCost)} cr`}
							</td>
							<td className="text-muted-foreground">
								{meter.periodInterval ? humanize(`${meter.periodInterval}ly`) : 'Never'}
								{meter.rolloverCap ? ` · rolls ${f.quantity(meter.rolloverCap, true)}` : ''}
							</td>
							<td className="text-muted-foreground">{meter.aggregation === 'peak' ? 'Peak' : 'Sum'}</td>
							<td className="text-right">
								<Switch
									className={tableSwitchClass}
									aria-label={`${meter.active ? 'Pause' : 'Resume'} ${meter.displayName}`}
									checked={meter.active}
									disabled={!onToggle}
									onCheckedChange={(active) => onToggle?.(meter, active)}
								/>
							</td>
						</tr>
					))}
				</tbody>
			))}
		</TableSurface>
	);
}

/* ------------------------------------------------------------------ *
 * Packs and codes
 * ------------------------------------------------------------------ */

type CreditPackTableProps = {
	packs: CreditPack[];
	creditsPerCent?: number;
	onToggle?: (pack: CreditPack, active: boolean) => void;
	onAdd?: () => void;
	className?: string;
};

/** Credit packs with the charge the credit rate produces, flagged when the advertised price is below it. */
export function CreditPackTable({ packs, creditsPerCent = 1, onToggle, className }: CreditPackTableProps) {
	const f = useBillingFormat();
	return (
		<TableSurface className={className} minWidth="40rem">
			<thead className={tableHeadClass}>
				<tr>
					<th scope="col">Pack</th>
					<th scope="col" className="text-right">
						Credits
					</th>
					<th scope="col" className="text-right">
						Advertised
					</th>
					<th scope="col" className="text-right">
						Charged
					</th>
					<th scope="col">Expiry</th>
					<th scope="col" className="text-right">
						Active
					</th>
				</tr>
			</thead>
			<tbody>
				{packs.map((pack) => {
					const charged = Math.ceil(pack.amount / creditsPerCent);
					const refused = pack.price.amountMinor < charged;
					return (
						<tr key={pack.id} className={cn(tableRowClass, !pack.active && 'text-muted-foreground')}>
							<th scope="row" className="px-4 py-2 text-left font-normal">
								<span className="block text-foreground">{pack.displayName}</span>
								<span className="block font-mono text-[11px] text-subtle-foreground">{pack.slug}</span>
							</th>
							<td className="text-right tabular-nums">{f.quantity(pack.amount)}</td>
							<td className="text-right tabular-nums">{f.money(pack.price, { precise: true })}</td>
							<td className="text-right tabular-nums">
								{refused ? (
									<Tooltip>
										<TooltipTrigger render={<span tabIndex={0} className="inline-flex" />}>
											<ToneBadge tone="danger">Below rate</ToneBadge>
										</TooltipTrigger>
										<TooltipContent>Checkout refuses this pack until its price is at least {f.money({ ...pack.price, amountMinor: charged }, { precise: true })}.</TooltipContent>
									</Tooltip>
								) : (
									<span className="text-foreground">{f.money({ ...pack.price, amountMinor: charged }, { precise: true })}</span>
								)}
							</td>
							<td className="text-muted-foreground">{pack.expiresAfterDays ? `${pack.expiresAfterDays} days` : 'Never'}</td>
							<td className="text-right">
								<Switch
									className={tableSwitchClass}
									aria-label={`${pack.active ? 'Stop selling' : 'Sell'} ${pack.displayName}`}
									checked={pack.active}
									disabled={!onToggle}
									onCheckedChange={(active) => onToggle?.(pack, active)}
								/>
							</td>
						</tr>
					);
				})}
			</tbody>
		</TableSurface>
	);
}

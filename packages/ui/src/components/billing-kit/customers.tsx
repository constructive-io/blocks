'use client';

import { Building2, CalendarClock, ChevronRight, Gift, SlidersHorizontal, User, Users } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Input } from '../input';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../sheet';
import { focusRingClass, Segmented, ToneBadge } from '../workspace-kit/primitives';
import { AllowanceBar, UsageFigure } from './allowance';
import { useBillingFormat } from './context';
import { CreditGrantList } from './credits';
import { CREDIT_TYPE, isUnlimited, OPERATION_STATE } from './format';
import { InvoiceTable } from './invoices';
import { type BillingProviderDescriptor } from './providers';
import { ExternalRef } from './provider';
import { LifecycleBadge } from './status';
import { dashedRule, EmptyState, nativeSelectClass, Panel, StatusBadge, TableSurface, tableHeadClass, tableRowClass } from './surface';
import type { CreditType, CustomerSummary, Meter, Plan, PlanOverride, ProviderMode } from './types';

type CustomerTableProps = {
	customers: CustomerSummary[];
	plans: Plan[];
	selectedId?: string;
	onSelect?: (customer: CustomerSummary) => void;
	className?: string;
};

/** Subscribers with their plan, standing, revenue, and how close they run to their limits. */
export function CustomerTable({ customers, plans, selectedId, onSelect, className }: CustomerTableProps) {
	const f = useBillingFormat();
	const planNames = new Map(plans.map((plan) => [plan.id, plan.displayName]));
	const planName = (id: string) => planNames.get(id) ?? id;
	if (customers.length === 0) {
		return <EmptyState icon={Users} title="No customers match" description="Try another filter or search." className={className} />;
	}
	return (
		<TableSurface className={className} minWidth="46rem">
					<thead className={tableHeadClass}>
						<tr>
							<th scope="col">Customer</th>
							<th scope="col">Plan</th>
							<th scope="col">Status</th>
							<th scope="col" className="text-right">
								MRR
							</th>
							<th scope="col">Peak usage</th>
							<th scope="col">
								<span className="sr-only">Open</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{customers.map((customer) => {
							const selected = customer.id === selectedId;
							const Icon = customer.kind === 'organization' ? Building2 : User;
							return (
								<tr key={customer.id} aria-selected={selected || undefined} className={cn(tableRowClass, 'hover:bg-muted/30', selected && 'bg-primary/[0.04]')}>
									<td>
										<span className="flex items-center gap-2.5">
											<span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
												<Icon className="size-3.5" />
											</span>
											<span className="min-w-0">
												<span className="block truncate font-medium text-foreground">{customer.name}</span>
												<span className="block truncate text-xs text-muted-foreground">
													{customer.email ?? (customer.kind === 'organization' ? 'Organization' : 'Personal')} · since {f.date(customer.since, 'short')}
												</span>
											</span>
										</span>
									</td>
									<td>
										<span className="flex flex-col">
											<span className="text-foreground">{planName(customer.planId)}</span>
											{customer.scheduledChange ? (
												<span className="flex items-center gap-1 text-xs text-muted-foreground">
													<CalendarClock aria-hidden="true" className="size-3" />
													{planName(customer.scheduledChange.planId)} on {f.date(customer.scheduledChange.effectiveAt, 'short')}
												</span>
											) : null}
										</span>
									</td>
									<td>
										<LifecycleBadge lifecycle={customer.lifecycle} />
									</td>
									<td className="text-right font-medium text-foreground tabular-nums">{f.money(customer.mrr)}</td>
									<td>
										<span className="flex items-center gap-2">
											<AllowanceBar used={customer.usagePeak} limit={100} label={`${customer.name} peak usage`} size="sm" className="w-16" />
											<span
												className={cn(
													'text-xs tabular-nums',
													customer.usagePeak >= 100 ? 'font-medium text-destructive' : customer.usagePeak >= 80 ? 'font-medium text-warning' : 'text-muted-foreground',
												)}
											>
												{Math.round(customer.usagePeak)}%
											</span>
										</span>
									</td>
									<td className="text-right">
										{onSelect ? (
											<button
												type="button"
												aria-label={`Open ${customer.name}`}
												onClick={() => onSelect(customer)}
												className={cn('grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-overlay-hover hover:text-foreground', focusRingClass)}
											>
												<ChevronRight aria-hidden="true" className="size-3.5" />
											</button>
										) : null}
									</td>
								</tr>
							);
						})}
					</tbody>
		</TableSurface>
	);
}

export type GrantCreditsRequest = {
	customerId: string;
	meterSlug: string;
	amount: number;
	creditType: CreditType;
	expiresInDays?: number;
	reason: string;
};

type GrantCreditsFormProps = {
	customerId: string;
	meters: Meter[];
	onGrant: (request: GrantCreditsRequest) => Promise<void> | void;
	onCancel?: () => void;
};

/** Grants credits to one customer: meter, amount, type, optional expiry, and a reason for the ledger. */
export function GrantCreditsForm({ customerId, meters, onGrant, onCancel }: GrantCreditsFormProps) {
	const grantable = meters.filter((meter) => meter.active && meter.meterType !== 'boolean');
	const [meterSlug, setMeterSlug] = React.useState(grantable.find((meter) => meter.slug === 'universal')?.slug ?? grantable[0]?.slug ?? '');
	const [amount, setAmount] = React.useState('');
	const [creditType, setCreditType] = React.useState<CreditType>('permanent');
	const [expires, setExpires] = React.useState('');
	const [reason, setReason] = React.useState('');
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const id = React.useId();
	const value = Number(amount.replace(/[, _]/g, ''));
	const valid = Number.isFinite(value) && value > 0 && reason.trim().length > 0;

	return (
		<form
			className="flex flex-col gap-3"
			onSubmit={async (event) => {
				event.preventDefault();
				if (!valid) return;
				setBusy(true);
				setError(null);
				try {
					await onGrant({ customerId, meterSlug, amount: Math.round(value), creditType, expiresInDays: expires ? Number(expires) : undefined, reason: reason.trim() });
				} catch (reason_) {
					setError(reason_ instanceof Error ? reason_.message : 'The grant failed.');
				} finally {
					setBusy(false);
				}
			}}
		>
			<div className="grid gap-3 @md/view:grid-cols-2">
				<label htmlFor={`${id}-meter`} className="flex flex-col gap-1 text-xs text-muted-foreground">
					Meter
					<select
						id={`${id}-meter`}
						value={meterSlug}
						onChange={(event) => setMeterSlug(event.target.value)}
						className={nativeSelectClass}
					>
						{grantable.map((meter) => (
							<option key={meter.slug} value={meter.slug}>
								{meter.displayName}
							</option>
						))}
					</select>
				</label>
				<label htmlFor={`${id}-amount`} className="flex flex-col gap-1 text-xs text-muted-foreground">
					Amount
					<Input id={`${id}-amount`} size="sm" inputMode="numeric" value={amount} placeholder="5,000" onChange={(event) => setAmount(event.target.value)} className="tabular-nums" />
				</label>
			</div>
			<div className="flex flex-col gap-1 text-xs text-muted-foreground">
				<span id={`${id}-type`}>Type</span>
				<Segmented
					label="Credit type"
					value={creditType}
					onChange={setCreditType}
					options={(['permanent', 'period', 'rollover'] as const).map((type) => ({ value: type, label: CREDIT_TYPE[type].label }))}
				/>
				<span>{CREDIT_TYPE[creditType].description}</span>
			</div>
			<div className="grid gap-3 @md/view:grid-cols-[8rem_1fr]">
				<label htmlFor={`${id}-expires`} className="flex flex-col gap-1 text-xs text-muted-foreground">
					Expires after
					<span className="flex h-8 items-center rounded-md border border-border bg-card pr-2 shadow-2xs focus-within:ring-[3px] focus-within:ring-ring/50">
						<input
							id={`${id}-expires`}
							inputMode="numeric"
							value={expires}
							placeholder="Never"
							onChange={(event) => setExpires(event.target.value.replace(/\D/g, ''))}
							className="h-full w-full min-w-0 bg-transparent px-2 text-[13px] text-foreground tabular-nums outline-none placeholder:text-subtle-foreground"
						/>
						<span className="text-xs text-muted-foreground">days</span>
					</span>
				</label>
				<label htmlFor={`${id}-reason`} className="flex flex-col gap-1 text-xs text-muted-foreground">
					Reason (shown in the ledger)
					<Input id={`${id}-reason`} size="sm" value={reason} placeholder="Goodwill after the Sep 12 incident" onChange={(event) => setReason(event.target.value)} />
				</label>
			</div>
			{error ? (
				<p role="alert" className="text-xs text-destructive">
					{error}
				</p>
			) : null}
			<div className="flex justify-end gap-2">
				{onCancel ? (
					<Button type="button" size="xs" variant="ghost" onClick={onCancel}>
						Cancel
					</Button>
				) : null}
				<Button type="submit" size="xs" disabled={!valid || busy} aria-busy={busy || undefined}>
					{busy ? 'Granting…' : 'Grant credits'}
				</Button>
			</div>
		</form>
	);
}

type CustomerDetailSheetProps = {
	customer?: CustomerSummary;
	plans: Plan[];
	meters: Meter[];
	provider?: BillingProviderDescriptor;
	mode?: ProviderMode;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onGrantCredits?: (request: GrantCreditsRequest) => Promise<void> | void;
	onRemoveOverride?: (customer: CustomerSummary, override: PlanOverride) => void;
	onCancelScheduledChange?: (customer: CustomerSummary) => void;
};

/**
 * One customer in depth, for an operator: plan and standing, balances,
 * credits (with a grant form), per-customer overrides and request windows,
 * the provider operations log, and invoices.
 */
export function CustomerDetailSheet({
	customer,
	plans,
	meters,
	provider,
	mode = 'live',
	open,
	onOpenChange,
	onGrantCredits,
	onRemoveOverride,
	onCancelScheduledChange,
}: CustomerDetailSheetProps) {
	const f = useBillingFormat();
	const [granting, setGranting] = React.useState(false);
	// Close the grant form when another customer opens, during render rather than in an effect.
	const [forId, setForId] = React.useState(customer?.id);
	if (forId !== customer?.id) {
		setForId(customer?.id);
		setGranting(false);
	}
	if (!customer) return null;
	const plan = plans.find((candidate) => candidate.id === customer.planId);
	const meterBySlug = new Map(meters.map((meter) => [meter.slug, meter]));
	const detail = customer.detail;
	const balances = [...(detail?.balances ?? [])]
		.filter((balance) => meterBySlug.get(balance.meterSlug)?.meterType !== 'usage_pool' || balance.meterSlug === 'universal')
		.sort((a, b) => (isUnlimited(b.effectiveLimit) ? -1 : b.currentUsage / Math.max(1, b.effectiveLimit)) - (isUnlimited(a.effectiveLimit) ? -1 : a.currentUsage / Math.max(1, a.effectiveLimit)))
		.slice(0, 6);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-[34rem] max-w-[94vw] gap-0 p-0 sm:max-w-[34rem]">
				<div className="flex flex-col gap-3 border-b border-border px-5 pt-5 pb-4">
					<div className="flex flex-wrap items-center gap-2 pr-8">
						<SheetTitle className="text-base font-medium">{customer.name}</SheetTitle>
						<LifecycleBadge lifecycle={customer.lifecycle} />
					</div>
					<SheetDescription className="text-[13px]">
						{plan?.displayName ?? customer.planId} · {f.money(customer.mrr)}/mo · customer since {f.date(customer.since)}
					</SheetDescription>
					{customer.externalId ? <ExternalRef provider={provider} kind="customer" id={customer.externalId} mode={mode} className="self-start" /> : null}
				</div>
				<div className="@container/view flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-background px-5 py-5 [&>*]:shrink-0">
					{customer.scheduledChange ? (
						<div className="flex flex-wrap items-center gap-3 rounded-lg border border-info/25 bg-info/[0.06] px-3 py-2.5 text-[13px]">
							<CalendarClock aria-hidden="true" className="size-3.5 text-info" />
							<span className="min-w-0 flex-1 text-foreground">
								Moves to {plans.find((candidate) => candidate.id === customer.scheduledChange!.planId)?.displayName} on {f.date(customer.scheduledChange.effectiveAt)}
							</span>
							{onCancelScheduledChange ? (
								<Button size="xs" variant="outline" onClick={() => onCancelScheduledChange(customer)}>
									Cancel change
								</Button>
							) : null}
						</div>
					) : null}

					{!detail ? (
						<p className="text-[13px] text-muted-foreground">Loading details…</p>
					) : (
						<>
							<Panel title="Balances" description="Busiest meters this period.">
								<ul className="flex flex-col">
									{balances.map((balance, index) => {
										const meter = meterBySlug.get(balance.meterSlug);
										return (
											<li key={balance.meterSlug} className={cn('flex flex-col gap-1.5 py-2', index > 0 && cn('border-t', dashedRule))}>
												<span className="flex items-center justify-between gap-3">
													<span className="truncate text-[13px] text-foreground">{meter?.displayName ?? balance.meterSlug}</span>
													<UsageFigure used={balance.currentUsage} limit={balance.effectiveLimit} unit={meter?.unit ?? ''} className="text-xs" />
												</span>
												<AllowanceBar used={balance.currentUsage} limit={balance.effectiveLimit} label={meter?.displayName ?? balance.meterSlug} size="sm" planMarker={balance.planLimit} />
											</li>
										);
									})}
								</ul>
							</Panel>

							<Panel
								title="Credits"
								actions={
									onGrantCredits && !granting ? (
										<Button size="xs" variant="outline" onClick={() => setGranting(true)}>
											<Gift aria-hidden="true" />
											Grant
										</Button>
									) : null
								}
							>
								{granting && onGrantCredits ? (
									<div className={cn('mb-3 rounded-lg border border-border bg-muted/30 p-3')}>
										<GrantCreditsForm
											customerId={customer.id}
											meters={meters}
											onCancel={() => setGranting(false)}
											onGrant={async (request) => {
												await onGrantCredits(request);
												setGranting(false);
											}}
										/>
									</div>
								) : null}
								<CreditGrantList grants={detail.grants} meterName={(slug) => meterBySlug.get(slug)?.displayName ?? slug} />
							</Panel>

							<Panel title="Overrides" description="Per-customer limits that beat the plan until they expire.">
								{detail.overrides.length === 0 ? (
									<p className="text-[13px] text-muted-foreground">None. This customer gets exactly what the plan says.</p>
								) : (
									<ul className="flex flex-col">
										{detail.overrides.map((override, index) => (
											<li key={override.id} className={cn('flex items-center gap-3 py-2', index > 0 && cn('border-t', dashedRule))}>
												<SlidersHorizontal aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
												<span className="min-w-0 flex-1">
													<span className="block text-[13px] text-foreground">
														{override.limitName} → {isUnlimited(override.maxValue) ? 'unlimited' : f.quantity(override.maxValue)}
													</span>
													<span className="block text-xs text-muted-foreground">
														{override.reason ?? 'No reason given'}
														{override.expiresAt ? ` · until ${f.date(override.expiresAt)}` : ''}
													</span>
												</span>
												{onRemoveOverride ? (
													<Button size="xs" variant="ghost" onClick={() => onRemoveOverride(customer, override)}>
														Remove
													</Button>
												) : null}
											</li>
										))}
									</ul>
								)}
							</Panel>

							{detail.rateWindows.length > 0 ? (
								<Panel title="Request windows" bodyClassName="p-0">
									<table className="w-full border-collapse text-[13px]">
										<thead className={tableHeadClass}>
											<tr>
												<th scope="col">Meter</th>
												<th scope="col">Window</th>
												<th scope="col" className="text-right">
													Max
												</th>
											</tr>
										</thead>
										<tbody>
											{detail.rateWindows.map((window) => (
												<tr key={window.id} className={tableRowClass}>
													<td className="text-foreground">
														{meterBySlug.get(window.meterSlug)?.displayName ?? window.meterSlug}
														<span className="block text-xs text-muted-foreground">{window.scope === 'entity' ? 'Whole account' : 'Per member'}</span>
													</td>
													<td className="text-muted-foreground">
														{window.window} · lock {window.lockout}
													</td>
													<td className="text-right tabular-nums">
														<span className="inline-flex items-center gap-2">
															{window.override ? <ToneBadge tone="primary">Override</ToneBadge> : null}
															{isUnlimited(window.maxRequests) ? 'None' : f.quantity(window.maxRequests)}
														</span>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</Panel>
							) : null}

							<Panel title="Provider operations" description="Idempotent calls to the provider, newest first.">
								<ol className="flex flex-col">
									{detail.operations.map((operation, index) => (
										<li key={operation.id} className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 py-2', index > 0 && cn('border-t', dashedRule))}>
											<code className="font-mono text-xs text-foreground">{operation.action}</code>
											<StatusBadge presentation={OPERATION_STATE[operation.state]} />
											<span className="ml-auto text-xs text-muted-foreground tabular-nums">{f.date(operation.createdAt, 'short', true)}</span>
											{operation.errorCode ? <span className="w-full text-xs text-destructive">{operation.errorCode}</span> : null}
										</li>
									))}
								</ol>
							</Panel>

							{detail.invoices.length > 0 ? <InvoiceTable invoices={detail.invoices.slice(0, 4)} /> : null}
						</>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}

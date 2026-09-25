'use client';

import { BellRing, Check, Lock, Plus, Trash2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Switch } from '../switch';
import { ToneBadge, TooltipIconButton } from '../workspace-kit/primitives';
import { AllowanceBar } from './allowance';
import { useBillingFormat } from './context';
import { isUnlimited, usageLevel } from './format';
import { dashedRule, EmptyState, nativeSelectClass } from './surface';
import type { FeatureCap, LimitCounter, UsageAlert } from './types';

type LimitListProps = {
	limits: LimitCounter[];
	className?: string;
};

/** Counted limits such as databases and seats: used of allowed, with the soft limit as a warning. */
export function LimitList({ limits, className }: LimitListProps) {
	const f = useBillingFormat();
	return (
		<ul className={cn('flex flex-col', className)}>
			{limits.map((limit, index) => {
				const level = usageLevel(limit.used, limit.max, limit.softMax && limit.max > 0 ? limit.softMax / limit.max : 0.8);
				return (
					<li key={limit.name} className={cn('flex flex-col gap-2 py-3', index > 0 && cn('border-t', dashedRule))}>
						<div className="flex items-baseline justify-between gap-3">
							<span className="text-[13px] text-foreground">
								{limit.label}
								{limit.window ? <span className="text-muted-foreground"> · {limit.window}</span> : null}
							</span>
							<span className="text-[13px] tabular-nums">
								<span className={cn('font-medium', level === 'exhausted' || level === 'over' ? 'text-destructive' : 'text-foreground')}>{f.quantity(limit.used)}</span>
								<span className="text-muted-foreground">
									{' of '}
									{isUnlimited(limit.max) ? 'unlimited' : f.quantity(limit.max)} {limit.unit}
								</span>
							</span>
						</div>
						<AllowanceBar used={limit.used} limit={limit.max} label={limit.label} size="sm" soft={limit.softMax && limit.max > 0 ? limit.softMax / limit.max : undefined} />
						{level === 'exhausted' || level === 'over' ? (
							<p className="text-xs text-destructive">At the limit. New {limit.unit} are refused until you upgrade or free one up.</p>
						) : null}
					</li>
				);
			})}
		</ul>
	);
}

type FeatureCapListProps = {
	caps: FeatureCap[];
	/** Asks the host to show the plans that include a cap. */
	onUnlock?: (cap: FeatureCap) => void;
	className?: string;
};

/** Plan features: on, off with a way to unlock, or a numeric setting. */
export function FeatureCapList({ caps, onUnlock, className }: FeatureCapListProps) {
	const f = useBillingFormat();
	return (
		<ul className={cn('grid gap-2 @xl/view:grid-cols-2', className)}>
			{caps.map((cap) => {
				const on = cap.value > 0;
				return (
					<li key={cap.name} className={cn('flex items-start gap-3 rounded-lg border px-3 py-2.5', on ? 'border-border bg-card' : 'border-dashed border-foreground/15')}>
						<span
							aria-hidden="true"
							className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-md', on ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}
						>
							{on ? <Check className="size-3" /> : <Lock className="size-3" />}
						</span>
						<span className="min-w-0 flex-1">
							<span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
								{cap.label}
								<span className="sr-only">{on ? ', included' : ', not included'}</span>
							</span>
							{cap.description ? <span className="mt-0.5 block text-pretty text-xs text-muted-foreground">{cap.description}</span> : null}
						</span>
						{cap.kind === 'number' && on ? (
							<span className="text-[13px] text-foreground tabular-nums">
								{f.quantity(cap.value)}
								{cap.unit ? <span className="text-muted-foreground"> {cap.unit}</span> : null}
							</span>
						) : !on && onUnlock ? (
							<Button size="xs" variant="ghost" onClick={() => onUnlock(cap)}>
								Unlock
							</Button>
						) : null}
					</li>
				);
			})}
		</ul>
	);
}

type AlertTarget = { value: string; label: string };

type UsageAlertListProps = {
	alerts: UsageAlert[];
	targets: AlertTarget[];
	onChange: (alerts: UsageAlert[]) => void;
	readOnly?: boolean;
	className?: string;
};

/**
 * Usage alerts: notify when a meter or limit crosses a share of its allowance.
 * Each row toggles; new alerts pick a target and a percentage.
 */
export function UsageAlertList({ alerts, targets, onChange, readOnly, className }: UsageAlertListProps) {
	const [chosenTarget, setTarget] = React.useState(targets[0]?.value ?? '');
	// Fall back to the first target when the chosen one is no longer offered.
	const target = targets.some((candidate) => candidate.value === chosenTarget) ? chosenTarget : (targets[0]?.value ?? '');
	const [threshold, setThreshold] = React.useState(80);
	const targetId = React.useId();
	const thresholdId = React.useId();
	const labels = new Map(targets.map((candidate) => [candidate.value, candidate.label]));
	const label = (value: string) => labels.get(value) ?? value;

	return (
		<div className={cn('flex flex-col gap-3', className)}>
			{alerts.length === 0 ? (
				<EmptyState icon={BellRing} title="No alerts" description="Get told before a meter runs out, not after." className="py-6" />
			) : (
				<ul className="flex flex-col">
					{alerts.map((alert, index) => (
						<li key={alert.id} className={cn('flex items-center gap-3 py-2.5', index > 0 && cn('border-t', dashedRule))}>
							<Switch
								aria-label={`${alert.enabled ? 'Turn off' : 'Turn on'} the ${label(alert.target)} alert`}
								checked={alert.enabled}
								disabled={readOnly}
								onCheckedChange={(enabled) => onChange(alerts.map((candidate) => (candidate.id === alert.id ? { ...candidate, enabled } : candidate)))}
							/>
							<span className={cn('min-w-0 flex-1 truncate text-[13px]', alert.enabled ? 'text-foreground' : 'text-muted-foreground')}>{label(alert.target)}</span>
							<ToneBadge tone={alert.enabled ? 'warning' : 'neutral'}>
								at {alert.threshold}
								{alert.kind === 'percent' ? '%' : ''}
							</ToneBadge>
							{readOnly ? null : (
								<TooltipIconButton label={`Remove the ${label(alert.target)} alert`} size="sm" onClick={() => onChange(alerts.filter((candidate) => candidate.id !== alert.id))}>
									<Trash2 aria-hidden="true" className="size-3.5" />
								</TooltipIconButton>
							)}
						</li>
					))}
				</ul>
			)}
			{readOnly || targets.length === 0 ? null : (
				<form
					className={cn('flex flex-wrap items-end gap-2 border-t pt-3', dashedRule)}
					onSubmit={(event) => {
						event.preventDefault();
						const id = `alert-${target}-${threshold}`;
						// One alert per target and threshold; adding it again just turns it back on.
						onChange(
							alerts.some((alert) => alert.id === id)
								? alerts.map((alert) => (alert.id === id ? { ...alert, enabled: true } : alert))
								: [...alerts, { id, target, kind: 'percent', threshold, enabled: true }],
						);
					}}
				>
					<label htmlFor={targetId} className="flex min-w-40 flex-1 flex-col gap-1 text-xs text-muted-foreground">
						Alert me about
						<select
							id={targetId}
							value={target}
							onChange={(event) => setTarget(event.target.value)}
							className={nativeSelectClass}
						>
							{targets.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</label>
					<label htmlFor={thresholdId} className="flex w-24 flex-col gap-1 text-xs text-muted-foreground">
						At
						<span className="flex h-8 items-center rounded-md border border-border bg-card pr-2 shadow-2xs focus-within:ring-[3px] focus-within:ring-ring/50">
							<input
								id={thresholdId}
								type="number"
								min={1}
								max={100}
								value={threshold}
								onChange={(event) => setThreshold(Math.min(100, Math.max(1, Number(event.target.value) || 1)))}
								className="h-full w-full min-w-0 bg-transparent px-2 text-[13px] text-foreground tabular-nums outline-none"
							/>
							<span className="text-[13px] text-muted-foreground">%</span>
						</span>
					</label>
					<Button type="submit" size="sm" variant="outline">
						<Plus aria-hidden="true" />
						Add alert
					</Button>
				</form>
			)}
		</div>
	);
}

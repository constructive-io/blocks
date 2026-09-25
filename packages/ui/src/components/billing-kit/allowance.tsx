'use client';

import { cn } from '../../lib/utils';
import { useBillingFormat } from './context';
import { isUnlimited, type UsageLevel, usageLevel, usageRatio } from './format';

const FILL: Record<UsageLevel, string> = {
	ok: 'bg-foreground/55',
	warning: 'bg-warning',
	exhausted: 'bg-destructive',
	over: 'bg-destructive',
};

type AllowanceBarProps = {
	used: number;
	/** `-1` means unlimited. */
	limit: number;
	/** Accessible name, e.g. "Read operations". */
	label: string;
	/** Share at which the bar turns amber. Defaults to 0.8. */
	soft?: number;
	/** Where the plan's own allowance ends inside `limit`; credits fill the rest. */
	planMarker?: number;
	size?: 'sm' | 'md';
	className?: string;
};

/**
 * A meter bar: neutral while comfortable, amber past the soft threshold, red
 * when exhausted. A tick marks where the plan allowance ends and purchased
 * credits begin. Unlimited allowances render as an empty dashed track.
 */
export function AllowanceBar({ used, limit, label, soft = 0.8, planMarker, size = 'md', className }: AllowanceBarProps) {
	const f = useBillingFormat();
	const unlimited = isUnlimited(limit);
	const ratio = usageRatio(used, limit) ?? 0;
	const level = usageLevel(used, limit, soft);
	const height = size === 'sm' ? 'h-1' : 'h-1.5';
	if (unlimited) {
		return (
			<div
				role="img"
				aria-label={`${label}: unlimited`}
				className={cn('w-full rounded-full border border-dashed border-foreground/15', height, className)}
			/>
		);
	}
	const markerAt = planMarker !== undefined && limit > 0 && planMarker > 0 && planMarker < limit ? planMarker / limit : null;
	return (
		<div
			role="meter"
			aria-label={label}
			aria-valuemin={0}
			aria-valuemax={limit}
			aria-valuenow={Math.min(used, limit)}
			aria-valuetext={`${f.quantity(used)} of ${f.quantity(limit)}`}
			className={cn('relative w-full overflow-hidden rounded-full bg-foreground/[0.07]', height, className)}
		>
			<div
				className={cn('h-full rounded-full transition-[width] duration-(--duration-slow) ease-out motion-reduce:transition-none', FILL[level])}
				style={{ width: `${Math.min(1, Number.isFinite(ratio) ? ratio : 1) * 100}%` }}
			/>
			{markerAt !== null ? (
				<span aria-hidden="true" className="absolute inset-y-0 w-px bg-background" style={{ left: `${markerAt * 100}%` }} />
			) : null}
		</div>
	);
}

type UsageFigureProps = {
	used: number;
	limit: number;
	unit: string;
	compact?: boolean;
	className?: string;
};

/** "4.2M / 10M operations", "12 / unlimited seats", with the used figure emphasised. */
export function UsageFigure({ used, limit, unit, compact = true, className }: UsageFigureProps) {
	const f = useBillingFormat();
	return (
		<span className={cn('text-[13px] whitespace-nowrap tabular-nums', className)}>
			<span className="font-medium text-foreground">{f.quantity(used, compact)}</span>
			<span className="text-muted-foreground">
				{' / '}
				{isUnlimited(limit) ? 'unlimited' : f.quantity(limit, compact)} {unit}
			</span>
		</span>
	);
}

type SparklineProps = {
	values: number[];
	label: string;
	/** Days still to come in the period, drawn as faint placeholders. */
	remaining?: number;
	className?: string;
};

/** Daily bars for the period so far; the latest day is emphasised. */
export function Sparkline({ values, label, remaining = 0, className }: SparklineProps) {
	const max = Math.max(1, ...values);
	const total = values.length + remaining;
	return (
		<div role="img" aria-label={label} className={cn('flex h-8 items-end gap-[2px]', className)}>
			{values.map((value, index) => (
				<span
					key={index}
					className={cn('min-w-[2px] flex-1 rounded-[2px]', index === values.length - 1 ? 'bg-foreground/60' : 'bg-foreground/20')}
					style={{ height: `${Math.max(6, (value / max) * 100)}%` }}
				/>
			))}
			{Array.from({ length: remaining }, (_, index) => (
				<span key={`r${index}`} className="h-[6%] min-w-[2px] flex-1 rounded-[2px] bg-foreground/[0.06]" />
			))}
			<span className="sr-only">{`${values.length} of ${total} days`}</span>
		</div>
	);
}

const DAY_MS = 86_400_000;

type PeriodTrackProps = {
	start: string;
	end: string;
	/** Defaults to the formatter's clock. */
	now?: string;
	/** `warning` tints today's tick, e.g. while a payment is overdue. */
	tone?: 'default' | 'warning';
	className?: string;
};

/**
 * The billing period as a thin segmented bar: one segment per day (per week
 * for yearly periods). Days behind are filled, today glows in colour, and the
 * days left stay quiet.
 */
export function PeriodTrack({ start, end, now: nowProp, tone = 'default', className }: PeriodTrackProps) {
	const f = useBillingFormat();
	const from = new Date(start).getTime();
	const to = new Date(end).getTime();
	const now = new Date(nowProp ?? f.now).getTime();
	const days = Math.max(1, Math.round((to - from) / DAY_MS));
	const weekly = days > 62;
	const unit = weekly ? DAY_MS * 7 : DAY_MS;
	const count = Math.max(1, Math.ceil((to - from) / unit));
	const elapsed = Math.min(count, Math.max(0, Math.floor((now - from) / unit)));
	const today = elapsed < count ? elapsed : -1;
	const color = tone === 'warning' ? 'var(--warning)' : 'var(--primary)';
	const dayOfPeriod = Math.min(days, Math.max(1, Math.floor((now - from) / DAY_MS) + 1));

	return (
		<div
			role="meter"
			aria-label="Billing period"
			aria-valuemin={1}
			aria-valuemax={days}
			aria-valuenow={dayOfPeriod}
			aria-valuetext={`Day ${dayOfPeriod} of ${days}, ends ${f.date(end)}`}
			className={cn('flex h-1 gap-[2px]', className)}
		>
			{Array.from({ length: count }, (_, index) => {
				const isToday = index === today;
				return (
					<span
						key={index}
						aria-hidden="true"
						className={cn(
							'min-w-px flex-1 rounded-full transition-[background-color] duration-(--duration-slow) ease-out motion-reduce:transition-none',
							isToday ? null : index < elapsed ? 'bg-foreground/45' : 'bg-foreground/[0.12]',
						)}
						style={isToday ? { backgroundColor: color, boxShadow: `0 0 6px color-mix(in oklab, ${color} 55%, transparent)` } : undefined}
					/>
				);
			})}
		</div>
	);
}

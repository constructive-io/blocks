'use client';

import { History } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { useBillingFormat } from './context';
import { dayKey, LEDGER_ENTRY } from './format';
import { dashedRule, EmptyState, StatusBadge } from './surface';
import type { LedgerEntry, Meter } from './types';

const NEGATIVE_ENTRIES = new Set<LedgerEntry['entryType']>(['expired', 'reset', 'credits_consumed', 'credit_deduction']);

type LedgerTimelineProps = {
	entries: LedgerEntry[];
	meters: Meter[];
	/** The surface the timeline sits on, so the sticky day headings match it. */
	surface?: 'background' | 'card';
	className?: string;
};

/**
 * The append-only ledger, grouped by day: each entry's type, the meter it
 * touched, the change, and the running total after it. Grants read as
 * positive, expiries and pool draws as negative, and usage as a plain count.
 */
export function LedgerTimeline({ entries, meters, surface = 'background', className }: LedgerTimelineProps) {
	const f = useBillingFormat();
	const meterBySlug = React.useMemo(() => new Map(meters.map((meter) => [meter.slug, meter])), [meters]);
	const groups = React.useMemo(() => {
		const byDay = new Map<string, LedgerEntry[]>();
		for (const entry of [...entries].sort((a, b) => b.at.localeCompare(a.at))) {
			const key = dayKey(entry.at, f.timeZone);
			const day = byDay.get(key);
			if (day) day.push(entry);
			else byDay.set(key, [entry]);
		}
		return [...byDay.entries()];
	}, [entries, f.timeZone]);

	if (entries.length === 0) {
		return <EmptyState icon={History} title="Nothing recorded yet" description="Usage, grants, resets, and expiries are logged here as they happen." className={className} />;
	}

	return (
		<div className={cn('flex flex-col gap-5', className)}>
			{groups.map(([day, list]) => (
				<section key={day} aria-label={f.date(list[0]!.at, 'long')}>
					<h3 className={cn('sticky top-0 z-10 py-1 text-xs text-muted-foreground backdrop-blur-sm', surface === 'card' ? 'bg-card/90' : 'bg-background/90')}>{f.date(list[0]!.at, 'long')}</h3>
					<ol className="mt-1 flex flex-col">
						{list.map((entry, index) => {
							const meter = meterBySlug.get(entry.meterSlug);
							const presentation = LEDGER_ENTRY[entry.entryType];
							const positive = entry.ledgerClass === 'grant' || entry.entryType === 'rollover';
							const sign = positive ? '+' : NEGATIVE_ENTRIES.has(entry.entryType) ? '−' : '';
							return (
								<li key={entry.id} className={cn('grid grid-cols-[4.5rem_1fr_auto] items-baseline gap-x-3 py-2', index > 0 && cn('border-t', dashedRule))}>
									<span className="text-xs text-subtle-foreground tabular-nums">{f.time(entry.at)}</span>
									<span className="flex min-w-0 flex-col gap-1">
										<span className="flex flex-wrap items-center gap-2">
											<StatusBadge presentation={presentation} />
											<span className="truncate text-[13px] text-foreground">{meter?.displayName ?? entry.meterSlug}</span>
										</span>
										{entry.note ? <span className="text-xs text-muted-foreground">{entry.note}</span> : null}
									</span>
									<span className="flex flex-col items-end text-[13px] tabular-nums">
										<span className={cn('font-medium', positive ? 'text-success' : entry.entryType === 'refused' ? 'text-destructive' : 'text-foreground')}>
											{sign}
											{f.quantity(Math.abs(entry.delta))}
											{entry.entryType === 'refused' ? <span className="sr-only"> refused</span> : null}
										</span>
										<span className="text-xs text-subtle-foreground">
											{f.quantity(entry.usageAfter, true)} {meter?.unit ?? ''}
										</span>
									</span>
								</li>
							);
						})}
					</ol>
				</section>
			))}
		</div>
	);
}

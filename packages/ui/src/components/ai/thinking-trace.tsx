'use client';

import { Check, ChevronDown, FileCode2, Globe, Loader2, Sparkles, Terminal } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '../collapsible';
import { formatDuration } from './format-duration';
import { TextShimmer } from './text-shimmer';

type ThinkingTraceMode = 'steps' | 'reasoning' | 'search' | 'coding';

type ThinkingTraceRow = {
	primary: string;
	secondary?: string;
	mono?: boolean;
	href?: string;
	add?: number;
	del?: number;
};

type ThinkingTraceProps = {
	mode?: ThinkingTraceMode;
	/** Active header while working. */
	activeLabel?: string;
	/** Settled header (overridden by durationMs when set). */
	doneLabel?: string;
	durationMs?: number | null;
	isStreaming?: boolean;
	rows: ThinkingTraceRow[];
	/** Optional search query shown in search mode. */
	query?: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	className?: string;
	/** How many rows are visible while streaming (progressive reveal). */
	visibleCount?: number;
};

/**
 * Beautiful UI–style expandable agent trace with mode variants.
 * Production hosts pass rows + streaming; demos can drive visibleCount.
 */
function ThinkingTrace({
	mode = 'steps',
	activeLabel,
	doneLabel,
	durationMs = null,
	isStreaming = false,
	rows,
	query,
	open: openProp,
	onOpenChange,
	className,
	visibleCount,
}: ThinkingTraceProps) {
	const defaults = MODE_DEFAULTS[mode];
	const [internalOpen, setInternalOpen] = React.useState(isStreaming);
	const userToggled = React.useRef(false);
	const prevStreaming = React.useRef(isStreaming);
	const controlled = openProp !== undefined;
	const open = controlled ? openProp : internalOpen;

	React.useEffect(() => {
		const was = prevStreaming.current;
		prevStreaming.current = isStreaming;
		if (!was && isStreaming) {
			userToggled.current = false;
			if (!controlled) setInternalOpen(true);
		} else if (was && !isStreaming && !userToggled.current) {
			if (!controlled) setInternalOpen(false);
		}
	}, [isStreaming, controlled]);

	const setOpen = (next: boolean) => {
		if (isStreaming) userToggled.current = true;
		if (!controlled) setInternalOpen(next);
		onOpenChange?.(next);
	};

	const count = visibleCount ?? rows.length;
	const shown = rows.slice(0, Math.max(0, count));
	const duration = durationMs != null && durationMs > 0 ? formatDuration(durationMs) : null;
	const workingLabel = activeLabel ?? defaults.active;
	const settledLabel =
		doneLabel ??
		(duration ? `${defaults.donePrefix} ${duration}` : defaults.done);

	return (
		<div data-slot="thinking-trace" data-mode={mode} className={cn('flex w-full flex-col', className)}>
			<Collapsible open={open} onOpenChange={setOpen}>
				<CollapsibleTrigger
					className={cn(
						'group -mx-1.5 flex w-fit items-center gap-2 rounded-md px-1.5 py-1 text-left',
						'transition-colors duration-150 hover:bg-accent',
					)}
				>
					<Sparkles
						className={cn(
							'size-3.5 shrink-0',
							isStreaming ? 'text-muted-foreground' : 'text-muted-foreground/70',
						)}
					/>
					{isStreaming ? (
						<TextShimmer className="text-[13px] font-medium whitespace-nowrap">
							{workingLabel}
						</TextShimmer>
					) : (
						<span className="text-[13px] font-medium whitespace-nowrap text-muted-foreground animate-[fade-in_350ms_ease-out_both] motion-reduce:animate-none">
							{settledLabel}
						</span>
					)}
					<ChevronDown data-slot="collapsible-icon" className="size-3.5 text-muted-foreground/60" />
				</CollapsibleTrigger>

				<CollapsiblePanel innerClassName="py-0">
					<div className="relative mt-1 ml-1.5 border-l border-border/70 pl-3">
						{mode === 'search' && query ? (
							<div className="mb-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
								<Globe className="size-3 shrink-0" />
								<span className="truncate font-mono">{query}</span>
							</div>
						) : null}
						<ul className="flex flex-col gap-1.5">
							{shown.map((row, index) => {
								const settled = !isStreaming || index < shown.length - 1 || count >= rows.length;
								return (
									<li
										key={`${row.primary}-${index}`}
										className="flex min-w-0 items-start gap-2 text-[13px] animate-[ai-fade-up_300ms_cubic-bezier(0.23,1,0.32,1)_both] motion-reduce:animate-none"
										style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
									>
										<span className="mt-0.5 shrink-0">
											{settled ? (
												mode === 'coding' ? (
													<RowIcon mono={row.mono} primary={row.primary} />
												) : (
													<Check className="size-3 text-muted-foreground/70" />
												)
											) : (
												<Loader2 className="size-3 animate-spin text-muted-foreground motion-reduce:animate-none" />
											)}
										</span>
										<div className="min-w-0 flex-1">
											{row.href ? (
												<a
													href={row.href}
													target="_blank"
													rel="noreferrer noopener"
													className="font-medium text-foreground underline-offset-2 hover:underline"
												>
													{row.primary}
												</a>
											) : (
												<span
													className={cn(
														'text-foreground',
														row.mono && 'font-mono text-[12px]',
														mode === 'reasoning' && 'text-muted-foreground',
													)}
												>
													{row.primary}
												</span>
											)}
											{row.secondary ? (
												<span
													className={cn(
														'ml-1.5 text-muted-foreground',
														row.mono && 'font-mono text-[12px]',
													)}
												>
													{row.secondary}
												</span>
											) : null}
											{(row.add != null || row.del != null) && (
												<span className="ml-1.5 font-mono text-[11px] tabular-nums">
													{row.add != null ? (
														<span className="text-success">+{row.add}</span>
													) : null}
													{row.del != null ? (
														<span className="ml-1 text-destructive">-{row.del}</span>
													) : null}
												</span>
											)}
										</div>
									</li>
								);
							})}
						</ul>
					</div>
				</CollapsiblePanel>
			</Collapsible>
		</div>
	);
}

function RowIcon({ mono, primary }: { mono?: boolean; primary: string }) {
	const p = primary.toLowerCase();
	if (p.startsWith('run') || p.startsWith('bash')) {
		return <Terminal className="size-3 text-muted-foreground" />;
	}
	if (p.startsWith('read') || p.startsWith('edit') || p.startsWith('write') || mono) {
		return <FileCode2 className="size-3 text-muted-foreground" />;
	}
	return <Check className="size-3 text-muted-foreground/70" />;
}

const MODE_DEFAULTS: Record<
	ThinkingTraceMode,
	{ active: string; done: string; donePrefix: string }
> = {
	steps: { active: 'Thinking', done: 'Thought', donePrefix: 'Thought for' },
	reasoning: { active: 'Thinking', done: 'Thought', donePrefix: 'Thought for' },
	search: { active: 'Searching the web', done: 'Searched the web', donePrefix: 'Searched for' },
	coding: { active: 'Running tools', done: 'Ran tools', donePrefix: 'Ran tools for' },
};

export { ThinkingTrace };
export type { ThinkingTraceProps, ThinkingTraceMode, ThinkingTraceRow };

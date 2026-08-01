'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import type { InlineDiffSource } from './types';

type InlineDiffProps = {
	source: InlineDiffSource;
	className?: string;
	/** Max lines shown before collapse. */
	maxLines?: number;
};

type DiffLine = { type: 'context' | 'add' | 'del'; text: string };

/** Naive line diff for presentation (not a full Myers algorithm). */
function lineDiff(before: string, after: string): DiffLine[] {
	const a = before.split('\n');
	const b = after.split('\n');
	const aSet = new Set(a);
	const bSet = new Set(b);
	const lines: DiffLine[] = [];

	// Deleted then added, with shared context kept once.
	for (const line of a) {
		if (!bSet.has(line)) lines.push({ type: 'del', text: line });
	}
	for (const line of b) {
		if (!aSet.has(line)) lines.push({ type: 'add', text: line });
		else if (!lines.some((l) => l.type === 'context' && l.text === line)) {
			// keep light context for shared lines only when both sides non-empty
		}
	}

	// If pure rewrite with no shared detection, show both sides fully.
	if (lines.length === 0 && before !== after) {
		return [
			...a.map((text) => ({ type: 'del' as const, text })),
			...b.map((text) => ({ type: 'add' as const, text })),
		];
	}

	// Prefer side-by-side chronological: dels first from before order, adds from after order
	const dels = a.filter((line) => !bSet.has(line)).map((text) => ({ type: 'del' as const, text }));
	const adds = b.filter((line) => !aSet.has(line)).map((text) => ({ type: 'add' as const, text }));
	const shared = b.filter((line) => aSet.has(line)).map((text) => ({ type: 'context' as const, text }));

	// Interleave roughly: context blocks small
	if (shared.length > 6) {
		return [...dels, ...adds];
	}
	return [...shared.slice(0, 2), ...dels, ...adds, ...shared.slice(2)];
}

function InlineDiff({ source, className, maxLines = 40 }: InlineDiffProps) {
	const lines = React.useMemo(
		() => lineDiff(source.before, source.after),
		[source.before, source.after],
	);
	const visible = lines.slice(0, maxLines);
	const hidden = lines.length - visible.length;

	return (
		<div
			data-slot="inline-diff"
			className={cn(
				'overflow-hidden rounded-lg border border-border bg-muted/30 font-mono text-[11.5px] leading-relaxed',
				className,
			)}
		>
			{source.fileName ? (
				<div className="border-b border-border/80 bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
					{source.fileName}
				</div>
			) : null}
			<pre className="overflow-x-auto p-0">
				{visible.map((line, i) => (
					<div
						key={i}
						className={cn(
							'flex gap-2 px-2.5 py-0.5',
							line.type === 'add' && 'bg-success/10 text-success',
							line.type === 'del' && 'bg-destructive/10 text-destructive',
							line.type === 'context' && 'text-muted-foreground',
						)}
					>
						<span className="w-3 shrink-0 select-none opacity-70">
							{line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '}
						</span>
						<span className="min-w-0 whitespace-pre-wrap break-all">{line.text || ' '}</span>
					</div>
				))}
			</pre>
			{hidden > 0 ? (
				<div className="border-t border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground">
					+{hidden} more lines
				</div>
			) : null}
		</div>
	);
}

export { InlineDiff, lineDiff };
export type { InlineDiffProps };

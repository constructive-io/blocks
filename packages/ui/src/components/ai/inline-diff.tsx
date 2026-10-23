'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import { type DiffLine, diffLines } from './line-diff';
import type { InlineDiffSource } from './types';

type InlineDiffProps = {
	source: InlineDiffSource;
	className?: string;
	/** Max lines shown before collapse. */
	maxLines?: number;
};

/** Unchanged lines kept on each side of a change. */
const CONTEXT_LINES = 2;

/**
 * Line diff between two texts, in order: unchanged lines as `context`, removed
 * lines as `del`, new lines as `add`. A line that also appears elsewhere is
 * matched by position, so a repeated line is shown as added or removed rather
 * than hidden. The common head and tail are trimmed before the comparison, and
 * a long file is compared by its edits rather than by a table of every pair of
 * lines, so a few edits stay cheap however far apart they are.
 */
function lineDiff(before: string, after: string): DiffLine[] {
	return diffLines(before.split('\n'), after.split('\n'));
}

type DiffRow = DiffLine | { type: 'gap'; count: number };

/** Keeps `CONTEXT_LINES` unchanged lines around each change and folds longer unchanged runs into one gap row. */
function withContext(lines: DiffLine[]): DiffRow[] {
	if (lines.every((line) => line.type === 'context')) return lines;
	const keep = lines.map(() => false);
	lines.forEach((line, index) => {
		if (line.type === 'context') return;
		for (let near = Math.max(0, index - CONTEXT_LINES); near <= Math.min(lines.length - 1, index + CONTEXT_LINES); near++) keep[near] = true;
	});
	const rows: DiffRow[] = [];
	let skipped = 0;
	const flush = (index: number) => {
		if (skipped === 1) rows.push(lines[index - 1]!);
		else if (skipped > 1) rows.push({ type: 'gap', count: skipped });
		skipped = 0;
	};
	lines.forEach((line, index) => {
		if (keep[index]) {
			flush(index);
			rows.push(line);
		} else {
			skipped += 1;
		}
	});
	flush(lines.length);
	return rows;
}

function InlineDiff({ source, className, maxLines = 40 }: InlineDiffProps) {
	const lines = React.useMemo(
		() => withContext(lineDiff(source.before, source.after)),
		[source.before, source.after],
	);
	const visible = lines.slice(0, maxLines);
	const hidden = lines.length - visible.length;

	return (
		<div
			data-slot="inline-diff"
			className={cn(
				'overflow-hidden rounded-lg border border-border bg-muted/30 font-mono text-[0.71875rem] leading-relaxed',
				className,
			)}
		>
			{source.fileName ? (
				<div title={source.fileName} className="border-b border-border bg-muted/50 px-2.5 py-1 text-xs break-all text-muted-foreground">
					{source.fileName}
				</div>
			) : null}
			<pre className="overflow-x-auto p-0">
				{visible.map((line, i) =>
					line.type === 'gap' ? (
						<div key={i} className="px-2.5 py-0.5 text-center text-[0.6875rem] text-subtle-foreground select-none">
							{line.count} unchanged {line.count === 1 ? 'line' : 'lines'}
						</div>
					) : (
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
					),
				)}
			</pre>
			{hidden > 0 ? (
				<div className="border-t border-border px-2.5 py-1 text-[0.6875rem] text-muted-foreground">
					{hidden} more {hidden === 1 ? 'line' : 'lines'}
				</div>
			) : null}
		</div>
	);
}

export { InlineDiff, lineDiff };
export type { InlineDiffProps };

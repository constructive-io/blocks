// Read-only viewer for a full-text search value: the keywords it holds as chips, the
// stored value as text, and why it cannot be changed here. The host (the grid overlay
// or the record panel) owns focus, Escape and a press outside; Close is the only
// control, so it takes focus first.

import { useMemo } from 'react';

import { Button } from '@constructive-io/ui/button';

import { cn } from '../../utils/cn';
import { OVERLAY } from './overlay-presets';

type Weight = 'A' | 'B' | 'C' | 'D';
interface Keyword {
	word: string;
	weights: Weight[];
}

/** The keywords of a stored search value (`'cat':1A 'fast':2B`), or its words when it is plain text. */
function parseKeywords(stored: string): Keyword[] {
	const keywords: Keyword[] = [];
	const pattern = /'([^']+)':([0-9A-D,]+)/g;
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(stored)) !== null) {
		const weights = new Set<Weight>();
		for (const position of match[2]!.split(',')) {
			const weight = /[A-D]$/.exec(position)?.[0] as Weight | undefined;
			if (weight) weights.add(weight);
		}
		keywords.push({ word: match[1]!, weights: [...weights].sort() });
	}
	if (keywords.length > 0) return keywords;
	return stored
		.split(/\s+/)
		.filter(Boolean)
		.map((word) => ({ word, weights: [] }));
}

interface TsvectorViewerProps {
	value: unknown;
	/** The field's readable name. */
	title: string;
	/** Why the value cannot be changed here. */
	note: string;
	onClose: () => void;
}

export function TsvectorViewer({ value, title, note, onClose }: TsvectorViewerProps) {
	const stored = typeof value === 'string' ? value : '';
	const keywords = useMemo(() => parseKeywords(stored), [stored]);
	const weighted = keywords.some((keyword) => keyword.weights.length > 0);

	return (
		<div data-slot='tsvector-viewer' className={cn('bg-popover flex flex-col gap-2 rounded-lg border p-3 shadow-lg', OVERLAY.md)}>
			<div className='flex items-baseline justify-between gap-2'>
				<h3 className='text-sm font-medium'>{title}</h3>
				<span className='text-muted-foreground text-xs tabular-nums'>
					{keywords.length} {keywords.length === 1 ? 'keyword' : 'keywords'}
				</span>
			</div>
			{keywords.length > 0 ? (
				// Chips sit 4px inside the 8px box, so their corners are 8px - 4px.
				<ul aria-label='Search keywords' className='bg-muted/40 flex max-h-32 flex-wrap gap-1 overflow-y-auto rounded-md p-1'>
					{keywords.map((keyword, index) => (
						<li
							key={`${index}-${keyword.word}`}
							className='bg-muted text-muted-foreground rounded-[calc(var(--radius-md)-4px)] px-2 py-0.5 text-xs font-medium'
						>
							{keyword.word}
							{keyword.weights.length > 0 ? <span className='text-muted-foreground/70 ms-1'>{keyword.weights.join(' ')}</span> : null}
						</li>
					))}
				</ul>
			) : (
				<p className='text-muted-foreground text-sm'>No keywords</p>
			)}
			{stored ? (
				<div className='flex flex-col gap-1'>
					<span className='text-muted-foreground text-xs font-medium'>Stored value</span>
					<pre className='bg-muted/40 m-0 max-h-24 overflow-auto rounded-md p-2 font-mono text-xs break-all whitespace-pre-wrap'>{stored}</pre>
				</div>
			) : null}
			<p className='text-muted-foreground text-xs'>
				{weighted ? 'A letter after a keyword shows how much it counts in a search, from A (most) to D (least). ' : null}
				{note}
			</p>
			<div className='flex justify-end border-t pt-2'>
				<Button size='xs' variant='outline' onClick={onClose} autoFocus>
					Close
				</Button>
			</div>
		</div>
	);
}

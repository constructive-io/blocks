import * as React from 'react';

import { cn } from '../../lib/utils';

/** The last `count` characters of `text`, split at a grapheme boundary so an emoji or accent is never cut in half. */
function splitTail(text: string, count: number): [head: string, tail: string] {
	const pieces =
		typeof Intl !== 'undefined' && 'Segmenter' in Intl
			? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), (part) => part.segment)
			: Array.from(text);
	if (pieces.length <= count) return [text, ''];
	return [pieces.slice(0, pieces.length - count).join(''), pieces.slice(pieces.length - count).join('')];
}

interface MiddleTruncateProps {
	text: string;
	/** Characters that always stay visible at the end: the extension, version or last path segment. Default: 12. */
	tail?: number;
	className?: string;
}

/**
 * `MiddleTruncate` — one line that gives up its middle when it runs out of room, keeping the start and the
 * end. Names and keys differ at the end (`…edited_edited.HEIC`, `…/2025/09/14/`), so clipping only the end
 * would make different files read the same. The full text is the tooltip.
 */
export function MiddleTruncate({ text, tail = 12, className }: MiddleTruncateProps) {
	const [head, end] = splitTail(text, tail);
	return (
		// `dir="auto"` lays the two halves out in the text's own direction, so Arabic or Hebrew names stay in reading order.
		// `whitespace-pre` keeps a space at the cut ("Đặng " + "Thị Ngọc Hân") from collapsing away.
		// The halves are flex items, so assistive tech would read a break at the cut ("Pr oduct"); it reads the sr-only copy instead.
		<span dir="auto" className={cn('flex min-w-0', className)} title={text}>
			<span className="sr-only">{text}</span>
			<span aria-hidden="true" className="min-w-0 overflow-hidden text-ellipsis whitespace-pre">{head}</span>
			{/* The tail never shrinks while the head can, but it never outgrows the line either: in a box narrower than the tail it clips instead of spilling over the neighbours. */}
			{end ? <span aria-hidden="true" className="max-w-full shrink-0 overflow-hidden text-ellipsis whitespace-pre">{end}</span> : null}
		</span>
	);
}

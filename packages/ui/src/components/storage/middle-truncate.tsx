'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';

// Built once. Grapheme boundaries do not depend on the locale, so the server and the browser split a name alike.
const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

/** The last `count` characters of `text`, split at a grapheme boundary so an emoji or accent is never cut in half. */
function splitTail(text: string, count: number): [head: string, tail: string] {
	const pieces = segmenter ? Array.from(segmenter.segment(text), (part) => part.segment) : Array.from(text);
	if (pieces.length <= count) return [text, ''];
	return [pieces.slice(0, pieces.length - count).join(''), pieces.slice(pieces.length - count).join('')];
}

interface MiddleTruncateProps {
	text: string;
	/** Characters that always stay visible at the end: the extension, version or last path segment. Default: 12. */
	tail?: number;
	/** The tooltip. Default: the whole text. Pass `false` when an ancestor already has a richer `title`, which a nested one would hide. */
	title?: string | false;
	className?: string;
}

/**
 * `MiddleTruncate` — one line that gives up its middle when it runs out of room, keeping the start and the
 * end. Names and keys differ at the end (`…edited_edited.HEIC`, `…/2025/09/14/`), so clipping only the end
 * would make different files read the same. The full text is the tooltip.
 *
 * A text longer than `tail` is drawn as two pieces, so the text itself is in the document once more, visually
 * hidden: that copy is what assistive tech reads and what a selection or copy picks up, so a copied name is the
 * original string once. The two visible pieces cannot be selected themselves.
 */
export function MiddleTruncate({ text, tail = 12, title = text, className }: MiddleTruncateProps) {
	const [head, end] = React.useMemo(() => splitTail(text, tail), [text, tail]);
	const tooltip = title === false ? undefined : title;
	// `dir="auto"` lays the pieces out in the text's own direction, so Arabic or Hebrew names stay in reading order.
	// `whitespace-pre` keeps a space at the cut ("Đặng " + "Thị Ngọc Hân") from collapsing away.
	if (!end) {
		// Nothing to keep at the end: an ordinary line that ends in an ellipsis.
		return (
			<span dir="auto" className={cn('block min-w-0 overflow-hidden text-ellipsis whitespace-pre', className)} title={tooltip}>
				{text}
			</span>
		);
	}
	return (
		<span dir="auto" className={cn('flex min-w-0', className)} title={tooltip}>
			<span className="sr-only">{text}</span>
			<span aria-hidden="true" className="min-w-0 overflow-hidden text-ellipsis whitespace-pre select-none">
				{head}
			</span>
			{/* The tail never shrinks while the head can, but it never outgrows the line either: in a box narrower than the tail it clips instead of spilling over the neighbours. */}
			<span aria-hidden="true" className="max-w-full shrink-0 overflow-hidden text-ellipsis whitespace-pre select-none">
				{end}
			</span>
		</span>
	);
}

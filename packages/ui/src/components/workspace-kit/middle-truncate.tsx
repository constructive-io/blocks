'use client';

import * as React from 'react';

import { graphemes } from '../../lib/intl';
import { cn } from '../../lib/utils';

const EXTENSION = /\.[A-Za-z0-9]{1,8}$/;

/** The text split into what the line gives up first and what it always keeps, or `null` when it is too short to bother. */
function splitMiddle(text: string, tail: number | undefined): [head: string, end: string] | null {
	const extension = EXTENSION.exec(text)?.[0];
	const asked = tail ?? (extension ? extension.length + 4 : 8);
	const keep = Number.isFinite(asked) ? Math.max(0, Math.floor(asked)) : 0;
	// A text is never longer in characters than in UTF-16 units, so a short one skips the segmenter.
	if (keep === 0 || text.length <= keep * 2) return null;
	const pieces = graphemes(text);
	if (pieces.length <= keep * 2) return null;
	return [pieces.slice(0, -keep).join(''), pieces.slice(-keep).join('')];
}

interface MiddleTruncateProps {
	text: string;
	/**
	 * Characters that always stay visible at the end: the extension, version or last path segment. Defaults to the
	 * extension plus four characters, or eight. `0` keeps none: an ordinary line that ends in an ellipsis.
	 */
	tail?: number;
	/** The tooltip. Default: the whole text. Pass `false` when an ancestor already has a richer `title`, which a nested one would hide. */
	title?: string | false;
	className?: string;
}

/**
 * `MiddleTruncate` — one line that gives up its middle when it runs out of room, keeping the start and the end.
 * Names and keys differ at the end (`…edited_edited.HEIC`, `…/2025/09/14/`), so clipping only the end would make
 * different files read the same. The full text is the tooltip.
 *
 * A long text is drawn as two pieces, so the text itself is in the document once more, visually hidden: that copy is
 * what assistive tech reads and what a selection or copy picks up, so a copied name is the original string once. The
 * two visible pieces cannot be selected themselves. Graphemes are never cut, so an emoji or accent stays whole.
 */
export function MiddleTruncate({ text, tail, title = text, className }: MiddleTruncateProps) {
	const parts = React.useMemo(() => splitMiddle(text, tail), [text, tail]);
	const tooltip = title === false ? undefined : title;
	// `dir="auto"` lays the pieces out in the text's own direction, so Arabic or Hebrew names stay in reading order.
	// `whitespace-pre` keeps a space at the cut ("Đặng " + "Thị Ngọc Hân") from collapsing away.
	if (!parts) {
		return (
			<span dir="auto" className={cn('block min-w-0 overflow-hidden text-ellipsis whitespace-pre', className)} title={tooltip}>
				{text}
			</span>
		);
	}
	return (
		<span dir="auto" className={cn('flex min-w-0 max-w-full', className)} title={tooltip}>
			<span className="sr-only">{text}</span>
			<span aria-hidden="true" className="min-w-0 overflow-hidden text-ellipsis whitespace-pre select-none">
				{parts[0]}
			</span>
			{/* The tail never shrinks while the head can, but it never outgrows the line either: in a box narrower than the tail it clips instead of spilling over the neighbours. */}
			<span aria-hidden="true" className="max-w-full shrink-0 overflow-hidden text-ellipsis whitespace-pre select-none">
				{parts[1]}
			</span>
		</span>
	);
}

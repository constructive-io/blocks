// Default DOM view for the `badges` SheetsCell family — the native analogue of
// v1's glide BubbleCell render. Dependency-light: plain JSX + Tailwind v4 + a
// local `cn`, with no shared primitive dependency. Reads the string[] off
// `props.cell.data` (the badges payload) and renders one tonal chip per item per
// DESIGN_SPEC §7; an empty array renders an empty cell.
//
// Chips default to the `neutral` tone — the palette is wired for opt-in color
// later (consumer-supplied tone map / resolver); an unconfigured grid stays calm.

import { BADGE_TONES, resolveBadgeTone } from '../badge-tones';
import { cn } from '../../utils/cn';
import type { CellProps } from '../cell-props';

export function BadgesCellView(props: CellProps) {
	const items = Array.isArray(props.cell.data) ? (props.cell.data as string[]) : [];

	return (
		<div
			data-slot="badges-cell"
			className={cn(
				'flex h-full w-full items-center gap-1 overflow-hidden px-3',
				// Single row in the fixed-height cell (no vertical cramming): pills that run
				// past the right edge fade out, signalling more items beyond the cut (DESIGN_SPEC §7).
				// The fade runs over the last 2rem of the content and is fully clear by the end
				// padding, so a cut pill dissolves instead of stopping mid-letter at the cell edge.
				// It only bites when content reaches that far, so a short list shows no fade.
				'[mask-image:linear-gradient(to_right,black,black_calc(100%_-_2.75rem),transparent_calc(100%_-_0.75rem))]',
			)}
		>
			{items.map((item, index) => (
				<span
					key={`${index}-${item}`}
					className={cn(
						'inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium tabular-nums',
						BADGE_TONES[resolveBadgeTone(item)],
					)}
				>
					{item}
				</span>
			))}
		</div>
	);
}

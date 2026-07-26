// Default DOM view for the `badges` SheetsCell family — the native analogue of
// v1's glide BubbleCell render. Dependency-light: plain JSX + Tailwind v4 + a
// local `cn`, no @constructive-io/ui this phase. Reads the string[] off
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
			role="gridcell"
			data-slot="badges-cell"
			className={cn(
				'flex h-full w-full items-center gap-1 overflow-hidden px-3',
				// Single row in the fixed-height cell (no vertical cramming): pills that run
				// past the right edge fade out, signalling more items beyond the cut (DESIGN_SPEC §7).
				// The mask only bites when content actually reaches the right edge, so a short list
				// (nothing near the edge) shows no fade.
				'[mask-image:linear-gradient(to_right,black,black_calc(100%_-_1.5rem),transparent)]',
			)}
		>
			{items.map((item, index) => (
				<span
					key={`${index}-${item}`}
					className={cn(
						'inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium',
						BADGE_TONES[resolveBadgeTone(item)],
					)}
				>
					{item}
				</span>
			))}
		</div>
	);
}

/**
 * A press on an empty part of the grid: the space below the last row, a row line past the
 * last column, or the header band past the last header. Cells, headers, the row markers,
 * the fill handle and any control keep their own meaning, and so does a scrollbar.
 */

/** Parts of the grid a press acts on; anything else inside the viewport is empty space. */
const PRESSABLE = [
	'[role="gridcell"]',
	'[role="columnheader"]',
	'[data-part-id^="sheets-row-marker"]',
	'[data-part-id="sheets-fill-handle"]',
	'button',
	'input',
	'a',
].join(', ');

export function isEmptyGridPress(target: Element, viewport: HTMLElement, clientX: number, clientY: number): boolean {
	if (!viewport.contains(target)) return false;
	if (target === viewport) {
		// A press on a scrollbar lands on the viewport itself, outside its client box.
		const rect = viewport.getBoundingClientRect();
		const x = clientX - rect.left - viewport.clientLeft;
		const y = clientY - rect.top - viewport.clientTop;
		return x >= 0 && y >= 0 && x < viewport.clientWidth && y < viewport.clientHeight;
	}
	const pressable = target.closest(PRESSABLE);
	return pressable === null || !viewport.contains(pressable);
}

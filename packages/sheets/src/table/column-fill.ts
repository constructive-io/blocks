/**
 * Column widths that fill the grid.
 *
 * When the shown columns are narrower than the grid, the spare width goes to the
 * columns the user has not resized, in proportion to their widths, so the last
 * column ends at the grid's right edge (the rounding remainder goes to the last
 * flexible column). Narrow kinds (a checkbox, a number) keep their width while a
 * wider kind (text, a date, a list, a link) can take the space, and share it only
 * when nothing else can grow. A column the user resized keeps its width, and so do
 * frozen columns unless every column is frozen. When no column may grow, the columns
 * keep their widths and `filler` says how much empty width is left for an inert
 * filler. Columns wider than the grid are returned unchanged (the grid scrolls).
 *
 * The result is for display only: it is never stored, so a saved view keeps the
 * widths the user chose, not the widths one window size produced.
 */

export interface ColumnFillInput {
	/** Each shown column's width before filling (the user's width, else its default), in display order. */
	widths: readonly number[];
	/** True for a column that keeps its width: the user resized it. */
	fixed: readonly boolean[];
	/** True for a column frozen at the start: it keeps its width unless every column is frozen. */
	frozen: readonly boolean[];
	/** True for a narrow kind (a checkbox, a number): it grows only when no other column can. */
	narrow: readonly boolean[];
	/** The width the columns may take: the grid's inner width without the row marker. */
	available: number;
}

export interface ColumnFill {
	/** The widths to draw. The input array itself when nothing changes. */
	widths: readonly number[];
	/** Empty width after the last column when no column may grow, else 0. */
	filler: number;
}

/**
 * The columns that may grow, by preference: unresized, unfrozen columns of a wide kind;
 * else every unresized, unfrozen column; else, when every column is frozen, every
 * unresized column.
 */
function flexibleColumns({ fixed, frozen, narrow }: Pick<ColumnFillInput, 'fixed' | 'frozen' | 'narrow'>, count: number): number[] {
	const indexes = Array.from({ length: count }, (_, index) => index);
	const unfrozen = indexes.filter((index) => !fixed[index] && !frozen[index]);
	const wide = unfrozen.filter((index) => !narrow[index]);
	if (wide.length > 0) return wide;
	if (unfrozen.length > 0) return unfrozen;
	const allFrozen = indexes.every((index) => frozen[index]);
	return allFrozen ? indexes.filter((index) => !fixed[index]) : [];
}

export function fillColumnWidths({ widths, fixed, frozen, narrow, available }: ColumnFillInput): ColumnFill {
	const total = widths.reduce((sum, width) => sum + width, 0);
	const spare = available - total;
	if (!(spare > 0)) return { widths, filler: 0 };

	const flexible = flexibleColumns({ fixed, frozen, narrow }, widths.length);
	if (flexible.length === 0) return { widths, filler: spare };

	const base = flexible.reduce((sum, index) => sum + widths[index]!, 0);
	const next = [...widths];
	let given = 0;
	flexible.forEach((index, position) => {
		const last = position === flexible.length - 1;
		const proportional = base > 0 ? (spare * widths[index]!) / base : spare / flexible.length;
		const share = last ? spare - given : Math.floor(proportional);
		next[index] = widths[index]! + share;
		given += share;
	});
	return { widths: next, filler: 0 };
}

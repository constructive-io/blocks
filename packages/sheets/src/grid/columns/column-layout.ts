/**
 * Column layout: pure helpers over `SheetsColumnLayout`.
 *
 * `available` is always the table's grid column keys in the table's order
 * (`gridColumnKeys(model)`). A layout names keys by field name, so it survives
 * a schema change: keys it names that the table lost are ignored here (and
 * reported by the validator), keys the table gained follow at the end.
 */
import type { ColumnValueKind, TableModel } from '@constructive-io/data';

import type { SheetsColumnLayout, SheetsRowHeight } from '../view-state/view-state.types';

/** Row height of each setting, in pixels. */
export const ROW_HEIGHT_PX: Readonly<Record<SheetsRowHeight, number>> = {
	short: 32,
	medium: 44,
	tall: 64,
	extraTall: 96,
};

export const ROW_HEIGHT_LABELS: Readonly<Record<SheetsRowHeight, string>> = {
	short: 'Short',
	medium: 'Medium',
	tall: 'Tall',
	extraTall: 'Extra tall',
};

export const ROW_HEIGHTS = Object.keys(ROW_HEIGHT_PX) as SheetsRowHeight[];

/** Narrowest and widest a column can be dragged or stored. */
export const MIN_COLUMN_WIDTH = 40;
export const MAX_COLUMN_WIDTH = 2000;

/** The layout with every column shown in the table's order and the first column frozen. */
export function createColumnLayout(): SheetsColumnLayout {
	return { order: [], hidden: [], frozenCount: 1, widths: {}, rowHeight: 'medium' };
}

/** Every available key in display order: the layout's order first, then the rest in the table's order. */
export function orderedColumnKeys(available: readonly string[], layout: SheetsColumnLayout): string[] {
	const known = new Set(available);
	const named = layout.order.filter((key) => known.has(key));
	const placed = new Set(named);
	return [...named, ...available.filter((key) => !placed.has(key))];
}

/** The keys that show, in display order. */
export function visibleColumnKeys(available: readonly string[], layout: SheetsColumnLayout): string[] {
	const hidden = new Set(layout.hidden);
	return orderedColumnKeys(available, layout).filter((key) => !hidden.has(key));
}

/** How many leading visible columns stay in place, within the visible count. */
export function effectiveFrozenCount(available: readonly string[], layout: SheetsColumnLayout): number {
	return Math.max(0, Math.min(layout.frozenCount, visibleColumnKeys(available, layout).length));
}

/** The layout with `key` shown or hidden. */
export function setColumnHidden(layout: SheetsColumnLayout, key: string, hidden: boolean): SheetsColumnLayout {
	const rest = layout.hidden.filter((entry) => entry !== key);
	return { ...layout, hidden: hidden ? [...rest, key] : rest };
}

/** Show every column. */
export function showAllColumns(layout: SheetsColumnLayout): SheetsColumnLayout {
	return { ...layout, hidden: [] };
}

/** Hide every column but the first one in display order (at least one column always shows). */
export function hideAllColumns(available: readonly string[], layout: SheetsColumnLayout): SheetsColumnLayout {
	const [first, ...rest] = orderedColumnKeys(available, layout);
	return first === undefined ? layout : { ...layout, hidden: rest };
}

/** The layout with `key` moved to `index` of the full display order. */
export function moveColumnTo(
	available: readonly string[],
	layout: SheetsColumnLayout,
	key: string,
	index: number,
): SheetsColumnLayout {
	const order = orderedColumnKeys(available, layout);
	const from = order.indexOf(key);
	if (from === -1) return layout;
	order.splice(from, 1);
	order.splice(Math.max(0, Math.min(index, order.length)), 0, key);
	return { ...layout, order };
}

/** The layout with `key` placed just before or after `target` (header drag, Fields drag). */
export function moveColumnBeside(
	available: readonly string[],
	layout: SheetsColumnLayout,
	key: string,
	target: string,
	side: 'before' | 'after',
): SheetsColumnLayout {
	if (key === target) return layout;
	const without = orderedColumnKeys(available, layout).filter((entry) => entry !== key);
	const at = without.indexOf(target);
	if (at === -1) return layout;
	without.splice(side === 'before' ? at : at + 1, 0, key);
	return { ...layout, order: without };
}

/**
 * The layout with `key` moved one place among the visible columns (header
 * menu, keyboard). Hidden columns in between keep their places.
 */
export function moveColumnStep(
	available: readonly string[],
	layout: SheetsColumnLayout,
	key: string,
	step: -1 | 1,
): SheetsColumnLayout {
	const visible = visibleColumnKeys(available, layout);
	const at = visible.indexOf(key);
	const neighbour = visible[at + step];
	if (at === -1 || neighbour === undefined) return layout;
	return moveColumnBeside(available, layout, key, neighbour, step === -1 ? 'before' : 'after');
}

/** Freeze the visible columns up to and including `key`. */
export function freezeColumnsUpTo(available: readonly string[], layout: SheetsColumnLayout, key: string): SheetsColumnLayout {
	const at = visibleColumnKeys(available, layout).indexOf(key);
	return at === -1 ? layout : { ...layout, frozenCount: at + 1 };
}

export function clampColumnWidth(width: number): number {
	return Math.round(Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, width)));
}

/** The layout with a stored width for `key`. */
export function setColumnWidth(layout: SheetsColumnLayout, key: string, width: number): SheetsColumnLayout {
	const next = clampColumnWidth(width);
	return layout.widths[key] === next ? layout : { ...layout, widths: { ...layout.widths, [key]: next } };
}

/** Value kinds that read at a glance in a narrow column: a checkbox and numbers. */
const NARROW_KINDS: ReadonlySet<ColumnValueKind> = new Set<ColumnValueKind>(['boolean', 'integer', 'bigint', 'decimal', 'float']);

/**
 * The table's checkbox and number columns (single values, not lists). When the grid is
 * wider than its columns, they keep their width while other columns can take the space.
 */
export function narrowColumnNames(model: TableModel | null): ReadonlySet<string> {
	const names = (model?.columns ?? []).filter((column) => !column.value.isArray && NARROW_KINDS.has(column.value.kind)).map((column) => column.name);
	return new Set(names);
}

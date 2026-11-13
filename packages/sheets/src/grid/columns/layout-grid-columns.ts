import type { RelationGridColumn } from '../../hooks/use-relation-columns';
import type { ColumnLayoutBindings } from './use-column-layout';

/**
 * The grid columns a view shows: the layout's visible keys in order, each with
 * its stored width (or its default width).
 */
export function layoutGridColumns(
	columns: readonly RelationGridColumn[],
	layout: ColumnLayoutBindings,
): { columns: RelationGridColumn[]; columnKeys: string[] } {
	const byId = new Map(columns.map((column) => [column.id, column]));
	const shown = layout.visibleKeys.flatMap((key) => {
		const column = byId.get(key);
		return column ? [{ ...column, width: layout.layout.widths[key] ?? column.width }] : [];
	});
	return { columns: shown, columnKeys: shown.map((column) => column.id) };
}

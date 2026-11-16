// The grid's own CSV export (selected rows, else the loaded ones): the toolbar's
// "Export selected" button and `SheetsHandle.exportCsv()`.
import { useCallback } from 'react';

import { loadedRowsCsv } from '../../import-export/export-view';
import { downloadTextFile } from '../../import-export/files';
import type { SheetsSelection } from '../../selection/selection-model';
import type { SheetsRow } from '../row-model';
import type { DataGridProps } from '../sheets.types';
import type { SheetsShellBindings } from '../use-sheets';

export interface UseGridCsvExportInput {
	tableName: string;
	csvExport: DataGridProps['csvExport'];
	selection: SheetsSelection | undefined;
	combinedRows: SheetsRow[];
	shell: SheetsShellBindings;
}

export function useGridCsvExport({ tableName, csvExport, selection, combinedRows, shell }: UseGridCsvExportInput) {
	// Imperative getSelectedRows reads the SAME canonical RangeSet the canvas handle uses.
	const getSelectedRows = useCallback(
		(): Record<string, unknown>[] =>
			(selection?.rows.toArray() ?? []).map((i) => combinedRows[i]).filter(Boolean) as Record<string, unknown>[],
		[selection, combinedRows],
	);

	// Shared CSV export body — selected rows if any, else the loaded/filtered set. Reused by
	// the imperative SheetsHandle.exportCsv() and the toolbar Export button (handleExport).
	const defaultProtectFormulas = csvExport?.protectFormulas ?? false;
	const runCsvExport = useCallback(
		(opts?: { columns?: string[]; filename?: string; protectFormulas?: boolean }) => {
			const selected = getSelectedRows();
			const rows = selected.length ? selected : (shell.combinedRows as Record<string, unknown>[]);
			// The same copy format as the full-view export: choice labels, JSON for structured values, linked-record labels.
			const text = loadedRowsCsv(shell.tableModel, rows, opts?.columns ?? shell.columnKeys, {
				protectFormulas: opts?.protectFormulas ?? defaultProtectFormulas,
			});
			downloadTextFile(text, opts?.filename ?? 'export.csv');
		},
		[defaultProtectFormulas, getSelectedRows, shell.combinedRows, shell.columnKeys, shell.tableModel],
	);

	// Toolbar Export button — same path as the imperative SheetsHandle.exportCsv().
	const handleExport = useCallback(() => runCsvExport({ filename: `${tableName}.csv` }), [runCsvExport, tableName]);

	return { getSelectedRows, runCsvExport, handleExport, defaultProtectFormulas };
}

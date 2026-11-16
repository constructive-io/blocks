'use client';

// Preload the built-in date editor's chunk when the grid's table has a date or time
// column, so the first open shows the editor at once instead of waiting for its code.
// It runs once, in idle time after the grid has rows: a table without such a column,
// or a host that brings its own date editor, loads nothing.

import type { ComponentType } from 'react';
import { useEffect } from 'react';

import type { TableModel } from '@constructive-io/data';

import { DATE_TIME_TYPES } from '../../cell-types/cell-type-groups';
import { cellTypeForColumn } from '../../cell-types/column-routing';
import type { EditorProps } from './editor-props';
import { loadDateEditor } from './date-editor';

export interface DateEditorPreloadInput {
	table: TableModel | null;
	/** Host cell-type overrides (`SheetsConfig.fieldTypeOverrides`), keyed `Table.field`. */
	typeOverrides?: Readonly<Record<string, string>>;
	/** The grid has rendered rows; nothing is loaded before the first paint of data. */
	hasRows: boolean;
	/** The host's editor for a cell type, when it replaces the built-in one. */
	getEditorComponent?: (typeKey: string) => ComponentType<EditorProps> | undefined;
	/** Injected in tests; defaults to the date editor's own loader. */
	load?: () => Promise<unknown>;
}

/** True when a column of the table opens the built-in date editor. */
export function tableUsesDateEditor(
	table: TableModel | null,
	typeOverrides?: Readonly<Record<string, string>>,
	getEditorComponent?: DateEditorPreloadInput['getEditorComponent'],
): boolean {
	if (!table) return false;
	return table.columns.some((column) => {
		const cellType = typeOverrides?.[`${table.name}.${column.name}`] || cellTypeForColumn(column);
		return DATE_TIME_TYPES.has(cellType) && !getEditorComponent?.(cellType);
	});
}

/** Run `task` when the browser is idle (or soon, where idle callbacks are missing). Returns a cancel. */
function whenIdle(task: () => void): () => void {
	if (typeof window.requestIdleCallback === 'function') {
		const handle = window.requestIdleCallback(task, { timeout: 2000 });
		return () => window.cancelIdleCallback(handle);
	}
	const handle = window.setTimeout(task, 200);
	return () => window.clearTimeout(handle);
}

export function useDateEditorPreload({
	table,
	typeOverrides,
	hasRows,
	getEditorComponent,
	load = loadDateEditor,
}: DateEditorPreloadInput): void {
	const needed = hasRows && tableUsesDateEditor(table, typeOverrides, getEditorComponent);
	useEffect(() => {
		if (!needed) return;
		// A failed preload is not an error: the editor loads again when it is opened.
		return whenIdle(() => void load().catch(() => {}));
	}, [needed, load]);
}

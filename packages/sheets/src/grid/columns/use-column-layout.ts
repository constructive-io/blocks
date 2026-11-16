/**
 * Column layout bindings over the validated layout: what shows, in what order,
 * the actions the Fields control, the header and the commands use, and the
 * open state of the Fields popover and the header menus.
 */
import { useCallback, useMemo, useState } from 'react';

import type { SheetsColumnLayout, SheetsRowHeight } from '../view-state/view-state.types';
import {
	ROW_HEIGHT_PX,
	effectiveFrozenCount,
	freezeColumnsUpTo,
	hideAllColumns,
	moveColumnBeside,
	moveColumnStep,
	moveColumnTo,
	orderedColumnKeys,
	setColumnHidden,
	setColumnWidth,
	showAllColumns,
	visibleColumnKeys,
} from './column-layout';

export interface ColumnLayoutBindings {
	layout: SheetsColumnLayout;
	/** Every grid column key of the table, in display order (shown and hidden). */
	orderedKeys: readonly string[];
	/** The keys that show, in display order. */
	visibleKeys: readonly string[];
	/** How many leading visible columns stay in place. */
	frozenCount: number;
	/** Row height in pixels. */
	rowHeightPx: number;
	isHidden: (key: string) => boolean;
	/** Why a column cannot be hidden (it is the last one shown), or null. */
	hideReason: (key: string) => string | null;
	setHidden: (key: string, hidden: boolean) => void;
	showAll: () => void;
	hideAll: () => void;
	/** Move to a position of the full display order (Fields list). */
	moveTo: (key: string, index: number) => void;
	/** Move beside another column (drag and drop). */
	moveBeside: (key: string, target: string, side: 'before' | 'after') => void;
	/** Move one place among the visible columns; false when it is already at that end. */
	moveStep: (key: string, step: -1 | 1) => boolean;
	freezeUpTo: (key: string) => void;
	unfreeze: () => void;
	setWidth: (key: string, width: number) => void;
	setRowHeight: (rowHeight: SheetsRowHeight) => void;
	fieldsOpen: boolean;
	setFieldsOpen: (open: boolean) => void;
	/** The column whose header menu is open, or null. */
	menuColumn: string | null;
	setMenuColumn: (key: string | null) => void;
}

export interface UseColumnLayoutOptions {
	/** The validated layout in use. */
	layout: SheetsColumnLayout;
	setLayout: (layout: SheetsColumnLayout) => void;
	/** Every grid column key of the table, in the table's order. */
	available: readonly string[];
}

const LAST_VISIBLE = 'At least one field must stay visible.';

export function useColumnLayout({ layout, setLayout, available }: UseColumnLayoutOptions): ColumnLayoutBindings {
	const [fieldsOpen, setFieldsOpen] = useState(false);
	const [menuColumn, setMenuColumn] = useState<string | null>(null);

	const orderedKeys = useMemo(() => orderedColumnKeys(available, layout), [available, layout]);
	const visibleKeys = useMemo(() => visibleColumnKeys(available, layout), [available, layout]);
	const hidden = useMemo(() => new Set(layout.hidden), [layout.hidden]);

	const isHidden = useCallback((key: string) => hidden.has(key), [hidden]);
	const hideReason = useCallback(
		(key: string) => (!hidden.has(key) && visibleKeys.length <= 1 ? LAST_VISIBLE : null),
		[hidden, visibleKeys],
	);
	const setHidden = useCallback(
		(key: string, next: boolean) => {
			if (next && !hidden.has(key) && visibleKeys.length <= 1) return;
			setLayout(setColumnHidden(layout, key, next));
		},
		[hidden, visibleKeys, layout, setLayout],
	);
	const moveStep = useCallback(
		(key: string, step: -1 | 1) => {
			const next = moveColumnStep(available, layout, key, step);
			if (next === layout) return false;
			setLayout(next);
			return true;
		},
		[available, layout, setLayout],
	);

	return useMemo<ColumnLayoutBindings>(
		() => ({
			layout,
			orderedKeys,
			visibleKeys,
			frozenCount: effectiveFrozenCount(available, layout),
			rowHeightPx: ROW_HEIGHT_PX[layout.rowHeight],
			isHidden,
			hideReason,
			setHidden,
			showAll: () => setLayout(showAllColumns(layout)),
			hideAll: () => setLayout(hideAllColumns(available, layout)),
			moveTo: (key, index) => setLayout(moveColumnTo(available, layout, key, index)),
			moveBeside: (key, target, side) => setLayout(moveColumnBeside(available, layout, key, target, side)),
			moveStep,
			freezeUpTo: (key) => setLayout(freezeColumnsUpTo(available, layout, key)),
			unfreeze: () => setLayout({ ...layout, frozenCount: 0 }),
			setWidth: (key, width) => {
				const next = setColumnWidth(layout, key, width);
				if (next !== layout) setLayout(next);
			},
			setRowHeight: (rowHeight) => setLayout({ ...layout, rowHeight }),
			fieldsOpen,
			setFieldsOpen,
			menuColumn,
			setMenuColumn,
		}),
		[layout, orderedKeys, visibleKeys, available, isHidden, hideReason, setHidden, moveStep, setLayout, fieldsOpen, menuColumn],
	);
}

'use client';

// Native date editor — a thin EditorProps adapter that RE-HOSTS the (now value-
// native) `DateEditor` verbatim. The UI (calendar, time input, footer, OVERLAY.sm
// width, own EditorFocusTrap) is reused as-is; only the contract is mapped:
//   • initial value — the raw EditorProps.value is read directly by the source.
//   • dateType — narrowed from EditorProps.cell.meta?.cellType via DATE_TIME_TYPES,
//     mirroring the original `createDateEditorFactory` precedence.
//   • commit — `onFinishedEditing(next)` -> `onCommit(next)` (the RAW serialized
//     value; the host builds the cell). `onFinishedEditing(undefined)` -> `onCancel()`.
//
// DateEditor stays in its own chunk (it pulls @internationalized/date and
// react-aria-components). The grid preloads it in idle time when its table has a
// date or time column (`useDateEditorPreload`), so it is normally ready before the
// first open. When it is not, the editor waits behind `OverlayPending`: the overlay
// stays hidden until the editor has rendered, then appears once at its final size and
// place. A placeholder cannot reserve that size, because the calendar's height depends
// on how many weeks the month spans.

import { lazy, Suspense, useState } from 'react';

import { DATE_TIME_TYPES } from '../../cell-types/cell-type-groups';
import { fieldLabel } from '../../cell-types/field-label';
import type { DateEditorType } from '../../grid/editors/date-editor';
import { OverlayPending } from '../overlay/overlay-pending';
import type { EditorProps } from './editor-props';

type DateEditorModule = typeof import('../../grid/editors/date-editor');

let loading: Promise<DateEditorModule> | null = null;
let loaded: DateEditorModule | null = null;

/** Load the date editor's chunk once. A failed load is retried on the next call. */
export function loadDateEditor(): Promise<DateEditorModule> {
	loading ??= import('../../grid/editors/date-editor').then(
		(module) => (loaded = module),
		(error: unknown) => {
			loading = null;
			throw error;
		},
	);
	return loading;
}

const LazyDateEditor = lazy(() => loadDateEditor().then((module) => ({ default: module.DateEditor })));

export function DateEditorDom({ value, cell, column, colKey, onCommit, onCancel }: EditorProps) {
	const cellType = cell.meta?.cellType;
	const dateType: DateEditorType | undefined =
		cellType && DATE_TIME_TYPES.has(cellType) ? (cellType as DateEditorType) : undefined;
	// Chosen once per open: an editor that started behind Suspense keeps that path, so a
	// later re-render never remounts it (and never drops what the user typed).
	const [ReadyEditor] = useState(() => loaded?.DateEditor ?? null);
	const editorProps = {
		value,
		dateType,
		canClear: Boolean(column?.nullable),
		title: fieldLabel(column?.name ?? colKey),
		onFinishedEditing: (next?: unknown) => (next === undefined ? onCancel() : onCommit(next)),
	};

	return (
		<div data-slot='date-editor'>
			{ReadyEditor ? (
				<ReadyEditor {...editorProps} />
			) : (
				<Suspense fallback={<OverlayPending />}>
					<LazyDateEditor {...editorProps} />
				</Suspense>
			)}
		</div>
	);
}

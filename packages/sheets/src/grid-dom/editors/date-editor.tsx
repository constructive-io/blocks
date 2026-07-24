'use client';

// Native date editor — a thin EditorProps adapter that RE-HOSTS the (now value-
// native) `DateEditor` verbatim. The UI (calendar, time input, footer, OVERLAY.sm
// width, own EditorFocusTrap) is reused as-is; only the contract is mapped:
//   • initial value — the raw EditorProps.value is read directly by the source.
//   • dateType — narrowed from EditorProps.cell.meta?.cellType via DATE_TIME_TYPES,
//     mirroring the original `createDateEditorFactory` precedence.
//   • commit — `onFinishedEditing(next)` -> `onCommit(next)` (the RAW serialized
//     value; the host builds the cell). `onFinishedEditing(undefined)` -> `onCancel()`.
// DateEditor is lazy (pulls @internationalized/date + react-aria-components); the
// lazy/Suspense boundary is preserved here.

import { lazy, Suspense } from 'react';

import { DATE_TIME_TYPES } from '../../cell-types/cell-type-groups';
import type { DateEditorType } from '../../grid/editors/date-editor';
import type { EditorProps } from './editor-props';

const DateEditor = lazy(() => import('../../grid/editors/date-editor').then((m) => ({ default: m.DateEditor })));

export function DateEditorDom({ value, cell, onCommit, onCancel }: EditorProps) {
	const cellType = cell.meta?.cellType;
	const dateType: DateEditorType | undefined =
		cellType && DATE_TIME_TYPES.has(cellType) ? (cellType as DateEditorType) : undefined;

	return (
		<div data-slot='date-editor'>
			<Suspense fallback={<div className='h-9 w-full min-w-[320px] animate-pulse rounded-sm bg-muted' />}>
				<DateEditor
					value={value}
					dateType={dateType}
					onFinishedEditing={(next) => (next === undefined ? onCancel() : onCommit(next))}
				/>
			</Suspense>
		</div>
	);
}

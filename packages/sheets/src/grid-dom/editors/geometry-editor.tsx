'use client';

// Native geometry editor — a thin EditorProps adapter that RE-HOSTS the (now value-
// native) `GeometryEditor` verbatim. The UI (map/JSON tabs, randomizer, OVERLAY.xl
// width, own EditorFocusTrap, internally-lazy MapPicker) is reused as-is; the contract
// maps directly to value-native EditorProps:
//   • value (raw geojson string or object) -> read directly by the source.
//   • expectedType <- EditorProps.fieldMeta?.type?.subtype (column geometry subtype).
//   • onFinishedEditing(next) -> onCommit(next) (raw geojson string; host builds the
//     cell), onFinishedEditing(undefined) -> onCancel().
// The Suspense wrapper preserves the source's lazy-loaded Leaflet MapPicker. Escape is
// handled by the reused editor's EditorFocusTrap -> handleCancel ->
// onFinishedEditing(undefined).

import { Suspense } from 'react';

import { GeometryEditor } from '../../grid/editors/geometry-editor';
import type { EditorProps } from './editor-props';

export function GeometryEditorDom({ value, fieldMeta, onCommit, onCancel }: EditorProps) {
	const expectedType = fieldMeta?.type?.subtype || undefined;
	return (
		<div data-slot='geometry-editor'>
			<Suspense fallback={<div className='h-80 w-full min-w-[600px] animate-pulse rounded-lg bg-muted' />}>
				<GeometryEditor
					value={value}
					expectedType={expectedType}
					onFinishedEditing={(next) => (next === undefined ? onCancel() : onCommit(next))}
				/>
			</Suspense>
		</div>
	);
}

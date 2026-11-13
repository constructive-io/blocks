'use client';

// Native geometry editor — a thin EditorProps adapter that RE-HOSTS the (now value-
// native) `GeometryEditor` verbatim. The UI (map/JSON tabs, randomizer, OVERLAY.xl
// width, own EditorFocusTrap, internally-lazy MapPicker) is reused as-is; the contract
// maps directly to value-native EditorProps:
//   • value (raw geojson string or object) -> read directly by the source.
//   • expectedType <- EditorProps.column.value.geometrySubtype (the declared shape).
//   • onFinishedEditing(next) -> onCommit(next) (raw geojson string; host builds the
//     cell), onFinishedEditing(undefined) -> onCancel().
// Leaflet loads on first use inside the map picker, behind a placeholder of the map's own
// height, so the editor needs no loading state of its own. Escape is handled by the
// reused editor's EditorFocusTrap -> handleCancel -> onFinishedEditing(undefined).

import { fieldLabel } from '../../cell-types/field-label';
import { GeometryEditor } from '../../grid/editors/geometry-editor';
import type { EditorProps } from './editor-props';

export function GeometryEditorDom({ value, column, colKey, fieldMeta, onCommit, onCancel }: EditorProps) {
	// The declared shape (Point, Polygon, ...) from the table model; raw metadata only without a model.
	const expectedType = column?.value.geometrySubtype || fieldMeta?.type?.subtype || undefined;
	return (
		<div data-slot='geometry-editor'>
			<GeometryEditor
				value={value}
				expectedType={expectedType}
				title={fieldLabel(column?.name ?? colKey)}
				nullable={Boolean(column?.nullable)}
				onFinishedEditing={(next) => (next === undefined ? onCancel() : onCommit(next))}
			/>
		</div>
	);
}

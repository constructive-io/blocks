// The overlay editor element for the active cell, with its placement.
import type { TableModel } from '@constructive-io/data';

import type { CellTypeRegistry } from '../../cell-types/cell-type-registry';
import type { SheetsCellResolution } from '../../grid-dom/use-sheets-content';
import { resolveEditIntent } from '../../grid-dom/editors/edit-intent';
import type { useOverlayController } from '../../grid-dom/overlay/use-overlay-controller';
import { computeOverlayGeometry } from '../editors/overlay-viewport-guard';
import { getDraftMeta, type SheetsRow } from '../row-model';
import type { DraftSubmitResult } from '../draft-types';

// Overlay flip-geometry knobs — MUST match the OverlayManager's private constants so
// the geometry we hand the editor via EditorProps.overlay matches where it's placed.
const OVERLAY_MARGIN_PX = 12;
const OVERLAY_MIN_BELOW_PX = 320;

type OverlayController = ReturnType<typeof useOverlayController>;
type ActiveOverlay = NonNullable<OverlayController['active']>;
type MediaDraft = NonNullable<ActiveOverlay['mediaDraft']>;

export interface ActiveEditorInput {
	active: OverlayController['active'];
	mediaDraft: MediaDraft | undefined;
	activeMediaDraft: MediaDraft | undefined;
	getSheetsCellContent: (rowIndex: number, colKey: string) => SheetsCellResolution;
	getEditorComponent: CellTypeRegistry['getEditorComponent'];
	combinedRows: SheetsRow[];
	getRowId: (row: SheetsRow | null | undefined, index: number) => string;
	tableName: string;
	tableModel: TableModel | null;
	commitBulkOrSingle: (rowIndex: number, colKey: string, value: unknown) => void;
	overlayClose: () => void;
	commitCellPatch: (rowIndex: number, patch: Record<string, unknown>) => void;
	submitDraftRow: (draftRowId: string) => Promise<DraftSubmitResult>;
	invalidateData: () => void;
}

// Resolve the active editor + its EditorProps. Computed in render (cheap, only when
// an overlay is open) — the cell resolution, value, native editor and flip geometry
// all derive from overlay.active, so no effect/state mirror is needed.
export function activeEditorElement({
	active,
	mediaDraft,
	activeMediaDraft,
	getSheetsCellContent,
	getEditorComponent,
	combinedRows,
	getRowId,
	tableName,
	tableModel,
	commitBulkOrSingle,
	overlayClose,
	commitCellPatch,
	submitDraftRow,
	invalidateData,
}: ActiveEditorInput) {
	if (!active || (mediaDraft && !activeMediaDraft)) return null;
	const resolution = activeMediaDraft?.resolution ?? getSheetsCellContent(active.rowIndex, active.colKey);
	// Resolve the editor through the SAME edit-intent resolver the activation branch
	// used (typeKey-driven, consumer-override aware). Only `overlay` intents ever open
	// here (openEditor short-circuits inline-toggle/none), but resolving again keeps a
	// single source of truth — and guards against a non-overlay intent slipping through.
	const intent = resolveEditIntent(resolution.typeKey, { readonly: resolution.cell.readonly }, getEditorComponent);
	if (intent.mode !== 'overlay') return null;
	const Editor = intent.editor;
	const row = combinedRows[active.rowIndex];
	const rowValue = activeMediaDraft ? activeMediaDraft.value : row?.[active.colKey];
	const geom = computeOverlayGeometry(
		typeof window !== 'undefined' ? window.innerHeight : 800,
		active.anchorRect.top,
		active.anchorRect.height,
		OVERLAY_MARGIN_PX,
		OVERLAY_MIN_BELOW_PX,
	);
	return {
		presetClass: Editor.overlayPresetClass,
		// Commit-on-click-away (Stage B): editors that own an onBlur→onCommit advertise it
		// so the OverlayManager dismisses by blurring (commit) instead of cancelling.
		dismissMode: Editor.commitsOnBlur ? ('commit' as const) : ('cancel' as const),
		element: (
			<Editor
				value={rowValue}
				cell={resolution.cell}
				colKey={active.colKey}
				rowId={activeMediaDraft?.rowId ?? getRowId(row, active.rowIndex)}
				rowIdentifier={resolution.rowIdentifier}
				row={row ?? null}
				rowIndex={active.rowIndex}
				tableName={tableName}
				fieldMeta={resolution.fieldMeta}
				relationInfo={resolution.relationInfo}
				column={resolution.column ?? null}
				relation={resolution.relation ?? null}
				table={tableModel}
				readOnlyReason={resolution.readOnlyReason ?? null}
				initialText={active.initialText}
				onCommit={(next) => {
					commitBulkOrSingle(active.rowIndex, active.colKey, next);
					overlayClose();
				}}
				onCommitPatch={(patch) => {
					if (!activeMediaDraft || getDraftMeta(row)?.draftRowId === activeMediaDraft.rowId) {
						commitCellPatch(active.rowIndex, patch);
					}
					overlayClose();
				}}
				onSubmitDraftRow={submitDraftRow}
				onInvalidateData={invalidateData}
				onCancel={overlayClose}
				overlay={{ maxHeight: geom.maxHeight, flipped: geom.shouldFlip }}
			/>
		),
	};
}

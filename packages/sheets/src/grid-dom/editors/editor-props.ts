// Public contract for a NATIVE (DOM React-portal) overlay editor. Pure types.
//
// The Phase-4 analogue of the glide `ProvideEditorComponent` payload, but value-
// native: VALUE editors (text/json/…) call `onCommit(next)` to push a value down
// the glide value-commit path (onCellEdited -> editCell), and `onCancel()` to
// dismiss with no write. SELF-COMMITTING editors (relation/image, Phase 5) use
// the optimistic `onSubmitDraftRow`/`onInvalidateData` callbacks instead.
//
// `overlay` carries the geometry the OverlayManager already computed (via the
// reused `computeOverlayGeometry`) so editors can size/scroll without re-measuring.

import type { FieldMetadata } from '../../cell-types/cell-type-resolver';
import type { SheetsCell } from '../../cell-model/sheets-cell';
import type { RelationInfo } from '../../store/relation-info-slice';

export interface EditorProps {
	value: unknown;
	cell: SheetsCell;
	colKey: string;
	rowId: string;
	rowIndex: number;
	tableName?: string;
	fieldMeta?: FieldMetadata;
	relationInfo?: RelationInfo;
	/**
	 * Type-to-edit seed: when the overlay was opened by typing a printable char on the
	 * active cell, this carries that char. Value editors (text/number) initialize their
	 * input to it in OVERWRITE mode (replacing the cell value); other editors ignore it.
	 */
	initialText?: string;
	/** Commit a value down the glide value-commit path (onCellEdited -> editCell). */
	onCommit: (next: unknown) => void;
	/**
	 * Self-committing editors (relation/image): commit a MULTI-field patch after an
	 * out-of-band server mutation, routed through the existing optimistic-update path
	 * (handleEditorSaveComplete). Value editors use {@link onCommit} instead.
	 */
	onCommitPatch?: (patch: Record<string, unknown>) => void;
	/** Dismiss the overlay with no write. */
	onCancel: () => void;
	/** Self-committing editors: submit a client-side draft row, resolving to the server row. */
	onSubmitDraftRow?: (draftRowId: string) => Promise<unknown>;
	/** Self-committing editors: invalidate cached data after an out-of-band mutation. */
	onInvalidateData?: () => void;
	/** Geometry pre-computed by the OverlayManager (reused `computeOverlayGeometry`). */
	overlay: { maxHeight: number; flipped: boolean };
}

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

import type { ColumnModel, RelationModel, TableModel } from '@constructive-io/data';

import type { FieldMetadata } from '../../cell-types/cell-type-resolver';
import type { SheetsCell } from '../../cell-model/sheets-cell';
import type { DraftSubmitResult } from '../../grid/draft-types';
import type { RelationInfo } from '../../store/relation-info-slice';
import type { SheetsRowIdentifier } from '../../row-identity';

export interface EditorProps {
	value: unknown;
	cell: SheetsCell;
	colKey: string;
	rowId: string;
	rowIdentifier?: SheetsRowIdentifier | null;
	/** The row being edited (server or draft), or null. Relation editors read the row's own key values from it. */
	row?: Readonly<Record<string, unknown>> | null;
	rowIndex: number;
	tableName?: string;
	fieldMeta?: FieldMetadata;
	relationInfo?: RelationInfo;
	/** The table-model column behind this cell, or null when the cell is not a column. */
	column?: ColumnModel | null;
	/** The table-model relation behind this cell, or null when the cell is not a relation. */
	relation?: RelationModel | null;
	/** The table model of the grid, or null while it loads. */
	table?: TableModel | null;
	/** Why the cell cannot be written, from the table model; null when it can. */
	readOnlyReason?: string | null;
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
	/** Self-committing editors: submit a client-side draft row and return its creation result. */
	onSubmitDraftRow?: (draftRowId: string) => Promise<DraftSubmitResult>;
	/** Self-committing editors: invalidate cached data after an out-of-band mutation. */
	onInvalidateData?: () => void;
	/** Geometry pre-computed by the OverlayManager (reused `computeOverlayGeometry`). */
	overlay: { maxHeight: number; flipped: boolean };
}

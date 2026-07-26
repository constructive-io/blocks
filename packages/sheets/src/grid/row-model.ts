// Typed row + draft-metadata model for the sheets grid.
//
// Draft metadata is attached to a row under a non-enumerable Symbol key so it
// never collides with real column data and stays invisible to JSON.stringify
// and key enumeration. NOTE: exactly like the previous non-enumerable string
// markers (`__isDraft` etc.), this metadata does NOT survive an object spread
// (`{ ...row }`) — callers must thread the row reference through rather than a
// shallow copy. Use `copyDraftMeta()` when a copy is unavoidable.
import type { DraftRow } from '../store/draft-rows-slice';

/** A grid row: arbitrary column values keyed by field name, plus an optional id. */
export type SheetsRow = Record<string, unknown> & { id?: string | number };

/** Client-side draft metadata carried by a not-yet-persisted row. */
export interface DraftMeta {
	readonly isDraft: true;
	readonly draftRowId: string;
	readonly status: DraftRow['status'];
	readonly errors: Record<string, string> | null;
}

const DRAFT_META: unique symbol = Symbol('sheets.draftMeta');

/** A row that may carry draft metadata under the (non-enumerable) Symbol key. */
export type RowWithDraft<TRow extends SheetsRow = SheetsRow> = TRow & { readonly [DRAFT_META]?: DraftMeta };

/** Attach draft metadata to a row in place (non-enumerable). Returns the same row, typed. */
export function attachDraftMeta<TRow extends SheetsRow>(row: TRow, meta: DraftMeta): RowWithDraft<TRow> {
	Object.defineProperty(row, DRAFT_META, { value: meta, enumerable: false, configurable: true });
	return row as RowWithDraft<TRow>;
}

/** Read draft metadata, or undefined for a normal (server) row. */
export function getDraftMeta(row: SheetsRow | null | undefined): DraftMeta | undefined {
	return row ? (row as RowWithDraft)[DRAFT_META] : undefined;
}

/** True when the row is a client-side draft. */
export function isDraftRow(row: SheetsRow | null | undefined): boolean {
	return getDraftMeta(row)?.isDraft === true;
}

/** Re-attach draft metadata after an unavoidable shallow copy. */
export function copyDraftMeta<TRow extends SheetsRow>(from: SheetsRow | null | undefined, to: TRow): TRow {
	const meta = getDraftMeta(from);
	return meta ? (attachDraftMeta(to, meta) as TRow) : to;
}

/**
 * useBatchCommit — the batched cell-value commit primitive behind paste / fill /
 * bulk-edit AND (routed through it) the single-cell edit, so EVERY server-row value
 * write is one undoable, coalesced operation.
 *
 * It owns NO coercion/readonly rules of its own: server-row writes go through the
 * shared {@link resolveServerPatch} (the same resolver `useCellEditing` uses), so the
 * UUID-id guard, relation normalization and readonly skips stay in ONE place.
 *
 * Coalescing contract (load-bearing for a 1000-cell paste):
 *   • prior values are captured from `combinedRows` BEFORE any optimistic patch, so
 *     undo restores the EXACT pre-edit value.
 *   • ONE optimistic cache patch is applied per affected ROW (merged col patches),
 *     not per cell — N rows -> N patches, never N×cols.
 *   • ONE server `update(rowId, {merged})` is issued per row, and the commit stops at
 *     the first row the server refuses. Rows saved before it keep their values; the
 *     refused row and the rows not sent yet go back to their prior values.
 *   • when recording, the HistoryEntry's `undo`/`redo` re-enter `commitCells` with
 *     `{ record: false }` so replays never double-record. A commit that stops part
 *     way records the rows it saved.
 *
 * Draft-row writes are NOT batched here — they route to the existing per-cell draft
 * path (`editCell`) and are excluded from history (draft undo is out of P3 scope).
 */
import { useCallback, useMemo, useRef } from 'react';

import type { ColumnModel, TableModel } from '@constructive-io/data';

import { parseColumnInput } from '../../cell-types/column-value';
import { resolveServerPatch } from './use-cell-editing';
import type { CellEditingResult } from './use-cell-editing';
import { getDraftMeta, type SheetsRow } from '../row-model';
import { reportRejectedWrites, type RejectedWrite } from '../write-feedback';
import type { SheetsRowIdentifier } from '../../row-identity';

/** A single cell write request. */
export interface CellWrite {
	rowIndex: number;
	colKey: string;
	value: unknown;
	/**
	 * The value is text the user typed or pasted (JSON and lists are read from it).
	 * Defaults to true for a string value, false otherwise; an editor or a fill that
	 * hands over a stored value sets it to false.
	 */
	fromText?: boolean;
}

export interface CommitCellsOptions {
	/** When false, the commit is NOT pushed to history (used by undo/redo replays). Default true. */
	record?: boolean;
}

export interface CommitCellsResult {
	/** Number of server cells actually written (post readonly/null/no-op filtering). */
	applied: number;
	/** Writes refused before sending (the value did not fit, or the cell is read-only), when there are any. */
	rejected?: readonly RejectedWrite[];
}

interface UseBatchCommitParams {
	combinedRows: SheetsRow[];
	fieldMetaMap: Map<string, any>;
	relationInfoByField: Map<string, any>;
	update: (id: SheetsRowIdentifier, data: Record<string, unknown>) => Promise<{ updatedRow?: Record<string, unknown> | null }>;
	getRowIdentifier?: (row: Readonly<Record<string, unknown>>) => SheetsRowIdentifier | null;
	readOnlyFields?: ReadonlySet<string>;
	isCellReadOnly?: (rowIndex: number, colKey: string) => boolean;
	/** The grid's cell resolver: a write to a cell with a `readOnlyReason` is refused and reported. */
	resolveCell?: (rowIndex: number, colKey: string) => { readOnlyReason?: string | null };
	/** The table model: every write to one of its columns is parsed by the column's rules first. */
	tableModel?: TableModel | null;
	/** Report the writes that were refused. Defaults to a notification. */
	onRejected?: (rejected: readonly RejectedWrite[], total: number) => void;
	/**
	 * Report a save the server refused, with the number of changes not saved (those cells
	 * already show their prior values again). When given, `commitCells` resolves instead of
	 * throwing, so fire-and-forget callers (paste, fill, clear) still surface the failure.
	 */
	onServerError?: (error: unknown, cellCount: number, failed: ServerWriteFailure) => void;
	canUpdate?: boolean;
	/** Single-write optimistic cache patch (infinite mode) — returns a revert thunk. */
	applyOptimisticPatch?: (rowIndex: number, patch: Record<string, unknown>) => (() => void) | void;
	/** Re-sync a server row over the optimistic patch after the mutation resolves (infinite mode). */
	resyncRow?: (rowIndex: number, updatedRow: Record<string, unknown>) => void;
	/** Existing per-cell editor (draft routing + single-cell server coercion). */
	editCell: (rowIndex: number, colKey: string, rawValue: unknown) => Promise<CellEditingResult>;
	/** Observational per-server-write callback (mirrors useCellEditing's onCellEdit). */
	onCellEdit?: (id: SheetsRowIdentifier, field: string, value: unknown) => void;
	/** Push a reversible step to the history. */
	record: (entry: { label: string; undo: () => Promise<void> | void; redo: () => Promise<void> | void }) => void;
	/** The grid's save status: the server writes of one commit report as one save. */
	feedback?: {
		onStart?: (type: 'update', total: number) => string;
		onComplete?: (id: string, status: 'success' | 'partial' | 'error', message: string) => void;
	};
}

function changes(count: number): string {
	return `${count.toLocaleString()} ${count === 1 ? 'change' : 'changes'}`;
}

/** The status of a commit the server stopped: what it saved before, and what it did not. */
function notSavedMessage(saved: number, unsaved: number): string {
	if (saved === 0) return unsaved === 1 ? 'Not saved' : `${changes(unsaved)} not saved`;
	return `${changes(saved)} saved, ${unsaved.toLocaleString()} not saved`;
}

/** The row whose save the server refused, and the fields that save patched. */
export interface ServerWriteFailure {
	rowIndex: number;
	fields: readonly string[];
}

/** Why a paste, fill or clear does not change a linked-records cell. */
export const RELATION_WRITE_REASON = 'Use the link editor to change linked records.';

/** A resolved server write: its row, the patch field, the next + prior values. */
interface ResolvedWrite {
	rowIndex: number;
	rowId: SheetsRowIdentifier;
	field: string;
	value: unknown;
	prior: unknown;
}

const NO_RELATIONS: Map<string, unknown> = new Map();

function legacyRowIdentifier(row: Readonly<Record<string, unknown>>): SheetsRowIdentifier | null {
	return typeof row.id === 'string' || typeof row.id === 'number' ? row.id : null;
}

export function useBatchCommit({
	combinedRows,
	fieldMetaMap,
	relationInfoByField,
	update,
	getRowIdentifier = legacyRowIdentifier,
	readOnlyFields,
	isCellReadOnly,
	resolveCell,
	tableModel,
	onRejected = reportRejectedWrites,
	onServerError,
	canUpdate = true,
	applyOptimisticPatch,
	resyncRow,
	editCell,
	onCellEdit,
	record,
	feedback,
}: UseBatchCommitParams) {
	const columnByName = useMemo(
		() => new Map<string, ColumnModel>((tableModel?.columns ?? []).map((column) => [column.name, column])),
		[tableModel],
	);
	const relationFields = useMemo(
		() => new Set((tableModel?.relations ?? []).map((relation) => relation.fieldName)),
		[tableModel],
	);

	// Holds the latest commitCells so a recorded HistoryEntry (captured at record-time)
	// always re-enters the CURRENT closure — avoids a stale-row snapshot. Per-hook
	// instance, so multiple grids never share a commit fn.
	const commitRef = useRef<((writes: CellWrite[], opts?: CommitCellsOptions) => Promise<CommitCellsResult>) | null>(null);

	const commitCells = useCallback(
		async (writes: CellWrite[], opts?: CommitCellsOptions): Promise<CommitCellsResult> => {
			if (!writes.length) return { applied: 0 };

			const resolved: ResolvedWrite[] = [];
			const draftWrites: CellWrite[] = [];
			const rejected: RejectedWrite[] = [];

			for (const original of writes) {
				const rowData = combinedRows[original.rowIndex] as Record<string, unknown> | null | undefined;
				// Null-guard unfetched proxy rows — skip writes whose row is not loaded.
				if (!rowData) continue;
				if (isCellReadOnly?.(original.rowIndex, original.colKey)) continue;
				const readOnlyReason = resolveCell?.(original.rowIndex, original.colKey).readOnlyReason ?? null;
				if (readOnlyReason) {
					rejected.push({ rowIndex: original.rowIndex, colKey: original.colKey, reason: readOnlyReason });
					continue;
				}

				// A table-model column takes only a value that fits it; anything else is refused, never coerced.
				const column = columnByName.get(original.colKey);
				// Linked records change only through the link editor: a pasted or filled value cannot
				// name a related record safely (its key may be composite or not called id).
				if (!column && (relationFields.has(original.colKey) || relationInfoByField.has(original.colKey))) {
					rejected.push({ rowIndex: original.rowIndex, colKey: original.colKey, reason: RELATION_WRITE_REASON });
					continue;
				}
				let w = original;
				if (column) {
					const parsed = parseColumnInput(column, original.value, {
						fromText: original.fromText ?? typeof original.value === 'string',
					});
					if (parsed.ok === false) {
						rejected.push({ rowIndex: original.rowIndex, colKey: original.colKey, reason: parsed.reason });
						continue;
					}
					w = { ...original, value: parsed.value, fromText: false };
				}

				// Draft rows keep their existing per-cell path; excluded from coalescing + history.
				if (getDraftMeta(rowData)) {
					draftWrites.push(w);
					continue;
				}

				if (!canUpdate) continue;
				// A model column writes its own parsed value; only keys outside the model keep the legacy relation route.
				const resolution = resolveServerPatch(w.colKey, w.value, fieldMetaMap, column ? NO_RELATIONS : relationInfoByField, readOnlyFields);
				if (resolution.kind === 'noop') continue;
				const rowIdentifier = getRowIdentifier(rowData);
				if (rowIdentifier === null) continue;

				resolved.push({
					rowIndex: w.rowIndex,
					rowId: rowIdentifier,
					field: resolution.field,
					value: resolution.value,
					// Capture the PRIOR value of the patched field BEFORE any optimistic patch.
					prior: rowData[resolution.field],
				});
			}

			if (rejected.length) onRejected(rejected, writes.length);
			const withRejected = (applied: number): CommitCellsResult =>
				rejected.length ? { applied, rejected } : { applied };

			// Fire draft writes through the existing path (not batched, not recorded).
			for (const dw of draftWrites) {
				// eslint-disable-next-line no-await-in-loop
				await editCell(dw.rowIndex, dw.colKey, dw.value);
			}

			if (!resolved.length) return withRejected(0);

			// Group by row: one merged optimistic patch + one merged server PATCH per row.
			const byRow = new Map<number, ResolvedWrite[]>();
			for (const r of resolved) {
				const list = byRow.get(r.rowIndex);
				if (list) list.push(r);
				else byRow.set(r.rowIndex, [r]);
			}

			// Apply ONE optimistic patch per row (merged), keeping each row's revert thunk.
			const reverts = new Map<number, () => void>();
			for (const [rowIndex, group] of byRow) {
				const patch: Record<string, unknown> = {};
				for (const r of group) patch[r.field] = r.value;
				const revert = applyOptimisticPatch?.(rowIndex, patch);
				if (revert) reverts.set(rowIndex, revert);
			}

			// Record the inverse (prior values) of the saved writes, so undo restores the exact pre-edit state.
			const recordSaved = (writes: readonly ResolvedWrite[]): void => {
				if (opts?.record === false || writes.length === 0) return;
				const priorWrites: CellWrite[] = writes.map((r) => ({
					rowIndex: r.rowIndex,
					colKey: r.field,
					value: r.prior,
					fromText: false,
				}));
				const redoWrites: CellWrite[] = writes.map((r) => ({
					rowIndex: r.rowIndex,
					colKey: r.field,
					value: r.value,
					fromText: false,
				}));
				// Capture the live commit fn via the closure below (commitRef).
				record({
					label: writes.length > 1 ? `Edit ${writes.length} cells` : 'Edit cell',
					undo: () => void commitRef.current?.(priorWrites, { record: false }),
					redo: () => void commitRef.current?.(redoWrites, { record: false }),
				});
			};

			// Issue ONE server mutation per row, and stop at the first row the server refuses.
			// A saved row keeps its values; the refused row and the rows not sent yet are reverted.
			// The whole commit is one save in the status, whatever the number of rows.
			const statusId = feedback?.onStart?.('update', resolved.length);
			const saved: ResolvedWrite[] = [];
			let failing: ServerWriteFailure | null = null;
			try {
				for (const [rowIndex, group] of byRow) {
					failing = { rowIndex, fields: group.map((r) => r.field) };
					const patch: Record<string, unknown> = {};
					for (const r of group) patch[r.field] = r.value;
					// eslint-disable-next-line no-await-in-loop
					const result = await update(group[0].rowId, patch);
					reverts.delete(rowIndex);
					saved.push(...group);
					if (result?.updatedRow) resyncRow?.(rowIndex, result.updatedRow);
					for (const r of group) onCellEdit?.(r.rowId, r.field, r.value);
				}
			} catch (error) {
				for (const revert of reverts.values()) revert();
				const unsaved = resolved.length - saved.length;
				if (statusId) feedback?.onComplete?.(statusId, saved.length > 0 ? 'partial' : 'error', notSavedMessage(saved.length, unsaved));
				recordSaved(saved);
				if (!onServerError) throw error;
				onServerError(error, unsaved, failing ?? { rowIndex: resolved[0].rowIndex, fields: [resolved[0].field] });
				return withRejected(saved.length);
			}

			if (statusId) feedback?.onComplete?.(statusId, 'success', resolved.length === 1 ? 'Saved' : `${changes(resolved.length)} saved`);
			recordSaved(resolved);
			return withRejected(resolved.length);
		},
		[combinedRows, fieldMetaMap, relationInfoByField, update, getRowIdentifier, readOnlyFields, isCellReadOnly, resolveCell, columnByName, relationFields, onRejected, onServerError, canUpdate, applyOptimisticPatch, resyncRow, editCell, onCellEdit, record, feedback],
	);

	commitRef.current = commitCells;
	return commitCells;
}

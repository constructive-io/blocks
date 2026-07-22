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
 *   • ONE server `update(rowId, {merged})` is issued per row.
 *   • when recording, the HistoryEntry's `undo`/`redo` re-enter `commitCells` with
 *     `{ record: false }` so replays never double-record.
 *
 * Draft-row writes are NOT batched here — they route to the existing per-cell draft
 * path (`editCell`) and are excluded from history (draft undo is out of P3 scope).
 */
import { useCallback, useRef } from 'react';

import { resolveServerPatch } from './use-cell-editing';
import type { CellEditingResult } from './use-cell-editing';
import { getDraftMeta, type SheetsRow } from '../row-model';
import type { SheetsRowIdentifier } from '../../row-identity';

/** A single cell write request. */
export interface CellWrite {
	rowIndex: number;
	colKey: string;
	value: unknown;
}

export interface CommitCellsOptions {
	/** When false, the commit is NOT pushed to history (used by undo/redo replays). Default true. */
	record?: boolean;
}

export interface CommitCellsResult {
	/** Number of server cells actually written (post readonly/null/no-op filtering). */
	applied: number;
}

interface UseBatchCommitParams {
	combinedRows: SheetsRow[];
	fieldMetaMap: Map<string, any>;
	relationInfoByField: Map<string, any>;
	update: (id: SheetsRowIdentifier, data: Record<string, unknown>) => Promise<{ updatedRow?: Record<string, unknown> | null }>;
	getRowIdentifier?: (row: Readonly<Record<string, unknown>>) => SheetsRowIdentifier | null;
	readOnlyFields?: ReadonlySet<string>;
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
}

/** A resolved server write: its row, the patch field, the next + prior values. */
interface ResolvedWrite {
	rowIndex: number;
	rowId: SheetsRowIdentifier;
	field: string;
	value: unknown;
	prior: unknown;
}

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
	canUpdate = true,
	applyOptimisticPatch,
	resyncRow,
	editCell,
	onCellEdit,
	record,
}: UseBatchCommitParams) {
	// Holds the latest commitCells so a recorded HistoryEntry (captured at record-time)
	// always re-enters the CURRENT closure — avoids a stale-row snapshot. Per-hook
	// instance, so multiple grids never share a commit fn.
	const commitRef = useRef<((writes: CellWrite[], opts?: CommitCellsOptions) => Promise<CommitCellsResult>) | null>(null);

	const commitCells = useCallback(
		async (writes: CellWrite[], opts?: CommitCellsOptions): Promise<CommitCellsResult> => {
			if (!writes.length) return { applied: 0 };

			const resolved: ResolvedWrite[] = [];
			const draftWrites: CellWrite[] = [];

			for (const w of writes) {
				const rowData = combinedRows[w.rowIndex] as Record<string, unknown> | null | undefined;
				// Null-guard unfetched proxy rows — skip writes whose row is not loaded.
				if (!rowData) continue;

				// Draft rows keep their existing per-cell path; excluded from coalescing + history.
				if (getDraftMeta(rowData)) {
					draftWrites.push(w);
					continue;
				}

				if (!canUpdate) continue;
				const resolution = resolveServerPatch(w.colKey, w.value, fieldMetaMap, relationInfoByField, readOnlyFields);
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

			// Fire draft writes through the existing path (not batched, not recorded).
			for (const dw of draftWrites) {
				// eslint-disable-next-line no-await-in-loop
				await editCell(dw.rowIndex, dw.colKey, dw.value);
			}

			if (!resolved.length) return { applied: 0 };

			// Group by row: one merged optimistic patch + one merged server PATCH per row.
			const byRow = new Map<number, ResolvedWrite[]>();
			for (const r of resolved) {
				const list = byRow.get(r.rowIndex);
				if (list) list.push(r);
				else byRow.set(r.rowIndex, [r]);
			}

			// Apply ONE optimistic patch per row (merged) and collect revert thunks.
			const reverts: Array<() => void> = [];
			for (const [rowIndex, group] of byRow) {
				const patch: Record<string, unknown> = {};
				for (const r of group) patch[r.field] = r.value;
				const revert = applyOptimisticPatch?.(rowIndex, patch);
				if (revert) reverts.push(revert);
			}

			// Issue ONE server mutation per row; revert ALL optimistic patches on first failure.
			try {
				for (const [rowIndex, group] of byRow) {
					const patch: Record<string, unknown> = {};
					for (const r of group) patch[r.field] = r.value;
					// eslint-disable-next-line no-await-in-loop
					const result = await update(group[0].rowId, patch);
					if (result?.updatedRow) resyncRow?.(rowIndex, result.updatedRow);
					for (const r of group) onCellEdit?.(r.rowId, r.field, r.value);
				}
			} catch (error) {
				for (const revert of reverts) revert();
				throw error;
			}

			// Record the inverse (prior values) so undo restores the exact pre-edit state.
			if (opts?.record !== false) {
				const priorWrites: CellWrite[] = resolved.map((r) => ({
					rowIndex: r.rowIndex,
					colKey: r.field,
					value: r.prior,
				}));
				const redoWrites: CellWrite[] = resolved.map((r) => ({
					rowIndex: r.rowIndex,
					colKey: r.field,
					value: r.value,
				}));
				// Capture the live commit fn via the closure below (commitRef).
				record({
					label: resolved.length > 1 ? `Edit ${resolved.length} cells` : 'Edit cell',
					undo: () => void commitRef.current?.(priorWrites, { record: false }),
					redo: () => void commitRef.current?.(redoWrites, { record: false }),
				});
			}

			return { applied: resolved.length };
		},
		[combinedRows, fieldMetaMap, relationInfoByField, update, getRowIdentifier, readOnlyFields, canUpdate, applyOptimisticPatch, resyncRow, editCell, onCellEdit, record],
	);

	commitRef.current = commitCells;
	return commitCells;
}

import { useCallback } from 'react';

import { DRAFT_ACTION_COLUMN_KEY } from '../sheets.constants';
import { prepareDraftRelationValue } from '../sheets.utils';
import type { DraftRowsState } from './use-draft-rows';
import { getDraftMeta } from '../row-model';
import type { SheetsRowIdentifier } from '../../row-identity';

/** Result from the useCellEditing hook */
export interface CellEditingResult {
	/** Type of edit: 'draft' for local draft row, 'server' for server mutation, 'noop' for no action */
	type: 'draft' | 'server' | 'noop';
	/** The updated row data from the server (only for 'server' type) */
	updatedRow?: Record<string, unknown> | null;
	/** The field that was patched (only for 'server' type) */
	patchField?: string;
	/** The value that was sent (only for 'server' type) */
	patchValue?: unknown;
}

interface UseCellEditingParams {
	combinedRows: any[];
	fieldMetaMap: Map<string, any>;
	relationInfoByField: Map<string, any>;
	updateDraftCell: DraftRowsState['updateDraftCell'];
	tableKey: string;
	update: (id: SheetsRowIdentifier, data: Record<string, unknown>) => Promise<{ updatedRow?: Record<string, unknown> | null }>;
	getRowIdentifier?: (row: Readonly<Record<string, unknown>>) => SheetsRowIdentifier | null;
	readOnlyFields?: ReadonlySet<string>;
	canUpdate?: boolean;
	onCellEdit?: (id: SheetsRowIdentifier, field: string, value: unknown) => void;
	/**
	 * Optimistic server-row cache patch. Applied to the local (infinite) cache BEFORE
	 * the `update` round-trip so the cell flips instantly; returns a revert thunk that
	 * the hook calls if `update` rejects. Omitted (e.g. paginated mode / unit tests) =>
	 * no pre-await patch and the consumer reconciles after the await as before.
	 */
	applyOptimisticPatch?: (rowIndex: number, patch: Record<string, unknown>) => (() => void) | void;
}

function legacyRowIdentifier(row: Readonly<Record<string, unknown>>): SheetsRowIdentifier | null {
	return typeof row.id === 'string' || typeof row.id === 'number' ? row.id : null;
}

/**
 * Normalize a relation value for a server PATCH: a JSON string is parsed, an array
 * is mapped to its ids (single id for belongsTo/hasOne, list otherwise), a single
 * object to its id. Mirrors the relation branch the canvas `handleCellEdit` ran,
 * but on the RAW native value instead of an extracted glide cell.
 */
export function normalizeRelationPatchValue(rawValue: unknown, relationKind: string | undefined): unknown {
	let value = rawValue;

	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (trimmed === '') {
			value = null;
		} else {
			try {
				value = JSON.parse(trimmed);
			} catch {
				value = trimmed;
			}
		}
	}

	if (Array.isArray(value)) {
		const mapped = value
			.map((entry) => (entry && typeof entry === 'object' ? ((entry as any).id ?? entry) : entry))
			.filter((entry) => entry !== undefined && entry !== null);
		value = relationKind === 'belongsTo' || relationKind === 'hasOne' ? (mapped[0] ?? null) : mapped;
	} else if (value && typeof value === 'object') {
		value = (value as any).id ?? null;
	}

	if (value === '') value = null;
	return value;
}

/** The resolved server PATCH for one cell write, or a reason it is a no-op. */
export type ServerPatchResolution =
	| { kind: 'patch'; field: string; value: unknown }
	| { kind: 'noop' };

/**
 * Derive the single-field server PATCH for a server-row cell write — the ONE place
 * that owns server-row coercion + readonly guards (UUID id / relation-not-inline /
 * undefined). Shared by `useCellEditing` (single cell) and the batched `commitCells`
 * (paste/fill/bulk) so neither forks the rules. PURE; never touches the cache or
 * network. `rowData` is the target row (skip callers must null-guard before calling).
 */
export function resolveServerPatch(
	colKey: string,
	rawValue: unknown,
	fieldMetaMap: Map<string, any>,
	relationInfoByField: Map<string, any>,
	readOnlyFields?: ReadonlySet<string>,
): ServerPatchResolution {
	if (!colKey || colKey === DRAFT_ACTION_COLUMN_KEY) return { kind: 'noop' };
	if (readOnlyFields?.has(colKey)) return { kind: 'noop' };

	// Block edits to the UUID primary key id.
	const metaField = fieldMetaMap.get(colKey);
	if (colKey === 'id' && metaField?.type?.gqlType === 'UUID') return { kind: 'noop' };

	const relationInfo = relationInfoByField.get(colKey);
	let value: unknown = rawValue;

	if (relationInfo) {
		const patchFieldCandidate = relationInfo.foreignKeyField || colKey;
		const canEditRelationInline = relationInfo.kind === 'belongsTo' && fieldMetaMap.has(patchFieldCandidate);
		if (!canEditRelationInline) return { kind: 'noop' };
		value = normalizeRelationPatchValue(rawValue, relationInfo.kind);
	}

	if (value === undefined) return { kind: 'noop' };

	const field = relationInfo?.foreignKeyField || colKey;
	return { kind: 'patch', field, value };
}

export function useCellEditing({
	combinedRows,
	fieldMetaMap,
	relationInfoByField,
	updateDraftCell,
	tableKey,
	update,
	getRowIdentifier = legacyRowIdentifier,
	readOnlyFields,
	canUpdate = true,
	onCellEdit,
	applyOptimisticPatch,
}: UseCellEditingParams) {
	return useCallback(
		// NATIVE signature: the DOM editors / inline-toggle pass a raw value that flows
		// straight through — no glide cell round-trip. This is what fixes the boolean
		// toggle: a raw `false` persists as `false`, never stringified to "false".
		async (rowIndex: number, colKey: string, rawValue: unknown): Promise<CellEditingResult> => {
			const rowData = combinedRows[rowIndex];
			if (!colKey || !rowData) return { type: 'noop' };

			if (colKey === DRAFT_ACTION_COLUMN_KEY) {
				return { type: 'noop' };
			}

			const draftMeta = getDraftMeta(rowData);
			if (draftMeta?.isDraft && colKey === 'id') {
				return { type: 'noop' };
			}

			if (draftMeta?.isDraft) {
				const draftRowId: string | undefined = draftMeta.draftRowId;
				if (!draftRowId) return { type: 'noop' };

				const baseValue = rawValue;
				const relationInfo = relationInfoByField.get(colKey);

				let storedValue: unknown = baseValue;
				let extraValues: Record<string, unknown> | undefined;

				if (relationInfo) {
					const { relationData, foreignKeyUpdates, relationReferences } = prepareDraftRelationValue(
						baseValue,
						relationInfo,
					);
					const relationFieldKey = relationInfo.relationField;
					const foreignKeyFieldKey = relationInfo.foreignKeyField;
					const editingRelationField = relationFieldKey ? relationFieldKey === colKey : false;
					const editingForeignKeyField = foreignKeyFieldKey ? foreignKeyFieldKey === colKey : false;

					const processedRelationData = Array.isArray(relationData)
						? relationData.filter((entry) => entry !== undefined)
						: relationData;

					const relationExtra = relationFieldKey
						? processedRelationData === undefined
							? undefined
							: processedRelationData === null
								? { [relationFieldKey]: null }
								: typeof processedRelationData === 'object'
									? { [relationFieldKey]: processedRelationData }
									: undefined
						: undefined;

					const processedReferenceValue = Array.isArray(relationReferences)
						? relationReferences.filter((entry) => entry !== undefined)
						: relationReferences;

					const foreignKeyExtra = foreignKeyFieldKey
						? processedReferenceValue !== undefined
							? { [foreignKeyFieldKey]: processedReferenceValue }
							: undefined
						: undefined;

					if (editingRelationField) {
						storedValue = processedRelationData;
						extraValues = {
							...(foreignKeyUpdates ?? {}),
						};
					} else if (editingForeignKeyField) {
						storedValue = processedReferenceValue ?? processedRelationData;
						extraValues = {
							...(foreignKeyUpdates ?? {}),
							...(relationExtra ?? {}),
						};
					} else {
						storedValue = processedRelationData;
						extraValues = {
							...(foreignKeyUpdates ?? {}),
							...(relationExtra ?? {}),
							...(foreignKeyExtra ?? {}),
						};
					}
				}

				updateDraftCell({
					tableKey,
					draftRowId,
					columnKey: colKey,
					value: storedValue,
					extraValues: extraValues && Object.keys(extraValues).length > 0 ? extraValues : undefined,
				});
				return { type: 'draft' };
			}

			// Server row edit — derive the PATCH via the shared resolver (the single owner
			// of server-row coercion + readonly guards, also used by batched `commitCells`).
			if (!canUpdate) return { type: 'noop' };
			const resolution = resolveServerPatch(colKey, rawValue, fieldMetaMap, relationInfoByField, readOnlyFields);
			if (resolution.kind === 'noop') return { type: 'noop' };
			const { field: patchField, value } = resolution;
			const rowIdentifier = getRowIdentifier(rowData);
			if (rowIdentifier === null) return { type: 'noop' };

			// Optimistic: patch the local cache with the new value BEFORE awaiting the
			// server so the cell updates instantly. `applyOptimisticPatch` returns a revert
			// thunk (snapshot of the prior value) which we replay only if `update` rejects.
			const revertOptimisticPatch = applyOptimisticPatch?.(rowIndex, { [patchField]: value });

			let result: { updatedRow?: Record<string, unknown> | null };
			try {
				result = await update(rowIdentifier, { [patchField]: value });
			} catch (error) {
				revertOptimisticPatch?.();
				throw error;
			}
			onCellEdit?.(rowIdentifier, patchField, value);

			return {
				type: 'server',
				updatedRow: result?.updatedRow ?? null,
				patchField,
				patchValue: value,
			};
		},
		[combinedRows, fieldMetaMap, relationInfoByField, tableKey, update, getRowIdentifier, readOnlyFields, canUpdate, onCellEdit, updateDraftCell, applyOptimisticPatch],
	);
}

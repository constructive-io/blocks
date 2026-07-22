// The DOM content resolver — the native analogue of the canvas `useGridContent`
// (grid/hooks/use-grid-content.ts). It MIRRORS that hook's routing steps 1:1 but
// produces a neutral {@link SheetsCell} (+ the resolved view component) instead of
// a glide `GridCell`, so the DOM grid never touches the canvas render path.
//
// It deliberately does NOT own the `ensureRelationInfo` effect: the canvas
// `useGridContent` already runs that effect for the same table, so this hook takes
// `relationInfoByField` + `meta` as INPUTS to avoid a duplicate store write/effect.
// Draft VISUAL styling (faded/error theme overrides) is intentionally deferred to
// Phase 7 — here we only blank the leaked draft-id text and tag `styleHint.draft`
// so Phase 7 can style from a neutral flag (no glide theme imports).

import { useCallback, useMemo } from 'react';

import type { CellTypeRegistry } from '../cell-types/cell-type-registry';
import type { FieldMetadata } from '../cell-types/cell-type-resolver';
import type { CellCreationMetadata } from '../grid/grid-cell-types';
import type { CellProps } from '../cell-model/cell-props';
import type { SheetsCell } from '../cell-model/sheets-cell';
import type { SheetsRow } from '../grid/row-model';
import type { RelationInfo } from '../store/relation-info-slice';
import type { MetaQuery } from '@constructive-io/data';
import { buildRelationFieldNameSet, resolveGridCellRoute } from '../grid/cell-routing';
import { getDraftMeta } from '../grid/row-model';
import { unwrapRelationValue } from '../grid/sheets.utils';

interface RelationOptions {
	relationChipLimit?: number;
	relationLabelMaxLength?: number;
}

/** Resolved DOM cell payload: the neutral cell plus its (optional) view component. */
export interface SheetsCellResolution {
	cell: SheetsCell;
	component?: React.ComponentType<CellProps>;
	colKey: string;
	/**
	 * The resolved cell-type key (post detection-override) — the SINGLE source of
	 * truth the host feeds to `resolveEditIntent` to route activation. Always set;
	 * `'text'` for the loading/empty fallthrough cells that carry no type. (Mirror
	 * of the `meta.cellType` the cell itself now self-describes.)
	 */
	typeKey: string;
	/** Field metadata for the column — fed to a native overlay editor's EditorProps.fieldMeta. */
	fieldMeta?: FieldMetadata;
	/** Relation info for the column (when relational) — fed to a native overlay editor's EditorProps.relationInfo. */
	relationInfo?: RelationInfo;
}

export interface UseSheetsContentArgs {
	data: SheetsRow[];
	columnKeys: string[];
	fieldMetaMap: ReadonlyMap<string, FieldMetadata>;
	registry: CellTypeRegistry;
	tableName?: string;
	options?: RelationOptions;
	/** Relation info per field — owned by the canvas `useGridContent` ensureRelationInfo effect. */
	relationInfoByField: ReadonlyMap<string, RelationInfo>;
	/** Schema meta (same value the canvas path reads via useSheetsMeta). */
	meta: MetaQuery | undefined;
}

function isDraftId(value: unknown): boolean {
	return typeof value === 'string' && value.startsWith('draft:');
}

/**
 * DISPLAY-LEVEL suppression of an internal draft key leaking as visible cell text —
 * the {@link SheetsCell} mirror of the canvas `suppressDraftIdText`. When the row is
 * a draft AND the value being rendered is the draft key (the `id` column starting
 * with `draft:`, or any value equal to the draft id), blank the cell's display/data
 * text while preserving kind and structural flags. Narrow by design: nothing else.
 */
export function suppressDraftIdText(
	cell: SheetsCell,
	args: { isDraftRow: boolean; colKey: string; rawValue: unknown; draftId: string | undefined },
): SheetsCell {
	const { isDraftRow, colKey, rawValue, draftId } = args;
	if (!isDraftRow) return cell;

	const isIdColumnDraftKey = colKey === 'id' && isDraftId(rawValue);
	const valueIsDraftId = typeof draftId === 'string' && rawValue === draftId;
	if (!isIdColumnDraftKey && !valueIsDraftId) return cell;

	return { ...cell, data: typeof cell.data === 'string' ? '' : cell.data, displayData: '' };
}

/**
 * Tag the cell as a draft row so the host can apply faded/error styling from a flag —
 * the DOM mirror of the canvas applyDraftDisabledStyle/applyDraftErrorStyle split.
 * `error` is set when draftMeta.errors carries a field-level error for THIS colKey
 * (canvas: applyDraftErrorStyle); `draft` always (canvas: faded/disabled visuals).
 */
function tagDraftStyle(cell: SheetsCell, hasError: boolean): SheetsCell {
	return { ...cell, styleHint: { ...cell.styleHint, draft: true, error: hasError } };
}

/**
 * Build the DOM content resolver. Returns `getSheetsCell(rowIndex, colKey)` which
 * mirrors the canvas `getCellContent` routing exactly (draftMeta → fieldMeta →
 * relationInfo → route → relation value unwrap → matchInput → resolveTypeKey →
 * metadata → registry.toSheetsCell), then suppresses any leaked draft-id text and
 * tags draft rows. The view component is resolved alongside via `getCellComponent`.
 */
export function useSheetsContent(args: UseSheetsContentArgs) {
	const { data, columnKeys, fieldMetaMap, registry, tableName, options, relationInfoByField, meta } = args;

	const relationFieldNamesFromMeta = useMemo(() => buildRelationFieldNameSet(meta, tableName), [meta, tableName]);

	// PER-RESOLVER RESULT CACHE. The cell host calls `getSheetsCell` for every visible
	// cell on every re-render, almost always re-deriving an identical resolution. This
	// Map memoizes the last resolution per `rowIndex|colKey`, keyed on the cell's raw
	// VALUE: a repeat call whose value is reference-equal to the cached one returns the
	// cached resolution and skips the full pipeline (route → relation unwrap →
	// resolveTypeKey → toSheetsCell, which allocates ≥3 objects).
	//
	// SAFETY: the deps below are IDENTICAL to the `getSheetsCell` useCallback's deps, so
	// the cache is thrown away exactly when the resolver would change identity. Every
	// input that can change a cell's resolution flows through one of these deps — most
	// notably `data`: draft status/errors rebuild `combinedRows` (new array + new row
	// objects, see useDraftRows), and any server-data / optimistic change recreates the
	// rows array too. So `styleHint.draft/error` (derived from the row's DraftMeta) and
	// the relation-unwrap fields (read off the same row object) cannot change without a
	// new `data` reference resetting this cache — making the per-value compare sound:
	// within one resolver identity the row objects are immutable, so a value that is
	// reference-equal guarantees an identical resolution.
	const cache = useMemo(
		() => new Map<string, { value: unknown; resolution: SheetsCellResolution }>(),
		[data, columnKeys, fieldMetaMap, registry, relationFieldNamesFromMeta, relationInfoByField, options],
	);

	const getSheetsCell = useCallback(
		(rowIndex: number, colKey: string): SheetsCellResolution => {
			// UNLOADED INFINITE ROW → loading skeleton. In infinite-scroll mode `data` is the
			// null-backed proxy from useSheets: a server index whose page is still in flight reads
			// back as `null` (drafts are real objects, never null). Resolve those slots to a neutral
			// `kind: 'loading'` cell with NO component, so the host's kind→view map paints
			// LoadingCellView (the canvas analogue is glide's loadingCell). Without this the row
			// coerces to `{}` below and every cell renders as blank text instead of a skeleton.
			const rawRow = (data as any[])[rowIndex];
			const cacheKey = rowIndex + '|' + colKey;
			if (colKey && rawRow == null) {
				// Cache the loading slot keyed on its (null) value: when the page loads, the row
				// flips null → object, the value identity changes, and this naturally MISSES and
				// recomputes (a new `data` proxy also resets the whole cache, so this is belt-and-braces).
				const hit = cache.get(cacheKey);
				if (hit && hit.value === rawRow) return hit.resolution;
				const resolution: SheetsCellResolution = {
					cell: { kind: 'loading', data: null, displayData: '', readonly: true },
					colKey,
					typeKey: 'text',
				};
				cache.set(cacheKey, { value: rawRow, resolution });
				return resolution;
			}
			const rowData = rawRow ?? {};
			if (!colKey) {
				return { cell: { kind: 'text', data: '', displayData: '', readonly: false }, colKey, typeKey: 'text' };
			}

			const rawValue = rowData?.[colKey];

			// RESULT-CACHE FAST PATH: the resolution is fully determined by the row object's
			// fields (see the cache declaration), and the row object is immutable within this
			// resolver identity, so a reference-equal `rawValue` means an identical resolution.
			const hit = cache.get(cacheKey);
			if (hit && hit.value === rawValue) return hit.resolution;
			const draftMeta = getDraftMeta(rowData);
			const isDraftRow = Boolean(draftMeta?.isDraft);
			const isDraftIdCell = isDraftRow && colKey === 'id';

			const baseFieldMeta = fieldMetaMap.get(colKey);
			const relationInfo = relationInfoByField.get(colKey);
			const isRelationFallback = relationFieldNamesFromMeta.has(colKey);
			const isRelation = Boolean(relationInfo) || isRelationFallback;
			const foreignKeyField = relationInfo?.foreignKeyField;
			const canEditRelationInline =
				relationInfo?.kind === 'belongsTo' &&
				typeof foreignKeyField === 'string' &&
				fieldMetaMap.has(foreignKeyField);

			const fieldMeta: FieldMetadata | undefined = baseFieldMeta;
			const route = resolveGridCellRoute({
				colKey,
				fieldMeta,
				relationInfo,
				isRelationFallback,
				isDraftIdCell,
				hasForeignKeyField: canEditRelationInline,
			});

			let valueForCell = rawValue;

			if (relationInfo && relationInfo.relationField && relationInfo.relationField !== colKey) {
				const relatedValue = (rowData as any)?.[relationInfo.relationField];
				if (relatedValue !== undefined && relatedValue !== null) {
					valueForCell = relatedValue;
				} else if (typeof rawValue === 'string' && rawValue && !isDraftId(rawValue)) {
					valueForCell = { id: rawValue };
				}
			} else if (relationInfo && valueForCell == null) {
				const fkField = relationInfo.foreignKeyField;
				const fkValue = fkField ? (rowData as any)?.[fkField] : undefined;
				if (fkValue && !isDraftId(fkValue)) {
					valueForCell = { id: fkValue };
				}
			}

			if (isRelation) {
				valueForCell = unwrapRelationValue(valueForCell);
			}

			// Consumer detection override: a registered def's match() may override the
			// resolved typeKey. With no consumer cell types this returns route.cellType.
			const matchInput = {
				gqlType: fieldMeta?.type?.gqlType ?? '',
				isArray: Boolean(fieldMeta?.type?.isArray),
				pgAlias: fieldMeta?.type?.pgAlias ?? null,
				pgType: fieldMeta?.type?.pgType ?? null,
				subtype: fieldMeta?.type?.subtype ?? null,
				fieldName: colKey,
			};
			const cellType = registry.resolveTypeKey(matchInput, () => route.cellType);

			const metadata: CellCreationMetadata = {
				cellType,
				fieldName: colKey,
				fieldMeta,
				relationInfo,
				relationOptions: relationInfo ? options || {} : undefined,
				canEdit: route.canEdit,
				isReadonly: route.isReadonly,
				activationBehavior: route.activationBehavior,
			};

			const cell = registry.toSheetsCell(cellType, valueForCell, { metadata });

			// Blank any internal draft key that would otherwise render as visible text
			// (kind unchanged); narrow to the draft id, nothing else.
			const displaySafe = suppressDraftIdText(cell, {
				isDraftRow,
				colKey,
				rawValue,
				draftId: draftMeta?.draftRowId,
			});

			// Flag draft rows (faded) and per-cell errors (error) so the host can paint
			// the DOM equivalent of applyDraftDisabledStyle / applyDraftErrorStyle.
			const draftErrors = draftMeta?.errors ?? null;
			const hasCellError = Boolean(draftErrors && colKey in draftErrors);
			const styled = isDraftRow ? tagDraftStyle(displaySafe, hasCellError) : displaySafe;

			const component = registry.getCellComponent(cellType);
			// Surface the already-computed field/relation meta so a native overlay editor
			// (relation/image, Phase 5) can read EditorProps.fieldMeta / relationInfo without
			// re-resolving — no extra work, just exposing what this routing already derived.
			// `typeKey` is the resolved cellType — the single source of truth for edit-intent.
			const resolution: SheetsCellResolution = { cell: styled, component, colKey, typeKey: cellType, fieldMeta, relationInfo };
			cache.set(cacheKey, { value: rawValue, resolution });
			return resolution;
		},
		[data, columnKeys, fieldMetaMap, registry, relationFieldNamesFromMeta, relationInfoByField, options],
	);

	return { getSheetsCell };
}

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

import { useCallback, useMemo, useRef } from 'react';

import type { CellTypeRegistry } from '../cell-types/cell-type-registry';
import type { CellType } from '../cell-types/types';
import type { FieldMetadata } from '../cell-types/cell-type-resolver';
import type { CellCreationMetadata } from '../grid/grid-cell-types';
import type { CellProps } from '../cell-model/cell-props';
import type { SheetsCell } from '../cell-model/sheets-cell';
import type { SheetsRow } from '../grid/row-model';
import type { RelationInfo } from '../store/relation-info-slice';
import type { ColumnModel, MetaQuery, RelationModel, TableModel } from '@constructive-io/data';
import { readCellError, readRelationTotalCount } from '@constructive-io/data';
import type { CellTypeMatchInput } from '../cell-types/define-cell-type';
import {
	CELL_READ_ERROR_TEXT,
	buildRelationFieldNameSet,
	relationCellReadOnlyReason,
	resolveGridCellRoute,
	resolveModelCellRoute,
} from '../grid/cell-routing';
import { getDraftMeta } from '../grid/row-model';
import { unwrapRelationValue } from '../grid/sheets.utils';
import { MEDIA_TYPES } from '../cell-types/cell-type-groups';
import type { SheetsRowIdentifier } from '../row-identity';

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
	/** Typed server row locator, separate from the grid's string key. */
	rowIdentifier?: SheetsRowIdentifier | null;
	readOnlyReason?: string;
	/** Field metadata for the column — fed to a native overlay editor's EditorProps.fieldMeta. */
	fieldMeta?: FieldMetadata;
	/** Relation info for the column (when relational) — fed to a native overlay editor's EditorProps.relationInfo. */
	relationInfo?: RelationInfo;
	/** The table-model column behind this cell, or null when the cell is not a column. */
	column?: ColumnModel | null;
	/** The table-model relation behind this cell, or null when the cell is not a relation. */
	relation?: RelationModel | null;
	/** A problem with this draft cell's value (for example a missing required value), shown on the cell. */
	errorMessage?: string;
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
	/** The table model of the grid, or null while it loads. */
	tableModel?: TableModel | null;
	/** Disable every persisted-row editor when the table cannot expose update mutations. */
	serverRowsReadOnly?: boolean;
	/** Primary-key fields are immutable after insertion because they define row identity. */
	serverReadOnlyFields?: ReadonlySet<string>;
	/** Resolve the GraphQL mutation identity. */
	getRowIdentifier?: (row: Readonly<Record<string, unknown>>) => SheetsRowIdentifier | null;
	canUpload?: boolean;
	canCreate?: boolean;
	/** Host cell-type overrides by `Table.field` (`SheetsConfig.fieldTypeOverrides`). */
	fieldTypeOverrides?: Readonly<Record<string, string>>;
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

/** The cell for a value the list read could not serve: a notice, read-only. */
function unreadableCell(cellType: string): SheetsCell {
	return {
		kind: 'text',
		data: '',
		displayData: CELL_READ_ERROR_TEXT,
		readonly: true,
		styleHint: { unreadable: true },
		meta: { cellType: cellType as CellType },
	};
}

/**
 * Build the DOM content resolver. Returns `getSheetsCell(rowIndex, colKey)` which
 * mirrors the canvas `getCellContent` routing exactly (draftMeta → fieldMeta →
 * relationInfo → route → relation value unwrap → matchInput → resolveTypeKey →
 * metadata → registry.toSheetsCell), then suppresses any leaked draft-id text and
 * tags draft rows. The view component is resolved alongside via `getCellComponent`.
 */
export function useSheetsContent(args: UseSheetsContentArgs) {
	const {
		data,
		columnKeys,
		fieldMetaMap,
		registry,
		tableName,
		options,
		relationInfoByField,
		meta,
		serverRowsReadOnly = false,
		serverReadOnlyFields,
		getRowIdentifier,
		canUpload = true,
		canCreate = true,
		tableModel = null,
		fieldTypeOverrides,
	} = args;

	const columnByName = useMemo(
		() => new Map((tableModel?.columns ?? []).map((column) => [column.name, column] as const)),
		[tableModel],
	);
	const relationByField = useMemo(
		() => new Map((tableModel?.relations ?? []).map((relation) => [relation.fieldName, relation] as const)),
		[tableModel],
	);

	const relationFieldNamesFromMeta = useMemo(() => buildRelationFieldNameSet(meta, tableName), [meta, tableName]);

	// The rows are read at call time, so the resolver keeps its identity when the row array
	// changes (a page loads, a cell saves). The grid rows memoized on it then render again only
	// when their own row object changes, not the whole window on every data change.
	const dataRef = useRef(data);
	dataRef.current = data;

	// RESULT CACHE, per row object and column. The cell host calls `getSheetsCell` for every
	// visible cell it renders, almost always re-deriving an identical resolution, and the full
	// pipeline (route → relation unwrap → resolveTypeKey → toSheetsCell) allocates ≥3 objects.
	//
	// SAFETY: a resolution reads only its row object's fields (draft meta, cell errors, the
	// relation fields) and the deps below, never the row's index. Row objects are never
	// changed in place: a server row is a new object after a refetch or an optimistic update
	// (see useInfiniteGridData), and a draft row after any draft change (see useDraftRows).
	// So a row object's cached resolution stays valid until one of these deps changes, which
	// throws the whole cache away.
	const cache = useMemo(
		() => new WeakMap<object, Map<string, SheetsCellResolution>>(),
		[columnKeys, fieldMetaMap, registry, relationFieldNamesFromMeta, relationInfoByField, options, serverRowsReadOnly, serverReadOnlyFields, getRowIdentifier, canUpload, canCreate, tableModel, columnByName, relationByField, fieldTypeOverrides, tableName],
	);

	const getSheetsCell = useCallback(
		(rowIndex: number, colKey: string): SheetsCellResolution => {
			// UNLOADED INFINITE ROW → loading skeleton. In infinite-scroll mode `data` is the
			// null-backed proxy from useSheets: a server index whose page is still in flight reads
			// back as `null` (drafts are real objects, never null). Resolve those slots to a neutral
			// `kind: 'loading'` cell with NO component, so the host's kind→view map paints
			// LoadingCellView (the canvas analogue is glide's loadingCell). Without this the row
			// coerces to `{}` below and every cell renders as blank text instead of a skeleton.
			const rawRow = (dataRef.current as any[])[rowIndex];
			if (colKey && rawRow == null) {
				return {
					cell: { kind: 'loading', data: null, displayData: '', readonly: true },
					colKey,
					typeKey: 'text',
					column: null,
					relation: null,
				};
			}
			const rowData = rawRow ?? {};
			if (!colKey) {
				return { cell: { kind: 'text', data: '', displayData: '', readonly: false }, colKey, typeKey: 'text', column: null, relation: null };
			}

			const rawValue = rowData?.[colKey];

			// RESULT-CACHE FAST PATH: the row object fully determines its resolution (see the cache).
			let rowCache = cache.get(rowData);
			const hit = rowCache?.get(colKey);
			if (hit) return hit;
			const draftMeta = getDraftMeta(rowData);
			const isDraftRow = Boolean(draftMeta?.isDraft);

			const fieldMeta: FieldMetadata | undefined = fieldMetaMap.get(colKey);
			const column = columnByName.get(colKey) ?? null;
			const relation = relationByField.get(colKey) ?? null;
			const relationInfo = relationInfoByField.get(colKey);
			// The name-based fallback only covers keys the table model does not describe as a column.
			const isRelationFallback = !column && relationFieldNamesFromMeta.has(colKey);
			const isRelation = Boolean(relation) || Boolean(relationInfo) || isRelationFallback;

			// A table-model column routes from the model alone (kind, write flags, reasons).
			// Relations keep the relation route; the relation lane owns their editing rules.
			const cellError = column ? readCellError(rowData, colKey) : null;
			const modelRoute = column && tableModel && !isRelation
				? resolveModelCellRoute({
					column,
					table: tableModel,
					isDraftRow,
					cellError,
					typeOverride: tableName ? fieldTypeOverrides?.[`${tableName}.${colKey}`] : null,
					lockedFields: serverReadOnlyFields,
				})
				: null;

			const foreignKeyField = relationInfo?.foreignKeyField;
			const canEditRelationInline =
				relationInfo?.kind === 'belongsTo' &&
				typeof foreignKeyField === 'string' &&
				fieldMetaMap.has(foreignKeyField);
			const route = modelRoute
				? null
				: resolveGridCellRoute({
					colKey,
					fieldMeta,
					relationInfo,
					isRelationFallback,
					hasForeignKeyField: canEditRelationInline,
				});
			// A table-model relation opens the relation editor, which decides each link and says why;
			// the cell carries the relation-level reason (not editable, or the row cannot be written).
			const relationReason = relation ? relationCellReadOnlyReason(relation, tableModel, isDraftRow) : null;
			const tableForcedReadOnly = !modelRoute && !relation && !isDraftRow && (
				serverRowsReadOnly || Boolean(serverReadOnlyFields?.has(colKey))
			);

			// A table-model relation hands its factory and editor the raw related record(s) of
			// `row[relation.fieldName]`; only legacy relation info (no model relation) is wrapped.
			let valueForCell = rawValue;
			const legacyRelationInfo = relation ? undefined : relationInfo;

			if (legacyRelationInfo && legacyRelationInfo.relationField && legacyRelationInfo.relationField !== colKey) {
				const relatedValue = (rowData as any)?.[legacyRelationInfo.relationField];
				if (relatedValue !== undefined && relatedValue !== null) {
					valueForCell = relatedValue;
				} else if (typeof rawValue === 'string' && rawValue && !isDraftId(rawValue)) {
					valueForCell = { id: rawValue };
				}
			} else if (legacyRelationInfo && valueForCell == null) {
				const fkField = legacyRelationInfo.foreignKeyField;
				const fkValue = fkField ? (rowData as any)?.[fkField] : undefined;
				if (fkValue && !isDraftId(fkValue)) {
					valueForCell = { id: fkValue };
				}
			}

			if (isRelation) {
				valueForCell = unwrapRelationValue(valueForCell);
			}

			// Consumer detection override: a registered def's match() may override the
			// resolved typeKey. With no consumer cell types this returns the routed type.
			const builtinCellType = modelRoute?.cellType ?? route?.cellType ?? 'text';
			const matchInput: CellTypeMatchInput = {
				gqlType: column?.value.typeName ?? fieldMeta?.type?.gqlType ?? '',
				isArray: column ? column.value.isArray : Boolean(fieldMeta?.type?.isArray),
				pgType: fieldMeta?.type?.pgType ?? null,
				subtype: fieldMeta?.type?.subtype ?? null,
				fieldName: colKey,
				kind: column?.value.kind ?? null,
				semantic: column?.value.semantic ?? null,
				column,
			};
			const cellType = registry.resolveTypeKey(matchInput, () => builtinCellType);
			const rowIdentifier = !isDraftRow ? getRowIdentifier?.(rowData) : null;
			const isMedia = MEDIA_TYPES.has(cellType);
			const lacksMediaTarget = isMedia && (isDraftRow ? !canCreate || serverRowsReadOnly : rowIdentifier == null);
			const readOnlyReason =
				modelRoute?.readOnlyReason ?? relationReason ?? (isMedia && !canUpload ? 'Uploads need a storage endpoint' : null) ?? undefined;
			const routeReadOnly = modelRoute
				? Boolean(modelRoute.readOnlyReason)
				: relation
					? Boolean(relationReason)
					: Boolean(route?.isReadonly);
			const forcedReadOnly = tableForcedReadOnly || lacksMediaTarget || !!readOnlyReason;

			const metadata: CellCreationMetadata = {
				cellType,
				fieldName: colKey,
				fieldMeta,
				relationInfo,
				column,
				relation,
				table: tableModel,
				relationTotalCount: relation?.hasTotalCount ? readRelationTotalCount(rowData, relation.fieldName) : null,
				relationOptions: relationInfo ? options || {} : undefined,
				canEdit: !routeReadOnly && (route && !relation ? route.canEdit : true) && !forcedReadOnly,
				isReadonly: routeReadOnly || forcedReadOnly,
				activationBehavior: route?.activationBehavior ?? 'double-click',
			};

			const resolvedCell = cellError
				? unreadableCell(cellType)
				: registry.toSheetsCell(cellType, valueForCell, { metadata });
			const cell = (forcedReadOnly || routeReadOnly) && !resolvedCell.readonly
				? { ...resolvedCell, readonly: true }
				: resolvedCell;

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
			const errorMessage = hasCellError && draftErrors ? draftErrors[colKey] : undefined;
			const styled = isDraftRow ? tagDraftStyle(displaySafe, hasCellError) : displaySafe;

			// An unreadable cell always shows the built-in notice, never a consumer component.
			const component = cellError ? undefined : registry.getCellComponent(cellType);
			// Surface the already-computed field/relation meta so a native overlay editor
			// (relation/image, Phase 5) can read EditorProps.fieldMeta / relationInfo without
			// re-resolving — no extra work, just exposing what this routing already derived.
			// `typeKey` is the resolved cellType — the single source of truth for edit-intent.
			const resolution: SheetsCellResolution = {
				cell: styled, component, colKey, typeKey: cellType, fieldMeta, relationInfo, column, relation, rowIdentifier, readOnlyReason, errorMessage,
			};
			if (!rowCache) {
				rowCache = new Map();
				cache.set(rowData, rowCache);
			}
			rowCache.set(colKey, resolution);
			return resolution;
		},
		[cache, columnKeys, fieldMetaMap, registry, relationFieldNamesFromMeta, relationInfoByField, options, serverRowsReadOnly, serverReadOnlyFields, getRowIdentifier, canUpload, canCreate, tableModel, columnByName, relationByField, fieldTypeOverrides, tableName],
	);

	return { getSheetsCell };
}

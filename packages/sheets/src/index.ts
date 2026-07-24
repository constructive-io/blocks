// =============================================================================
// @constructive-io/sheets — Public API
// =============================================================================

// -- Provider + Context -------------------------------------------------------
export { SheetsProvider } from './context/sheets-provider';
export { useSheetsContext, SheetsContext } from './context/sheets-context';
export type {
	SheetsConfig,
	SheetsContextValue,
	SheetsAuthEmbedded,
	SheetsAuthStandalone,
	SheetsScopeKey,
} from './context/sheets-context';
export type { SheetsExecuteFn, SheetsUploadFn } from './context/sheets-execute';
export { createSheetsExecute, createSheetsUpload, DataError } from './context/sheets-execute';
export { resolveDownloadUrl } from './context/sheets-upload-presigned';

// -- Store --------------------------------------------------------------------
export { useSheetsStore, useSheetsStoreApi } from './store/sheets-store';
export type { SheetsStoreState, SheetsAuthState } from './store/sheets-store';
export type { RelationInfo, RelationKind } from './store/relation-info-slice';
export { buildRelationInfoFromMeta } from './store/relation-info-slice';
export type { DraftRow } from './store/draft-rows-slice';
export { computeDraftMetaSignature } from './store/draft-rows-slice';

// -- Main Grid Component ------------------------------------------------------
export { Sheets } from './grid/sheets';
export type { SheetsProps } from './grid/sheets';
export type { SheetsEvent, SheetsSlots, SheetsHandle } from './grid/sheets.types';

// -- Headless Hook ------------------------------------------------------------
// Drive your own grid shell from the same data/state bindings the built-in
// <Sheets> component renders with the native DOM grid. Input type is SheetsProps
// (= DataGridProps).
export { useSheets } from './grid/use-sheets';
export type {
	UseSheetsResult,
	SheetsDraftBindings,
	SheetsSelectionBindings,
	SheetsPaginationBindings,
} from './grid/use-sheets';

// -- Theming ------------------------------------------------------------------
export type { SheetsThemeTokens, SheetsThemeInput } from './grid/sheets.theme';
export { tokensFromCssVars } from './grid/sheets.theme';

// -- Row Model (typed rows + draft metadata) ----------------------------------
export { getDraftMeta, isDraftRow } from './grid/row-model';
export type { SheetsRow, DraftMeta, RowWithDraft } from './grid/row-model';
export {
	resolveSheetsRowIdentity,
	resolveSheetsIdentifier,
	sheetsIdentifierToWhere,
	sheetsIdentifierCacheKey,
	sheetsRowKey,
	getSheetsWriteCapability,
	canRunSheetsMutation,
} from './row-identity';
export type { SheetsRowIdentifier, SheetsRowIdentityResolution } from './row-identity';
export { SheetsControls, createEmptyGroup, countConditions, MAX_FILTER_DEPTH } from './grid/sheets.controls';
export type {
	FilterCondition,
	FilterGroup,
	FilterNode,
	FilterValue,
	FieldTypeMap,
	SheetsControlsProps,
} from './grid/sheets.controls';
export { SheetsPagination } from './grid/sheets.pagination';
export type { SheetsPaginationProps } from './grid/sheets.pagination';
export { SheetsTableSelector } from './grid/sheets.table-selector';
export type { TableSelectorProps, TableWithCategory } from './grid/sheets.table-selector';

// -- Data Hooks ---------------------------------------------------------------
export { useSheetsMeta } from './hooks/use-sheets-meta';
export type { UseMetaOptions } from './hooks/use-sheets-meta';
export { useSheetsTable, sheetsTableQueryKeys as queryKeys } from './hooks/use-sheets-table';
export type { UseTableOptions, UseTableResult } from './hooks/use-sheets-table';
export { useSheetsInfiniteTable } from './hooks/use-sheets-infinite-table';
export type { UseInfiniteTableOptions, UseInfiniteTableResult } from './hooks/use-sheets-infinite-table';
export { useSheetsTableCursor } from './hooks/use-sheets-table-cursor';
export type { UseSheetsTableCursorOptions, UseSheetsTableCursorResult } from './hooks/use-sheets-table-cursor';
export { useSheetsFieldUpload, useSheetsImageUpload, executeFieldUpload } from './hooks/use-sheets-upload';
export type { UploadProgress, UploadResponse, UseFieldUploadOptions } from './hooks/use-sheets-upload';
export { useRelationColumns, useDataGridColumns } from './hooks/use-relation-columns';
export type { RelationColumnInfo } from './hooks/use-relation-columns';
export { sheetsQueryKeys, isSheetsScopeKey } from './hooks/query-keys';

// -- Backend Adapter ----------------------------------------------------------
export type {
	SheetsBackendAdapter,
	AdapterTableContext,
	AdapterListQuery,
	AdapterListResult,
	AdapterPageInfo,
} from './adapter/sheets-adapter';
export { createPostGraphileAdapter } from './adapter/postgraphile-adapter';
export { useSheetsAdapter } from './adapter/use-sheets-adapter';

// -- Cell Type System ---------------------------------------------------------
export { CellRegistry } from './cell-types/cell-registry';
export {
	BOOLEAN_TYPES,
	BUILTIN_EDITOR_TYPES,
	DATE_TIME_TYPES,
	ENHANCED_TYPES,
	GEOMETRY_TYPES,
	MEDIA_TYPES,
	NON_EDITABLE_TYPES,
	NUMBER_TYPES,
	STRUCTURED_DATA_TYPES,
	TYPED_ARRAY_TYPES,
	VIEWER_ONLY_TYPES,
	isArrayCellType,
} from './cell-types/cell-type-groups';
export { mapToFrontendCellType, isStructuredDataType, createColumnSchemaFromMeta } from './cell-types/type-mapping';
export { resolveCellType, isImageField } from './cell-types/cell-type-resolver';
export type {
	CellType,
	CellCategory,
	CellValue,
	FieldMetadata,
	ColumnSchema,
	TableSchema,
	RowData,
	BaseCellProps,
	CellRenderer,
	CellRegistryEntry,
	CellPlugin,
} from './cell-types/types';

// -- Cell Type Extension API --------------------------------------------------
export { defineCellType } from './cell-types/define-cell-type';
export type {
	CellTypeDefinition,
	CellTypePlugin,
	CellTypeMatchInput,
	SheetsCellRenderContext,
} from './cell-types/define-cell-type';
export { createCellTypeRegistry } from './cell-types/cell-type-registry';
export type { CellTypeRegistry, CellTypeBuiltins } from './cell-types/cell-type-registry';

// -- Native Cell Model (DOM render payload + component override slots) ---------
export type { SheetsCell, SheetsCellKind } from './cell-model/sheets-cell';
export type { CellProps, CellColumnDescriptor } from './cell-model/cell-props';
export type { CellSlots, CellSlot } from './cell-model/cell-slots';
export type { EditorProps } from './grid-dom/editors/editor-props';

// -- Native Selection (replaces glide CompactSelection / GridSelection) --------
export { RangeSet } from './selection/range-set';
export {
	emptySheetsSelection,
	selectRow,
	toggleRow,
	selectRange,
	selectCell,
	extendRangeToCell,
	moveActive,
	clear as clearSheetsSelection,
} from './selection/selection-model';
export type { SheetsSelection, SelectionCurrent, SelectionRect } from './selection/selection-model';
export { getCellsInRange, toTSV } from './selection/cell-extract';
export type { ExtractedRange } from './selection/cell-extract';
export { fillDownWrites, fillRightWrites } from './selection/fill';

// -- Dynamic Forms ------------------------------------------------------------
export {
	buildScalarFormSpec,
	findTableFormSpec,
} from './forms/form-spec-builder';
export { buildZodSchema } from './forms/zod-schema';
export { useDynamicCreate, useDynamicUpdate } from './forms/mutations';
export { createMetadataHash } from './forms/metadata-hash';
export type { DynamicFormSpec, ScalarFieldSpec, MetaTable, MetaField } from './forms/types';

// -- Auth (Standalone Mode) ---------------------------------------------------
/**
 * @deprecated Import the standalone-auth surface from `@constructive-io/sheets/auth`
 * instead. These root re-exports are retained for back-compat and may be removed
 * in a future major.
 */
export { SheetsAuthGate } from './auth/auth-gate';
export type { SheetsAuthGateProps } from './auth/auth-gate';
export { useSheetsLogin } from './auth/hooks/use-login';
export { useSheetsRegister } from './auth/hooks/use-register';
export { useSheetsForgotPassword } from './auth/hooks/use-forgot-password';
export { useSheetsResetPassword } from './auth/hooks/use-reset-password';

// -- Feedback System ----------------------------------------------------------
export { FeedbackProvider, useFeedback, useOperationFeedback } from './grid/feedback';
export { FloatingStatus } from './grid/feedback/floating-status';
export { DockStatusBar, DockStatusBarCompact } from './grid/feedback/dock-status-bar';
export type { OperationFeedback } from './grid/feedback/feedback-reducer';
export { SheetsErrorBoundary } from './grid/feedback/sheets-error-boundary';
export { SheetsErrorState, SheetsEmptyState, SheetsLoadingState } from './grid/feedback/sheets-error-state';
export type { SheetsLogger } from './utils/sheets-logger';

// -- Command Customization Seam (P4 Phase 2) ----------------------------------
// The PUBLIC override surface for the <Sheets> `commands` / `keymap` / `interceptors` /
// `onCommand` props. DEFAULT_COMMANDS / DEFAULT_KEYMAP stay INTERNAL (consumers override
// by id / binding, they don't import the default tables).
export type { GridCommand, GridCommandContext } from './commands';
export type { Interceptor, DispatchEvent, CommandResult } from './commands';
export type { Binding, Trigger } from './commands';
export { kbd } from './commands';

// -- Grid Hooks (advanced usage) ----------------------------------------------
export { useDataFiltering } from './grid/hooks/use-filter-grid';
export type { DataFilteringContextValue, UseDataFilteringConfig } from './grid/hooks/use-filter-grid';
export { useDataPagination } from './grid/hooks/use-paginate-grid';
export type { DataPaginationContextValue, UseDataPaginationConfig } from './grid/hooks/use-paginate-grid';

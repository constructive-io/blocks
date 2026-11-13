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
export type {
	SheetsExecuteFn,
	SheetsExecuteOptions,
	SheetsFileValue,
	SheetsPartialResult,
	SheetsResponseError,
	SheetsUploadFn,
	SheetsUploadResult,
} from './context/sheets-execute';
export {
	createSheetsExecute,
	createSheetsUpload,
	ConstructiveError,
	partialResultOf,
	responseErrorsOf,
} from './context/sheets-execute';
export { resolveDownloadUrl } from './context/sheets-upload-presigned';

// -- Store --------------------------------------------------------------------
export { useSheetsStore, useSheetsStoreApi } from './store/sheets-store';
export type { SheetsStoreState, SheetsAuthState } from './store/sheets-store';
export type { RelationInfo, RelationKind } from './store/relation-info-slice';
export { relationInfoFromModel } from './store/relation-info-slice';
export type {
	SheetsOpenRecordHandler,
	SheetsOpenRecordRequest,
	SheetsOpenTableHandler,
	SheetsOpenTableRequest,
} from './relations/relation-navigation';
export { SheetsOpenRecordContext, SheetsOpenTableContext, useOpenRecordHandler } from './relations/relation-navigation';
export { RelationSection } from './relations/relation-section';
export type { RelationSectionProps } from './relations/relation-section';
export { gridRelations } from './relations/relation-columns';
export type { DraftRow } from './store/draft-rows-slice';
export { computeDraftMetaSignature } from './store/draft-rows-slice';

// -- Main Grid Component ------------------------------------------------------
export { Sheets } from './grid/sheets';
export type { SheetsProps } from './grid/sheets';
export type { SheetsEvent, SheetsSlots, SheetsHandle } from './grid/sheets.types';

// -- Headless Hook ------------------------------------------------------------
// Drive your own grid shell from the same data/state bindings the built-in
// <Sheets> component renders with the native DOM grid. Input type is SheetsProps
// (= DataGridProps). For a read-only grid, wrap it in `SheetsReadOnlyProvider`
// (what `<Sheets readOnly>` does).
export { useSheets } from './grid/use-sheets';
export { SheetsReadOnlyProvider, DEFAULT_READ_ONLY_REASON } from './context/sheets-read-only';
export type { SheetsReadOnlyProviderProps } from './context/sheets-read-only';
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
	sheetsIdentifierToRowKey,
	getSheetsWriteCapability,
	canRunSheetsMutation,
} from './row-identity';
export type { SheetsRowIdentifier, SheetsRowIdentityResolution } from './row-identity';
export { SheetsControls } from './grid/sheets.controls';
export type { SheetsControlsProps } from './grid/sheets.controls';

// -- Import and export ----------------------------------------------------------
// Toolbar controls: import CSV or TSV rows as new records (mapping, a checked preview,
// progress, cancel, an error report), and export every row of a view as CSV.
export { ImportRecordsControl, ExportViewControl } from './import-export';
export type { ImportRecordsControlProps, ExportViewControlProps } from './import-export';

// -- View state (filters, sort, search, column layout) ----------------------------
// One serializable value that names columns by field name, for saved views. Load a
// stored value through `validateSheetsViewState` (it also upgrades version 1); pass
// the parts to <Sheets> as the controlled `filters` / `sort` / `search` / `columns` props.
export {
	SHEETS_VIEW_STATE_VERSION,
	type SheetsColumnCondition,
	type SheetsColumnLayout,
	type SheetsRowHeight,
	type SheetsFilterCondition,
	type SheetsFilterGroup,
	type SheetsFilterLogic,
	type SheetsFilterNode,
	type SheetsFilterValue,
	type SheetsRelationCondition,
	type SheetsRelationTest,
	type SheetsSortDirection,
	type SheetsSortKey,
	type SheetsViewState,
	type SheetsViewStateDrop,
	type SheetsViewStateDropReason,
	type SheetsViewStateValidation,
} from './grid/view-state/view-state.types';
export { validateSheetsViewState, type ValidateSheetsViewStateOptions } from './grid/view-state/validate-view-state';
export {
	MAX_FILTER_DEPTH,
	createFilterGroup,
	createSheetsViewState,
	cycleSort,
	filterConditionsOf,
} from './grid/view-state/view-state';
export { buildViewQuery, type ConditionStatus, type ViewQuery } from './grid/view-state/build-view-query';
export {
	ROW_HEIGHT_PX,
	createColumnLayout,
	orderedColumnKeys,
	visibleColumnKeys,
} from './grid/columns/column-layout';

// -- Saved views ------------------------------------------------------------------
// Named views per table. `SheetsConfig.views` takes a host storage; the default keeps
// views in this browser's local storage, keyed by endpoint, database, identity and table.
export {
	createKeyValueViewStorage,
	createMemoryViewStorage,
	type KeyValueStore,
	type SheetsStoredView,
	type SheetsViewStorage,
	type SheetsViewStorageScope,
} from './grid/views/view-storage';
export type { SheetsViewProps } from './grid/view-state/use-sheets-view';
export {
	defaultOperatorOption,
	filterOperatorLabel,
	filterOperatorOptions,
	type FilterOperatorGroup,
	type FilterOperatorOption,
	type FilterValueControl,
	type ScalarValueControl,
} from './grid/filter-operators';
export { SheetsPagination } from './grid/sheets.pagination';
export { SheetsStatusBar } from './grid/sheets.status-bar';
export type { SheetsStatusBarProps } from './grid/sheets.status-bar';
export type { SheetsPaginationProps } from './grid/sheets.pagination';
export { SheetsTableSelector } from './grid/sheets.table-selector';
export type { TableSelectorProps, TableWithCategory } from './grid/sheets.table-selector';

// -- Table Model --------------------------------------------------------------
// One normalized model per table (keys, column kinds and options, write flags,
// relations, labels, sort and filter names), built by @constructive-io/data
// from `_meta` and targeted introspection.
export { useTableModel, useTableModels } from './hooks/use-table-model';
export type { UseTableModelOptions, UseTableModelResult, UseTableModelsResult } from './hooks/use-table-model';
export {
	CELL_ERRORS_KEY,
	RELATION_TOTAL_COUNTS_KEY,
	TableModelError,
	readCellError,
	readRelationTotalCount,
	resolveDisplayFields,
} from '@constructive-io/data';
export type {
	ArgumentModel,
	ColumnFileModel,
	ColumnFilterModel,
	ColumnModel,
	ColumnOption,
	ColumnSemantic,
	ColumnSortModel,
	ColumnValueKind,
	ColumnValueModel,
	ColumnWriteModel,
	CreateOperationModel,
	DeleteOperationModel,
	DisplayFieldOverrides,
	DisplayFieldsModel,
	FilterOperatorModel,
	InputFieldModel,
	InputValueModel,
	ListOperationModel,
	ModelIssue,
	ModelIssueCode,
	RelationJunctionModel,
	RelationKeyPair,
	RelationModel,
	RelationModelKind,
	RelationTargetModel,
	SortDirection,
	SortSpec,
	TableKey,
	TableModel,
	TableModelErrorCode,
	TableOperations,
	TableSearchModel,
	TableStorageModel,
	TableStorageUploadModel,
	UpdateOperationModel,
} from '@constructive-io/data';

// -- Data Hooks ---------------------------------------------------------------
export { useSheetsMeta } from './hooks/use-sheets-meta';
export type { UseMetaOptions } from './hooks/use-sheets-meta';
export { useSheetsTable, sheetsTableQueryKeys as queryKeys } from './hooks/use-sheets-table';
export type { UseTableOptions, UseTableResult } from './hooks/use-sheets-table';
export { useSheetsInfiniteTable } from './hooks/use-sheets-infinite-table';
export type { UseInfiniteTableOptions, UseInfiniteTableResult } from './hooks/use-sheets-infinite-table';
export { useSheetsTableCursor } from './hooks/use-sheets-table-cursor';
export type { UseSheetsTableCursorOptions, UseSheetsTableCursorResult } from './hooks/use-sheets-table-cursor';
export {
	executeFieldUpload,
	useColumnStorage,
	useFileCellWriter,
	useFileUploadState,
	useSheetsFieldUpload,
} from './hooks/use-sheets-upload';
export type {
	FieldUploadTarget,
	FieldUploadTransport,
	FileCellWriteJob,
	FileUploadState,
	UploadProgress,
	UploadResponse,
	UseColumnStorageResult,
	UseFieldUploadOptions,
} from './hooks/use-sheets-upload';
export type { ColumnStorage, SendFile, SendFileOptions } from './uploads/column-storage';
export { uploadToFilesTable } from './uploads/upload-to-files-table';
export type { UploadedFile, UploadToFilesTableOptions } from './uploads/upload-to-files-table';
export { unfinishedUploadOf } from './context/sheets-upload-presigned';
export type { FileProjection, UnfinishedUpload, UploadProgressEvent } from './context/sheets-upload-presigned';
export type {
	SheetsUploadColumnConfig,
	SheetsUploadConfig,
	SheetsUploadProcessingConfig,
} from './uploads/upload-config';
export type { SheetsMapConfig, SheetsMapPlaceSearch, SheetsMapTiles } from './utils/map-settings';
export { useRelationColumns, useDataGridColumns } from './hooks/use-relation-columns';
export type { RelationColumnInfo } from './hooks/use-relation-columns';
export { sheetsQueryKeys, sheetsMutationKeys, isSheetsScopeKey } from './hooks/query-keys';

// -- Backend Adapter ----------------------------------------------------------
export type {
	SheetsBackendAdapter,
	AdapterTableContext,
	AdapterListQuery,
	AdapterListResult,
	AdapterPageInfo,
	AdapterTableModelOptions,
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
export { buildModelFormSpec, buildModelFormSchema } from './forms/model-form';
export type { ModelFormField, ModelFormMode, ModelFormSpec } from './forms/model-form';
export { cellTypeForColumn } from './cell-types/column-routing';
export { parseColumnInput, formatColumnValue } from './cell-types/column-value';
export type { ColumnInputResult, ColumnInputOptions } from './cell-types/column-value';

// -- Auth (Standalone Mode) ---------------------------------------------------
/**
 * @deprecated Import from the dedicated `auth` entry point instead:
 * `@constructive-io/sheets/auth` for npm or `@/components/ui/sheets/auth` for a
 * registry source install. These root exports may be removed in a future major.
 */
export { SheetsAuthGate } from './auth/auth-gate';
export type { SheetsAuthGateProps } from './auth/auth-gate';
export { useSheetsLogin } from './auth/hooks/use-login';
export { useSheetsRegister } from './auth/hooks/use-register';
export { useSheetsForgotPassword } from './auth/hooks/use-forgot-password';
export { useSheetsResetPassword } from './auth/hooks/use-reset-password';

// -- Feedback System ----------------------------------------------------------
export { FeedbackProvider, useFeedback, useOptionalFeedback, useOperationFeedback, ModelIssuesNotice, SaveStatus, WriteErrorStack, writeErrorMessages } from './grid/feedback';
export type { OperationType, WriteMessages } from './grid/feedback';
export type { WriteAction, WriteErrorReport } from './grid/feedback';
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

import type { SheetsRow } from './row-model';
import type { CellTypeDefinition } from '../cell-types/define-cell-type';
import type { CellSlots } from '../cell-model/cell-slots';
// SheetsThemeInput is owned + exported by Unit B (./sheets.theme). Imported as a type
// only; if Unit B's change has not landed yet this import is the single expected
// cross-unit transient error — both units typecheck once they land together.
import type { SheetsThemeInput } from './sheets.theme';
import type { GridCommand, Binding, Interceptor, DispatchEvent, CommandResult } from '../commands';
import type { SheetsRowIdentifier } from '../row-identity';
import type { SheetsOpenTableHandler } from '../relations/relation-navigation';
import type { SheetsViewProps } from './view-state/use-sheets-view';

export interface DataGridRow {
	id: string;
	[key: string]: any;
}

// =============================================================================
// Public component API — events, render slots, imperative handle
// =============================================================================

/**
 * Lifecycle/interaction event emitted by {@link Sheets} via the optional
 * `onEvent` prop. Purely observational: firing an event never changes grid
 * behavior, so consumers can wire analytics/telemetry without side effects.
 */
export interface SheetsEvent {
	type:
		| 'load:success'
		| 'load:error'
		| 'cell:edit'
		| 'row:create'
		| 'row:delete'
		| 'filter:apply'
		| 'sort:change'
		| 'search:change'
		| 'page:change';
	/** The table the event originated from. */
	tableName: string;
	/** Epoch ms (`Date.now()`) when the event fired. */
	at: number;
	/** Event-specific extra context (ids, values, error, page index, …). */
	meta?: Record<string, unknown>;
}

/** Context passed to the `toolbar` slot when supplied as a render function. */
export interface SheetsToolbarSlotContext {
	tableName: string;
}

/**
 * Render-slot overrides. Each provided slot replaces the corresponding default
 * (the Phase-0 SheetsErrorState / SheetsEmptyState / SheetsLoadingState stay as
 * fallbacks when a slot is omitted). All slots are optional and additive.
 */
export interface SheetsSlots {
	/** Replaces (precedes) the default <SheetsControls> toolbar block. */
	toolbar?: React.ReactNode | ((ctx: SheetsToolbarSlotContext) => React.ReactNode);
	/** Replaces the default full-screen empty state. */
	empty?: React.ReactNode | ((ctx: { tableName: string }) => React.ReactNode);
	/** Replaces the default full-screen error state. */
	error?: (ctx: { error: unknown; retry: () => void }) => React.ReactNode;
	/** Replaces the default full-screen loading state. */
	loading?: React.ReactNode;
}

/**
 * Alias kept in sync with {@link SheetsSlots}. The `slots` prop is typed with
 * this name to match the shared Phase-4 contract; `SheetsSlots` is the exported
 * public name.
 */
export type SheetsSlotsInput = SheetsSlots;

/**
 * Imperative handle exposed through a `ref` on {@link Sheets}. Lets host apps
 * drive the grid (scroll, submit drafts, refetch, read selection, export CSV)
 * without reaching into internals.
 */
export interface SheetsHandle {
	/** Scroll the viewport so the row at `index` is visible. */
	scrollToRow(index: number): void;
	/** Submit all pending draft rows (awaits the in-flight submission). */
	submitDrafts(): Promise<void>;
	/** Refetch the underlying table data (mode-aware: infinite vs paginated). */
	refetch(): void;
	/** Return the currently selected rows (empty array when nothing selected). */
	getSelectedRows(): Record<string, unknown>[];
	/**
	 * Download the selected rows (or all rows when none selected) as CSV.
	 * `protectFormulas` overrides the grid's `csvExport.protectFormulas` for this download.
	 */
	exportCsv(opts?: { columns?: string[]; filename?: string; protectFormulas?: boolean }): void;
	/** Open a record of this table in the record panel. False when the identifier does not name a record. */
	openRecord(recordId: SheetsRowIdentifier): boolean;
	/** Open the record panel on a new record. False when the table does not allow new records. */
	openNewRecord(): boolean;
	/** Close the record panel. */
	closeRecord(): void;
}

export interface DataGridColumnMeta {
	fieldName: string;
	fieldType: {
		gqlType: string;
		pgType?: string | null;
		pgAlias?: string | null;
	};
}

/**
 * `filters` / `sort` / `search` (each with its change callback) let a host own
 * the view state, for example to persist it as a saved view. Each one omitted is
 * owned by the grid. The grid checks every given state against the table model
 * and leaves out what the model no longer supports (see `validateSheetsViewState`).
 */
export interface DataGridProps<TRow extends SheetsRow = SheetsRow> extends SheetsViewProps {
	tableName: string;
	/**
	 * Make the grid read-only for this host: `true`, or the reason to show. Every cell,
	 * paste and fill, Add row, New record, Import, Delete, every link and the record panel's
	 * fields refuse writes and show the reason; viewing, sorting, filtering, search and
	 * export stay. `true` shows "This table is read-only here."
	 */
	readOnly?: boolean | string;
	className?: string;
	pageSize?: number;
	showSelection?: boolean;
	showPagination?: boolean;
	onRowSelect?: (selectedRows: TRow[]) => void;
	onCellEdit?: (id: SheetsRowIdentifier, field: string, value: unknown) => void;
	// Relation rendering options
	relationChipLimit?: number;
	relationLabelMaxLength?: number;
	/**
	 * Enable infinite scroll mode with cursor-based pagination.
	 * When enabled:
	 * - Rows are loaded on-demand as user scrolls
	 * - Traditional pagination UI is hidden
	 * - Uses hybrid cursor/offset pagination for optimal performance
	 * @default false
	 */
	infiniteScroll?: boolean;
	/** Per-instance cell types merged over provider plugins. */
	cellTypes?: CellTypeDefinition<any>[];
	/** Consumer cell-component overrides keyed by cell typeKey. */
	cellSlots?: CellSlots;
	/**
	 * Optional observational event callback. Fired on load success/error, cell
	 * edits, row create/delete, filter apply, sort change, and page change.
	 * Omitting it leaves behavior unchanged.
	 */
	onEvent?: (e: SheetsEvent) => void;
	/**
	 * Called when the user asks to see another table, for example the table that
	 * stores links needing more fields than the link editor can fill. The grid
	 * does not navigate; omit it and the editor offers no such action.
	 */
	onOpenTable?: SheetsOpenTableHandler;
	/**
	 * CSV export settings. `protectFormulas`: text that starts with =, +, -, @, a tab or
	 * a carriage return is written with a leading apostrophe, so a spreadsheet app does not
	 * run it as a formula (numbers are not changed). Off by default. It applies to
	 * "Export selected" and `SheetsHandle.exportCsv`, and is the starting choice of the
	 * checkbox in the "Export view" dialog.
	 */
	csvExport?: { protectFormulas?: boolean };
	/**
	 * The record open in the record panel, for deep links: an identifier of a record of
	 * this table, or null for closed. Omit it to let the grid own the panel state.
	 */
	recordId?: SheetsRowIdentifier | null;
	/** Called whenever the user opens, moves to or closes a record of this table in the record panel. */
	onRecordOpenChange?: (recordId: SheetsRowIdentifier | null) => void;
	/**
	 * Optional render-slot overrides for the toolbar / empty / error / loading
	 * regions. Any omitted slot falls back to the built-in default.
	 */
	slots?: SheetsSlotsInput;
	/**
	 * Override or extend the grid command set: a command with a matching id REPLACES
	 * the built-in body, a new id ADDS a command. Omitting it = the default set.
	 */
	commands?: GridCommand[];
	/**
	 * Extra / override key bindings, scanned BEFORE the defaults, so a rebind of a
	 * built-in chord wins. When several bindings match a key, they are tried in order
	 * and the first whose command can run wins. Omitting it = the default keymap.
	 */
	keymap?: Binding[];
	/**
	 * Interceptors wrapping every dispatch (observe / veto / transform). Listed FIRST
	 * = OUTERMOST; the consumer list runs outside the `onCommand` tail observer.
	 */
	interceptors?: Interceptor[];
	/**
	 * Observe every dispatch and its result (sugar for an innermost tail-observer
	 * interceptor — runs after all consumer interceptors, never alters behavior).
	 */
	onCommand?: (ev: DispatchEvent, result: CommandResult) => void;
	/** Optional theme token overrides (per light/dark mode) or a Glide-theme function. */
	theme?: SheetsThemeInput;
	/** Optional explicit theme mode; defaults to following the document `dark` class. */
	themeMode?: 'light' | 'dark' | 'system';
	/**
	 * @internal Render-path switch for the TanStack DOM port spike. `'dom'`
	 * renders the native DOM grid; anything else (default) renders the canvas
	 * `<DataEditor>`. Double-underscore = internal/undocumented; NOT a public API.
	 */
	__impl?: 'canvas' | 'dom';
}

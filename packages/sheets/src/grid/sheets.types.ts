import type { SheetsRow } from './row-model';
import type { CellTypeDefinition } from '../cell-types/define-cell-type';
import type { CellSlots } from '../cell-model/cell-slots';
// SheetsThemeInput is owned + exported by Unit B (./sheets.theme). Imported as a type
// only; if Unit B's change has not landed yet this import is the single expected
// cross-unit transient error — both units typecheck once they land together.
import type { SheetsThemeInput } from './sheets.theme';
import type { GridCommand, Binding, Interceptor, DispatchEvent, CommandResult } from '../commands';
import type { SheetsRowIdentifier } from '../row-identity';

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
	/** Download the selected rows (or all rows when none selected) as CSV. */
	exportCsv(opts?: { columns?: string[]; filename?: string }): void;
}

export interface DataGridColumnMeta {
	fieldName: string;
	fieldType: {
		gqlType: string;
		pgType?: string | null;
		pgAlias?: string | null;
	};
}

export interface DataGridProps<TRow extends SheetsRow = SheetsRow> {
	tableName: string;
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
	 * Extra / override key bindings, scanned BEFORE the defaults (first-match-wins),
	 * so a rebind of a built-in chord wins. Omitting it = the default keymap.
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

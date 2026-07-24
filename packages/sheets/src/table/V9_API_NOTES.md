# TanStack Table v9 API notes (GROUND TRUTH)

Pinned: `@tanstack/react-table@9.0.0-beta.17` (`@tanstack/table-core@9.0.0-beta.17`),
`@tanstack/react-virtual@3.14.3`. Verified by the compiling probe at
`src/table/__probe__/v9-probe.tsx` (S6 deletes it). All snippets below are exactly what
typechecked — Context7/training data that disagrees is wrong for this pinned beta.

## Feature export names (the four we register)

```ts
import {
	columnSizingFeature,   // COMMITTED column widths  -> state.columnSizing
	columnResizingFeature, // transient drag-resize    -> state.columnResizing
	columnPinningFeature,  // left/right pin            -> state.columnPinning
	rowSelectionFeature    // row selection             -> state.rowSelection
} from '@tanstack/react-table';
```

v9 SPLIT v8's `ColumnSizing` into `columnSizingFeature` (widths) + `columnResizingFeature`
(drag). Sizing carries NO enable flag; resizing carries `enableColumnResizing` +
`columnResizeMode`. All four also exported from `@tanstack/table-core`.

## tableFeatures + createColumnHelper (module scope = stable identity)

```ts
const features = tableFeatures({
	columnSizingFeature,
	columnResizingFeature,
	columnPinningFeature,
	rowSelectionFeature
});
// createColumnHelper<TFeatures, TData> — TFeatures is FIRST in v9 (changed from v8).
const helper = createColumnHelper<typeof features, Row>();
const columns: Array<ColumnDef<typeof features, Row>> = helper.columns([
	helper.accessor('name', { header: 'Name', size: 160 })
]);
```

`tableFeatures(obj)` is required (even `tableFeatures({})`). Row-model factories
(`sortedRowModel` etc.) + `*Fns` registries live ON this object — we register NONE of them
(no sort/filter/pagination features).

## useTable signature + controlled (reducer-driven) wiring

```ts
function useTable<TFeatures, TData, TSelected = TableState<TFeatures>>(
	tableOptions: TableOptions<TFeatures, TData>,
	selector?: (state: TableState<TFeatures>) => TSelected
): ReactTable<TFeatures, TData, TSelected>;
```

`TableOptions<TFeatures, TData>` only includes a feature's options when that feature key is
in `TFeatures` (`ExtractFeatureMapTypes`). Controlled state is **v8-style**: top-level
`state` partial + per-feature `on*Change` callbacks. (The atoms mechanism via
`options.atoms.<slice>` + `useCreateAtom` also exists — table writes directly, no `on*Change`
— but we use the `state` + `on*Change` path so OUR reducer owns the slices.) Precedence:
`atoms[key] > state[key] > internal baseAtoms[key]`. Do NOT pass both `state.X` and `atoms.X`.

```ts
const table = useTable({
	features,
	columns,
	data: rows,               // fed AS-IS (already server sorted/filtered/paginated)
	getRowId: (row) => row.id,
	enableColumnPinning: true,
	enableColumnResizing: true,
	enableRowSelection: true,
	columnResizeMode: 'onChange',
	state: {                  // our reducer is the source of truth
		columnSizing,           // ColumnSizingState = Record<string, number>
		columnPinning,          // ColumnPinningState = { left: string[]; right: string[] }
		rowSelection            // RowSelectionState = Record<string, boolean | undefined>
	},
	onColumnSizingChange,     // OnChangeFn<ColumnSizingState>  (value | (prev)=>next)
	onColumnPinningChange,    // OnChangeFn<ColumnPinningState>
	onRowSelectionChange      // OnChangeFn<RowSelectionState>
});
```

Read state in render via `table.state` (selected snapshot) or `<table.Subscribe>` /
standalone `<Subscribe source={table.atoms.X}>` inside cell/header contexts. `getState()` is
REMOVED. APIs: `table.setColumnSizing`, `table.setColumnPinning`, `table.setRowSelection`,
`column.getSize/getStart/getAfter/getIsPinned/pin`, `row.getIsSelected/toggleSelected`.

## Render API — `table.FlexRender` (instance property)

```tsx
<table.FlexRender header={header} />   // headers/cells/footers
<table.FlexRender cell={cell} />
```

Exactly one of `cell` | `header` | `footer`. Standalone `flexRender(comp, ctx)` and
`<FlexRender .../>` are also exported but the instance `table.FlexRender` is the idiom.
Inside a cell/header render fn `table` is the CORE `Table` (no `.Subscribe`/`.FlexRender`
instance helpers) — import standalone `Subscribe`/`flexRender` there.

## getRowId

Core option (`TableOptions_Rows`), always available regardless of registered features:
`getRowId?: (originalRow, index, parent?) => string`. We pass `(row) => row.id`.

## Manual-flags / rowCount verdict: OMIT ALL

`manualSorting` (rowSortingFeature), `manualFiltering` (columnFilteringFeature),
`manualPagination` + `rowCount` (rowPaginationFeature) live ONLY on those features'
option types. We register NONE of them, so these keys are NOT in our `TableOptions` type
and MUST be omitted (passing them is a TS error). The table is a pure column + selection
state-mirror; rows arrive already sorted/filtered/paginated from `useSheets`.

## Types import surface (all from `@tanstack/react-table`)

`ColumnDef`, `ColumnSizingState`, `ColumnPinningState`, `RowSelectionState`,
`ColumnResizeMode`, `OnChangeFn`, `Updater`, `TableState`, `TableFeatures`, `RowData`,
`CellData` (re-exported via `export * from '@tanstack/table-core'`).

## react-virtual 3.14.3

`useVirtualizer` / `useWindowVirtualizer` from `@tanstack/react-virtual`.

/* @vitest-environment jsdom */
//
// BOOLEAN INLINE-TOGGLE integration test (STAGE 3 GATE). Proves the routing-fix
// payoff end-to-end through the DOM host: activating a BOOLEAN cell does NOT open an
// overlay — it commits the TOGGLED boolean (`!current`) in place. This is the case
// the old `cell.meta?.cellType ?? 'text'` lookup got wrong (it opened a TEXT editor
// over a boolean); here we assert the new edit-intent path: boolean -> inline-toggle.
//
// The harness mirrors SheetsDomInner's activation branch VERBATIM (the part the
// production host runs in `openEditor`): resolve the cell, run `resolveEditIntent`
// off the resolved `typeKey` + readonly flag, and on an `inline-toggle` intent commit
// `!coerceCellBoolean(current)` through the injected commitSpy — no overlay opened.
// Non-boolean activation still does SOMETHING (a text cell edits inline; an overlay type
// would portal), so the test can prove the NEGATIVE: a boolean activation commits AND opens
// no editor at all — neither `[data-slot="text-editor"]` nor `[data-slot="inline-cell-editor"]`.
//
// Same component-test idiom as the sibling overlay-editor.test.tsx: jsdom + react-dom/
// client createRoot + act (no @testing-library — not a dep of this package). Trigger
// parity: editing is activated exactly as production — double-click / Enter on the
// host's focusable cell wrapper fires `openEditor(rowIndex, colKey, rect)`.
import { act, useCallback, useMemo, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSheetsTableInstance, type SheetsColumnDescriptor } from '../../table/use-sheets-table-instance';
import { GridViewport, type RenderCell } from '../../table/grid-viewport';
import { SheetsCellHost, type OpenEditor } from '../sheets-cell-host';
import { createCellTypeRegistry, type CellTypeBuiltins, type CellTypeRegistry } from '../../cell-types/cell-type-registry';
import { createSheetsCell } from '../../cell-model/create-sheets-cell';
import { makeMetadata } from '../../grid/__golden__/display-cases';
import { useOverlayController } from '../overlay/use-overlay-controller';
import { OverlayManager } from '../overlay/overlay-manager';
import { resolveEditIntent } from '../editors/edit-intent';
import { computeOverlayGeometry } from '../../grid/editors/overlay-viewport-guard';
import { SheetsContext, type SheetsContextValue } from '../../context/sheets-context';
import type { CellType } from '../../cell-types/types';
import type { SheetsCellResolution } from '../use-sheets-content';
import type { SheetsRow } from '../../grid/row-model';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ---- Fixtures -------------------------------------------------------------
// A boolean column (the cell under test) plus a text column (a control: it MUST still
// open the overlay, proving the harness isn't suppressing every activation).
const COLUMNS: SheetsColumnDescriptor[] = [
	{ key: 'name', name: 'Name', size: 160 },
	{ key: 'active', name: 'Active', size: 160 },
];

// Two rows so both boolean polarities are exercised: true -> false and false -> true.
const ROWS: SheetsRow[] = [
	{ id: 'r1', name: 'Alpha', active: true },
	{ id: 'r2', name: 'Bravo', active: false },
];

const COL_TYPE: Record<string, CellType> = { name: 'text', active: 'boolean' };

// Stub builtins: route display through the real native dispatcher so the boolean cell
// is a genuine SheetsCell (BooleanCellView renders a token check / muted dash).
const BUILTINS: CellTypeBuiltins = {
	toSheetsCell: (value, ctx) => createSheetsCell(value, ctx.metadata),
};

const noop = () => {};
const EMPTY = {} as never;

const OVERLAY_MARGIN_PX = 12;
const OVERLAY_MIN_BELOW_PX = 320;

// `coerceCellBoolean` is a private helper in sheets.tsx, so mirror its exact contract
// here (null/undefined -> false; boolean passes through; else Boolean()) — the toggle
// must flip against the SAME boolean the cell renders.
function coerceCellBoolean(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	return typeof value === 'boolean' ? value : Boolean(value);
}

const STUB_CONTEXT = {
	config: { endpoint: '', auth: { mode: 'standalone' }, onError: noop },
	execute: (async () => ({})) as never,
	executeUpload: (async () => ({})) as never,
	scopeKey: { databaseId: null, endpoint: '', identityKey: null },
} as unknown as SheetsContextValue;

function renderHarness(root: Root, ui: React.ReactNode) {
	return act(async () => {
		root.render(<SheetsContext.Provider value={STUB_CONTEXT}>{ui}</SheetsContext.Provider>);
	});
}

// ---- Harness: a faithful copy of SheetsDomInner's activation branch -------
//
// Mirrors the production `openEditor` (sheets.tsx): resolve the cell, run the SINGLE
// edit-intent resolver off `resolution.typeKey` + `cell.readonly`, and branch:
//   • inline-toggle -> commit `!coerceCellBoolean(current)` via commitSpy, NO overlay.
//   • overlay       -> open the portal (so the text control still opens its editor).
//   • none          -> do nothing.
// The overlay block is the same `editorNode` closure as overlay-editor.test.tsx.
function Harness({
	registry,
	commitSpy,
}: {
	registry: CellTypeRegistry;
	commitSpy: (rowIndex: number, colKey: string, next: unknown) => void;
}) {
	const getSheetsCellContent = useCallback(
		(rowIndex: number, colKey: string): SheetsCellResolution => {
			const value = (ROWS[rowIndex] as Record<string, unknown>)?.[colKey];
			const typeKey = COL_TYPE[colKey] ?? 'unknown';
			const cell = registry.toSheetsCell(typeKey, value, { metadata: makeMetadata(typeKey) });
			const component = registry.getCellComponent(typeKey);
			return { cell, component, colKey, typeKey };
		},
		[registry],
	);

	const overlay = useOverlayController();
	const overlayClose = overlay.close;
	const overlayOpen = overlay.open;
	// Inline (in-cell) edit target — the simple text/number types render their <input> here
	// instead of a portal (mirrors production, where this rides the overlay controller tagged
	// mode:'inline'; the harness keeps it as a tiny separate state for clarity).
	const [inlineCell, setInlineCell] = useState<{ rowIndex: number; colKey: string } | null>(null);

	// THE branch under test — identical shape to production openEditor.
	const openEditor = useCallback<OpenEditor>(
		(rowIndex, colKey, anchorRect) => {
			const resolution = getSheetsCellContent(rowIndex, colKey);
			const intent = resolveEditIntent(
				resolution.typeKey,
				{ readonly: resolution.cell.readonly },
				registry.getEditorComponent,
			);
			if (intent.mode === 'none') return;
			if (intent.mode === 'inline-toggle') {
				const current = (ROWS[rowIndex] as Record<string, unknown> | undefined)?.[colKey];
				commitSpy(rowIndex, colKey, !coerceCellBoolean(current));
				return;
			}
			if (intent.mode === 'inline-edit') {
				setInlineCell({ rowIndex, colKey });
				return;
			}
			overlayOpen({ rowIndex, colKey, anchorRect });
		},
		[overlayOpen, getSheetsCellContent, registry, commitSpy],
	);

	// Active-cell + grid-root keydown nav, mirroring SheetsDomInner: click parks the active
	// cell; Enter/F2 on the grid ROOT opens the editor (here, runs the inline-toggle branch)
	// at the active cell via its stable DOM id. This replaces the removed per-cell keydown.
	const [activeCell, setActiveCell] = useState<[number, number] | undefined>(undefined);
	const onActivateCell = useCallback((col: number, row: number) => setActiveCell([col, row]), []);
	const onGridKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (overlay.isOpen) return;
			if (e.key === 'Enter' || e.key === 'F2') {
				if (!activeCell) return;
				const [col, row] = activeCell;
				const colKey = COLUMNS[col]?.key;
				const node = document.getElementById(`sheets-cell-${row}-${col}`);
				if (!colKey || !node) return;
				e.preventDefault();
				openEditor(row, colKey, node.getBoundingClientRect());
			}
		},
		[overlay.isOpen, activeCell, openEditor],
	);

	const renderCell = useCallback<RenderCell>(
		(c, ctx) => {
			const editing = !!inlineCell && inlineCell.rowIndex === c.row.index && inlineCell.colKey === c.column.id;
			return (
				<SheetsCellHost
					cell={c}
					ctx={ctx}
					getSheetsCellContent={getSheetsCellContent}
					openEditor={openEditor}
					isEditing={editing}
					onInlineCommit={(rowIndex, colKey, value) => {
						commitSpy(rowIndex, colKey, value);
						setInlineCell(null);
					}}
					onInlineCancel={() => setInlineCell(null)}
					onActivateCell={onActivateCell}
				/>
			);
		},
		[getSheetsCellContent, openEditor, onActivateCell, inlineCell, commitSpy],
	);

	const table = useSheetsTableInstance({
		columns: COLUMNS,
		data: ROWS,
		columnSizing: EMPTY,
		columnPinning: EMPTY,
		rowSelection: EMPTY,
		onColumnSizingChange: noop,
		onColumnPinningChange: noop,
		onRowSelectionChange: noop,
	});

	const active = overlay.active;
	const editorNode = useMemo(() => {
		if (!active) return null;
		const resolution = getSheetsCellContent(active.rowIndex, active.colKey);
		const intent = resolveEditIntent(
			resolution.typeKey,
			{ readonly: resolution.cell.readonly },
			registry.getEditorComponent,
		);
		if (intent.mode !== 'overlay') return null;
		const Editor = intent.editor;
		const rowValue = (ROWS[active.rowIndex] as Record<string, unknown> | undefined)?.[active.colKey];
		const geom = computeOverlayGeometry(
			typeof window !== 'undefined' ? window.innerHeight : 800,
			active.anchorRect.top,
			active.anchorRect.height,
			OVERLAY_MARGIN_PX,
			OVERLAY_MIN_BELOW_PX,
		);
		return {
			presetClass: Editor.overlayPresetClass,
			element: (
				<Editor
					value={rowValue}
					cell={resolution.cell}
					colKey={active.colKey}
					rowId={String((ROWS[active.rowIndex] as Record<string, unknown> | undefined)?.id ?? '')}
					rowIndex={active.rowIndex}
					onCommit={(next) => {
						commitSpy(active.rowIndex, active.colKey, next);
						overlayClose();
					}}
					onCancel={overlayClose}
					overlay={{ maxHeight: geom.maxHeight, flipped: geom.shouldFlip }}
				/>
			),
		};
	}, [active, getSheetsCellContent, registry, commitSpy, overlayClose]);

	return (
		<>
			<GridViewport
				table={table}
				renderCell={renderCell}
				onScroll={overlayClose}
				activeCell={activeCell}
				onGridKeyDown={onGridKeyDown}
			/>
			<OverlayManager
				open={overlay.isOpen}
				anchorRect={active?.anchorRect ?? null}
				presetClass={editorNode?.presetClass}
				onCancel={overlayClose}
			>
				{editorNode?.element}
			</OverlayManager>
		</>
	);
}

// ---- DOM helpers ----------------------------------------------------------

// The host wrapper is no longer per-cell focusable (keys live on the grid root now); it
// carries a stable `id="sheets-cell-${row}-${col}"`, so find wrappers by that id scheme.
function cellWrapper(view: HTMLElement): HTMLElement {
	const wrapper = view.closest<HTMLElement>('[id^="sheets-cell-"]');
	if (!wrapper) throw new Error('no sheets-cell wrapper for view');
	return wrapper;
}

/** Find a cell wrapper by its rendered value text. */
function cellWrapperByText(text: string): HTMLElement {
	for (const view of Array.from(document.querySelectorAll<HTMLElement>('[role="gridcell"]'))) {
		if (view.textContent?.includes(text)) return cellWrapper(view);
	}
	throw new Error(`no cell wrapper containing text: ${text}`);
}

/**
 * The boolean cell for a given polarity. The boolean view no longer renders text glyphs
 * (true -> a token <RiCheckLine> SVG, false -> a muted en-dash) so we locate by structure:
 * the `active` column is col index 1, and the two rows have fixed polarities
 * (row 0 = true, row 1 = false). Resolve the `[data-slot="boolean-cell"]` view inside the
 * matching row wrapper (`sheets-cell-${row}-1`).
 */
function booleanCellWrapper(polarity: true | false): HTMLElement {
	const row = polarity ? 0 : 1; // row 0 (Alpha) is true; row 1 (Bravo) is false
	const wrapper = document.getElementById(`sheets-cell-${row}-1`);
	const view = wrapper?.querySelector<HTMLElement>('[data-slot="boolean-cell"]');
	if (!wrapper || !view) throw new Error(`no boolean cell wrapper for polarity: ${polarity}`);
	return wrapper;
}

// ---- Suite ----------------------------------------------------------------

describe('boolean inline-toggle (host activation -> commit !current, NO overlay)', () => {
	let root: Root;
	let container: HTMLDivElement;
	const proto = window.HTMLElement.prototype;
	const origW = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
	const origH = Object.getOwnPropertyDescriptor(proto, 'offsetHeight');

	beforeEach(() => {
		// Non-zero size so TanStack Virtual's getRect yields outerSize > 0 (jsdom does no layout).
		Object.defineProperty(proto, 'offsetWidth', { configurable: true, get: () => 1000 });
		Object.defineProperty(proto, 'offsetHeight', { configurable: true, get: () => 1000 });
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => {
			root.unmount();
		});
		container.remove();
		vi.clearAllMocks();
		if (origW) Object.defineProperty(proto, 'offsetWidth', origW);
		else delete (proto as unknown as Record<string, unknown>).offsetWidth;
		if (origH) Object.defineProperty(proto, 'offsetHeight', origH);
		else delete (proto as unknown as Record<string, unknown>).offsetHeight;
	});

	it('double-click a TRUE boolean commits false and opens NO overlay', async () => {
		const commitSpy = vi.fn();
		const registry = createCellTypeRegistry([], BUILTINS);
		await renderHarness(root, <Harness registry={registry} commitSpy={commitSpy} />);

		// Row 0's `active` is true -> renders the token check.
		const wrapper = booleanCellWrapper(true);
		await act(async () => {
			wrapper.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});

		// Toggled to the negation; committed in place at (rowIndex, colKey).
		expect(commitSpy).toHaveBeenCalledTimes(1);
		expect(commitSpy).toHaveBeenCalledWith(0, 'active', false);
		// NO overlay — the boolean must never open the text (or any) editor.
		expect(document.querySelector('[data-slot="text-editor"]')).toBeNull();
		expect(document.querySelector('[data-slot="number-editor"]')).toBeNull();
	});

	it('Enter (grid root) on a FALSE boolean commits true and opens NO overlay', async () => {
		const commitSpy = vi.fn();
		const registry = createCellTypeRegistry([], BUILTINS);
		await renderHarness(root, <Harness registry={registry} commitSpy={commitSpy} />);

		// Row 1's `active` is false -> renders the muted dash. Click parks the active cell, then
		// Enter on the grid ROOT activates editing (per-cell keydown was removed in favor of the root).
		const wrapper = booleanCellWrapper(false);
		await act(async () => {
			wrapper.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		const gridRoot = document.querySelector<HTMLElement>('[data-part-id="sheets-viewport"]')!;
		await act(async () => {
			gridRoot.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		});

		expect(commitSpy).toHaveBeenCalledTimes(1);
		expect(commitSpy).toHaveBeenCalledWith(1, 'active', true);
		expect(document.querySelector('[data-slot="text-editor"]')).toBeNull();
	});

	it('CONTROL: a TEXT cell in the same grid opens its INLINE editor (toggle is boolean-only)', async () => {
		const commitSpy = vi.fn();
		const registry = createCellTypeRegistry([], BUILTINS);
		await renderHarness(root, <Harness registry={registry} commitSpy={commitSpy} />);

		const wrapper = cellWrapperByText('Alpha');
		await act(async () => {
			wrapper.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});

		// The text path edits IN PLACE — a bare inline <input>, NOT an overlay — proving the
		// boolean (inline-toggle) intent is the only one suppressed, not all activation.
		expect(document.querySelector('[data-slot="inline-cell-editor"]')).not.toBeNull();
		expect(document.querySelector('[data-slot="text-editor"]')).toBeNull();
		// And activating the text cell did NOT fire a commit (editing started, nothing saved yet).
		expect(commitSpy).not.toHaveBeenCalled();
	});
});

/* @vitest-environment jsdom */
//
// Phase-4 overlay-editor integration test (STAGE 4 GATE). Proves the NATIVE
// React-portal overlay path end-to-end through the DOM host — NO GraphQL / no
// useSheets. The harness replicates SheetsDomInner's overlay block verbatim
// (useOverlayController + the resolver + the `editorNode` render closure +
// OverlayManager + GridViewport over the S3 table), but injects a `commitSpy`
// in place of the shell's `commitCellValue`, so a commit is observable without
// the data layer.
//
// Trigger parity: editing is activated exactly as in production — the host's
// cell wrapper fires `openEditor(rowIndex, colKey, getBoundingClientRect())` on
// double-click / Enter / F2. The overlay then portals into document.body.
//
// Covers (the four gate cases):
//  - TEXT round-trip: double-click a text cell -> overlay opens (data-slot
//    "text-editor") -> type -> Enter -> commitSpy(rowIndex, colKey, "<new>") and
//    the overlay closes.
//  - JSON round-trip: open a json cell (JsonEditorDom) -> edit valid JSON -> Save
//    -> commitSpy with the PARSED object; invalid JSON blocks Save (no commit).
//  - CANCEL: open -> Escape -> commitSpy NOT called, overlay closed.
//  - EDITOR SLOT override: a consumer `cellSlots` editor (object form
//    `{ editor: MyEditor }`) compiled into the registry -> resolveNativeEditor
//    returns MyEditor (asserted directly) AND MyEditor renders (data-slot
//    "custom-editor") instead of the built-in TextEditor.
//
// Same component-test idiom as the sibling grid-dom tests: jsdom + react-dom/
// client createRoot + act (no @testing-library — not a dep of this package).
import { act, useCallback, useMemo } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSheetsTableInstance, type SheetsColumnDescriptor } from '../../table/use-sheets-table-instance';
import { GridViewport, type RenderCell } from '../../table/grid-viewport';
import { SheetsCellHost, type OpenEditor } from '../sheets-cell-host';
import { createCellTypeRegistry, type CellTypeBuiltins, type CellTypeRegistry } from '../../cell-types/cell-type-registry';
import { compileSlots, type CellSlots } from '../../cell-model/cell-slots';
import { createSheetsCell } from '../../cell-model/create-sheets-cell';
import { makeMetadata } from '../../grid/__golden__/display-cases';
import { useOverlayController } from '../overlay/use-overlay-controller';
import { OverlayManager } from '../overlay/overlay-manager';
import { resolveNativeEditor } from '../editors/editor-registry-dom';
import { computeOverlayGeometry } from '../../grid/editors/overlay-viewport-guard';
import { SheetsContext, type SheetsContextValue } from '../../context/sheets-context';
import type { EditorProps } from '../editors/editor-props';
import type { CellType } from '../../cell-types/types';
import type { SheetsCellResolution } from '../use-sheets-content';
import type { SheetsRow } from '../../grid/row-model';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ---- Fixtures -------------------------------------------------------------

const COLUMNS: SheetsColumnDescriptor[] = [
	{ key: 'name', name: 'Name', size: 160 },
	{ key: 'config', name: 'Config', size: 200 },
];

const ROWS: SheetsRow[] = [{ id: 'r1', name: 'Alpha', config: { a: 1 } }];

const COL_TYPE: Record<string, CellType> = { name: 'text', config: 'json' };

// Stub builtins: the registry's display engine routes through the real native
// dispatcher (createSheetsCell), so a column gets a genuine SheetsCell carrying
// `meta.cellType` (text factory sets it) — that's what the host reads to resolve
// the native editor.
const BUILTINS: CellTypeBuiltins = {
	toSheetsCell: (value, ctx) => createSheetsCell(value, ctx.metadata),
};

// Consumer editor override for the slot test — a stable data-slot the test asserts.
function MyEditor({ onCommit }: EditorProps) {
	return (
		<div data-slot="custom-editor">
			<button onClick={() => onCommit('from-custom')}>Apply</button>
		</div>
	);
}

const noop = () => {};
const EMPTY = {} as never;

// Overlay flip knobs — MUST match the OverlayManager/SheetsDomInner constants.
const OVERLAY_MARGIN_PX = 12;
const OVERLAY_MIN_BELOW_PX = 320;

// Minimal SheetsContext value. The OverlayManager wraps editors in EditorErrorGuard,
// which sources `config.onError` via useSheetsContext — in production the whole DOM
// grid lives under <SheetsProvider>. Only `config` is touched on the overlay path;
// the rest is stubbed (cast to satisfy the value shape without a real provider).
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

// ---- Harness: a faithful copy of SheetsDomInner's overlay block -----------
//
// Mirrors SheetsDomInner exactly: resolver from the registry, useOverlayController,
// the host's openEditor (measure rect), the `editorNode` render closure (resolve
// editor + geometry + EditorProps), and <GridViewport/> + <OverlayManager/>. The
// only swap is the injected `commitSpy` standing in for shell.commitCellValue.
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
	const overlayReanchor = overlay.reanchor;
	const openEditor = useCallback<OpenEditor>(
		(rowIndex, colKey, anchorRect) => overlayOpen({ rowIndex, colKey, anchorRect }),
		[overlayOpen],
	);

	// Mirror SheetsDomInner's FOLLOW-CELL-ON-SCROLL (Stage B): re-anchor to the live cell node,
	// or commit-and-close (blur the focused editor element) when it has unmounted.
	const activeForScroll = overlay.active;
	const onGridScroll = useCallback(() => {
		if (!activeForScroll) return;
		const colIndex = COLUMNS.findIndex((c) => c.key === activeForScroll.colKey);
		const node = colIndex >= 0 ? document.getElementById(`sheets-cell-${activeForScroll.rowIndex}-${colIndex}`) : null;
		if (node) {
			overlayReanchor(node.getBoundingClientRect());
			return;
		}
		const focused = document.activeElement;
		if (focused instanceof HTMLElement) focused.blur();
		overlayClose();
	}, [activeForScroll, overlayReanchor, overlayClose]);

	const renderCell = useCallback<RenderCell>(
		(c, ctx) => (
			<SheetsCellHost cell={c} ctx={ctx} getSheetsCellContent={getSheetsCellContent} openEditor={openEditor} />
		),
		[getSheetsCellContent, openEditor],
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
		const typeKey = resolution.cell.meta?.cellType ?? 'text';
		const Editor = resolveNativeEditor(typeKey, registry.getEditorComponent);
		if (!Editor) return null;
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
			dismissMode: Editor.commitsOnBlur ? ('commit' as const) : ('cancel' as const),
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
			<GridViewport table={table} renderCell={renderCell} onScroll={onGridScroll} />
			<OverlayManager
				open={overlay.isOpen}
				anchorRect={active?.anchorRect ?? null}
				presetClass={editorNode?.presetClass}
				dismissMode={editorNode?.dismissMode}
				onCancel={overlayClose}
			>
				{editorNode?.element}
			</OverlayManager>
		</>
	);
}

// ---- DOM helpers ----------------------------------------------------------

/** Find a cell wrapper by its rendered value text (the host's tabIndex=0 border div). */
function cellWrapperByText(text: string): HTMLElement {
	const wrappers = Array.from(document.querySelectorAll<HTMLElement>('[role="gridcell"]'));
	// The gridcell role is on the built-in view INSIDE the host's wrapper; walk up to
	// the focusable wrapper (the element carrying the activation handlers).
	for (const view of wrappers) {
		if (view.textContent?.includes(text)) {
			// The wrapper is no longer per-cell focusable (keys live on the grid root); it
			// carries a stable id="sheets-cell-${row}-${col}", so match on that.
			const wrapper = view.closest<HTMLElement>('[id^="sheets-cell-"]');
			if (wrapper) return wrapper;
		}
	}
	throw new Error(`no cell wrapper containing text: ${text}`);
}

function typeInto(input: HTMLInputElement, text: string) {
	const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
	setter.call(input, text);
	input.dispatchEvent(new Event('input', { bubbles: true }));
}

function setTextarea(ta: HTMLTextAreaElement, text: string) {
	const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
	setter.call(ta, text);
	ta.dispatchEvent(new Event('input', { bubbles: true }));
}

function findButton(label: string): HTMLButtonElement | undefined {
	return Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes(label)) as
		| HTMLButtonElement
		| undefined;
}

// ---- Suite ----------------------------------------------------------------

describe('overlay editor integration (host -> OverlayManager -> commit)', () => {
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

	it('TEXT round-trip: double-click opens, Enter commits the typed value and closes', async () => {
		const commitSpy = vi.fn();
		const registry = createCellTypeRegistry([], BUILTINS);
		await renderHarness(root, <Harness registry={registry} commitSpy={commitSpy} />);

		// Activate the text cell exactly as production does (double-click the wrapper).
		const wrapper = cellWrapperByText('Alpha');
		await act(async () => {
			wrapper.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});

		// Overlay opened with the native text editor.
		const editor = document.querySelector('[data-slot="text-editor"]');
		expect(editor).not.toBeNull();
		const input = editor!.querySelector('input') as HTMLInputElement;
		expect(input.value).toBe('Alpha');

		await act(async () => {
			typeInto(input, 'Alpha2');
		});
		await act(async () => {
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		});

		// Commit fired with (rowIndex, colKey, value); overlay closed.
		expect(commitSpy).toHaveBeenCalledTimes(1);
		expect(commitSpy).toHaveBeenCalledWith(0, 'name', 'Alpha2');
		expect(document.querySelector('[data-slot="text-editor"]')).toBeNull();
	});

	it('JSON round-trip: Save commits parsed JSON; invalid JSON blocks the commit', async () => {
		const commitSpy = vi.fn();
		const registry = createCellTypeRegistry([], BUILTINS);
		await renderHarness(root, <Harness registry={registry} commitSpy={commitSpy} />);

		// Open the json cell. The config cell shows a compact JSON preview ("{a: 1}"),
		// so locate it by its column rather than value text.
		const configView = Array.from(document.querySelectorAll<HTMLElement>('[role="gridcell"]')).find(
			(v) => !v.textContent?.includes('Alpha'),
		);
		const wrapper = configView!.closest<HTMLElement>('[id^="sheets-cell-"]')!;
		await act(async () => {
			wrapper.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});

		// The reused JsonEditor exposes a <textarea> seeded from the value.
		const ta = document.querySelector('textarea') as HTMLTextAreaElement;
		expect(ta).not.toBeNull();
		expect(JSON.parse(ta.value)).toEqual({ a: 1 });

		// (1) INVALID JSON -> Save disabled, no commit.
		await act(async () => {
			setTextarea(ta, '{ not valid');
		});
		await act(async () => {
			findButton('Save')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		expect(commitSpy).not.toHaveBeenCalled();

		// (2) VALID JSON -> Save commits the parsed object and closes.
		await act(async () => {
			setTextarea(ta, '{"a":2,"b":"x"}');
		});
		await act(async () => {
			findButton('Save')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		expect(commitSpy).toHaveBeenCalledTimes(1);
		expect(commitSpy).toHaveBeenCalledWith(0, 'config', { a: 2, b: 'x' });
		expect(document.querySelector('textarea')).toBeNull();
	});

	it('CANCEL: Escape dismisses without committing', async () => {
		const commitSpy = vi.fn();
		const registry = createCellTypeRegistry([], BUILTINS);
		await renderHarness(root, <Harness registry={registry} commitSpy={commitSpy} />);

		const wrapper = cellWrapperByText('Alpha');
		await act(async () => {
			wrapper.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		const input = document.querySelector('[data-slot="text-editor"] input') as HTMLInputElement;
		expect(input).not.toBeNull();
		await act(async () => {
			typeInto(input, 'discard me');
		});
		await act(async () => {
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		});

		expect(commitSpy).not.toHaveBeenCalled();
		expect(document.querySelector('[data-slot="text-editor"]')).toBeNull();
	});

	it('EDITOR SLOT override: a cellSlots { editor } wins over the built-in TextEditor', async () => {
		const slots: CellSlots = { text: { editor: MyEditor } };
		const registry = createCellTypeRegistry(compileSlots(slots), BUILTINS);

		// (a) the registry exposes the override, and resolveNativeEditor picks it over
		// the built-in TextEditor for the `text` typeKey.
		expect(registry.getEditorComponent('text')).toBe(MyEditor);
		expect(resolveNativeEditor('text', registry.getEditorComponent)).toBe(MyEditor);

		const commitSpy = vi.fn();
		await renderHarness(root, <Harness registry={registry} commitSpy={commitSpy} />);

		// (b) opening the text cell renders the consumer editor, NOT the built-in one.
		const wrapper = cellWrapperByText('Alpha');
		await act(async () => {
			wrapper.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		expect(document.querySelector('[data-slot="custom-editor"]')).not.toBeNull();
		expect(document.querySelector('[data-slot="text-editor"]')).toBeNull();

		// (c) and it commits through the same EditorProps.onCommit path.
		await act(async () => {
			findButton('Apply')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		expect(commitSpy).toHaveBeenCalledWith(0, 'name', 'from-custom');
	});

	it('COMMIT-ON-CLICK-AWAY: a pointerdown outside commits the in-progress text (not cancel)', async () => {
		const commitSpy = vi.fn();
		const registry = createCellTypeRegistry([], BUILTINS);
		await renderHarness(root, <Harness registry={registry} commitSpy={commitSpy} />);

		const wrapper = cellWrapperByText('Alpha');
		await act(async () => {
			wrapper.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		const input = document.querySelector('[data-slot="text-editor"] input') as HTMLInputElement;
		expect(input).not.toBeNull();
		input.focus();
		await act(async () => {
			typeInto(input, 'kept');
		});

		// A pointerdown on an OUTSIDE element: the OverlayManager (dismissMode='commit') blurs
		// the focused input → its onBlur commits the current text, then closes. NOT a cancel.
		const outside = document.createElement('button');
		document.body.appendChild(outside);
		await act(async () => {
			outside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
		});

		expect(commitSpy).toHaveBeenCalledTimes(1);
		expect(commitSpy).toHaveBeenCalledWith(0, 'name', 'kept');
		expect(document.querySelector('[data-slot="text-editor"]')).toBeNull();
		outside.remove();
	});

	it('FOLLOW-CELL-ON-SCROLL: a scroll re-anchors (does NOT close) while the cell is mounted', async () => {
		const commitSpy = vi.fn();
		const registry = createCellTypeRegistry([], BUILTINS);
		await renderHarness(root, <Harness registry={registry} commitSpy={commitSpy} />);

		const wrapper = cellWrapperByText('Alpha');
		await act(async () => {
			wrapper.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		const input = document.querySelector('[data-slot="text-editor"] input') as HTMLInputElement;
		expect(input).not.toBeNull();
		await act(async () => {
			typeInto(input, 'in-progress');
		});

		// Scroll the grid while the active cell node (sheets-cell-0-0) is still mounted: the
		// overlay re-anchors instead of closing, and nothing commits.
		const scrollRoot = document.querySelector('[data-part-id="sheets-viewport"]');
		expect(scrollRoot).not.toBeNull();
		await act(async () => {
			scrollRoot!.dispatchEvent(new Event('scroll', { bubbles: true }));
		});

		expect(document.querySelector('[data-slot="text-editor"]')).not.toBeNull();
		expect(commitSpy).not.toHaveBeenCalled();
		// And the in-progress text survived the re-anchor (editor state preserved).
		expect((document.querySelector('[data-slot="text-editor"] input') as HTMLInputElement).value).toBe('in-progress');
	});
});

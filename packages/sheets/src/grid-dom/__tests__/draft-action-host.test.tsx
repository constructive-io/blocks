/* @vitest-environment jsdom */
//
// Stage-4 host-wiring integration test. Proves the DOM host's draft/loading branches
// END-TO-END through GridViewport + SheetsCellHost with HAND-FED rows — NO GraphQL /
// useSheets (same idiom as sheets-dom.smoke.test.tsx: jsdom + react-dom/client + act).
//
// Covers exactly the three Stage-4 host responsibilities:
//  - LOADING: a cell with kind 'loading' renders LoadingCellView (data-slot
//    "loading-cell"), not the TextCellView fallback.
//  - DRAFT-ACTION: the DRAFT_ACTION_COLUMN_KEY column renders the REAL <Button>
//    (DraftActionCellView, data-slot "draft-action-cell") with status derived from the
//    row's DraftMeta (errored -> error dot; saving -> disabled), and clicking it calls
//    the threaded submitDraftRow(draftRowId).
//  - DRAFT STYLING: styleHint.draft fades the host wrapper; styleHint.error overrides
//    with the destructive bg/text (the DOM analogue of applyDraftDisabledStyle/Error).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSheetsTableInstance, type SheetsColumnDescriptor } from '../../table/use-sheets-table-instance';
import { GridViewport, type RenderCell } from '../../table/grid-viewport';
import { SheetsCellHost } from '../sheets-cell-host';
import { DRAFT_ACTION_COLUMN_KEY } from '../../grid/sheets.constants';
import { attachDraftMeta, type DraftMeta, type SheetsRow } from '../../grid/row-model';
import type { SheetsCell } from '../../cell-model/sheets-cell';
import type { SheetsCellResolution } from '../use-sheets-content';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// A draft row carrying an `error` status + a field-level error on `name`, plus the
// synthetic draft-action column. The draft-action column has no row value (synthetic).
const DRAFT_ID = 'draft:abc';
const DRAFT_META: DraftMeta = { isDraft: true, draftRowId: DRAFT_ID, status: 'error', errors: { name: 'required' } };

function makeRow(): SheetsRow {
	const row: SheetsRow = { id: DRAFT_ID, name: 'Alpha', errorCol: 'Bravo', loadingCol: null };
	return attachDraftMeta(row, DRAFT_META);
}

const ROWS: SheetsRow[] = [
	{ id: 'existing:1', name: 'Existing', errorCol: 'Stable', loadingCol: null },
	makeRow(),
];

const COLUMNS: SheetsColumnDescriptor[] = [
	{ key: 'name', name: 'Name', size: 160 },
	{ key: 'errorCol', name: 'Errored', size: 160 },
	{ key: 'loadingCol', name: 'Loading', size: 160 },
	{ key: DRAFT_ACTION_COLUMN_KEY, name: '', size: 120 },
];

// Resolver standing in for useSheetsContent's output: `name` is draft-only (faded);
// `errorCol` is draft+error (the canvas applyDraftErrorStyle case); `loadingCol` is a
// neutral loading cell; the draft-action column carries kind 'draft-action' (its
// value/styling is unused — the host special-cases it and reads DraftMeta off the row).
const getSheetsCellContent = (rowIndex: number, colKey: string): SheetsCellResolution => {
	if (colKey === DRAFT_ACTION_COLUMN_KEY) {
		const cell: SheetsCell = { kind: 'draft-action', data: null, displayData: '', readonly: true };
		return { cell, component: undefined, colKey, typeKey: 'text' };
	}
	if (colKey === 'loadingCol') {
		const cell: SheetsCell = { kind: 'loading', data: null, displayData: '', readonly: true };
		return { cell, component: undefined, colKey, typeKey: 'text' };
	}
	const value = (ROWS[rowIndex] as Record<string, unknown>)?.[colKey];
	const cell: SheetsCell = {
		kind: 'text',
		data: value,
		displayData: String(value ?? ''),
		readonly: false,
		styleHint: { draft: true, error: colKey === 'errorCol' },
	};
	return { cell, component: undefined, colKey, typeKey: 'text' };
};

const noop = () => {};
const EMPTY = {} as never;

function Harness({ submitDraftRow }: { submitDraftRow: (id: string) => Promise<unknown> }) {
	const renderCell: RenderCell = (c, ctx) => (
		<SheetsCellHost
			cell={c}
			ctx={ctx}
			getSheetsCellContent={getSheetsCellContent}
			onSubmitDraftRow={submitDraftRow}
		/>
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
	return <GridViewport table={table} renderCell={renderCell} />;
}

/** Walk from a built-in view carrying `text` up to the host's wrapper div (stable id). */
function wrapperByText(text: string): HTMLElement {
	const view = Array.from(document.querySelectorAll<HTMLElement>('[role="gridcell"]')).find((v) =>
		v.textContent?.includes(text),
	);
	const wrapper = view?.closest<HTMLElement>('[id^="sheets-cell-"]');
	if (!wrapper) throw new Error(`no cell wrapper containing text: ${text}`);
	return wrapper;
}

describe('Stage-4 host wiring (loading / draft-action / draft styling)', () => {
	let root: Root;
	let container: HTMLDivElement;
	const proto = window.HTMLElement.prototype;
	const origW = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
	const origH = Object.getOwnPropertyDescriptor(proto, 'offsetHeight');

	beforeEach(() => {
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

	it('renders LoadingCellView for kind loading; draft-action Button submits; draft+error style the wrapper', async () => {
		const submitDraftRow = vi.fn(async () => ({}));
		await act(async () => {
			root.render(<Harness submitDraftRow={submitDraftRow} />);
		});

		// (a) LOADING kind -> the skeleton view, NOT the TextCellView fallback.
		const loading = container.querySelector('[data-slot="loading-cell"]');
		expect(loading).not.toBeNull();

		// (b) DRAFT-ACTION column -> the REAL Button. status 'error' -> the error dot is
		// shown and the button stays interactive (canvas parity: not disabled on error).
		const actionBtn = container.querySelector('[data-slot="draft-action-cell"]') as HTMLButtonElement | null;
		expect(actionBtn).not.toBeNull();
		expect(container.querySelectorAll('[data-slot="draft-action-cell"]')).toHaveLength(1);
		expect(actionBtn!.disabled).toBe(false);
		expect(container.querySelector('[data-slot="draft-action-error"]')).not.toBeNull();

		// clicking the Button calls the threaded submitDraftRow with the draft id.
		await act(async () => {
			actionBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		expect(submitDraftRow).toHaveBeenCalledTimes(1);
		expect(submitDraftRow).toHaveBeenCalledWith(DRAFT_ID);

		// (c) DRAFT STYLING. draft-only (`name`) fades the wrapper (muted text).
		const nameWrapper = wrapperByText('Alpha');
		expect(nameWrapper.className).toContain('text-muted-foreground');
		expect(nameWrapper.className).not.toContain('text-destructive');

		// draft+error (`errorCol`) resolves to the destructive bg/text — twMerge collapses
		// the conflicting faded utilities so error WINS (canvas parity: applyDraftErrorStyle
		// overrides applyDraftDisabledStyle).
		const errorWrapper = wrapperByText('Bravo');
		expect(errorWrapper.className).toContain('text-destructive');
		expect(errorWrapper.className).not.toContain('text-muted-foreground');
	});
});

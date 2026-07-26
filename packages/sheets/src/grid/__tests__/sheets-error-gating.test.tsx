/* @vitest-environment jsdom */

// Gating contract for the full-screen error state (FIX A):
//   full-screen error  = INITIAL-load failure only (no server rows AND no drafts)
//   background error    = grid stays mounted; host is notified via load:error
//
// We mock `useSheets` (the headless assembly) so we can drive the exact
// dataError / combinedRows combinations under test without a backend. The native
// TanStack DOM grid (SheetsDomInner) is the ONLY render path now — the glide
// <DataEditor> mock is gone. `useSheetsContext` is stubbed so the grid path renders
// in jsdom without a real <SheetsProvider>. Raw react-dom/client + act mirrors
// sheets-provider.lifecycle.test.tsx (this package ships no @testing-library/react).

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsRow } from '../row-model';
import type { UseSheetsInternalResult } from '../use-sheets';

// --- Mocks -----------------------------------------------------------------

// SheetsDomInner reads `config` from context (config.onError) before/around the
// load-state branches; a bare stub avoids needing a real <SheetsProvider>.
vi.mock('../../context/sheets-context', () => ({
	useSheetsContext: () => ({ config: {} }),
}));

const refetchSpy = vi.fn();
let mockResult: UseSheetsInternalResult<SheetsRow>;

vi.mock('../use-sheets', () => ({
	useSheets: () => mockResult,
}));

// Imported AFTER the mocks above are registered.
import { Sheets } from '../sheets';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom has no ResizeObserver; the grid container ref constructs one. A no-op
// stub lets the grid path render (otherwise SheetsErrorBoundary catches the
// throw and masks the result with its own error fallback).
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub;

// --- Mock result builder ---------------------------------------------------

// A loaded, non-empty, non-erroring grid by default. Each test overrides only
// the fields it exercises (dataError + combinedRows length). The DOM render path
// reads the full `_shell` (content resolver, registry, commit + state mirrors), so
// the shell carries inert stubs for every field SheetsDomInner touches.
function makeResult(overrides: Partial<UseSheetsInternalResult<SheetsRow>> = {}): UseSheetsInternalResult<SheetsRow> {
	const rows: SheetsRow[] = [{ id: '1' } as SheetsRow];
	const base = {
		columns: [],
		getCellContent: () => ({ kind: 'text', data: '', displayData: '', readonly: false }),
		onCellEdited: vi.fn(),
		provideEditor: undefined,
		rowCount: rows.length,
		customRenderers: [],
		theme: { themeOverrides: {}, rowMarkerTheme: {} },
		draft: {
			hasDrafts: false,
			appendRow: vi.fn(),
			submitDrafts: vi.fn(),
			deleteSelected: vi.fn(),
		},
		selection: { gridSelection: undefined, setGridSelection: vi.fn() },
		pagination: { pageIndex: 0, pageCount: 1, setPageIndex: vi.fn() },
		isInitialLoading: false,
		dataError: null,
		hasCompletedInitialLoad: true,
		isEmpty: false,
		refetch: refetchSpy,
		_shell: {
			combinedRows: rows,
			columnKeys: ['id'],
			totalCount: rows.length,
			serverRowCount: rows.length,
			draftRowCount: 0,
			infiniteScroll: false,
			filterTree: undefined,
			filtersOpen: false,
			setFilterTree: vi.fn(),
			setFiltersOpen: vi.fn(),
			clearAllFilters: vi.fn(),
			applyFilters: vi.fn(),
			fieldTypeMap: {},
			setGridSelectionForControls: vi.fn(),
			onHeaderClicked: vi.fn(),
			onVisibleRegionChanged: vi.fn(),
			sorting: [],
			columnWidths: new Map<string, number>(),
			resizeColumn: vi.fn(),
			frozenCount: 0,
			selectedRowCount: 0,
			isSubmittingDrafts: false,
			submitDraftButtonDisabled: true,
			submitDraftLabel: 'Submit',
			// Native DOM grid wiring — the content resolver + registry + commit paths.
			getSheetsCellContent: () => ({
				cell: { kind: 'text', data: '', displayData: '', readonly: false },
				colKey: 'id',
				typeKey: 'text',
			}),
			cellRegistry: { getEditorComponent: () => undefined },
			commitCellValue: vi.fn(),
			commitCellPatch: vi.fn(),
			submitDraftRow: vi.fn(),
			invalidateData: vi.fn(),
		},
	};
	// Test-grade cast: the stub provides only the fields the DOM render path reads.
	return { ...base, ...overrides } as unknown as UseSheetsInternalResult<SheetsRow>;
}

// --- Harness ---------------------------------------------------------------

describe('Sheets full-screen error gating', () => {
	let root: Root;
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
		refetchSpy.mockClear();
	});

	afterEach(async () => {
		await act(async () => {
			root.unmount();
		});
		container.remove();
		vi.clearAllMocks();
	});

	function render(node: React.ReactElement) {
		act(() => {
			root.render(node);
		});
	}

	const errorState = () => container.querySelector('[data-part-id="sheets-container"]') === null;
	const hasDefaultErrorState = () => /Failed to load data/.test(container.textContent ?? '');
	// The native DOM grid renders the TanStack viewport (data-impl="dom"); its presence
	// means the grid path (not a load-state early return) is mounted.
	const hasGrid = () => container.querySelector('[data-part-id="sheets-viewport"]') !== null;

	it('shows the error state on initial-load failure (dataError + zero rows)', () => {
		mockResult = makeResult({ dataError: new Error('boom') });
		mockResult._shell.combinedRows = [];

		render(<Sheets tableName='users' />);

		expect(errorState()).toBe(true);
		expect(hasDefaultErrorState()).toBe(true);
		expect(hasGrid()).toBe(false);
	});

	it('lets a consumer error slot win when there are zero rows', () => {
		mockResult = makeResult({ dataError: new Error('boom') });
		mockResult._shell.combinedRows = [];

		render(
			<Sheets
				tableName='users'
				slots={{ error: ({ error }) => <div data-testid='custom-error'>{String((error as Error).message)}</div> }}
			/>,
		);

		expect(container.querySelector('[data-testid="custom-error"]')?.textContent).toBe('boom');
		expect(hasDefaultErrorState()).toBe(false);
		expect(hasGrid()).toBe(false);
	});

	it('keeps the grid mounted on a background error when rows are present', () => {
		// dataError set, but combinedRows still populated (keepPreviousData) → no blank.
		mockResult = makeResult({ dataError: new Error('transient refetch') });

		render(<Sheets tableName='users' slots={{ toolbar: <div /> }} />);

		expect(errorState()).toBe(false);
		expect(hasDefaultErrorState()).toBe(false);
		expect(hasGrid()).toBe(true);
	});

	it('keeps the grid mounted on a background error when only drafts are present', () => {
		// No server rows, but a draft exists → combinedRows length > 0 → not blanked.
		const draft = { id: 'draft-1' } as SheetsRow;
		mockResult = makeResult({ dataError: new Error('transient refetch') });
		mockResult._shell.combinedRows = [draft];
		mockResult._shell.serverRowCount = 0;
		mockResult._shell.draftRowCount = 1;

		render(<Sheets tableName='users' slots={{ toolbar: <div /> }} />);

		expect(errorState()).toBe(false);
		expect(hasGrid()).toBe(true);
	});

	it('wires retry to refetch from the error state', () => {
		mockResult = makeResult({ dataError: new Error('boom') });
		mockResult._shell.combinedRows = [];

		render(<Sheets tableName='users' />);

		const retryBtn = Array.from(container.querySelectorAll('button')).find((b) => /retry/i.test(b.textContent ?? ''));
		expect(retryBtn).toBeTruthy();

		act(() => {
			retryBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(refetchSpy).toHaveBeenCalledTimes(1);
	});
});

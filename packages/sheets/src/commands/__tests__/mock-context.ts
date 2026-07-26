/**
 * A spyable {@link GridCommandContext} for command-body parity tests. Every dispatcher
 * is a vitest mock so a test can assert each DEFAULT_COMMANDS body calls the right ctx
 * method with the right args (pinning parity BEFORE the Stage B wiring). Live getters
 * are backed by a mutable `state` the test can set.
 */

import { vi } from 'vitest';

import type { GridCommandContext, CellMatrix } from '../context';
import type { SheetsSelection, SelectionRect } from '../../selection/selection-model';

export interface MockCtxState {
	rowCount: number;
	colCount: number;
	activeCell: [number, number] | undefined;
	selection: SheetsSelection | undefined;
	combinedRows: readonly unknown[];
	columnKeys: readonly string[];
	anchor: [number, number] | null;
	/** Return value the mocked openEditorAtActive yields (gates editor.openActive / typeToEdit). */
	openEditorAtActiveResult: boolean;
}

export interface MockCtx extends GridCommandContext {
	state: MockCtxState;
}

const defaults: MockCtxState = {
	rowCount: 10,
	colCount: 3,
	activeCell: [1, 1],
	selection: { current: { cell: [1, 1] }, rows: { toArray: () => [] } as never, columns: { toArray: () => [] } as never },
	combinedRows: [],
	columnKeys: ['id', 'name', 'active'],
	anchor: null,
	openEditorAtActiveResult: true,
};

export function createMockCtx(overrides?: Partial<MockCtxState>): MockCtx {
	const state: MockCtxState = { ...defaults, ...overrides };

	const ctx: MockCtx = {
		state,
		get rowCount() {
			return state.rowCount;
		},
		get colCount() {
			return state.colCount;
		},
		get activeCell() {
			return state.activeCell;
		},
		get selection() {
			return state.selection;
		},
		get combinedRows() {
			return state.combinedRows;
		},
		get columnKeys() {
			return state.columnKeys;
		},
		getAnchor: vi.fn(() => state.anchor),
		setAnchor: vi.fn((a: [number, number] | null) => {
			state.anchor = a;
		}),
		setActiveCell: vi.fn(),
		moveActiveCell: vi.fn(),
		extendToCell: vi.fn(),
		setSelection: vi.fn(),
		commitCells: vi.fn(async () => ({ applied: [] }) as never),
		openEditorAtActive: vi.fn(() => state.openEditorAtActiveResult),
		openEditorAt: vi.fn(),
		undo: vi.fn(),
		redo: vi.fn(),
		scrollToCell: vi.fn(),
		sortToggle: vi.fn(),
		toggleRow: vi.fn(),
		toggleAll: vi.fn(),
		getCellsInRange: vi.fn((_rect: SelectionRect): CellMatrix => ({ cols: [], rows: [], values: [] })),
		toTSV: vi.fn(() => ''),
		emit: vi.fn(),
	};
	return ctx;
}

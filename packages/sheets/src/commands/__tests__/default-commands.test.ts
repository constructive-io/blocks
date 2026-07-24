/**
 * PARITY spec — pins each DEFAULT_COMMANDS body to the VERBATIM sheets.tsx branch it was
 * lifted from, using a spy ctx (mock-context). Asserts the exact ctx dispatcher calls +
 * args + anchor resets + scroll order the original handler performed, BEFORE the Stage B
 * wiring. This is the regression gate for the lift: if a body drifts from the original
 * keydown/pointer handler, a call assertion here fails.
 */

import { describe, expect, it } from 'vitest';

import { createGridCommandRegistry } from '../registry';
import type { GridCommand } from '../types';
import { emptySheetsSelection, selectAllCells, computeKeyNavTarget } from '../../selection/selection-model';
import { createMockCtx, type MockCtx } from './mock-context';

const registry = createGridCommandRegistry();
function cmd(id: string): GridCommand {
	const c = registry.get(id);
	if (!c) throw new Error(`missing command ${id}`);
	return c;
}
function run(id: string, ctx: MockCtx, payload?: unknown) {
	void cmd(id).run(ctx, payload);
}
function canRun(id: string, ctx: MockCtx, payload?: unknown): boolean {
	const c = cmd(id);
	return c.canRun ? c.canRun(ctx, payload) : true;
}

describe('edit.undo / edit.redo (lifted: undo/redo keydown branch)', () => {
	it('edit.undo calls ctx.undo', () => {
		const ctx = createMockCtx();
		run('edit.undo', ctx);
		expect(ctx.undo).toHaveBeenCalledTimes(1);
		expect(ctx.redo).not.toHaveBeenCalled();
	});
	it('edit.redo calls ctx.redo', () => {
		const ctx = createMockCtx();
		run('edit.redo', ctx);
		expect(ctx.redo).toHaveBeenCalledTimes(1);
	});
});

describe('selection.all (lifted: Ctrl/Cmd+A branch)', () => {
	it('canRun is false on an empty grid (original returned early)', () => {
		expect(canRun('selection.all', createMockCtx({ rowCount: 0 }))).toBe(false);
		expect(canRun('selection.all', createMockCtx({ colCount: 0 }))).toBe(false);
		expect(canRun('selection.all', createMockCtx())).toBe(true);
	});
	it('sets anchor [0,0] and selects the whole grid via selectAllCells', () => {
		const sel = emptySheetsSelection;
		const ctx = createMockCtx({ selection: sel, colCount: 4, rowCount: 7 });
		run('selection.all', ctx);
		expect(ctx.setAnchor).toHaveBeenCalledWith([0, 0]);
		expect(ctx.setSelection).toHaveBeenCalledWith(selectAllCells(sel, 4, 7));
	});
});

describe('cell.move* (lifted: plain-arrow branch)', () => {
	const cases: [string, number, number][] = [
		['cell.moveUp', 0, -1],
		['cell.moveDown', 0, 1],
		['cell.moveLeft', -1, 0],
		['cell.moveRight', 1, 0],
	];
	for (const [id, dCol, dRow] of cases) {
		it(`${id}: setAnchor(clamped target) → moveActiveCell(delta) → scrollToCell(target)`, () => {
			const base: [number, number] = [1, 1];
			const ctx = createMockCtx({ selection: { current: { cell: base } } as never, colCount: 3, rowCount: 10 });
			run(id, ctx);
			const nextCol = Math.max(0, Math.min(base[0] + dCol, 3 - 1));
			const nextRow = Math.max(0, Math.min(base[1] + dRow, 10 - 1));
			expect(ctx.setAnchor).toHaveBeenCalledWith([nextCol, nextRow]);
			expect(ctx.moveActiveCell).toHaveBeenCalledWith(dCol, dRow, 3, 10);
			expect(ctx.scrollToCell).toHaveBeenCalledWith(nextCol, nextRow);
			// plain move never extends.
			expect(ctx.extendToCell).not.toHaveBeenCalled();
		});
	}
	it('clamps at the grid edge (no overflow past col/row bounds)', () => {
		const ctx = createMockCtx({ selection: { current: { cell: [0, 0] } } as never, colCount: 3, rowCount: 10 });
		run('cell.moveLeft', ctx);
		expect(ctx.setAnchor).toHaveBeenCalledWith([0, 0]);
		expect(ctx.scrollToCell).toHaveBeenCalledWith(0, 0);
	});
	it('canRun false on empty grid', () => {
		expect(canRun('cell.moveDown', createMockCtx({ rowCount: 0 }))).toBe(false);
	});
});

describe('cell.extend* (lifted: shift-arrow branch)', () => {
	const cases: [string, number, number][] = [
		['cell.extendUp', 0, -1],
		['cell.extendDown', 0, 1],
		['cell.extendLeft', -1, 0],
		['cell.extendRight', 1, 0],
	];
	for (const [id, dCol, dRow] of cases) {
		it(`${id}: extendToCell(clamped target) → scrollToCell(target), never moveActiveCell`, () => {
			const base: [number, number] = [1, 1];
			const ctx = createMockCtx({ selection: { current: { cell: base } } as never, colCount: 3, rowCount: 10 });
			run(id, ctx);
			const nextCol = Math.max(0, Math.min(base[0] + dCol, 3 - 1));
			const nextRow = Math.max(0, Math.min(base[1] + dRow, 10 - 1));
			expect(ctx.extendToCell).toHaveBeenCalledWith(nextCol, nextRow);
			expect(ctx.scrollToCell).toHaveBeenCalledWith(nextCol, nextRow);
			expect(ctx.moveActiveCell).not.toHaveBeenCalled();
			// extend keeps the anchor put (never resets it).
			expect(ctx.setAnchor).not.toHaveBeenCalled();
		});
	}
});

describe('cell.navAbsolute (lifted: Tab/Home/End/PageUp/PageDown branch)', () => {
	it('computes the target via computeKeyNavTarget, resets anchor, activates, scrolls', () => {
		const base: [number, number] = [1, 2];
		const ctx = createMockCtx({ selection: { current: { cell: base } } as never, colCount: 3, rowCount: 10 });
		const payload = { key: 'End', ctrlOrMeta: true, shift: false, pageRows: 5 };
		run('cell.navAbsolute', ctx, payload);
		const target = computeKeyNavTarget('End', { ctrlOrMeta: true, shift: false }, base, 3, 10, 5)!;
		expect(ctx.setAnchor).toHaveBeenCalledWith([target[0], target[1]]);
		expect(ctx.setActiveCell).toHaveBeenCalledWith(target[0], target[1]);
		expect(ctx.scrollToCell).toHaveBeenCalledWith(target[0], target[1]);
	});
	it('no-ops when computeKeyNavTarget yields null (unhandled key)', () => {
		const ctx = createMockCtx();
		run('cell.navAbsolute', ctx, { key: 'Escape', ctrlOrMeta: false, shift: false, pageRows: 5 });
		expect(ctx.setActiveCell).not.toHaveBeenCalled();
		expect(ctx.scrollToCell).not.toHaveBeenCalled();
	});
	it('canRun false on empty grid', () => {
		expect(canRun('cell.navAbsolute', createMockCtx({ colCount: 0 }))).toBe(false);
	});
});

describe('editor.openActive (lifted: Enter/F2 branch)', () => {
	it('canRun opens the editor at the active cell and returns its boolean', () => {
		const opened = createMockCtx({ openEditorAtActiveResult: true });
		expect(canRun('editor.openActive', opened)).toBe(true);
		expect(opened.openEditorAtActive).toHaveBeenCalledWith();

		const notOpened = createMockCtx({ openEditorAtActiveResult: false });
		expect(canRun('editor.openActive', notOpened)).toBe(false);
	});
});

describe('editor.typeToEdit (lifted: type-to-edit sentinel)', () => {
	it('canRun opens the editor seeded with the typed char and returns its boolean', () => {
		const ctx = createMockCtx({ openEditorAtActiveResult: true });
		expect(canRun('editor.typeToEdit', ctx, { char: 'q' })).toBe(true);
		expect(ctx.openEditorAtActive).toHaveBeenCalledWith('q');
	});
	it('returns false (key falls through) when the cell is non-editable', () => {
		const ctx = createMockCtx({ openEditorAtActiveResult: false });
		expect(canRun('editor.typeToEdit', ctx, { char: 'q' })).toBe(false);
	});
});

describe('cell.activate / cell.extendToClicked (lifted: handleActivateCell)', () => {
	it('cell.activate resets the anchor and parks the active cell', () => {
		const ctx = createMockCtx();
		run('cell.activate', ctx, { col: 2, row: 4 });
		expect(ctx.setAnchor).toHaveBeenCalledWith([2, 4]);
		expect(ctx.setActiveCell).toHaveBeenCalledWith(2, 4);
	});
	it('cell.extendToClicked extends from the latched anchor (shift-click), no anchor reset', () => {
		const ctx = createMockCtx();
		run('cell.extendToClicked', ctx, { col: 2, row: 4 });
		expect(ctx.extendToCell).toHaveBeenCalledWith(2, 4);
		expect(ctx.setActiveCell).not.toHaveBeenCalled();
		expect(ctx.setAnchor).not.toHaveBeenCalled();
	});
});

describe('editor.open (lifted: dblclick openEditor)', () => {
	it('opens the overlay at the explicit cell + anchor rect', () => {
		const ctx = createMockCtx();
		const rect = { top: 1 } as DOMRect;
		run('editor.open', ctx, { rowIndex: 3, colKey: 'name', anchorRect: rect, initialText: 'x' });
		expect(ctx.openEditorAt).toHaveBeenCalledWith(3, 'name', rect, 'x');
	});
});

describe('structural pointer commands (routed for invariant completeness)', () => {
	it('header.sortToggle delegates to ctx.sortToggle(colKey)', () => {
		const ctx = createMockCtx();
		run('header.sortToggle', ctx, { colKey: 'name' });
		expect(ctx.sortToggle).toHaveBeenCalledWith('name');
	});
	it('rowmarker.toggleRow delegates to ctx.toggleRow(rowIndex, shift)', () => {
		const ctx = createMockCtx();
		run('rowmarker.toggleRow', ctx, { rowIndex: 5, shift: true });
		expect(ctx.toggleRow).toHaveBeenCalledWith(5, true);
	});
	it('rowmarker.toggleAll delegates to ctx.toggleAll', () => {
		const ctx = createMockCtx();
		run('rowmarker.toggleAll', ctx);
		expect(ctx.toggleAll).toHaveBeenCalledTimes(1);
	});
});

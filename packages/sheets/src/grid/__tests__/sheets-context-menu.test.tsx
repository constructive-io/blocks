/**
 * CONTEXT MENU action→dispatch mapping (Stage B). The menu is "just another event source →
 * dispatch": each clipboard/clear item runs the matching COMMAND ID through `onAction` (the grid's
 * dispatch), and is DISABLED when its command's `canRun` is false (`isEnabled`). Add row / Delete
 * go through their dedicated callbacks; Delete is gated on a selection + routes to the confirm.
 *
 * We test the PURE item model (`buildContextMenuItems`) directly — the Base-UI menu popup needs a
 * real layout environment to mount (jsdom does not render it), so the full open→click interaction
 * is a CHROME visual check (see the open items in the Stage-B report). The model is the single
 * source of truth the component maps over, so asserting it covers the mapping + gating.
 */
import { describe, expect, it, vi } from 'vitest';

import { buildContextMenuItems, type ContextMenuItem } from '../sheets.context-menu';

function byKey(items: ContextMenuItem[], key: string): ContextMenuItem {
	const it = items.find((i) => i.key === key);
	if (!it) throw new Error(`missing menu item ${key}`);
	return it;
}

describe('buildContextMenuItems', () => {
	it('maps each clipboard/clear item to its command id via onAction', () => {
		const onAction = vi.fn();
		const items = buildContextMenuItems({
			onAction,
			isEnabled: () => true,
			onAddRow: vi.fn(),
			requestDelete: vi.fn(),
			selectedRowCount: 0,
		});
		for (const [key, id] of [
			['copy', 'clipboard.copy'],
			['cut', 'clipboard.cut'],
			['paste', 'clipboard.paste'],
			['clear', 'cell.clear'],
		] as const) {
			byKey(items, key).run?.();
			expect(onAction).toHaveBeenLastCalledWith(id);
		}
	});

	it('disables an item whose command canRun is false', () => {
		const items = buildContextMenuItems({
			onAction: vi.fn(),
			isEnabled: (id) => id !== 'clipboard.paste',
			onAddRow: vi.fn(),
			requestDelete: vi.fn(),
			selectedRowCount: 1,
		});
		expect(byKey(items, 'paste').disabled).toBe(true);
		expect(byKey(items, 'copy').disabled).toBe(false);
	});

	it('routes Add row through its dedicated callback, not onAction', () => {
		const onAction = vi.fn();
		const onAddRow = vi.fn();
		const items = buildContextMenuItems({
			onAction,
			isEnabled: () => true,
			onAddRow,
			requestDelete: vi.fn(),
			selectedRowCount: 0,
		});
		byKey(items, 'add-row').run?.();
		expect(onAddRow).toHaveBeenCalledTimes(1);
		expect(onAction).not.toHaveBeenCalled();
	});

	it('disables Delete with no selection and requests the confirm (never deletes directly)', () => {
		const requestDelete = vi.fn();
		const noSel = buildContextMenuItems({
			onAction: vi.fn(),
			isEnabled: () => true,
			onAddRow: vi.fn(),
			requestDelete,
			selectedRowCount: 0,
		});
		const del = byKey(noSel, 'delete-rows');
		expect(del.destructive).toBe(true);
		expect(del.disabled).toBe(true);
		expect(del.label).toBe('Delete row');

		const withSel = buildContextMenuItems({
			onAction: vi.fn(),
			isEnabled: () => true,
			onAddRow: vi.fn(),
			requestDelete,
			selectedRowCount: 3,
		});
		const del2 = byKey(withSel, 'delete-rows');
		expect(del2.disabled).toBe(false);
		expect(del2.label).toBe('Delete 3 rows');
		// Running it requests the confirm dialog — it must NOT delete directly (confirm gates that).
		del2.run?.();
		expect(requestDelete).toHaveBeenCalledTimes(1);
	});

	it('places a separator between the clipboard block and the row actions', () => {
		const items = buildContextMenuItems({
			onAction: vi.fn(),
			isEnabled: () => true,
			onAddRow: vi.fn(),
			requestDelete: vi.fn(),
			selectedRowCount: 0,
		});
		const sepIndex = items.findIndex((i) => i.separator);
		const clearIndex = items.findIndex((i) => i.key === 'clear');
		const addIndex = items.findIndex((i) => i.key === 'add-row');
		expect(sepIndex).toBeGreaterThan(clearIndex);
		expect(sepIndex).toBeLessThan(addIndex);
	});
});

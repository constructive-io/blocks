/**
 * CONTEXT MENU action→dispatch mapping (Stage B). The menu is "just another event source →
 * dispatch": each clipboard/clear item runs the matching COMMAND ID through `onAction` (the grid's
 * dispatch), and is DISABLED when its command's `canRun` is false (`isEnabled`). Add row / Delete
 * go through their dedicated callbacks; Delete follows the removal plan + routes to the confirm.
 *
 * We test the PURE item model (`buildContextMenuItems`) directly — the Base-UI menu popup needs a
 * real layout environment to mount (jsdom does not render it), so the full open→click interaction
 * is a CHROME visual check (see the open items in the Stage-B report). The model is the single
 * source of truth the component maps over, so asserting it covers the mapping + gating.
 */
import { describe, expect, it, vi } from 'vitest';

import { buildContextMenuItems, type ContextMenuItem } from '../sheets.context-menu';
import type { RowRemoval } from '../row-removal';

const removal = (saved: number, unsaved = 0, blockedReason: string | null = null): RowRemoval => ({
	rows: Array.from({ length: saved + unsaved }, (_, index) => index),
	saved,
	unsaved,
	blockedReason,
});

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
			removal: removal(1),
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
			removal: removal(1),
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
			removal: removal(1),
		});
		byKey(items, 'add-row').run?.();
		expect(onAddRow).toHaveBeenCalledTimes(1);
		expect(onAction).not.toHaveBeenCalled();
	});

	it('names Delete by what it does, says why it is off, and only requests the confirm', () => {
		const requestDelete = vi.fn();
		const build = (plan: RowRemoval) =>
			byKey(buildContextMenuItems({ onAction: vi.fn(), isEnabled: () => true, onAddRow: vi.fn(), requestDelete, removal: plan }), 'delete-rows');

		const blocked = build(removal(1, 0, 'This table has no primary key.'));
		expect(blocked.destructive).toBe(true);
		expect(blocked.disabled).toBe(true);
		expect(blocked.reason).toBe('This table has no primary key.');

		// A new row is discarded, also on a table whose saved rows cannot be deleted.
		const discard = build(removal(0, 1));
		expect(discard.disabled).toBe(false);
		expect(discard.label).toBe('Discard new row');

		const several = build(removal(3));
		expect(several.label).toBe('Delete 3 rows');
		expect(several.reason).toBeUndefined();
		// Running it requests the confirm dialog — it must NOT delete directly (confirm gates that).
		several.run?.();
		expect(requestDelete).toHaveBeenCalledTimes(1);
	});

	it('routes the sort items to the view commands and says why a column cannot be sorted', () => {
		const onAction = vi.fn();
		const items = buildContextMenuItems({
			onAction,
			isEnabled: (id) => !id.startsWith('view.sort'),
			reasonFor: (id) => (id.startsWith('view.sort') ? 'Linked records cannot be sorted.' : null),
			onAddRow: vi.fn(),
			requestDelete: vi.fn(),
			removal: removal(1),
		});
		const ascending = byKey(items, 'sort-asc');
		expect(ascending.disabled).toBe(true);
		expect(ascending.reason).toBe('Linked records cannot be sorted.');
		ascending.run?.();
		byKey(items, 'sort-desc').run?.();
		expect(onAction.mock.calls).toEqual([['view.sortAscending'], ['view.sortDescending']]);
		expect(byKey(items, 'copy').reason).toBeUndefined();
	});

});

// Removing rows: a new row that was never saved is discarded, even where saved rows cannot be
// deleted, and the words say which happens. "The row" is the selection, else the cursor's rows.
import { describe, expect, it } from 'vitest';

import { RangeSet } from '../../selection/range-set';
import { emptySheetsSelection, extendRangeToCell, selectCell, selectRange } from '../../selection/selection-model';
import { attachDraftMeta } from '../row-model';
import { planRowRemoval, rowRemovalConfirm, rowRemovalLabel, rowsUnderSelection } from '../row-removal';

const saved = (id: number) => ({ id });
const draft = (id: string) => attachDraftMeta({ name: '' }, { isDraft: true, draftRowId: id, status: 'draft', errors: null } as never);
const data = [saved(1), saved(2), saved(3), draft('d1'), draft('d2')];

describe('row removal', () => {
	it('acts on the selected rows, else the rows under the cursor, cut to the rows there are', () => {
		expect(rowsUnderSelection(selectRange(emptySheetsSelection, 1, 2), data.length)).toEqual([1, 2]);
		expect(rowsUnderSelection(selectCell(emptySheetsSelection, 4, 3), data.length)).toEqual([3]);
		expect(rowsUnderSelection(extendRangeToCell(emptySheetsSelection, 2, 4, 0, 2), data.length)).toEqual([2, 3, 4]);
		const all = { ...emptySheetsSelection, rows: RangeSet.empty(), current: { cell: [0, 0] as [number, number], range: { x: 0, y: 0, width: 3, height: 1_000_000 } } };
		expect(rowsUnderSelection(all, data.length)).toEqual([0, 1, 2, 3, 4]);
		expect(rowsUnderSelection(emptySheetsSelection, data.length)).toEqual([]);
	});

	it('discards new rows on a table whose saved rows cannot be deleted, and says why saved ones stay', () => {
		const access = { canDeleteSaved: false, readOnlyReason: 'This table has no primary key.' };
		const drafts = planRowRemoval([3, 4], data, access);
		expect(drafts).toMatchObject({ saved: 0, unsaved: 2, blockedReason: null });
		expect(rowRemovalLabel(drafts)).toBe('Discard 2 new rows');
		expect(planRowRemoval([2, 3], data, access).blockedReason).toBe('This table has no primary key.');
		expect(planRowRemoval([], data, access).blockedReason).toBe('Select the rows to delete.');
	});

	it('says a new row loses what was typed and a saved row is gone for good', () => {
		const access = { canDeleteSaved: true };
		expect(rowRemovalConfirm(planRowRemoval([3], data, access))).toEqual({
			title: 'Discard new row?',
			description: 'This row is not saved yet. What you typed in it will be lost.',
			action: 'Discard',
		});
		const mixed = planRowRemoval([0, 1, 4], data, access);
		expect(rowRemovalLabel(mixed)).toBe('Delete 3 rows');
		expect(rowRemovalConfirm(mixed)).toEqual({
			title: 'Delete 3 rows?',
			description: 'This will permanently delete 2 rows and discard 1 new row that is not saved yet. This cannot be undone.',
			action: 'Delete',
		});
		expect(rowRemovalLabel(planRowRemoval([0], data, access))).toBe('Delete row');
	});
});

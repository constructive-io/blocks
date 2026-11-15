// What removing rows does. A saved row is deleted for good; a new row that was never saved is
// only discarded, which the table's delete permission does not govern. One plan drives the
// toolbar's Delete, the context menu's item and the words of the confirm, so they agree.
import type { SheetsSelection } from '../selection/selection-model';
import { getDraftMeta, type SheetsRow } from './row-model';

export interface RowRemoval {
	/** The row indexes to remove. */
	rows: readonly number[];
	/** Saved rows among them: deleted on the server. */
	saved: number;
	/** New rows among them: discarded. */
	unsaved: number;
	/** Why these rows cannot be removed, or null. */
	blockedReason: string | null;
}

export interface RowRemovalAccess {
	/** The table lets saved rows be deleted. */
	canDeleteSaved: boolean;
	/** Why the table's records cannot be changed, when it says. */
	readOnlyReason?: string | null;
}

/**
 * The rows an action on "the row" means: the selected rows, else the rows under the cursor's
 * range or cell. A range is cut to the `rowCount` rows there are (Select all spans every row).
 */
export function rowsUnderSelection(selection: SheetsSelection | null | undefined, rowCount: number): number[] {
	if (!selection) return [];
	const selected = selection.rows.toArray();
	if (selected.length > 0) return selected;
	const range = selection.current?.range;
	if (range && range.height > 0) {
		const end = Math.min(range.y + range.height, rowCount);
		return Array.from({ length: Math.max(0, end - range.y) }, (_, offset) => range.y + offset);
	}
	const cell = selection.current?.cell;
	return cell ? [cell[1]] : [];
}

export function planRowRemoval(rows: readonly number[], data: readonly unknown[], access: RowRemovalAccess): RowRemoval {
	const present = rows.filter((row) => row >= 0 && row < data.length);
	const unsaved = present.filter((row) => getDraftMeta(data[row] as SheetsRow)?.isDraft).length;
	const saved = present.length - unsaved;
	const blockedReason =
		present.length === 0
			? 'Select the rows to delete.'
			: saved > 0 && !access.canDeleteSaved
				? access.readOnlyReason ?? 'Saved rows in this table cannot be deleted.'
				: null;
	return { rows: present, saved, unsaved, blockedReason };
}

const count = (n: number, noun: string) => `${n.toLocaleString()} ${noun}${n === 1 ? '' : 's'}`;

/** The action's name: "Delete row", "Delete 3 rows", "Discard new row". */
export function rowRemovalLabel(plan: RowRemoval): string {
	const total = plan.rows.length;
	if (plan.saved === 0 && plan.unsaved > 0) return plan.unsaved === 1 ? 'Discard new row' : `Discard ${count(plan.unsaved, 'new row')}`;
	return total > 1 ? `Delete ${count(total, 'row')}` : 'Delete row';
}

/** The confirm's words: a saved row is gone for good, a new row only loses what was typed. */
export function rowRemovalConfirm(plan: RowRemoval): { title: string; description: string; action: string } {
	const { saved, unsaved } = plan;
	if (saved === 0) {
		return {
			title: unsaved === 1 ? 'Discard new row?' : `Discard ${count(unsaved, 'new row')}?`,
			description: unsaved === 1 ? 'This row is not saved yet. What you typed in it will be lost.' : 'These rows are not saved yet. What you typed in them will be lost.',
			action: 'Discard',
		};
	}
	const deleted = `This will permanently delete ${count(saved, 'row')}`;
	return {
		title: `Delete ${count(saved + unsaved, 'row')}?`,
		description: unsaved > 0 ? `${deleted} and discard ${count(unsaved, 'new row')} that ${unsaved === 1 ? 'is' : 'are'} not saved yet. This cannot be undone.` : `${deleted}. This cannot be undone.`,
		action: 'Delete',
	};
}

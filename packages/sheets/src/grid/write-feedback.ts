// What the user sees when a write does not happen: a value that does not fit its
// column, a cell that cannot be changed, or a save the server refused. Every message
// is plain product language; the reasons come from the table model or the value
// rules, never from a backend type name.

import { toast } from '@constructive-io/ui/toast';

import { fieldLabel } from '../cell-types/field-label';

/** One cell write the grid refused before sending it. */
export interface RejectedWrite {
	rowIndex: number;
	colKey: string;
	reason: string;
}

/**
 * Report writes that were skipped because the value did not fit or the cell is read
 * only. One write names its field and reason; several are counted and grouped by
 * field and reason, so a paste into the wrong column says how much was left out and why.
 */
export function reportRejectedWrites(rejected: readonly RejectedWrite[], total: number): void {
	if (rejected.length === 0) return;
	if (rejected.length === 1 && total <= 1) {
		const [only] = rejected;
		toast.error({ message: `${fieldLabel(only.colKey)} was not changed`, description: only.reason });
		return;
	}
	const groups = new Map<string, { colKey: string; reason: string; count: number }>();
	for (const entry of rejected) {
		const key = `${entry.colKey}\u0000${entry.reason}`;
		const group = groups.get(key);
		if (group) group.count += 1;
		else groups.set(key, { colKey: entry.colKey, reason: entry.reason, count: 1 });
	}
	const lines = [...groups.values()].map(
		(group) => `${fieldLabel(group.colKey)} (${group.count} ${group.count === 1 ? 'cell' : 'cells'}): ${group.reason}`,
	);
	const skipped = rejected.length;
	toast.warning({
		// The verb agrees with the cells left alone: "1 of 3 cells was not changed".
		message: `${skipped} of ${total} ${total === 1 ? 'cell' : 'cells'} ${skipped === 1 ? 'was' : 'were'} not changed`,
		description: lines.join('\n'),
	});
}

/** Tell the user why a cell they tried to edit cannot be changed. */
export function reportReadOnlyCell(colKey: string, reason: string): void {
	toast.info({ message: `${fieldLabel(colKey)} cannot be changed`, description: reason });
}

/** Tell the user why a new row was not saved: the fields it still needs. */
export function reportIncompleteDraft(message: string): void {
	toast.warning({ message });
}

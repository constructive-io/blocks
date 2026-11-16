// Default DOM view for the boolean family. A boolean column IS a checkbox column, so it
// renders the design-system Checkbox: checked for true, unchecked for false, nothing for
// null/undefined ("no value" never reads as false).
//
// One click on the checkbox flips the value. The click target is a plain element around
// the checkbox, not the checkbox button: the grid root keeps the keyboard focus, and the
// gridcell stays the one thing a screen reader announces. A click anywhere else in the
// cell only selects it; Enter and double-click on the cell flip the value as before.
// A cell that cannot be changed shows the checkbox with no click target.
// Keyed off the boolean payload in `cell.data` (NOT displayData — the factory leaves
// displayData '' for parity).

import type { MouseEvent } from 'react';

import { Checkbox } from '@constructive-io/ui/checkbox';

import { cn } from '../../utils/cn';
import type { CellProps } from '../cell-props';

function stopEvent(event: MouseEvent) {
	event.stopPropagation();
}

export function BooleanCellView(props: CellProps) {
	const value = props.cell.data;
	const hasValue = value === true || value === false;
	const editable = !props.cell.readonly && !props.readOnlyReason && !props.disabled;

	if (!editable) {
		return (
			<div data-slot="boolean-cell" className="flex h-full w-full items-center px-3">
				{hasValue ? <Checkbox checked={value === true} readOnly tabIndex={-1} className="pointer-events-none" /> : null}
			</div>
		);
	}

	// A click with Shift, Ctrl or Cmd belongs to the selection (extend a range), not to the value.
	const toggle = (event: MouseEvent) => {
		if (event.shiftKey || event.metaKey || event.ctrlKey) return;
		props.onStartEdit();
	};

	return (
		<div data-slot="boolean-cell" className="group/boolean flex h-full w-full items-center px-3">
			<span
				data-slot="boolean-toggle"
				// The margin and padding cancel out: a 28px target around a 16px checkbox, same layout.
				className="-m-1.5 inline-flex cursor-pointer items-center justify-center p-1.5"
				onClick={toggle}
				// Two clicks are two flips; the cell's own double-click must not add a third.
				onDoubleClick={stopEvent}
			>
				{hasValue ? (
					<Checkbox checked={value === true} readOnly tabIndex={-1} className="pointer-events-none" />
				) : (
					// An empty cell has no checkbox, so it never reads as false. A dashed box shows
					// where to click when the pointer or the cursor is on the cell.
					<span
						aria-hidden="true"
						data-slot="boolean-empty"
						className={cn(
							'border-input size-4.5 rounded-xs border border-dashed opacity-0 group-hover/boolean:opacity-100 sm:size-4',
							props.isActive && 'opacity-100',
						)}
					/>
				)}
			</span>
		</div>
	);
}

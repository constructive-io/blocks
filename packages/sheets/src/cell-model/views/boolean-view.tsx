// Default DOM view for the boolean family. A boolean column IS a checkbox column,
// so it renders the design-system Checkbox (@constructive-io/ui, Base UI-backed) as a
// READ-ONLY status indicator: checked for true, unchecked for false, empty cell for
// null/undefined. `pointer-events-none` keeps the existing double-click-to-toggle model
// intact — clicks pass through to the host cell wrapper; the checkbox is display only.
// Keyed off the boolean payload in `cell.data` (NOT displayData — the factory leaves
// displayData '' for parity).

import { Checkbox } from '@constructive-io/ui/checkbox';

import type { CellProps } from '../cell-props';

export function BooleanCellView(props: CellProps) {
	const value = props.cell.data;
	const hasValue = value === true || value === false;

	return (
		<div role="gridcell" data-slot="boolean-cell" className="flex h-full w-full items-center px-3">
			{hasValue ? (
				<Checkbox checked={value === true} readOnly tabIndex={-1} className="pointer-events-none" />
			) : null}
		</div>
	);
}

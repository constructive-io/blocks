// Public component contract for a native DOM cell view. Pure types.

import type { CellType } from '../cell-types/types';
import type { SheetsCell } from './sheets-cell';

/** Smallest render-column descriptor a cell view needs now. Overridable. */
export interface CellColumnDescriptor {
	key: string;
	name: string;
	cellType: CellType;
}

/** Props every native cell view receives. Minimal and overridable. */
export interface CellProps {
	cell: SheetsCell;
	value: unknown;
	colKey: string;
	rowId: string;
	rowIndex: number;
	column: CellColumnDescriptor;
	isEditing: boolean;
	onStartEdit: () => void;
	disabled: boolean;
}

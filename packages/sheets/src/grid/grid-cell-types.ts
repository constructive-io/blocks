import type { ColumnModel, RelationModel, TableModel } from '@constructive-io/data';

import type { FieldMetadata } from '../cell-types/cell-type-resolver';
import type { RelationInfo } from '../store/relation-info-slice';

// Relation rendering options surfaced to cell factories alongside metadata
export interface RelationCellOptions {
	relationChipLimit?: number;
	relationLabelMaxLength?: number;
}

// Metadata used when creating cells from values
export interface CellCreationMetadata {
	cellType: string;
	fieldName: string;
	fieldMeta?: FieldMetadata;
	relationInfo?: RelationInfo;
	/** The table-model column behind this cell, or null when the cell is not a column (a relation, a draft action). */
	column?: ColumnModel | null;
	/** The table-model relation behind this cell, or null when the cell is not a relation. */
	relation?: RelationModel | null;
	/** The table model of the grid, or null while it loads. */
	table?: TableModel | null;
	/** Every record a list relation links to when the relation reports a total, else null ("+N more"). */
	relationTotalCount?: number | null;
	relationOptions?: RelationCellOptions;
	canEdit: boolean;
	isReadonly: boolean;
	activationBehavior: 'single-click' | 'double-click';
}

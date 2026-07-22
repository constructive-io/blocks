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
	relationOptions?: RelationCellOptions;
	canEdit: boolean;
	isReadonly: boolean;
	activationBehavior: 'single-click' | 'double-click';
}

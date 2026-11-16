import { CellRegistry } from './cell-registry';
import { NON_EDITABLE_TYPES, VIEWER_ONLY_TYPES } from './cell-type-groups';
import { mapToFrontendCellType } from './type-mapping';

export interface FieldMetadata {
	name: string;
	type?: {
		gqlType: string;
		pgType?: string | null;
		pgAlias?: string | null;
		isArray?: boolean;
		subtype?: string | null;
	};
}

export interface CellTypeResolution {
	cellType: string;
	canEdit: boolean;
	canActivate: boolean;
	activationBehavior: 'single-click' | 'double-click';
	isReadonly: boolean;
}

// Use double-click to activate overlay for all cell types
const SINGLE_CLICK_CELL_TYPES = new Set<string>();

/**
 * Resolve a cell type from raw `_meta` field metadata.
 *
 * @deprecated The grid routes table-model columns with `cellTypeForColumn` and takes
 * read-only state from the model's write flags. This resolver never marks a field
 * read-only by its name; it only says whether the cell type itself is editable.
 */
export function resolveCellType(fieldName: string, fieldMeta?: FieldMetadata): CellTypeResolution {
	const isReadonly = false;

	let cellType: string = 'text'; // Default fallback

	if (fieldMeta?.type) {
		// First try CellRegistry matching (same as existing logic)
		// NOTE: Cell type is determined ONLY from schema metadata, never from runtime values
		const matchedEntry = CellRegistry.findByMatch({
			gqlType: fieldMeta.type.gqlType || '',
			isArray: !!fieldMeta.type.isArray,
			pgAlias: fieldMeta.type.pgAlias,
			pgType: fieldMeta.type.pgType,
			subtype: fieldMeta.type.subtype ?? null,
			fieldName,
		});

		if (matchedEntry) {
			cellType = matchedEntry.type;
		} else {
			// Fallback: Map GraphQL field metadata to frontend cell types
			cellType = mapToFrontendCellType({
				gqlType: fieldMeta.type.gqlType,
				isArray: !!fieldMeta.type.isArray,
				pgType: fieldMeta.type.pgType,
				subtype: fieldMeta.type.subtype ?? null,
			});
		}
	}

	// Determine editing capabilities
	const canEdit = !isReadonly && !NON_EDITABLE_TYPES.has(cellType);
	const canActivate = canEdit || VIEWER_ONLY_TYPES.has(cellType);
	const activationBehavior = SINGLE_CLICK_CELL_TYPES.has(cellType) ? 'single-click' : 'double-click';

	return {
		cellType,
		canEdit,
		canActivate,
		activationBehavior,
		isReadonly,
	};
}

export function shouldShowCellActivation(_fieldName: string, cellType: string): boolean {
	if (VIEWER_ONLY_TYPES.has(cellType)) {
		return false;
	}

	return true;
}

/**
 * Whether raw field metadata describes an image column. Decided by the type only
 * (a registered matcher or the image type), never by the field's name.
 *
 * @deprecated Read `ColumnModel.value.file?.kind === 'image'` from the table model.
 */
export function isImageField(fieldMeta?: FieldMetadata, fieldName?: string): boolean {
	if (!fieldMeta || !fieldName) return false;

	if (mapToFrontendCellType({
		gqlType: fieldMeta.type?.gqlType || '',
		isArray: !!fieldMeta.type?.isArray,
		pgType: fieldMeta.type?.pgType,
		subtype: fieldMeta.type?.subtype ?? null,
	}) === 'image') return true;

	// Also check using CellRegistry matching
	const matchedEntry = CellRegistry.findByMatch({
		gqlType: fieldMeta.type?.gqlType || '',
		isArray: !!fieldMeta.type?.isArray,
		pgAlias: fieldMeta.type?.pgAlias,
		pgType: fieldMeta.type?.pgType,
		subtype: fieldMeta.type?.subtype ?? null,
		fieldName,
	});

	return matchedEntry?.type === 'image';
}

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

const READONLY_CONDITIONS = new Map([
	['id', (fieldMeta?: FieldMetadata) => fieldMeta?.type?.gqlType === 'UUID'],
	['createdAt', () => true],
	['updatedAt', () => true],
]);

export function resolveCellType(fieldName: string, fieldMeta?: FieldMetadata): CellTypeResolution {
	// Check for readonly fields first
	const readonlyCheck = READONLY_CONDITIONS.get(fieldName);
	const isReadonly = readonlyCheck?.(fieldMeta) ?? false;

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
				pgAlias: fieldMeta.type.pgAlias,
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

export function shouldShowCellActivation(fieldName: string, cellType: string): boolean {
	// Disable activation for specific readonly fields
	if (fieldName === 'createdAt' || fieldName === 'updatedAt') {
		return false;
	}

	if (VIEWER_ONLY_TYPES.has(cellType)) {
		return false;
	}

	return true;
}

// Helper for checking if a field is an image type (used by existing column logic)
export function isImageField(fieldMeta?: FieldMetadata, fieldName?: string): boolean {
	if (!fieldMeta || !fieldName) return false;

	// Check if this field is configured as an image type
	const isImageByType =
		fieldMeta.type?.gqlType === 'JSON' && // Image fields are often JSON
		(fieldName.toLowerCase().includes('image') ||
			fieldName.toLowerCase().includes('picture') ||
			fieldName.toLowerCase().includes('photo') ||
			fieldName.toLowerCase().includes('avatar'));

	// Also check using CellRegistry matching
	const matchedEntry = CellRegistry.findByMatch({
		gqlType: fieldMeta.type?.gqlType || '',
		isArray: !!fieldMeta.type?.isArray,
		pgAlias: fieldMeta.type?.pgAlias,
		pgType: fieldMeta.type?.pgType,
		subtype: fieldMeta.type?.subtype ?? null,
		fieldName,
	});

	return isImageByType || matchedEntry?.type === 'image';
}

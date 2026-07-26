// Native SheetsCell factory for the MEDIA family (image/file/video/audio/upload).
//
// Ports v1 `ImageCellFactory` (grid/cell-content-factory.ts). The glide cell put
// the resolved URL in BOTH `data` and `displayData` as a single-element array
// (`[url]`); empty/null/'' collapses to `['']`. The neutral SheetsCell keeps the
// SAME `data: [url]` array (so copyText === JSON.stringify([url]) like glide) and
// sets `displayData` to the STRING form of that array (JSON.stringify) so the
// `image` kind — projected via stringifyField, NOT the geometry/custom branch —
// yields the SAME displayText glide produced from its array `displayData`.
//
// URL extraction logic copied verbatim (NOT imported from cell-content-factory,
// which stays glide-only and is deleted at cutover).

import type { CellType } from '../../cell-types/types';
import type { CellCreationMetadata } from '../../grid/grid-cell-types';
import { MEDIA_TYPES } from '../../cell-types/cell-type-groups';
import type { SheetsCell } from '../sheets-cell';
import type { SheetsCellFactory } from './types';

/** Resolve a media URL from a string or an object's url/src/href/path keys (v1 order). */
function resolveMediaUrl(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'object' && value) {
		const obj = value as Record<string, unknown>;
		return (obj.url || obj.src || obj.href || obj.path || '') as string;
	}
	return '';
}

export const imageSheetsCellFactory: SheetsCellFactory = {
	canHandle(cellType: string): boolean {
		return MEDIA_TYPES.has(cellType);
	},

	create(value: unknown, metadata: CellCreationMetadata): SheetsCell {
		const url = value === null || value === undefined || value === '' ? '' : resolveMediaUrl(value);
		const data = [url];
		return {
			kind: 'image',
			data,
			displayData: JSON.stringify(data),
			readonly: false,
			meta: { cellType: metadata.cellType as CellType }
		};
	}
};

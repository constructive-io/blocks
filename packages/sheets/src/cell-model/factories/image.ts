// Native SheetsCell factory for the MEDIA family (image/file/video/audio/upload).
// Attachment columns hold URL text and use the text factory instead.
//
// `data` is a single-element array holding the durable URL (`['']` when there is
// none), so copyText === JSON.stringify([url]) as before; `displayData` is the string
// form of that array. A signed preview URL never enters this payload: it expires, so
// copy/export only ever carry the stored URL.

import type { CellType } from '../../cell-types/types';
import type { CellCreationMetadata } from '../../grid/grid-cell-types';
import { MEDIA_TYPES } from '../../cell-types/cell-type-groups';
import { getImageUrl } from '../../utils/file.utils';
import type { SheetsCell } from '../sheets-cell';
import type { SheetsCellFactory } from './types';

export const imageSheetsCellFactory: SheetsCellFactory = {
	canHandle(cellType: string): boolean {
		return cellType !== 'attachment' && MEDIA_TYPES.has(cellType);
	},

	create(value: unknown, metadata: CellCreationMetadata): SheetsCell {
		// Keep the legacy copy/export representation and its durable URL.
		const data = [getImageUrl(value) ?? ''];
		return {
			kind: 'image',
			data,
			displayData: JSON.stringify(data),
			readonly: false,
			meta: { cellType: metadata.cellType as CellType }
		};
	}
};

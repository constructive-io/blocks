// Native SheetsCell factory for file columns: image, upload, lists of uploads,
// and attachment links (the MEDIA family).
//
// `data` holds the durable URL of each file (`['']` for an empty single cell),
// so copy and export carry stored URLs only. A signed preview URL never enters
// this payload: it expires. `meta` carries the column and table models so the
// view can resolve previews and show the column's upload state.

import type { ColumnModel, TableModel } from '@constructive-io/data';

import type { CellType } from '../../cell-types/types';
import type { CellCreationMetadata } from '../../grid/grid-cell-types';
import { MEDIA_TYPES } from '../../cell-types/cell-type-groups';
import { storedFilesOf } from '../../utils/file.utils';
import type { SheetsCell } from '../sheets-cell';
import type { SheetsCellFactory } from './types';

/** What a file cell's `meta` carries beside its cell type. */
export interface FileCellMeta {
	cellType: CellType;
	/** The column model, or null when the grid has not modeled the column. */
	column: ColumnModel | null;
	/** The table model, or null. */
	table: TableModel | null;
}

/** The file meta of a cell, when the cell is a file cell. */
export function fileCellMetaOf(cell: SheetsCell): FileCellMeta | null {
	const meta = cell.meta as Partial<FileCellMeta> | undefined;
	if (!meta?.cellType) return null;
	return { cellType: meta.cellType, column: meta.column ?? null, table: meta.table ?? null };
}

export const imageSheetsCellFactory: SheetsCellFactory = {
	canHandle(cellType: string): boolean {
		return MEDIA_TYPES.has(cellType);
	},

	create(value: unknown, metadata: CellCreationMetadata): SheetsCell {
		const column = metadata.column ?? null;
		const files = storedFilesOf(value, column?.value.file);
		const urls = files.map((file) => file.url ?? '');
		const data = urls.length > 0 ? urls : [''];
		const meta: FileCellMeta = { cellType: metadata.cellType as CellType, column, table: metadata.table ?? null };
		return {
			kind: 'image',
			data,
			displayData: JSON.stringify(data),
			readonly: false,
			meta: { ...meta },
		};
	}
};

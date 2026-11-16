// Which files table a file column uploads into. Pure: no requests.
//
// The server binds a column to its files table (`MetaField.file.filesType`)
// when the API has exactly one. Otherwise the storage service's only files
// table is used, and with several the host must choose one
// (`SheetsConfig.upload.columns[table][column].filesType`, or
// `upload.filesType` for every column). Without a choice the column is
// read-only: the grid never picks a files table by name.

import type { ColumnModel } from '@constructive-io/data';

import type { ResolvedUploadChoices } from './upload-config';
import type { StorageCatalog, StoragePlane } from './storage-catalog';

export type UploadBinding =
	| { status: 'plane'; plane: StoragePlane }
	/** The storage `_meta` names no upload mutation: the fallback discovery decides (one plane only). */
	| { status: 'discovery' }
	| { status: 'unavailable'; reason: string };

export const SEVERAL_FILE_STORES_REASON =
	'The storage service has several file stores, and none is chosen for this column.';

export function resolveUploadBinding(
	column: Pick<ColumnModel, 'value'>,
	catalog: StorageCatalog,
	choices: ResolvedUploadChoices,
): UploadBinding {
	const file = column.value.file;
	if (!file) return { status: 'unavailable', reason: 'This column does not hold files.' };
	if (catalog.source === 'discovery') return { status: 'discovery' };

	const wanted = file.filesType ?? choices.filesType;
	if (wanted) {
		const plane = catalog.planes.find((candidate) => candidate.filesType === wanted);
		return plane
			? { status: 'plane', plane }
			: { status: 'unavailable', reason: `The storage service does not offer the file store "${wanted}" this column uses.` };
	}
	if (catalog.planes.length === 1) return { status: 'plane', plane: catalog.planes[0]! };
	return { status: 'unavailable', reason: SEVERAL_FILE_STORES_REASON };
}

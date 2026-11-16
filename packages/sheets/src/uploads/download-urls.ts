// Download URLs for stored files, read in batches through the model of the
// files table: its list field, its filter argument, its key column and the
// download URL field `_meta.storage` names. One request per batch with the
// key's `in` operator; one request per file when the key filter has only
// `equalTo`. A file the reader cannot see, or a field the schema lacks, simply
// has no URL: the cell then shows the file's name.

import type { ColumnModel, TableModel } from '@constructive-io/data';

import type { SheetsStorageTransport } from '../context/sheets-context';
import type { SheetsExecuteFn } from '../context/sheets-execute';
import { fileKeyField, type PlaneDetails } from './storage-catalog';

/** Where download URLs are read: an executor and the files table model on that API. */
export interface DownloadUrlSource {
	execute: SheetsExecuteFn;
	files: TableModel;
	/** Field on the files type that returns the URL; checked against the schema by the caller. */
	downloadUrlField: string;
}

/** The download URL source of a storage plane, or null when its previews cannot be signed. */
export function downloadUrlSourceOf(storage: SheetsStorageTransport, details: PlaneDetails): DownloadUrlSource | null {
	if (!details.files || !details.hasDownloadUrl || !details.plane.downloadUrlField) return null;
	const source = { execute: storage.execute, files: details.files, downloadUrlField: details.plane.downloadUrlField };
	return urlQueryFor(source) ? source : null;
}

interface UrlQuery {
	keyColumn: ColumnModel;
	operator: 'in' | 'equalTo';
	source: string;
	variables: (ids: readonly string[]) => Record<string, unknown>;
	read: (data: unknown) => Array<Record<string, unknown> | null>;
}

function urlQueryFor({ files, downloadUrlField }: Omit<DownloadUrlSource, 'execute'>): UrlQuery | null {
	const keyField = fileKeyField(files);
	const keyColumn = files.columns.find((column) => column.name === keyField && column.readable);
	const list = files.operations.list;
	const filter = keyColumn?.filter;
	if (!keyColumn || !list?.filter || !filter) return null;
	const operators = new Set(filter.operators.map((operator) => operator.name));
	const operator = operators.has('in') ? 'in' : operators.has('equalTo') ? 'equalTo' : null;
	if (!operator) return null;
	const first = list.first ? `, $first: ${list.first.type}` : '';
	const firstArg = list.first ? `, ${list.first.name}: $first` : '';
	const nodes = `{ ${keyColumn.name} ${downloadUrlField} }`;
	const selection = list.shape === 'connection' ? `{ nodes ${nodes} }` : nodes;
	return {
		keyColumn,
		operator,
		source: `query SheetsFileDownloadUrls($where: ${list.filter.type}${first}) { ${list.field}(${list.filter.name}: $where${firstArg}) ${selection} }`,
		variables: (ids) => ({
			where: { [filter.field]: operator === 'in' ? { in: ids } : { equalTo: ids[0] } },
			...(list.first ? { first: ids.length } : {}),
		}),
		read: (data) => {
			const value = (data as Record<string, unknown> | null)?.[list.field];
			const rows = list.shape === 'connection' ? (value as { nodes?: unknown } | null)?.nodes : value;
			return Array.isArray(rows) ? (rows as Array<Record<string, unknown> | null>) : [];
		},
	};
}

/** Download URLs by file id. Ids without a URL have no entry. */
export async function fetchDownloadUrls(source: DownloadUrlSource, ids: readonly string[]): Promise<Map<string, string>> {
	const urls = new Map<string, string>();
	const query = urlQueryFor(source);
	if (ids.length === 0 || !query) return urls;
	const collect = (data: unknown) => {
		for (const row of query.read(data)) {
			const id = row?.[query.keyColumn.name];
			const url = row?.[source.downloadUrlField];
			if (typeof id === 'string' && typeof url === 'string' && url) urls.set(id, url);
		}
	};
	if (query.operator === 'in') {
		collect(await source.execute(query.source, query.variables(ids)));
	} else {
		const results = await Promise.allSettled(ids.map((id) => source.execute(query.source, query.variables([id]))));
		for (const result of results) if (result.status === 'fulfilled') collect(result.value);
	}
	return urls;
}

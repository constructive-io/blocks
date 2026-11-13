// A preview column for a storage files table (`table.storage.role === 'files'`):
// each row shows its file (a thumbnail for an image) and a download link. This
// is not a storage browser; the files table's own columns stay as they are.
//
// The URL comes from the files type's download URL field (`_meta.storage`
// names it, and a `__type` lookup confirms the API has it), read in batches
// through the table's own list field and key filter on the data endpoint.
//
// Two columns of the storage module are read by their API names for display
// only: `mimeType` (whether to show a thumbnail) and `filename`. Without them
// the row shows its key and no thumbnail.

import { useQuery } from '@tanstack/react-query';
import { DownloadIcon, FileIcon } from 'lucide-react';

import { createSchemaTypeLoader, type SchemaTypeLoader, type TableModel } from '@constructive-io/data';

import type { CellProps } from '../cell-model/cell-props';
import type { SheetsCellResolution } from '../grid-dom/use-sheets-content';
import { useSheetsContext } from '../context/sheets-context';
import type { SheetsExecuteFn } from '../context/sheets-execute';
import { sheetsQueryKeys } from '../hooks/query-keys';
import { useSheetsMediaUrl, type MediaUrlResolver } from '../hooks/use-sheets-media-url';
import { cn } from '../utils/cn';
import { basename } from '../utils/file.utils';
import { fetchDownloadUrls, type DownloadUrlSource } from './download-urls';
import { fileKeyField } from './storage-catalog';

export const FILE_PREVIEW_COLUMN_KEY = '__file_preview__';

const FILE_COLUMNS = { mime: 'mimeType', filename: 'filename', key: 'key' } as const;

/** The preview column of a files table, or null for any other table. */
export function filesTablePreviewColumn(table: TableModel | null | undefined): { id: string; title: string; width: number } | null {
	if (table?.storage?.role !== 'files' || !table.storage.downloadUrlField || !fileKeyField(table) || !table.operations.list) return null;
	return { id: FILE_PREVIEW_COLUMN_KEY, title: 'File', width: 168 };
}

/** Resolve the preview column's cells; every other cell goes to `resolve`. */
export function withFilePreviewCells(
	resolve: (rowIndex: number, colKey: string) => SheetsCellResolution,
	rows: readonly unknown[],
	table: TableModel | null | undefined,
): (rowIndex: number, colKey: string) => SheetsCellResolution {
	if (!filesTablePreviewColumn(table)) return resolve;
	return (rowIndex, colKey) => {
		if (colKey !== FILE_PREVIEW_COLUMN_KEY) return resolve(rowIndex, colKey);
		const row = rows[rowIndex];
		return {
			cell: { kind: row ? 'custom' : 'loading', data: row ?? null, displayData: '', readonly: true, meta: { table } },
			component: row ? FileRowPreviewCellView : undefined,
			colKey,
			typeKey: 'file-preview',
			column: null,
			relation: null,
		};
	};
}

const loaders = new WeakMap<SheetsExecuteFn, SchemaTypeLoader>();

async function readSource(execute: SheetsExecuteFn, table: TableModel): Promise<DownloadUrlSource | null> {
	const field = table.storage?.downloadUrlField;
	if (!field) return null;
	let loader = loaders.get(execute);
	if (!loader) {
		loader = createSchemaTypeLoader();
		loaders.set(execute, loader);
	}
	await loader.loadTypes(execute, [table.name]);
	const type = loader.index.get(table.name);
	return type?.fields?.some((candidate) => candidate.name === field) ? { execute, files: table, downloadUrlField: field } : null;
}

function useFilesTableResolver(table: TableModel | null): MediaUrlResolver | null {
	const { execute, scopeKey } = useSheetsContext();
	const query = useQuery({
		queryKey: [...sheetsQueryKeys.scope(scopeKey), 'files-table-download', table?.key ?? ''],
		queryFn: () => readSource(execute, table!),
		enabled: Boolean(table),
		staleTime: Number.POSITIVE_INFINITY,
		structuralSharing: false,
	});
	const source = query.data;
	return source && table ? { key: `data|${table.key}`, resolve: (ids) => fetchDownloadUrls(source, ids) } : null;
}

function text(row: Record<string, unknown>, name: string): string | null {
	const value = row[name];
	return typeof value === 'string' && value ? value : null;
}

/** The preview cell of one files-table row: thumbnail or icon, name, and a download link. */
export function FileRowPreviewCellView(props: CellProps) {
	const table = ((props.cell.meta as { table?: TableModel } | undefined)?.table) ?? null;
	const row = (props.cell.data ?? {}) as Record<string, unknown>;
	const keyField = fileKeyField(table);
	const id = keyField && typeof row[keyField] === 'string' ? (row[keyField] as string) : null;
	const mime = text(row, FILE_COLUMNS.mime);
	const objectKey = text(row, FILE_COLUMNS.key);
	const name = text(row, FILE_COLUMNS.filename) ?? (objectKey ? basename(objectKey) : 'File');
	const resolver = useFilesTableResolver(table);
	const isImage = Boolean(mime?.startsWith('image/'));
	const { url, onImageError, onImageLoad } = useSheetsMediaUrl(id ? { id } : null, { previewImage: true, resolver });

	return (
		<div data-slot="file-preview-cell" className="flex h-full w-full items-center gap-2 overflow-hidden ps-3 pe-1.5">
			<span className="relative flex aspect-square h-full max-h-7 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted" aria-hidden="true">
				{isImage && url ? (
					<img src={url} alt="" decoding="async" onError={onImageError} onLoad={onImageLoad} className="absolute inset-0 size-full rounded-sm object-cover outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10" />
				) : (
					<FileIcon className="size-3.5 text-muted-foreground" />
				)}
			</span>
			<span className="min-w-0 flex-1 truncate text-sm" title={mime ? `${name}\n${mime}` : name}>{name}</span>
			{url ? (
				<a
					href={url}
					target="_blank"
					rel="noreferrer"
					download={name}
					aria-label={`Download ${name}`}
					title="Download"
					onClick={(event) => event.stopPropagation()}
					onDoubleClick={(event) => event.stopPropagation()}
					className={cn(
						'flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-hidden',
						'hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
					)}
				>
					<DownloadIcon className="size-3.5" aria-hidden="true" />
				</a>
			) : (
				<span className="flex size-6 shrink-0 items-center justify-center text-xs text-muted-foreground" title="The file is not available for download yet.">—</span>
			)}
		</div>
	);
}

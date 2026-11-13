// What a file cell holds, read through the value domains the backend defines:
//
//   image / upload  an object with at least one of `url`, `id`, `key`, plus
//                   optional `bucket`, `bucket_id`, `provider`, `mime`, `size`,
//                   `filename` (and `versions` for images). The upload
//                   mutation returns exactly this projection; `url` is set only
//                   for a public bucket and is durable.
//   attachment      an http(s) URL string.
//   lists           an array of the above (upload[]).
//
// Nothing here guesses other property names. A signed download URL never
// enters a stored value: it expires, so it lives only in the preview cache.

import type { ColumnFileModel } from '@constructive-io/data';

/** One file of a cell, normalized for display. */
export interface StoredFile {
	/** Files-row id from the projection, or null. */
	id: string | null;
	/** Object key from the projection, or null. */
	key: string | null;
	/** Durable URL: the projection's public `url`, or the attachment link. Never a signed URL. */
	url: string | null;
	filename: string | null;
	mime: string | null;
	size: number | null;
	/** The stored element exactly as the cell holds it, written back unchanged when the file is kept. */
	raw: unknown;
}

function text(value: unknown): string | null {
	return typeof value === 'string' && value !== '' ? value : null;
}

function size(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
	return null;
}

function fromObject(value: Record<string, unknown>): StoredFile {
	return {
		id: text(value.id),
		key: text(value.key),
		url: text(value.url),
		filename: text(value.filename),
		mime: text(value.mime),
		size: size(value.size),
		raw: value,
	};
}

function fromLink(value: string): StoredFile {
	return { id: null, key: null, url: value, filename: basename(value), mime: null, size: null, raw: value };
}

function fromElement(value: unknown): StoredFile | null {
	if (value == null) return null;
	if (typeof value === 'string') return value ? fromLink(value) : null;
	if (typeof value === 'object' && !Array.isArray(value)) return fromObject(value as Record<string, unknown>);
	// Unknown element: keep it so a list write never drops data it did not understand.
	return { id: null, key: null, url: null, filename: null, mime: null, size: null, raw: value };
}

/**
 * The files of a cell value, in order. A list column yields every element; a
 * single column yields zero or one file. `file` may be null when the column
 * model is not known: the value's shape is then read as is.
 */
export function storedFilesOf(value: unknown, file?: ColumnFileModel | null): StoredFile[] {
	if (Array.isArray(value)) return value.flatMap((element): StoredFile[] => { const file = fromElement(element); return file ? [file] : []; });
	if (file?.multiple && value == null) return [];
	const single = fromElement(value);
	return single ? [single] : [];
}

/** Last path segment of a URL, without query or hash. */
export function basename(url: string): string {
	const path = url.split(/[?#]/)[0] ?? url;
	const segment = path.slice(path.lastIndexOf('/') + 1);
	try {
		return decodeURIComponent(segment) || url;
	} catch {
		return segment || url;
	}
}

/** The name to show for a file: its filename, else the URL's last segment, else its key. */
export function fileLabel(file: StoredFile): string {
	return file.filename ?? (file.url ? basename(file.url) : null) ?? (file.key ? basename(file.key) : null) ?? 'File';
}

/** True when the file should preview as an image. */
export function isImageFile(file: StoredFile, kind: ColumnFileModel['kind'] | null): boolean {
	if (file.mime) return file.mime.startsWith('image/');
	return kind === 'image';
}

/** A short human type label: `PNG`, `PDF`, or the mime type. */
export function fileTypeLabel(mime: string | null, name?: string | null): string | null {
	if (mime) {
		const subtype = mime.split('/')[1];
		if (subtype && /^[a-z0-9.+-]+$/i.test(subtype) && subtype.length <= 8) return subtype.replace(/^x-/, '').toUpperCase();
		return mime;
	}
	const extension = name?.match(/\.([a-z0-9]{1,8})$/i)?.[1];
	return extension ? extension.toUpperCase() : null;
}

/** Name, type and size, joined for a title or a chip's second line. */
export function fileDetails(file: StoredFile): string {
	const label = fileLabel(file);
	return [label, fileTypeLabel(file.mime, label), file.size != null ? formatFileSize(file.size) : null]
		.filter(Boolean)
		.join(' • ');
}

/** Format a byte count: `0 B`, `1.5 KB`, `10 MB`. */
export const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/** Durable URL of the first file of a value, for copy and export. */
export function durableUrlOf(value: unknown): string | null {
	return storedFilesOf(value).find((file) => file.url)?.url ?? null;
}

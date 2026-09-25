/**
 * Pure presentational helpers for the Storage UI kit.
 *
 * No side effects, no I/O — safe to import anywhere (including non-'use client'
 * leaf components).
 */

import type { StorageBucket, StorageObject } from './types';

/** Humanize a byte count, e.g. 1536 -> "1.5 KB". */
export function humanizeBytes(bytes: number | null | undefined): string {
	if (bytes == null || Number.isNaN(bytes) || bytes < 0) return '—';
	if (bytes === 0) return '0 B';

	const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
	const exponent = Math.min(Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)), units.length - 1);
	const value = bytes / 1024 ** exponent;
	// Whole bytes show no decimals (round any fractional byte count); larger units show one.
	const formatted = exponent === 0 ? String(Math.round(value)) : value.toFixed(1);
	return `${formatted} ${units[exponent]}`;
}

const COUNT = new Intl.NumberFormat('en-US');

/** Thousands-separated count that renders the same on the server and in the browser. */
export function formatCount(value: number): string {
	return COUNT.format(value);
}

// Built once: `toLocaleDateString` creates a formatter on every call, which adds up across table rows.
const DATE = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const DATE_TIME = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Format an ISO timestamp as a compact, locale date — e.g. "Jun 24, 2026". */
export function formatDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	const time = Date.parse(iso);
	return Number.isNaN(time) ? '—' : DATE.format(time);
}

/** Format an ISO timestamp with date + time — used in the detail sheet. */
export function formatDateTime(iso: string | null | undefined): string {
	if (!iso) return '—';
	const time = Date.parse(iso);
	return Number.isNaN(time) ? '—' : DATE_TIME.format(time);
}

/**
 * Short, human-friendly label for a MIME type — e.g.
 * "image/png" -> "PNG", "application/pdf" -> "PDF",
 * "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> "DOCX".
 */
export function shortMimeLabel(mimeType: string | null | undefined): string {
	if (!mimeType) return '—';
	const lower = mimeType.toLowerCase();

	const known: Record<string, string> = {
		'application/pdf': 'PDF',
		'application/zip': 'ZIP',
		'application/x-zip-compressed': 'ZIP',
		'application/gzip': 'GZIP',
		'application/x-tar': 'TAR',
		'application/json': 'JSON',
		'application/msword': 'DOC',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
		'application/vnd.ms-excel': 'XLS',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
		'application/vnd.ms-powerpoint': 'PPT',
		'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
		'text/csv': 'CSV',
		'text/plain': 'TXT',
		'text/markdown': 'MD',
	};
	if (known[lower]) return known[lower];

	// Fall back to the subtype: "image/svg+xml" -> "SVG", "video/mp4" -> "MP4".
	const subtype = lower.split('/')[1] ?? lower;
	const base = subtype.split('+')[0].replace(/^x-/, '');
	return base.toUpperCase();
}

/** Best display name for an object: filename, falling back to its key. */
export function objectDisplayName(object: Pick<StorageObject, 'filename' | 'key'>): string {
	return object.filename?.trim() || object.key;
}

/** Best display name for a bucket: its friendly name, falling back to its key. */
export function bucketDisplayName(bucket: Pick<StorageBucket, 'key'> & { name?: string | null }): string {
	return bucket.name?.trim() || bucket.key;
}

export type FileCategory = 'image' | 'video' | 'audio' | 'document' | 'spreadsheet' | 'archive' | 'text' | 'folder' | 'other';

const DOCUMENT_TYPES = new Set([
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.ms-powerpoint',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);
const SPREADSHEET_TYPES = new Set([
	'text/csv',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const ARCHIVE_TYPES = new Set([
	'application/zip',
	'application/x-zip-compressed',
	'application/gzip',
	'application/x-tar',
	'application/x-7z-compressed',
	'application/x-rar-compressed',
]);

/** Broad family of a MIME type, for choosing an icon and its tint. */
export function fileCategory(mimeType: string | null | undefined): FileCategory {
	if (!mimeType) return 'other';
	const lower = mimeType.toLowerCase();
	if (lower.startsWith('image/')) return 'image';
	if (lower.startsWith('video/')) return 'video';
	if (lower.startsWith('audio/')) return 'audio';
	if (DOCUMENT_TYPES.has(lower)) return 'document';
	if (SPREADSHEET_TYPES.has(lower)) return 'spreadsheet';
	if (ARCHIVE_TYPES.has(lower)) return 'archive';
	if (lower.startsWith('text/') || lower === 'application/json') return 'text';
	return 'other';
}

/** The folder part of an object key, e.g. "launch/cover.png" → "launch/". */
export function keyFolder(key: string): string {
	const slash = key.lastIndexOf('/');
	return slash > 0 ? key.slice(0, slash + 1) : '';
}

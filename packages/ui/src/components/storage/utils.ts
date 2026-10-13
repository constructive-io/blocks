/**
 * Pure presentational helpers for the Storage UI kit.
 *
 * No side effects, no I/O — safe to import anywhere (including non-'use client'
 * leaf components).
 */

import type { StorageBucket, StorageObject } from './types';

/** Humanize a byte count, e.g. 1536 -> "1.5 KB". Missing, negative and non-finite values read as an em dash. */
export function humanizeBytes(bytes: number | null | undefined): string {
	if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '—';
	if (bytes === 0) return '0 B';

	const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
	let value = bytes;
	let exponent = 0;
	while (value >= 1024 && exponent < units.length - 1) {
		value /= 1024;
		exponent += 1;
	}
	// Rounding can land on the next unit's boundary ("1024.0 KB", "1024 B"): carry into that unit instead.
	const rounded = exponent === 0 ? Math.round(value) : Number(value.toFixed(1));
	if (rounded >= 1024 && exponent < units.length - 1) {
		value /= 1024;
		exponent += 1;
	}
	// Whole bytes show no decimals (round any fractional byte count); larger units show one.
	const formatted = exponent === 0 ? String(Math.round(value)) : value.toFixed(1);
	return `${formatted} ${units[exponent]}`;
}

export { formatCount } from '../../lib/intl';

// Built once: `toLocaleDateString` creates a formatter on every call, which adds up across table rows.
const DATE = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const DATE_TIME = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/**
 * Format an ISO timestamp as a compact, locale date — e.g. "Jun 24, 2026". Unparseable values and the Unix
 * epoch (`1970-01-01T00:00:00Z`, what a zeroed or defaulted timestamp becomes) read as an em dash.
 */
export function formatDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	const time = Date.parse(iso);
	return Number.isNaN(time) || time === 0 ? '—' : DATE.format(time);
}

/** Format an ISO timestamp with date + time — used in the detail sheet. */
export function formatDateTime(iso: string | null | undefined): string {
	if (!iso) return '—';
	const time = Date.parse(iso);
	return Number.isNaN(time) || time === 0 ? '—' : DATE_TIME.format(time);
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
		'application/vnd.oasis.opendocument.text': 'ODT',
		'application/vnd.oasis.opendocument.spreadsheet': 'ODS',
		'application/vnd.oasis.opendocument.presentation': 'ODP',
		'application/vnd.android.package-archive': 'APK',
		'application/x-7z-compressed': '7Z',
		'application/x-rar-compressed': 'RAR',
	};
	if (known[lower]) return known[lower];

	// Fall back to the subtype: "image/svg+xml" -> "SVG", "video/mp4" -> "MP4".
	const subtype = lower.split('/')[1] ?? lower;
	let base = subtype.split('+')[0].replace(/^x-/, '');
	// Vendor trees ("vnd.google-apps.spreadsheet") are namespaces: the last segment is the format.
	if (base.startsWith('vnd.')) base = base.split('.').pop() || base;
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

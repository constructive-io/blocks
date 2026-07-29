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

/** Format an ISO timestamp as a compact, locale date — e.g. "Jun 24, 2026". */
export function formatDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '—';
	return date.toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

/** Format an ISO timestamp with date + time — used in the detail sheet. */
export function formatDateTime(iso: string | null | undefined): string {
	if (!iso) return '—';
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '—';
	return date.toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	});
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

/** Best display name for a bucket: its key (buckets have no separate label). */
export function bucketDisplayName(bucket: Pick<StorageBucket, 'key'>): string {
	return bucket.key;
}

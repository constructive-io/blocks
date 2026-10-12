import { initials as initialsOf } from '../../lib/initials';
import type { DocumentKind } from './types';

export type DataRoomsFormatOptions = { locale: string; timeZone: string; now: string };

export const DAY_MS = 86_400_000;
const DAY = DAY_MS;

/** `iso` moved by whole days; negative days go back. */
export function addDays(iso: string, days: number) {
	return new Date(Date.parse(iso) + days * DAY_MS).toISOString();
}

/** A date nobody set: the zero timestamp a host sends for "none", an empty string, or text that is not a date. */
export function isUnsetDate(iso: string) {
	const time = Date.parse(iso);
	return time === 0 || Number.isNaN(time);
}

// Intl formats are slow to build and a table asks for several per row, so each distinct set of options is built once.
const formats = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat>();

function dateFormat(locale: string, options: Intl.DateTimeFormatOptions) {
	const key = `d|${locale}|${JSON.stringify(options)}`;
	let format = formats.get(key) as Intl.DateTimeFormat | undefined;
	if (!format) {
		format = new Intl.DateTimeFormat(locale, options);
		formats.set(key, format);
	}
	return format;
}

function numberFormat(locale: string, options?: Intl.NumberFormatOptions) {
	const key = `n|${locale}|${JSON.stringify(options ?? {})}`;
	let format = formats.get(key) as Intl.NumberFormat | undefined;
	if (!format) {
		format = new Intl.NumberFormat(locale, options);
		formats.set(key, format);
	}
	return format;
}

/** "Sep 24", or "Sep 24, 2025" outside the current year. A date nobody set is a dash. */
export function formatDate(iso: string, { locale, timeZone, now }: DataRoomsFormatOptions, withTime = false) {
	if (isUnsetDate(iso)) return '—';
	const date = new Date(iso);
	const sameYear = new Date(now).getUTCFullYear() === date.getUTCFullYear();
	return dateFormat(locale, {
		month: 'short',
		day: 'numeric',
		year: sameYear ? undefined : 'numeric',
		hour: withTime ? 'numeric' : undefined,
		minute: withTime ? '2-digit' : undefined,
		timeZone,
	}).format(date);
}

export function formatTime(iso: string, { locale, timeZone }: DataRoomsFormatOptions) {
	if (isUnsetDate(iso)) return '—';
	return dateFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone }).format(new Date(iso));
}

/** `YYYY-MM-DD` for the day `iso` falls on in `timeZone`; empty for a date nobody set, so those group together. */
export function dayKey(iso: string, timeZone: string) {
	if (isUnsetDate(iso)) return '';
	return dateFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

/** "just now", "12 min ago", "3 h ago", "yesterday", "4 days ago", then a date; "in 12 min", "tomorrow" and so on for a time ahead. */
export function formatRelative(iso: string, options: DataRoomsFormatOptions) {
	if (isUnsetDate(iso)) return '—';
	const diff = Date.parse(options.now) - Date.parse(iso);
	if (diff < 0 && -diff >= 60_000) {
		const ahead = -diff;
		if (ahead < 3_600_000) return `in ${Math.floor(ahead / 60_000)} min`;
		if (ahead < DAY) return `in ${Math.floor(ahead / 3_600_000)} h`;
		if (ahead < 2 * DAY) return 'tomorrow';
		if (ahead < 7 * DAY) return `in ${Math.floor(ahead / DAY)} days`;
		return formatDate(iso, options);
	}
	if (diff < 60_000) return 'just now';
	if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
	if (diff < DAY) return `${Math.floor(diff / 3_600_000)} h ago`;
	if (diff < 2 * DAY) return 'yesterday';
	if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} days ago`;
	return formatDate(iso, options);
}

/** Whole days from `now` until `iso`, to the nearest day; negative once it has passed. */
export function daysUntil(iso: string, now: string) {
	const days = (Date.parse(iso) - Date.parse(now)) / DAY;
	return days < 0 ? Math.floor(days) : Math.round(days);
}

/** "in 3 days", "tomorrow", "today", or "ended Sep 2"; a dash when there is no deadline. */
export function formatDeadline(iso: string, options: DataRoomsFormatOptions) {
	if (isUnsetDate(iso)) return '—';
	const days = daysUntil(iso, options.now);
	if (days < 0) return `ended ${formatDate(iso, options)}`;
	if (days === 0) return 'today';
	if (days === 1) return 'tomorrow';
	if (days <= 14) return `in ${days} days`;
	return formatDate(iso, options);
}

export function formatBytes(bytes: number, locale = 'en-US') {
	const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
	let value = bytes;
	let unit = 0;
	// Compare the rounded value: 1,048,500 bytes is 1,023.9 KB, which would print as "1,024 KB" instead of "1 MB".
	while (Math.round(value) >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${numberFormat(locale, { maximumFractionDigits: value < 10 && unit > 0 ? 1 : 0 }).format(value)} ${units[unit]}`;
}

/** "4m 20s", "45s", "1h 05m" for time spent reading. */
export function formatDuration(seconds: number) {
	if (seconds < 60) return `${Math.round(seconds)}s`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ${String(Math.round(seconds % 60)).padStart(2, '0')}s`;
	return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

export function formatCount(value: number, locale = 'en-US') {
	return numberFormat(locale).format(value);
}

/** "Dana Chen" → "Dana". */
export function firstName(name: string) {
	return name.trim().split(/\s+/)[0] ?? name;
}

/** Up to two initials: "Dana Chen" → "DC". Empty when the name has nothing to show; callers fall back to an icon or "?". */
export function initials(name: string) {
	return initialsOf(name) ?? '';
}

/** A readable name for an email nobody has a profile for yet: "jo.park@x.com" → "Jo Park". */
export function nameFromEmail(email: string) {
	const local = email.split('@')[0] ?? email;
	return local
		.split(/[._-]+/)
		.filter(Boolean)
		.map((part) => part[0]!.toUpperCase() + part.slice(1))
		.join(' ');
}

const KIND_BY_EXTENSION: Record<string, DocumentKind> = {
	pdf: 'pdf',
	xls: 'sheet',
	xlsx: 'sheet',
	csv: 'sheet',
	numbers: 'sheet',
	doc: 'doc',
	docx: 'doc',
	txt: 'doc',
	md: 'doc',
	pages: 'doc',
	ppt: 'slides',
	pptx: 'slides',
	key: 'slides',
	png: 'image',
	jpg: 'image',
	jpeg: 'image',
	gif: 'image',
	webp: 'image',
	zip: 'archive',
};

export function kindFromName(name: string): DocumentKind {
	const extension = name.split('.').pop()?.toLowerCase() ?? '';
	return KIND_BY_EXTENSION[extension] ?? 'other';
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value: string) {
	return EMAIL.test(value.trim());
}

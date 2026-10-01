import type { DocumentKind } from './types';

export type DataRoomsFormatOptions = { locale: string; timeZone: string; now: string };

export const DAY_MS = 86_400_000;
const DAY = DAY_MS;

/** `iso` moved by whole days; negative days go back. */
export function addDays(iso: string, days: number) {
	return new Date(Date.parse(iso) + days * DAY_MS).toISOString();
}

/** "Sep 24", or "Sep 24, 2025" outside the current year. */
export function formatDate(iso: string, { locale, timeZone, now }: DataRoomsFormatOptions, withTime = false) {
	const date = new Date(iso);
	const sameYear = new Date(now).getUTCFullYear() === date.getUTCFullYear();
	return new Intl.DateTimeFormat(locale, {
		month: 'short',
		day: 'numeric',
		year: sameYear ? undefined : 'numeric',
		hour: withTime ? 'numeric' : undefined,
		minute: withTime ? '2-digit' : undefined,
		timeZone,
	}).format(date);
}

export function formatTime(iso: string, { locale, timeZone }: DataRoomsFormatOptions) {
	return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone }).format(new Date(iso));
}

/** `YYYY-MM-DD` for the day `iso` falls on in `timeZone`. */
export function dayKey(iso: string, timeZone: string) {
	return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

/** "just now", "12 min ago", "3 h ago", "yesterday", "4 days ago", then a date. */
export function formatRelative(iso: string, options: DataRoomsFormatOptions) {
	const diff = Date.parse(options.now) - Date.parse(iso);
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

/** "in 3 days", "tomorrow", "today", or "ended Sep 2". */
export function formatDeadline(iso: string, options: DataRoomsFormatOptions) {
	const days = daysUntil(iso, options.now);
	if (days < 0) return `ended ${formatDate(iso, options)}`;
	if (days === 0) return 'today';
	if (days === 1) return 'tomorrow';
	if (days <= 14) return `in ${days} days`;
	return formatDate(iso, options);
}

export function formatBytes(bytes: number, locale = 'en-US') {
	const units = ['B', 'KB', 'MB', 'GB'];
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${new Intl.NumberFormat(locale, { maximumFractionDigits: value < 10 && unit > 0 ? 1 : 0 }).format(value)} ${units[unit]}`;
}

/** "4m 20s", "45s", "1h 05m" for time spent reading. */
export function formatDuration(seconds: number) {
	if (seconds < 60) return `${Math.round(seconds)}s`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ${String(Math.round(seconds % 60)).padStart(2, '0')}s`;
	return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

export function formatCount(value: number, locale = 'en-US') {
	return new Intl.NumberFormat(locale).format(value);
}

/** "Dana Chen" → "Dana". */
export function firstName(name: string) {
	return name.trim().split(/\s+/)[0] ?? name;
}

/** Up to two initials: "Dana Chen" → "DC". */
export function initials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => word[0] ?? '')
		.join('')
		.toUpperCase();
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

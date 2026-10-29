import { dateFormat, numberFormat, relativeTimeFormat } from '../../lib/intl';
import { fieldFormat } from './fields';
import type { FieldOption, ResourceField } from './types';

export type FormatOptions = {
	locale: string;
	currency: string;
	now?: number;
	/** Short dates for table cells: "Oct 22, 6:00 PM", with the year only when it is not the current one. */
	compact?: boolean;
};

/** A number from a number or a numeric string (big numbers often arrive as text). */
export function toNumber(value: unknown): number | null {
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

/** A date-only value (`2026-10-19`), read as that calendar day wherever the reader is. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function toDate(value: unknown): { date: Date; dateOnly: boolean } | null {
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : { date: value, dateOnly: false };
	if (typeof value !== 'string' && typeof value !== 'number') return null;
	const dateOnly = typeof value === 'string' && DATE_ONLY.test(value);
	const date = new Date(dateOnly ? `${value}T00:00:00Z` : value);
	return Number.isNaN(date.getTime()) ? null : { date, dateOnly };
}

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
	['year', 365 * 24 * 3600],
	['month', 30 * 24 * 3600],
	['week', 7 * 24 * 3600],
	['day', 24 * 3600],
	['hour', 3600],
	['minute', 60],
];

function relative(date: Date, { locale, now = Date.now() }: FormatOptions) {
	const seconds = (date.getTime() - now) / 1000;
	for (const [unit, size] of RELATIVE_STEPS) {
		if (Math.abs(seconds) >= size) return relativeTimeFormat(locale).format(Math.round(seconds / size), unit);
	}
	return relativeTimeFormat(locale).format(0, 'minute');
}

/** The option a stored select value names, if any. */
export function optionFor(field: ResourceField, value: unknown): FieldOption | undefined {
	return value == null ? undefined : field.options?.find((option) => option.value === String(value));
}

/**
 * A stored value as plain text for its field's format, or null when there is
 * nothing to show. Badges, booleans, and relations have richer renderings in
 * `FieldValue`; this is their text form (titles, sorting, compact lines).
 */
export function formatFieldText(field: ResourceField, value: unknown, options: FormatOptions): string | null {
	if (value == null || value === '') return null;
	const format = fieldFormat(field);
	switch (format) {
		case 'number':
		case 'currency':
		case 'percent': {
			const number = toNumber(value);
			if (number === null) return String(value);
			if (format === 'currency') return numberFormat(options.locale, { style: 'currency', currency: options.currency }).format(number);
			if (format === 'percent') return numberFormat(options.locale, { style: 'percent', maximumFractionDigits: 1 }).format(number);
			return numberFormat(options.locale, field.input === 'integer' ? { maximumFractionDigits: 0 } : { maximumFractionDigits: 4 }).format(number);
		}
		case 'date':
		case 'datetime':
		case 'relative': {
			const parsed = toDate(value);
			if (!parsed) return String(value);
			if (format === 'relative') return relative(parsed.date, options);
			const dayOnly = format === 'date' || parsed.dateOnly;
			// A date-only value is a calendar day, so it is read (and its year compared) in UTC.
			const zone = parsed.dateOnly ? { timeZone: 'UTC' } : {};
			if (options.compact) {
				const now = new Date(options.now ?? Date.now());
				const sameYear = parsed.dateOnly ? parsed.date.getUTCFullYear() === now.getUTCFullYear() : parsed.date.getFullYear() === now.getFullYear();
				return dateFormat(options.locale, {
					month: 'short',
					day: 'numeric',
					...(sameYear ? {} : { year: 'numeric' }),
					...(dayOnly ? {} : { hour: 'numeric', minute: '2-digit' }),
					...zone,
				}).format(parsed.date);
			}
			if (dayOnly) return dateFormat(options.locale, { dateStyle: 'medium', ...zone }).format(parsed.date);
			return dateFormat(options.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed.date);
		}
		case 'boolean':
			return value === true || value === 'true' ? 'Yes' : 'No';
		case 'badge':
			return optionFor(field, value)?.label ?? String(value);
		default:
			if (typeof value === 'object') return JSON.stringify(value);
			return String(value);
	}
}

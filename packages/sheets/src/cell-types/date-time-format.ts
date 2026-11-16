// How dates and times read in cells, range cells, the record panel and the date editor's
// value line. One rule (team decision):
//
// - A date stays as stored, "YYYY-MM-DD": readable and exact.
// - A time or a date and time reads "HH:mm:ss" / "YYYY-MM-DD HH:mm:ss": no "T", the
//   fraction of a second only when it is not zero (all its non-zero digits), no offset.
// - A value with a zone (timestamp with zone, time with zone) is shown in the viewer's
//   zone, the same zone the date editor edits in; the element's title carries the exact
//   stored text and that zone ("… · shown in GMT+7").
// - A value without a zone shows its stored wall time, unconverted.
//
// Only the display changes: copy, export, paste and writes keep the exact stored text.

import { sheetsLocale } from '../utils/sheets-i18n';

const DATE_RE = /^\d{4,}-\d{2}-\d{2}$/;
const TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2})(\.\d+)?)?(Z|[+-]\d{2}(?::?\d{2})?)?$/;
const DATE_TIME_RE = /^(\d{4,}-\d{2}-\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2})(\.\d+)?)?(Z|[+-]\d{2}(?::?\d{2})?)?$/;

/** The kinds of date and time text, by cell type. */
export type DateTimeKind = 'date' | 'time' | 'datetime';

export function dateTimeKindOf(cellType: string | undefined): DateTimeKind | null {
	if (cellType === 'date') return 'date';
	if (cellType === 'time') return 'time';
	if (cellType === 'datetime' || cellType === 'timestamptz') return 'datetime';
	return null;
}

export interface DateTimeDisplay {
	/** What the element shows. */
	text: string;
	/** The viewer's zone the text is shown in ("GMT+7"), for a zoned value; else null. */
	zone: string | null;
}

function pad2(value: number | string): string {
	return String(value).padStart(2, '0');
}

/** ".123400" -> ".1234"; ".000000" -> "". */
function shownFraction(fraction: string | undefined): string {
	const digits = fraction ? fraction.slice(1).replace(/0+$/, '') : '';
	return digits ? `.${digits}` : '';
}

/** The viewer's zone at an instant, as the locale names it briefly ("GMT+7", "PST"). */
export function viewerZoneName(instant: Date, locale: string = sheetsLocale()): string {
	try {
		const part = new Intl.DateTimeFormat(locale, { timeZoneName: 'short' })
			.formatToParts(instant)
			.find((entry) => entry.type === 'timeZoneName');
		return part?.value ?? 'local time';
	} catch {
		return 'local time';
	}
}

/** A Date for stored text with an offset; microseconds are cut to what Date holds (the shown fraction comes from the text). */
function instantOf(isoLike: string): Date | null {
	const instant = new Date(isoLike.replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1'));
	return Number.isNaN(instant.getTime()) ? null : instant;
}

function localDate(instant: Date): string {
	return `${String(instant.getFullYear()).padStart(4, '0')}-${pad2(instant.getMonth() + 1)}-${pad2(instant.getDate())}`;
}

function localTime(instant: Date): string {
	return `${pad2(instant.getHours())}:${pad2(instant.getMinutes())}:${pad2(instant.getSeconds())}`;
}

function displayTime(text: string, locale: string): DateTimeDisplay | null {
	const match = TIME_RE.exec(text);
	if (!match) return null;
	const [, hours, minutes, seconds = '00', fraction, zone] = match;
	const tail = shownFraction(fraction);
	if (!zone) return { text: `${pad2(hours!)}:${minutes}:${seconds}${tail}`, zone: null };
	// A time of day has no date; today's date gives the viewer's offset in effect now.
	const today = new Date();
	const day = `${today.getUTCFullYear()}-${pad2(today.getUTCMonth() + 1)}-${pad2(today.getUTCDate())}`;
	const instant = instantOf(`${day}T${pad2(hours!)}:${minutes}:${seconds}${zone}`);
	if (!instant) return null;
	return { text: `${localTime(instant)}${tail}`, zone: viewerZoneName(instant, locale) };
}

function displayDateTime(text: string, locale: string): DateTimeDisplay | null {
	const match = DATE_TIME_RE.exec(text);
	if (!match) return null;
	const [, date, hours, minutes, seconds = '00', fraction, zone] = match;
	const tail = shownFraction(fraction);
	if (!zone) return { text: `${date} ${pad2(hours!)}:${minutes}:${seconds}${tail}`, zone: null };
	// Offsets are whole minutes, so the seconds and their fraction are the same in every zone.
	const instant = instantOf(text);
	if (!instant) return null;
	return { text: `${localDate(instant)} ${localTime(instant)}${tail}`, zone: viewerZoneName(instant, locale) };
}

/** Date or time text as it is shown. Text that does not match its kind is shown as it is. */
export function formatDateTimeText(text: string, kind: DateTimeKind, locale: string = sheetsLocale()): DateTimeDisplay {
	try {
		const shown = kind === 'date' ? (DATE_RE.test(text) ? { text, zone: null } : null) : kind === 'time' ? displayTime(text, locale) : displayDateTime(text, locale);
		return shown ?? { text, zone: null };
	} catch {
		return { text, zone: null };
	}
}

/** The title for a shown date or time: the exact stored text, and the zone it is shown in. */
export function dateTimeTitle(exact: string, zone: string | null): string {
	return zone ? `${exact} · shown in ${zone}` : exact;
}

/** True for date-and-time text ("2024-01-01T00:00:00+00:00"); false for a date alone or other text. */
export function isTimestampText(text: string): boolean {
	return DATE_TIME_RE.test(text);
}

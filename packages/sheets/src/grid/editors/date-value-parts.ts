// The date editor works on the parts of the stored text, never on a JS Date, so
// nothing the user did not change is lost: microseconds ("13:45:30.123456"), a time's
// own zone ("+00:00") and a wall time without a zone all survive a save. A date and
// time with a zone is an instant: the editor shows and edits it in the viewer's zone,
// as the cells do, and writes it back with the viewer's offset for that moment.

export type DateEditorType = 'date' | 'datetime' | 'timestamptz' | 'time';

export interface DateValueParts {
	/** Calendar day, "YYYY-MM-DD" (in the viewer's zone for an instant); '' for a time. */
	date: string;
	/** Time of day, "HH:mm:ss" (in the viewer's zone for an instant); '' for a date. */
	time: string;
	/** Fraction of a second as stored (".123456"), or ''. Kept when the time changes. */
	fraction: string;
	/** A time-of-day value's own zone ("+00:00"), kept as stored; '' when it has none. */
	timeZone: string;
	/** A date and time with a zone: an instant, written with the viewer's offset. */
	instant: boolean;
}

const DATE_RE = /^(\d{4,})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2})(\.\d+)?)?(Z|[+-]\d{2}(?::?\d{2})?)?$/;
const DATE_TIME_RE = /^(\d{4,}-\d{2}-\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2})(\.\d+)?)?(Z|[+-]\d{2}(?::?\d{2})?)?$/;

function pad2(value: number | string): string {
	return String(value).padStart(2, '0');
}

function localDate(instant: Date): string {
	return `${String(instant.getFullYear()).padStart(4, '0')}-${pad2(instant.getMonth() + 1)}-${pad2(instant.getDate())}`;
}

function localTime(instant: Date): string {
	return `${pad2(instant.getHours())}:${pad2(instant.getMinutes())}:${pad2(instant.getSeconds())}`;
}

/** The parts of stored text, or null for no value or text that is not of this type. */
export function readDateValueParts(text: string, type: DateEditorType): DateValueParts | null {
	const value = text.trim();
	if (!value) return null;
	if (type === 'date') {
		const match = DATE_RE.exec(value) ?? DATE_RE.exec(value.slice(0, 10));
		return match ? { date: value.slice(0, 10), time: '', fraction: '', timeZone: '', instant: false } : null;
	}
	if (type === 'time') {
		const match = TIME_RE.exec(value);
		if (!match) return null;
		const [, hours, minutes, seconds = '00', fraction = '', zone = ''] = match;
		return { date: '', time: `${pad2(hours!)}:${minutes}:${seconds}`, fraction, timeZone: zone, instant: false };
	}
	const match = DATE_TIME_RE.exec(value);
	if (!match) return null;
	const [, date, hours, minutes, seconds = '00', fraction = '', zone] = match;
	if (!zone) return { date: date!, time: `${pad2(hours!)}:${minutes}:${seconds}`, fraction, timeZone: '', instant: false };
	// An instant: read in the viewer's zone. Offsets are whole minutes, so the seconds and
	// their fraction do not change.
	const instant = new Date(value.replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1'));
	if (Number.isNaN(instant.getTime())) return null;
	return { date: localDate(instant), time: localTime(instant), fraction, timeZone: '', instant: true };
}

/** The viewer's offset at this local wall time ("+07:00"). */
function localOffset(date: string, time: string): string {
	const instant = new Date(`${date}T${time}`);
	const minutes = Number.isNaN(instant.getTime()) ? -new Date().getTimezoneOffset() : -instant.getTimezoneOffset();
	const sign = minutes >= 0 ? '+' : '-';
	const absolute = Math.abs(minutes);
	return `${sign}${pad2(Math.floor(absolute / 60))}:${pad2(absolute % 60)}`;
}

/** Stored text for these parts. */
export function writeDateValueParts(parts: DateValueParts, type: DateEditorType): string {
	if (type === 'date') return parts.date;
	if (type === 'time') return `${parts.time}${parts.fraction}${parts.timeZone}`;
	const time = parts.time || '00:00:00';
	const base = `${parts.date}T${time}${parts.fraction}`;
	return parts.instant ? `${base}${localOffset(parts.date, time)}` : base;
}

/** Parts for a value the user starts from nothing. A zoned type is an instant. */
export function emptyDateValueParts(type: DateEditorType): DateValueParts {
	return { date: '', time: type === 'date' ? '' : '00:00:00', fraction: '', timeZone: '', instant: type === 'timestamptz' };
}

/** A time field's value ("HH:mm" or "HH:mm:ss") as "HH:mm:ss", or null when it is not a time. */
export function normalizeTimeInput(value: string): string | null {
	const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(value.trim());
	if (!match) return null;
	const [, hours, minutes, seconds = '00'] = match;
	if (Number(hours) > 23 || Number(minutes) > 59 || Number(seconds) > 59) return null;
	return `${pad2(hours!)}:${minutes}:${seconds}`;
}

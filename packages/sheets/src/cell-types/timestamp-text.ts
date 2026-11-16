// Timestamp text as the API sends it ("2024-01-01T00:00:00.000000+00:00") and the value
// a `datetime-local` field takes, in both directions. (How timestamps read in cells is
// `date-time-format.ts`.)

const TIMESTAMP_RE = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2})(\.\d+)?)?(Z|[+-]\d{2}(?::?\d{2})?)?$/;

function pad2(value: number): string {
	return String(value).padStart(2, '0');
}

/**
 * The value a `datetime-local` field shows for stored timestamp text: the local wall
 * time when the text has an offset (the same reading the date editor uses), otherwise
 * the stored wall time. Seconds are kept; fractions are not.
 */
export function timestampToLocalInput(text: string): string {
	const match = TIMESTAMP_RE.exec(text);
	if (!match) return '';
	const [, date, hoursMinutes, seconds = '00', , zone] = match;
	if (!zone) return `${date}T${hoursMinutes}:${seconds}`;
	const instant = new Date(text.replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1'));
	if (Number.isNaN(instant.getTime())) return `${date}T${hoursMinutes}:${seconds}`;
	return `${instant.getFullYear()}-${pad2(instant.getMonth() + 1)}-${pad2(instant.getDate())}T${pad2(instant.getHours())}:${pad2(
		instant.getMinutes(),
	)}:${pad2(instant.getSeconds())}`;
}

/**
 * Timestamp text for what a `datetime-local` field holds: the wall time with this
 * browser's offset for that moment ("2024-01-01T09:30:00+07:00"). A column with a time
 * zone stores that instant; one without keeps the wall time as typed.
 */
export function localInputToTimestamp(local: string): string {
	const withSeconds = /T\d{2}:\d{2}$/.test(local) ? `${local}:00` : local;
	const instant = new Date(withSeconds);
	if (Number.isNaN(instant.getTime())) return withSeconds;
	const offsetMinutes = -instant.getTimezoneOffset();
	const sign = offsetMinutes >= 0 ? '+' : '-';
	const absolute = Math.abs(offsetMinutes);
	return `${withSeconds}${sign}${pad2(Math.floor(absolute / 60))}:${pad2(absolute % 60)}`;
}

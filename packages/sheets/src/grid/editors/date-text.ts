// A date typed as text. Year first (2024-01-31, 2024/1/31) is read as year, month, day; a date
// that ends with the year (31/01/2024, 1.31.2024) is read in the order the locale writes its
// dates, so 03/04/2024 is 3 April where the day comes first and March 4 where the month does.
// A two-digit year is not guessed.

type Part = 'day' | 'month' | 'year';

const YEAR_FIRST = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/;
const YEAR_LAST = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/;

/** The order of day and month in the locale's numeric dates. */
export function dayMonthOrder(locale?: string): 'day-month' | 'month-day' {
	const parts = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'numeric', day: 'numeric' })
		.formatToParts(new Date(Date.UTC(2024, 0, 31, 12)))
		.map((part) => part.type)
		.filter((type): type is Part => type === 'day' || type === 'month' || type === 'year');
	return parts.indexOf('day') < parts.indexOf('month') ? 'day-month' : 'month-day';
}

const pad = (value: number, width = 2) => String(value).padStart(width, '0');

function isoDate(year: number, month: number, day: number): string | null {
	const probe = new Date(Date.UTC(year, month - 1, day));
	probe.setUTCFullYear(year);
	if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;
	return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/** The date `text` names, as YYYY-MM-DD, or null when it is not a whole, real date. */
export function parseTypedDate(text: string, locale?: string): string | null {
	const trimmed = text.trim();
	const yearFirst = YEAR_FIRST.exec(trimmed);
	if (yearFirst) return isoDate(Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3]));
	const yearLast = YEAR_LAST.exec(trimmed);
	if (!yearLast) return null;
	const [first, second, year] = [Number(yearLast[1]), Number(yearLast[2]), Number(yearLast[3])];
	return dayMonthOrder(locale) === 'day-month' ? isoDate(year, second, first) : isoDate(year, first, second);
}

/** What to type, for the hint: "2024-01-31 or 31/01/2024" in the locale's order. */
export function typedDateExample(locale?: string): string {
	return dayMonthOrder(locale) === 'day-month' ? '2024-01-31 or 31/01/2024' : '2024-01-31 or 01/31/2024';
}

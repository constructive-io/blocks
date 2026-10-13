/**
 * Cached `Intl` formatters and the small text helpers built on them.
 *
 * Intl constructors are slow and a list row formats several values, so each distinct locale and option set is built
 * once per page. An invalid locale tag falls back to `en-US` instead of throwing in the middle of a render.
 */

type Formatter = Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat | Intl.ListFormat | Intl.PluralRules;

const formatters = new Map<string, Formatter>();

function cached<T extends Formatter>(key: string, create: (locale: string) => T, locale: string): T {
	let formatter = formatters.get(`${key}|${locale}`) as T | undefined;
	if (!formatter) {
		try {
			formatter = create(locale);
		} catch (error) {
			if (!(error instanceof RangeError) || locale === 'en-US') throw error;
			formatter = create('en-US');
		}
		formatters.set(`${key}|${locale}`, formatter);
	}
	return formatter;
}

export function numberFormat(locale: string, options: Intl.NumberFormatOptions = {}) {
	return cached(`n|${JSON.stringify(options)}`, (tag) => new Intl.NumberFormat(tag, options), locale);
}

export function dateFormat(locale: string, options: Intl.DateTimeFormatOptions) {
	return cached(`d|${JSON.stringify(options)}`, (tag) => new Intl.DateTimeFormat(tag, options), locale);
}

export function relativeTimeFormat(locale: string) {
	return cached('r', (tag) => new Intl.RelativeTimeFormat(tag, { numeric: 'auto' }), locale);
}

export function listFormat(locale: string) {
	return cached('l', (tag) => new Intl.ListFormat(tag, { type: 'conjunction' }), locale);
}

export function pluralRules(locale: string) {
	return cached('p', (tag) => new Intl.PluralRules(tag), locale);
}

/**
 * Groups the digits of a count: `1284` becomes "1,284". Defaults to en-US so the server and the browser agree; pass
 * the reader's locale to show their own separators. A missing or non-finite value reads as an em dash.
 */
export function formatCount(value: number, locale = 'en-US') {
	return Number.isFinite(value) ? numberFormat(locale).format(value) : '—';
}

export type PluralForms = { one: string; other: string; zero?: string; two?: string; few?: string; many?: string };

/**
 * Picks the noun form for a count with `Intl.PluralRules`, so `1` reads "1 skill" and `2` reads "2 skills". Falls
 * back to `other` for a form that was not supplied.
 *
 * The forms are English unless `locale` says otherwise, and the choice follows the rules of the language they are
 * written in, not of the page's formatting locale: Japanese has no "one" form, so English forms picked by Japanese
 * rules would read "1 skills". Pass `locale` only together with forms written for it, such as
 * `plural(n, { one, few, many, other }, 'ru')`.
 */
export function plural(count: number, forms: PluralForms, locale = 'en-US') {
	return forms[pluralRules(locale).select(count)] ?? forms.other;
}

/**
 * Joins names for a sentence, showing the first `max` and a count of the rest: "a, b, c, and 12 more". Fifteen names
 * are a number to act on, not a paragraph to read.
 */
export function nameList(names: readonly string[], { max = 3, locale = 'en-US' }: { max?: number; locale?: string } = {}) {
	const shown = names.slice(0, max);
	const rest = names.length - shown.length;
	return listFormat(locale).format(rest > 0 ? [...shown, `${formatCount(rest, locale)} more`] : shown);
}

/** A date nobody set: the zero timestamp (`1970-01-01T00:00:00Z`) a host sends for "none", an empty string, or text that is not a date. */
export function isUnsetDate(iso: string) {
	const time = Date.parse(iso);
	return time === 0 || Number.isNaN(time);
}

/** Built once. Grapheme boundaries do not depend on the locale, so the server and the browser split text alike. */
export const graphemeSegmenter =
	typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

/** The characters a reader sees: a letter with its accent or an emoji sequence is one piece, never cut in half. */
export function graphemes(text: string) {
	return graphemeSegmenter ? Array.from(graphemeSegmenter.segment(text), (part) => part.segment) : Array.from(text);
}

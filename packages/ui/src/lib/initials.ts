/**
 * Initials for an avatar fallback, safe for any script.
 *
 * Takes the first grapheme of the first and last word, so emoji, ZWJ sequences,
 * combining marks and non-Latin names are never split mid-character (the
 * `word[0]` pattern turns `🦊 Fox` into a lone surrogate). A single word gives
 * one initial. Pass an email address and the local part is used.
 *
 * Returns `null` when there is nothing to show, so callers can render an icon
 * instead of an empty circle:
 *
 * ```tsx
 * <AvatarFallback>{initials(user.name ?? user.email) ?? <UserIcon />}</AvatarFallback>
 * ```
 */
export interface InitialsOptions {
	/** Maximum number of initials. Defaults to 2 (first and last word). */
	max?: number;
}

const segmenter =
	typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
		? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
		: null;

// Approximation for runtimes without Intl.Segmenter: a flag, or one code point
// plus its combining marks, variation selector, skin tone and ZWJ continuations.
const GRAPHEME_FALLBACK =
	/^(?:\p{Regional_Indicator}{2}|.[\p{M}️\u{1F3FB}-\u{1F3FF}]*(?:‍.[\p{M}️\u{1F3FB}-\u{1F3FF}]*)*)/su;

const LEADING_NOISE = /^[^\p{L}\p{N}\p{Extended_Pictographic}\p{Regional_Indicator}]+/u;
const TRAILING_NOISE = /[^\p{L}\p{N}\p{Extended_Pictographic}\p{Regional_Indicator}]+$/u;
const GENERATIONAL_SUFFIX = /^(?:jr|sr|ii|iii|iv|phd|md|esq)$/i;
const EMAIL = /^[^\s@]+@[^\s@]+$/;

function firstGrapheme(text: string): string {
	if (segmenter) {
		for (const { segment } of segmenter.segment(text)) return segment;
		return '';
	}
	return GRAPHEME_FALLBACK.exec(text)?.[0] ?? '';
}

function upperCase(grapheme: string): string {
	const upper = grapheme.toLocaleUpperCase();
	// `ß` becomes `SS`: keep the original when uppercasing would add a character.
	return firstGrapheme(upper) === upper ? upper : grapheme;
}

function wordsOf(value: string): string[] {
	const trimmed = value.trim();
	if (EMAIL.test(trimmed)) {
		const local = trimmed.slice(0, trimmed.indexOf('@')).split('+')[0];
		return local.split(/[._-]+/);
	}
	return trimmed.split(/\s+/u);
}

export function initials(name: string | null | undefined, { max = 2 }: InitialsOptions = {}): string | null {
	if (!name) return null;
	const limit = Math.max(1, Math.floor(max));

	let words = wordsOf(name)
		.map((word) => word.replace(LEADING_NOISE, '').replace(TRAILING_NOISE, ''))
		.filter(Boolean);
	// "Montgomery III" is Montgomery, not "MI".
	if (words.length > 1 && GENERATIONAL_SUFFIX.test(words[words.length - 1])) words = words.slice(0, -1);
	if (words.length === 0) return null;

	let picked = words;
	if (words.length > limit) picked = limit === 1 ? [words[0]] : [...words.slice(0, limit - 1), words[words.length - 1]];
	return picked.map((word) => upperCase(firstGrapheme(word))).join('');
}

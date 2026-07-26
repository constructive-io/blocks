/**
 * Sheets theme tokens.
 *
 * A small, semantic token set a host can override per light/dark mode, plus a
 * reader that lifts tokens off CSS custom properties. The native DOM grid styles
 * from CSS variables directly, so these tokens are the glide-free surface that
 * survived the canvas cutover (the old glide `Theme` mapping was removed).
 */

/**
 * Semantic, composable theme tokens. A small surface a host can override per mode.
 */
export interface SheetsThemeTokens {
	/** Primary accent (selection, links, focus). */
	accent: string;
	/** Foreground rendered on top of `accent` (e.g. selected header text). */
	accentForeground: string;
	/** Base canvas / cell background. */
	background: string;
	/** Header / muted cell surface. */
	surface: string;
	/** Hover / focused surface (one step from `surface`). */
	surfaceMuted: string;
	/** Grid + header border color. */
	border: string;
	/** Primary text color. */
	text: string;
	/** Secondary (muted) text color. */
	textMuted: string;
	/** Optional font stack; falls back to the default Inter-based stack. */
	fontFamily?: string;
}

/**
 * Host theme input: a partial token override keyed by mode (deep-merged over the
 * grid's defaults).
 */
export type SheetsThemeInput = Partial<Record<'light' | 'dark', Partial<SheetsThemeTokens>>>;

/**
 * Read theme tokens off CSS custom properties on `el` (defaults to
 * `document.documentElement`). Only properties that resolve to a non-empty value
 * are returned, so the result is safe to deep-merge over a defaults object.
 */
export function tokensFromCssVars(
	el: Element | null = typeof document !== 'undefined' ? document.documentElement : null,
): Partial<SheetsThemeTokens> {
	if (!el || typeof window === 'undefined') return {};
	const cs = window.getComputedStyle(el);
	const read = (name: string): string | undefined => {
		const v = cs.getPropertyValue(name).trim();
		return v.length > 0 ? v : undefined;
	};

	const out: Partial<SheetsThemeTokens> = {};
	const accent = read('--sheets-accent') ?? read('--primary');
	const background = read('--background');
	const border = read('--border');
	const text = read('--foreground');

	if (accent !== undefined) out.accent = accent;
	if (background !== undefined) out.background = background;
	if (border !== undefined) out.border = border;
	if (text !== undefined) out.text = text;
	return out;
}

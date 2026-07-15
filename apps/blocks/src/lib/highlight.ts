import { createHighlighter, type Highlighter } from 'shiki';

/**
 * Shiki syntax highlighter for docs code (usage snippets + code fences).
 *
 * Dual theme — 'github-light' / 'github-dark' with `defaultColor: false`, so
 * Shiki emits BOTH palettes as CSS variables on each token and the active theme
 * is picked by CSS (the `.dark` selector) at render time. No re-highlight is
 * needed when the theme toggles.
 *
 * The highlighter is expensive to create, so the instance is cached. The in-
 * flight promise is cached too, so concurrent first calls share a single init.
 */

/** Languages the highlighter is initialised with. Unknown langs fall back to `tsx`. */
export const SUPPORTED_LANGS = ['tsx', 'ts', 'bash', 'json', 'css'] as const;
export type HighlightLang = (typeof SUPPORTED_LANGS)[number];

let highlighter: Highlighter | null = null;
let loading: Promise<Highlighter> | null = null;

/** Returns the shared Shiki highlighter, creating (and caching) it on first use. */
export async function getHighlighter(): Promise<Highlighter> {
  if (highlighter) return highlighter;
  if (!loading) {
    loading = createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: [...SUPPORTED_LANGS],
    }).then((h: Highlighter) => {
      highlighter = h;
      return h;
    });
  }
  return loading;
}

/**
 * Highlights `code` to dual-theme HTML. Output relies on CSS variables
 * (`defaultColor: false`) — style via the `.shiki` class and the `.dark` scope.
 */
export async function highlight(code: string, lang: string = 'tsx'): Promise<string> {
  const h = await getHighlighter();
  const resolved: HighlightLang = (SUPPORTED_LANGS as readonly string[]).includes(lang)
    ? (lang as HighlightLang)
    : 'tsx';
  return h.codeToHtml(code.trim(), {
    lang: resolved,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
  });
}

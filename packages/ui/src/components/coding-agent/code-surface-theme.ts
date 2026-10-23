'use client';

import * as React from 'react';

export type ColorScheme = 'light' | 'dark';

/**
 * The diff and tree renderers draw inside shadow roots, so Tailwind classes never reach them. They do inherit CSS
 * custom properties from their host, so these maps hand our tokens to the renderers' override variables. Colors
 * stay `var()` references, which keeps both themes (and any host re-theme) working without re-rendering.
 */
export const DIFF_SURFACE_STYLE = {
	'--diffs-font-family': 'var(--font-mono)',
	'--diffs-header-font-family': 'var(--font-sans)',
	'--diffs-font-size': '12px',
	'--diffs-line-height': '20px',
	'--diffs-light-bg': 'var(--background)',
	'--diffs-dark-bg': 'var(--background)',
	'--diffs-bg-context-override': 'var(--background)',
	'--diffs-bg-buffer-override': 'var(--background)',
	// Folded context reads as a faint band, a step off the page rather than a block.
	'--diffs-bg-separator-override': 'color-mix(in oklab, var(--foreground) 3.5%, var(--background))',
	'--diffs-fg-number-override': 'color-mix(in oklab, var(--muted-foreground) 70%, transparent)',
	// Added and removed lines tint from these bases at the renderer's own strengths.
	'--diffs-addition-color-override': 'var(--success)',
	'--diffs-deletion-color-override': 'var(--destructive)',
	'--diffs-modified-color-override': 'var(--warning)',
	// Selection is primary, so it can't be mistaken for a modified line.
	'--diffs-bg-selection-override': 'color-mix(in oklab, var(--primary) 14%, var(--background))',
	'--diffs-bg-selection-number-override': 'color-mix(in oklab, var(--primary) 22%, var(--background))',
	'--diffs-selection-color-override': 'var(--primary)',
	// Tints run the full width of a line; the reserved scrollbar gutter left them short.
	'--diffs-scrollbar-gutter-override': '0px'
} as React.CSSProperties;

/**
 * Styles the renderer can't take as variables. The gutter's "add a comment" button is primary like the template's
 * other actions, and folded context is a slim 24px band in 11px type, flush with the code, that unfolds on click.
 */
export const DIFF_UNSAFE_CSS = [
	'[data-utility-button]{background:var(--primary);color:var(--primary-foreground)}',
	'[data-separator=line-info-basic]{height:24px}',
	'[data-separator=line-info-basic] [data-separator-content]{font-size:11px;letter-spacing:0;padding-inline:1.5ch}',
	'[data-separator=line-info-basic] [data-separator-content]:hover{color:var(--diffs-fg);text-decoration:none}'
].join('');

export const TREE_SURFACE_STYLE = {
	'--trees-font-family-override': 'var(--font-sans)',
	'--trees-font-size-override': '13px',
	// Opaque, not transparent: the tree's ellipsis marker covers overflowing text by painting this colour over it.
	'--trees-bg-override': 'color-mix(in oklab, var(--foreground) 2.5%, var(--background))',
	'--trees-fg-override': 'var(--foreground)',
	'--trees-fg-muted-override': 'var(--muted-foreground)',
	'--trees-bg-muted-override': 'color-mix(in oklab, var(--foreground) 5%, transparent)',
	'--trees-border-color-override': 'var(--border)',
	'--trees-accent-override': 'var(--primary)',
	'--trees-focus-ring-color-override': 'var(--ring)',
	'--trees-selected-bg-override': 'color-mix(in oklab, var(--foreground) 8%, transparent)',
	'--trees-selected-fg-override': 'var(--foreground)',
	'--trees-selected-focused-border-color-override': 'transparent',
	'--trees-search-bg-override': 'var(--muted)',
	'--trees-search-fg-override': 'var(--foreground)',
	'--trees-input-bg-override': 'var(--muted)',
	'--trees-indent-guide-bg-override': 'var(--border)',
	'--trees-border-radius-override': 'calc(var(--radius) - 4px)',
	'--trees-git-added-color-override': 'var(--success)',
	'--trees-git-untracked-color-override': 'var(--success)',
	'--trees-git-modified-color-override': 'var(--warning)',
	'--trees-git-renamed-color-override': 'var(--info)',
	'--trees-git-deleted-color-override': 'var(--destructive)',
	'--trees-git-ignored-color-override': 'var(--muted-foreground)'
} as React.CSSProperties;

/** The file tree column's tone: a step off the page, so it reads as its own column without a dividing rule. */
export const TREE_COLUMN_BG = 'color-mix(in oklab, var(--foreground) 2.5%, var(--background))';

/** Syntax themes for the diff and file renderers; the pair is picked by `colorScheme`. */
export const CODE_THEMES = { light: 'pierre-light', dark: 'pierre-dark' } as const;

function schemeOf(node: Element | null): ColorScheme {
	return node?.closest('.dark') ? 'dark' : 'light';
}

/**
 * Follows the nearest `.dark` ancestor of `ref`, so code surfaces match a class-based theme (the renderers would
 * otherwise follow the OS). Watches the root element's class for theme toggles.
 */
export function useColorScheme(ref: React.RefObject<Element | null>): ColorScheme {
	const [scheme, setScheme] = React.useState<ColorScheme>('light');
	React.useLayoutEffect(() => {
		const sync = () => setScheme(schemeOf(ref.current));
		sync();
		const observer = new MutationObserver(sync);
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		return () => observer.disconnect();
	}, [ref]);
	return scheme;
}

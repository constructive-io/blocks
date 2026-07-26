// The badge / category color system (DESIGN_SPEC §7) — the signature element.
//
// Category pills render as a tinted chip: a soft same-hue background paired with
// saturated same-hue text. The DEFAULT tone is `neutral`; color is OPT-IN. The
// consumer assigns a tone per value via a `Record<string, BadgeTone>` overrides
// map (exact value -> tone) or a `(value) => BadgeTone | undefined` resolver
// (e.g. CRM grids letting users color their own categories). There is NO
// automatic hashing — an unconfigured grid stays calm and on-brand, resolving
// every value to `neutral`.
//
// `neutral` is the only tone built from semantic tokens (so it themes for free);
// the 8-hue categorical palette below is intentional data-viz color and ships
// explicit `dark:` pairs — the one sanctioned exception to the tokens-not-palette
// law (§6).

export type BadgeTone = 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'pink' | 'teal';

export const BADGE_TONES: Record<BadgeTone, string> = {
	neutral: 'bg-muted text-muted-foreground',
	blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
	green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
	amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
	red: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
	purple: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
	pink: 'bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
	teal: 'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
};

/**
 * Resolve a badge value to its tone. Resolution order (first hit wins):
 *   1. `overrides[value]` — exact value -> tone map.
 *   2. `resolver?.(value)` — programmatic resolver.
 *   3. `'neutral'` — the default; color is neutral-until-configured.
 *
 * No automatic hashing: an unmapped value is always `neutral`.
 */
export function resolveBadgeTone(
	value: string,
	overrides?: Record<string, BadgeTone>,
	resolver?: (v: string) => BadgeTone | undefined,
): BadgeTone {
	return overrides?.[value] ?? resolver?.(value) ?? 'neutral';
}

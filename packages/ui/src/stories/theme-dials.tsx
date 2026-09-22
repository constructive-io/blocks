import { useEffect } from 'react';
import { useDialKitController, type DialKitValueUpdates } from 'dialkit';

import { DEFAULT_SPRING_TIERS, setSpringTiers } from '../lib/motion/tuning';
import { constructiveTheme } from '../theme';
import {
	buildThemeDialConfig,
	dialValuesToTuning,
	tuningToDialValues,
} from '../theme-dials-config';
import {
	defaultThemeTuning,
	resolveThemeTuning,
	themeOverrideStyleSheet,
	toCssDeclarations,
} from '../theme-tuning';

/**
 * Live theme tuning via DialKit.
 *
 * Dials write a `<style data-constructive-dials>` override sheet containing
 * `:root` / `.dark` token declarations. Because the override sheet comes after
 * `globals.css` in the cascade, every token-consuming component — including
 * portaled overlays — updates live while the dials move.
 *
 * The dial config + value mapping are shared with the docs theme playground
 * (`../theme-dials-config`), and defaults are derived from `constructiveTheme`
 * (the same source that generates `globals.css`), so the panel always starts
 * at the shipped theme. `copyTokens` exports the tuned map as theme.ts-ready
 * CSS variable declarations.
 */

const STYLE_TAG_ID = 'constructive-dials';

const FONT_STACKS = [
	{ value: constructiveTheme.fonts['--font-sans'], label: 'Inter (current)' },
	{ value: '"Open Sans", ui-sans-serif, system-ui, sans-serif', label: 'Open Sans' },
	{ value: 'ui-sans-serif, system-ui, sans-serif', label: 'System' },
	{ value: 'Georgia, ui-serif, serif', label: 'Georgia serif' },
];

const DEFAULTS = defaultThemeTuning();

const DIAL_CONFIG = {
	...buildThemeDialConfig(DEFAULTS, FONT_STACKS),
	copyTokens: { type: 'action' as const, label: 'Copy theme.ts tokens' },
	resetMotion: { type: 'action' as const, label: 'Reset motion tiers' },
};

function ensureStyleTag(): HTMLStyleElement {
	let el = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
	if (!el) {
		el = document.createElement('style');
		el.id = STYLE_TAG_ID;
		document.head.appendChild(el);
	}
	return el;
}

export function ThemeDials() {
	const { values, setValues, getValues } = useDialKitController(
		'Constructive theme',
		DIAL_CONFIG,
		{
			persist: { key: 'constructive-ui-dials', storage: 'localStorage', presets: true },
			onAction: (action) => {
				if (action === 'copyTokens') {
					const overrides = resolveThemeTuning(dialValuesToTuning(getValues(), DEFAULTS));
					const text = `// light\n${toCssDeclarations(overrides.light)}\n\n// dark\n${toCssDeclarations(overrides.dark)}\n\n// shared\n${toCssDeclarations(overrides.shared)}`;
					void navigator.clipboard?.writeText(text);
				}
				if (action === 'resetMotion') {
					// Reset through the dial store so sliders, the CSS var sheet, and
					// the JS spring store all land back on defaults together.
					setValues({
						motion: tuningToDialValues(DEFAULTS).motion,
					} as DialKitValueUpdates<typeof DIAL_CONFIG>);
				}
			},
		},
	);

	useEffect(() => {
		const tuning = dialValuesToTuning(values, DEFAULTS);
		ensureStyleTag().textContent = themeOverrideStyleSheet(resolveThemeTuning(tuning));
		setSpringTiers(tuning.tiers);
	}, [values]);

	useEffect(() => () => setSpringTiers(DEFAULT_SPRING_TIERS), []);

	return null;
}

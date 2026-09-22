import { describe, expect, it } from 'vitest';

import {
	fitModeTuning,
	PIN_FAMILIES,
	THEME_PRESETS,
	THEME_PRESET_IDS,
	themePresetRegistryName,
} from '../src/theme-presets';
import { contrastRatio, parseColor } from '../src/theme-tuning';

/** The exact color-token subset presets pin — no radius/shadow/duration keys. */
const COLOR_TOKEN_KEYS = [
	'background',
	'foreground',
	'card',
	'card-foreground',
	'popover',
	'popover-foreground',
	'primary',
	'primary-foreground',
	'secondary',
	'secondary-foreground',
	'muted',
	'muted-foreground',
	'subtle-foreground',
	'accent',
	'accent-foreground',
	'destructive',
	'destructive-foreground',
	'border',
	'input',
	'ring',
	'chart-1',
	'chart-2',
	'chart-3',
	'chart-4',
	'chart-5',
	'sidebar',
	'sidebar-foreground',
	'sidebar-primary',
	'sidebar-primary-foreground',
	'sidebar-accent',
	'sidebar-accent-foreground',
	'sidebar-border',
	'sidebar-ring',
	'info',
	'info-foreground',
	'success',
	'success-foreground',
	'warning',
	'warning-foreground',
];

function hueDistance(a: number, b: number) {
	const d = Math.abs(a - b) % 360;
	return d > 180 ? 360 - d : d;
}

describe('theme presets', () => {
	it('ships ten Ghostty-derived presets', () => {
		expect(THEME_PRESET_IDS).toHaveLength(10);
		expect(THEME_PRESETS.map((p) => p.id)).toEqual(THEME_PRESET_IDS);
	});

	for (const preset of THEME_PRESETS) {
		describe(preset.id, () => {
			for (const mode of ['light', 'dark'] as const) {
				const tokens = preset.tokens[mode];

				it(`${mode}: token key set is exactly the color subset`, () => {
					expect(new Set(Object.keys(tokens))).toEqual(new Set(COLOR_TOKEN_KEYS));
					expect(Object.keys(tokens)).not.toContain('radius');
				});

				it(`${mode}: clears the contrast thresholds`, () => {
					const card = parseColor(tokens.card);
					const white = { l: 0.985, c: 0, h: 0 };
					expect(contrastRatio(parseColor(tokens.foreground), card)).toBeGreaterThanOrEqual(7);
					expect(contrastRatio(parseColor(tokens['muted-foreground']), card)).toBeGreaterThanOrEqual(4.5);
					expect(contrastRatio(parseColor(tokens['subtle-foreground']), card)).toBeGreaterThanOrEqual(3);
					expect(
						contrastRatio(parseColor(tokens['primary-foreground']), parseColor(tokens.primary)),
					).toBeGreaterThanOrEqual(4.5);
					expect(contrastRatio(parseColor(tokens.destructive), white)).toBeGreaterThanOrEqual(
						mode === 'dark' ? 4 : 4.5,
					);
					for (const name of ['info', 'success', 'warning'] as const) {
						// Feedback text sits on the card surface over a tinted chip.
						expect(
							contrastRatio(parseColor(tokens[`${name}-foreground`]), card),
							`${name}-foreground vs card`,
						).toBeGreaterThanOrEqual(4.5);
					}
				});

				it(`${mode}: chart-1..5 keep ≥18° hue separation`, () => {
					const charts = [1, 2, 3, 4, 5].map((i) => parseColor(tokens[`chart-${i}`]));
					for (let i = 0; i < charts.length; i += 1) {
						for (let j = i + 1; j < charts.length; j += 1) {
							expect(
								hueDistance(charts[i]!.h, charts[j]!.h),
								`chart-${i + 1} vs chart-${j + 1}`,
							).toBeGreaterThanOrEqual(18);
						}
					}
				});
			}
		});
	}

	it('fitModeTuning reads lightness/accent inputs back out of a token map', () => {
		const tuning = fitModeTuning(THEME_PRESETS[0]!.tokens.dark);
		expect(tuning.backgroundL).toBeCloseTo(parseColor(THEME_PRESETS[0]!.tokens.dark.background).l, 3);
		expect(tuning.accentH).toBeCloseTo(parseColor(THEME_PRESETS[0]!.tokens.dark.primary).h, 3);
	});

	it('PIN_FAMILIES covers every tuning field with real tokens', () => {
		for (const [key, tokens] of Object.entries(PIN_FAMILIES)) {
			expect(tokens.length, key).toBeGreaterThan(0);
			for (const token of tokens) {
				expect(COLOR_TOKEN_KEYS, `${key} → ${token}`).toContain(token);
			}
		}
	});

	it('names registry items theme-<id>', () => {
		expect(themePresetRegistryName('dracula')).toBe('theme-dracula');
	});
});

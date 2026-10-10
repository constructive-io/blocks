import { describe, expect, it } from 'vitest';

import {
	THEME_PRESETS,
} from '../src/theme-presets';
import { contrastRatio, parseColor } from '../src/theme-tuning';

function hueDistance(a: number, b: number) {
	const d = Math.abs(a - b) % 360;
	return d > 180 ? 360 - d : d;
}

describe('theme presets', () => {

	for (const preset of THEME_PRESETS) {
		describe(preset.id, () => {
			for (const mode of ['light', 'dark'] as const) {
				const tokens = preset.tokens[mode];


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



});

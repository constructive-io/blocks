import { describe, expect, it } from 'vitest';

import { constructiveTheme, type ThemeTokenMap } from '../src/theme';
import {
	deriveModeTokens,
	modeTuningDefaults,
	NEUTRAL_CHROMA_WEIGHTS,
	NEUTRAL_REFERENCE_HUE,
	parseColor,
	parseOklch,
	shadowBorderRecipe,
} from '../src/theme-tuning';

/**
 * Drift guard: the tuning defaults must reproduce the shipped theme exactly.
 * If a token changes in theme.ts, the playground/dials stay correct — and if
 * the recipe drifts from theme.ts, this fails instead of silently shipping
 * two different "default" themes.
 *
 * Hue is only compared when both sides carry chroma — a pure-neutral token
 * (hsl gray → chroma 0) has no meaningful hue.
 */
function expectOklchClose(actual: string, expected: string, key: string) {
	const a = parseColor(actual);
	const e = parseColor(expected);
	expect(Math.abs(a.l - e.l), `${key} lightness`).toBeLessThanOrEqual(1e-3);
	expect(Math.abs(a.c - e.c), `${key} chroma`).toBeLessThanOrEqual(1e-3);
	if (a.c > 1e-3 && e.c > 1e-3) {
		expect(Math.abs(a.h - e.h), `${key} hue`).toBeLessThanOrEqual(1e-3);
	}
}

function expectDerivedMatchesShipped(base: ThemeTokenMap, mode: 'light' | 'dark') {
	const derived = deriveModeTokens(modeTuningDefaults(base), base);
	for (const [key, value] of Object.entries(derived)) {
		expect(base[key], `${mode} ${key} is not a shipped token`).toBeDefined();
		expectOklchClose(value, base[key], `${mode} ${key}`);
	}
}

describe('deriveModeTokens', () => {
	it('reproduces the shipped light tokens at default tuning', () => {
		expectDerivedMatchesShipped(constructiveTheme.light, 'light');
	});

	it('reproduces the shipped dark tokens at default tuning', () => {
		expectDerivedMatchesShipped(constructiveTheme.dark, 'dark');
	});

	it('tints the neutral ramp through the reference weights', () => {
		const tuning = {
			...modeTuningDefaults(constructiveTheme.light),
			neutralHue: NEUTRAL_REFERENCE_HUE,
			neutralChroma: 1,
		};
		const derived = deriveModeTokens(tuning, constructiveTheme.light);
		const border = parseColor(derived.border);
		expect(border.c).toBeCloseTo(NEUTRAL_CHROMA_WEIGHTS.border, 3);
		expect(border.h).toBeCloseTo(NEUTRAL_REFERENCE_HUE, 1);
	});
});

describe('shadowBorderRecipe', () => {
	const normalize = (css: string) => css.replace(/\s+/g, ' ').trim();

	it('reproduces the shipped light --shadow-border', () => {
		expect(normalize(shadowBorderRecipe(0.055, 1, false))).toBe(
			normalize(constructiveTheme.light['shadow-border']),
		);
	});

	it('reproduces the shipped dark --shadow-border', () => {
		expect(normalize(shadowBorderRecipe(0.055, 1, true))).toBe(
			normalize(constructiveTheme.dark['shadow-border']),
		);
	});
});

describe('parseColor', () => {
	it('parses hsl space syntax', () => {
		const white = parseColor('hsl(0 0% 100%)');
		expect(white.l).toBeCloseTo(1, 2);
		expect(white.c).toBe(0);
	});

	it('parses hsl comma syntax', () => {
		const mid = parseColor('hsl(0, 0%, 50%)');
		expect(mid.l).toBeCloseTo(0.6, 1);
		expect(mid.c).toBe(0);
	});

	it('parses hex colors', () => {
		const gray = parseColor('#7F7F7F');
		expect(gray.l).toBeCloseTo(0.6, 1);
		expect(gray.c).toBe(0);
		expect(parseColor('#fff').l).toBeCloseTo(1, 2);
	});

	it('equates hsl and hex encodings of the same color', () => {
		const a = parseColor('hsl(0 0% 16%)');
		const b = parseColor('#292929');
		expect(Math.abs(a.l - b.l)).toBeLessThanOrEqual(1e-3);
	});

	it('parses rgb() and passes oklch through', () => {
		expect(parseColor('rgb(255 0 0)').l).toBeCloseTo(parseOklch('oklch(0.628 0.258 29.234)').l, 1);
		expect(parseColor('oklch(0.565 0.215 259)')).toEqual({ l: 0.565, c: 0.215, h: 259 });
	});

	it('returns zeros for unparseable input', () => {
		expect(parseColor('var(--color-blue-500)')).toEqual({ l: 0, c: 0, h: 0 });
		expect(parseColor(undefined)).toEqual({ l: 0, c: 0, h: 0 });
	});
});

import { describe, expect, it } from 'vitest';

import {
	buildThemeDialConfig,
	dialValuesToTuning,
	tuningToDialValues,
} from '../src/theme-dials-config';
import { defaultThemeTuning, type ThemeTuning } from '../src/theme-tuning';

const FONT_OPTIONS = [
	{ value: '"Inter", ui-sans-serif, system-ui, sans-serif', label: 'Inter' },
	{ value: 'ui-sans-serif, system-ui, sans-serif', label: 'System' },
];

function expectTuningClose(actual: ThemeTuning, expected: ThemeTuning) {
	expect(actual.light).toEqual(expected.light);
	// The neutral folder carries one shared hue — both modes read it directly.
	expect(actual.dark).toEqual(expected.dark);
	expect(actual.radius).toBeCloseTo(expected.radius, 3);
	expect(actual.hairline).toBeCloseTo(expected.hairline, 3);
	expect(actual.elevation).toBeCloseTo(expected.elevation, 3);
	expect(actual.fontSans).toBe(expected.fontSans);
	expect(actual.tiers).toEqual(expected.tiers);
}

describe('theme-dials-config', () => {
	const defaults = defaultThemeTuning();

	it('builds a config whose defaults match the tuning', () => {
		const config = buildThemeDialConfig(defaults, FONT_OPTIONS);
		expect(config.accent.hueLight[0]).toBeCloseTo(defaults.light.accentH, 3);
		expect(config.accent.hueDark[0]).toBeCloseTo(defaults.dark.accentH, 3);
		expect(config.neutral.hue[0]).toBeCloseTo(defaults.light.neutralHue, 3);
		expect(config.shape.radius[0]).toBeCloseTo(defaults.radius, 3);
		expect(config.type.fontSans.default).toBe(defaults.fontSans);
	});

	it('round-trips the default tuning through dial values', () => {
		expectTuningClose(
			dialValuesToTuning(tuningToDialValues(defaults), defaults),
			defaults,
		);
	});

	it('round-trips a mutated tuning', () => {
		const mutated: ThemeTuning = {
			...defaults,
			light: {
				...defaults.light,
				neutralHue: 150,
				neutralChroma: 1.5,
				accentL: 0.5,
				accentC: 0.2,
				accentH: 300,
				accentForegroundL: 0.18,
				backgroundL: 0.97,
				subtleForegroundL: 0.62,
			},
			dark: {
				...defaults.dark,
				// One shared neutral hue across both modes.
				neutralHue: 150,
				neutralChroma: 1.5,
				subtleForegroundL: 0.48,
				accentL: 0.6,
				accentC: 0.15,
				accentH: 200,
				accentForegroundL: 0.985,
				cardL: 0.3,
			},
			radius: 0.875,
			hairline: 0.08,
			elevation: 1.6,
			fontSans: 'ui-sans-serif, system-ui, sans-serif',
			tiers: {
				fast: { duration: 0.05, bounce: 0.1, exitDuration: 0.04 },
				moderate: { duration: 0.1, bounce: 0, exitDuration: 0.08 },
				slow: { duration: 0.3, bounce: 0.2, exitDuration: 0.2 },
			},
		};
		expectTuningClose(dialValuesToTuning(tuningToDialValues(mutated), defaults), mutated);
	});

	it('falls back to defaults for missing dial values', () => {
		expect(dialValuesToTuning({}, defaults)).toEqual(defaults);
	});
});

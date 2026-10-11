import { describe, expect, it } from 'vitest';

import {
	dialValuesToTuning,
	tuningToDialValues,
} from '../src/theme-dials-config';
import { defaultThemeTuning, type ThemeTuning } from '../src/theme-tuning';

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
			hairline: 0.1,
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

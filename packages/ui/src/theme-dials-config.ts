import {
	type ModeTuning,
	type ThemeTuning,
} from './theme-tuning';

/**
 * DialKit-shaped config for the whole-theme tuning model — plain data, no
 * dialkit import, so both the Storybook panel and the docs Create panel can
 * build it and convert between dial values and `ThemeTuning`.
 *
 * Folder layout (DialConfig conventions: `[default, min, max, step]` sliders,
 * booleans, `type: 'select'`, `type: 'spring'`, nested folders):
 *
 *   accent         — per-mode hue/chroma/lightness + dark-text toggle
 *   neutral        — one shared hue + chroma multiplier for both modes
 *   surfacesLight  — collapsed; per-surface lightness sliders
 *   surfacesDark   — collapsed; same set for the dark map
 *   shape          — --radius
 *   elevation      — hairline alpha + umbra multiplier
 *   type           — --font-sans select
 *   motion         — spring tiers + exit sliders
 *
 * Callers append their own actions (`{ type: 'action' }` leaves) after
 * spreading the returned config.
 */

type SliderTuple = [number, number, number, number?];

/** Slider config helper — keeps the tuple type so DialConfig inference works. */
const s = (def: number, min: number, max: number, step?: number): SliderTuple => [
	def,
	min,
	max,
	step,
];

/** DialKit spring/easing leaf as it appears in resolved dial values. */
interface DialTransitionValue {
	type?: string;
	duration?: number;
	visualDuration?: number;
	bounce?: number;
}

interface FontOption {
	value: string;
	label: string;
}

/** Keys tuned inside the collapsed per-mode surfaces folders. */
const SURFACE_SLIDERS = [
	['backgroundL', 0.1, 1],
	['cardL', 0.1, 1],
	['popoverL', 0.1, 1],
	['mutedL', 0.1, 1],
	['borderL', 0.15, 1],
	['inputL', 0.15, 1],
	['ringL', 0.2, 1],
	['foregroundL', 0, 1],
	['mutedForegroundL', 0.3, 1],
	['subtleForegroundL', 0.3, 1],
	['sidebarL', 0.1, 1],
] as const;

type SurfaceSliderKey = (typeof SURFACE_SLIDERS)[number][0];

function surfaceDials(mode: ModeTuning) {
	const entries = SURFACE_SLIDERS.map(
		([key, min, max]) => [key, s(mode[key as SurfaceSliderKey], min, max, 0.001)] as const,
	);
	return { _collapsed: true, ...Object.fromEntries(entries) };
}

/** An accent foreground below mid-lightness means dark text on the accent. */
function isDarkText(accentForegroundL: number) {
	return accentForegroundL < 0.5;
}

export function buildThemeDialConfig(defaults: ThemeTuning, fonts: FontOption[]) {
	return {
		accent: {
			hueLight: s(defaults.light.accentH, 0, 360, 0.5),
			chromaLight: s(defaults.light.accentC, 0, 0.35, 0.001),
			lightnessLight: s(defaults.light.accentL, 0.3, 0.95, 0.001),
			darkTextLight: isDarkText(defaults.light.accentForegroundL),
			hueDark: s(defaults.dark.accentH, 0, 360, 0.5),
			chromaDark: s(defaults.dark.accentC, 0, 0.35, 0.001),
			lightnessDark: s(defaults.dark.accentL, 0.3, 0.95, 0.001),
			darkTextDark: isDarkText(defaults.dark.accentForegroundL),
		},
		neutral: {
			hue: s(defaults.light.neutralHue, 0, 360, 0.5),
			chroma: s(defaults.light.neutralChroma, 0, 3, 0.05),
		},
		surfacesLight: surfaceDials(defaults.light),
		surfacesDark: surfaceDials(defaults.dark),
		shape: {
			_collapsed: true,
			radius: s(defaults.radius, 0, 1.5, 0.0625),
		},
		elevation: {
			_collapsed: true,
			hairline: s(defaults.hairline, 0, 0.2, 0.005),
			elevation: s(defaults.elevation, 0, 2.5, 0.05),
		},
		type: {
			_collapsed: true,
			fontSans: {
				type: 'select' as const,
				options: fonts,
				default: defaults.fontSans,
			},
		},
		motion: {
			_collapsed: true,
			fast: {
				type: 'spring' as const,
				visualDuration: defaults.tiers.fast.duration,
				bounce: defaults.tiers.fast.bounce,
			},
			moderate: {
				type: 'spring' as const,
				visualDuration: defaults.tiers.moderate.duration,
				bounce: defaults.tiers.moderate.bounce,
			},
			slow: {
				type: 'spring' as const,
				visualDuration: defaults.tiers.slow.duration,
				bounce: defaults.tiers.slow.bounce,
			},
			fastExit: s(defaults.tiers.fast.exitDuration, 0.02, 0.3, 0.005),
			moderateExit: s(defaults.tiers.moderate.exitDuration, 0.02, 0.4, 0.005),
			slowExit: s(defaults.tiers.slow.exitDuration, 0.02, 0.5, 0.005),
		},
	};
}

type DialValues = Record<string, unknown>;

function num(value: unknown, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback;
}

function str(value: unknown, fallback: string): string {
	return typeof value === 'string' ? value : fallback;
}

function folder(values: DialValues, key: string): DialValues {
	const value = values[key];
	return typeof value === 'object' && value !== null ? (value as DialValues) : {};
}

/** Enter duration in seconds — springs use visualDuration, easings use duration. */
function transitionSeconds(value: unknown, fallback: number): number {
	const t = (typeof value === 'object' && value !== null ? value : {}) as DialTransitionValue;
	return t.type === 'easing' ? (t.duration ?? fallback) : (t.visualDuration ?? fallback);
}

function transitionBounce(value: unknown, fallback: number): number {
	const t = (typeof value === 'object' && value !== null ? value : {}) as DialTransitionValue;
	return t.type === 'spring' ? (t.bounce ?? fallback) : fallback;
}

function applySurfaces(mode: ModeTuning, values: DialValues): ModeTuning {
	const next = { ...mode };
	for (const [key] of SURFACE_SLIDERS) {
		next[key as SurfaceSliderKey] = num(values[key], next[key as SurfaceSliderKey]);
	}
	return next;
}

/** Dial values → ThemeTuning; missing values fall back to `defaults`. */
export function dialValuesToTuning(values: DialValues, defaults: ThemeTuning): ThemeTuning {
	const accent = folder(values, 'accent');
	const neutral = folder(values, 'neutral');
	const surfacesLight = folder(values, 'surfacesLight');
	const surfacesDark = folder(values, 'surfacesDark');
	const shape = folder(values, 'shape');
	const elevation = folder(values, 'elevation');
	const type = folder(values, 'type');
	const motion = folder(values, 'motion');

	const neutralHue = num(neutral.hue, defaults.light.neutralHue);
	const neutralChroma = num(neutral.chroma, defaults.light.neutralChroma);

	const light: ModeTuning = applySurfaces(
		{
			...defaults.light,
			neutralHue,
			neutralChroma,
			accentL: num(accent.lightnessLight, defaults.light.accentL),
			accentC: num(accent.chromaLight, defaults.light.accentC),
			accentH: num(accent.hueLight, defaults.light.accentH),
			accentForegroundL: bool(accent.darkTextLight, isDarkText(defaults.light.accentForegroundL))
				? 0.18
				: 0.985,
		},
		surfacesLight,
	);
	const dark: ModeTuning = applySurfaces(
		{
			...defaults.dark,
			neutralHue,
			neutralChroma,
			accentL: num(accent.lightnessDark, defaults.dark.accentL),
			accentC: num(accent.chromaDark, defaults.dark.accentC),
			accentH: num(accent.hueDark, defaults.dark.accentH),
			accentForegroundL: bool(accent.darkTextDark, isDarkText(defaults.dark.accentForegroundL))
				? 0.18
				: 0.985,
		},
		surfacesDark,
	);

	return {
		light,
		dark,
		radius: num(shape.radius, defaults.radius),
		hairline: num(elevation.hairline, defaults.hairline),
		elevation: num(elevation.elevation, defaults.elevation),
		fontSans: str(type.fontSans, defaults.fontSans),
		tiers: {
			fast: {
				duration: transitionSeconds(motion.fast, defaults.tiers.fast.duration),
				bounce: transitionBounce(motion.fast, defaults.tiers.fast.bounce),
				exitDuration: num(motion.fastExit, defaults.tiers.fast.exitDuration),
			},
			moderate: {
				duration: transitionSeconds(motion.moderate, defaults.tiers.moderate.duration),
				bounce: transitionBounce(motion.moderate, defaults.tiers.moderate.bounce),
				exitDuration: num(motion.moderateExit, defaults.tiers.moderate.exitDuration),
			},
			slow: {
				duration: transitionSeconds(motion.slow, defaults.tiers.slow.duration),
				bounce: transitionBounce(motion.slow, defaults.tiers.slow.bounce),
				exitDuration: num(motion.slowExit, defaults.tiers.slow.exitDuration),
			},
		},
	};
}

/** ThemeTuning → nested dial values for `controller.setValues`. */
export function tuningToDialValues(t: ThemeTuning): DialValues {
	const surfaces = (mode: ModeTuning): DialValues =>
		Object.fromEntries(SURFACE_SLIDERS.map(([key]) => [key, mode[key as SurfaceSliderKey]]));
	return {
		accent: {
			hueLight: t.light.accentH,
			chromaLight: t.light.accentC,
			lightnessLight: t.light.accentL,
			darkTextLight: isDarkText(t.light.accentForegroundL),
			hueDark: t.dark.accentH,
			chromaDark: t.dark.accentC,
			lightnessDark: t.dark.accentL,
			darkTextDark: isDarkText(t.dark.accentForegroundL),
		},
		neutral: { hue: t.light.neutralHue, chroma: t.light.neutralChroma },
		surfacesLight: surfaces(t.light),
		surfacesDark: surfaces(t.dark),
		shape: { radius: t.radius },
		elevation: { hairline: t.hairline, elevation: t.elevation },
		type: { fontSans: t.fontSans },
		motion: {
			fast: { type: 'spring', visualDuration: t.tiers.fast.duration, bounce: t.tiers.fast.bounce },
			moderate: {
				type: 'spring',
				visualDuration: t.tiers.moderate.duration,
				bounce: t.tiers.moderate.bounce,
			},
			slow: { type: 'spring', visualDuration: t.tiers.slow.duration, bounce: t.tiers.slow.bounce },
			fastExit: t.tiers.fast.exitDuration,
			moderateExit: t.tiers.moderate.exitDuration,
			slowExit: t.tiers.slow.exitDuration,
		},
	};
}

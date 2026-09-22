import { DEFAULT_SPRING_TIERS, type SpringTiers } from './lib/motion/tuning';
import { constructiveTheme, type ThemeTokenMap } from './theme';

/**
 * Shared theme-derivation math.
 *
 * Pure functions (no React) that derive a tuned token set from the shipped
 * `constructiveTheme` maps. The Storybook DialKit panel (stories/theme-dials)
 * and the docs theme playground both build on these, so a theme change only
 * needs to land in theme.ts — defaults and exports stay in sync.
 */

export interface OklchParts {
	l: number;
	c: number;
	h: number;
}

function round3(n: number) {
	return Math.round(n * 1000) / 1000;
}

const OKLCH_RE = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/;
const HSL_RE = /hsla?\(\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/;
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB_RE = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/;

/** hsl (deg / % / %) → sRGB channels in [0, 1]. Alpha is ignored. */
function hslToSrgb(hDeg: number, sPct: number, lPct: number): [number, number, number] {
	const h = (((hDeg % 360) + 360) % 360) / 360;
	const s = sPct / 100;
	const l = lPct / 100;
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) => {
		const k = (n + h * 12) % 12;
		return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
	};
	return [f(0), f(8), f(4)];
}

/** sRGB channels [0, 1] → linear → OKLab → OKLCH (standard matrices). */
function srgbToOklch(r: number, g: number, b: number): OklchParts {
	const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
	const [lr, lg, lb] = [lin(r), lin(g), lin(b)];
	const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
	const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
	const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
	const l_ = Math.cbrt(l);
	const m_ = Math.cbrt(m);
	const s_ = Math.cbrt(s);
	const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
	const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
	const b2 = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
	const c = Math.hypot(a, b2);
	if (c < 1e-4) return { l: L, c: 0, h: 0 };
	return { l: L, c, h: ((Math.atan2(b2, a) * 180) / Math.PI + 360) % 360 };
}

/**
 * Parse `oklch(L C H)`, `hsl(H S% L%)` (space or comma syntax, alpha ignored),
 * `#rgb`/`#rrggbb`, or `rgb(r g b)` into OKLCH parts. Anything unparseable
 * falls back to zeros.
 */
export function parseColor(css: string | undefined): OklchParts {
	const input = (css ?? '').trim();
	const oklch = OKLCH_RE.exec(input);
	if (oklch) return { l: Number(oklch[1]), c: Number(oklch[2]), h: Number(oklch[3]) };
	const hsl = HSL_RE.exec(input);
	if (hsl) return srgbToOklch(...hslToSrgb(Number(hsl[1]), Number(hsl[2]), Number(hsl[3])));
	const hex = HEX_RE.exec(input);
	if (hex) {
		const raw =
			hex[1].length === 3
				? hex[1].split('').map((ch) => ch + ch).join('')
				: hex[1];
		return srgbToOklch(
			parseInt(raw.slice(0, 2), 16) / 255,
			parseInt(raw.slice(2, 4), 16) / 255,
			parseInt(raw.slice(4, 6), 16) / 255,
		);
	}
	const rgb = RGB_RE.exec(input);
	if (rgb) return srgbToOklch(Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255);
	return { l: 0, c: 0, h: 0 };
}

/** Alias kept for existing imports — identical to `parseColor`. */
export function parseOklch(css: string | undefined): OklchParts {
	return parseColor(css);
}

/** OKLCH → linear sRGB channels clamped to [0, 1] (standard OKLab matrices). */
export function oklchToLinearSrgb(l: number, c: number, h: number): [number, number, number] {
	const hr = (h * Math.PI) / 180;
	const a = c * Math.cos(hr);
	const b = c * Math.sin(hr);
	const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
	const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
	const s_ = l - 0.0894841775 * a - 1.291485548 * b;
	const l3 = l_ ** 3;
	const m3 = m_ ** 3;
	const s3 = s_ ** 3;
	const clamp = (v: number) => Math.min(1, Math.max(0, v));
	return [
		clamp(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3),
		clamp(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3),
		clamp(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3),
	];
}

/** WCAG relative luminance of linear sRGB channels. */
export function relativeLuminance(rgb: [number, number, number]): number {
	return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/** WCAG contrast ratio between two OKLCH colors (1–21). */
export function contrastRatio(a: OklchParts, b: OklchParts): number {
	const la = relativeLuminance(oklchToLinearSrgb(a.l, a.c, a.h));
	const lb = relativeLuminance(oklchToLinearSrgb(b.l, b.c, b.h));
	const [lighter, darker] = la >= lb ? [la, lb] : [lb, la];
	return (lighter + 0.05) / (darker + 0.05);
}

/**
 * The accent as *text* on a surface: the accent itself when it already clears
 * 4.5:1 against `background`, otherwise its lightness stepped (darker on light
 * surfaces, lighter on dark ones) until the emitted 3-dp value does. Solid
 * fills keep the vivid accent; links and labels use this.
 */
export function linkColorFor(accent: OklchParts, background: OklchParts): OklchParts {
	const emitted = (c: OklchParts) => parseColor(formatOklch(c.l, c.c, c.h));
	const step = background.l > 0.5 ? -0.01 : 0.01;
	let current = accent;
	for (let i = 0; i < 60 && contrastRatio(emitted(current), emitted(background)) < 4.5; i++) {
		current = { l: Math.min(1, Math.max(0, current.l + step)), c: current.c, h: current.h };
	}
	return current;
}

/** Format with 3-decimal rounding: `oklch(0.565 0.215 259)`. */
export function formatOklch(l: number, c: number, h: number) {
	return `oklch(${round3(l)} ${round3(c)} ${round3(h)})`;
}

/**
 * Chroma each neutral token carried in the previous cool ramp — the reference
 * `neutralChroma` multiplies. The shipped ramp is pure-neutral hsl (chroma 0),
 * so tinting needs a remembered reference rather than the shipped chroma.
 */
export const NEUTRAL_CHROMA_WEIGHTS: Record<string, number> = {
	background: 0.003,
	card: 0,
	popover: 0,
	secondary: 0.006,
	muted: 0.006,
	accent: 0.006,
	border: 0.008,
	input: 0.008,
	sidebar: 0.004,
	'sidebar-accent': 0.006,
	'sidebar-border': 0.008,
	foreground: 0.02,
	'card-foreground': 0.02,
	'popover-foreground': 0.02,
	'secondary-foreground': 0.02,
	'accent-foreground': 0.02,
	'sidebar-foreground': 0.02,
	'sidebar-accent-foreground': 0.02,
	'muted-foreground': 0.025,
	'subtle-foreground': 0.022,
};

/** Hue used when the shipped ramp carries no chroma to read one from. */
export const NEUTRAL_REFERENCE_HUE = 250;

/** Per-mode tuning inputs; lightness keys default from the shipped map. */
export interface ModeTuning {
	/** Shared hue for every neutral token. */
	neutralHue: number;
	/** Multiplier on each token's `NEUTRAL_CHROMA_WEIGHTS` reference (1 = cool ramp). */
	neutralChroma: number;
	backgroundL: number;
	cardL: number;
	popoverL: number;
	mutedL: number;
	borderL: number;
	inputL: number;
	ringL: number;
	foregroundL: number;
	mutedForegroundL: number;
	subtleForegroundL: number;
	sidebarL: number;
	accentL: number;
	accentC: number;
	accentH: number;
	accentForegroundL: number;
}

/** Tuning defaults read straight out of a shipped theme token map. */
export function modeTuningDefaults(base: ThemeTokenMap): ModeTuning {
	const L = (key: string) => parseColor(base[key]).l;
	const accent = parseColor(base.primary);
	const border = parseColor(base.border);
	return {
		// A chroma-0 ramp carries no hue to read — fall back to the reference.
		neutralHue: border.c > 1e-3 ? border.h : NEUTRAL_REFERENCE_HUE,
		neutralChroma: border.c / (NEUTRAL_CHROMA_WEIGHTS.border ?? 1),
		backgroundL: L('background'),
		cardL: L('card'),
		popoverL: L('popover'),
		mutedL: L('muted'),
		borderL: L('border'),
		inputL: L('input'),
		ringL: L('ring'),
		foregroundL: L('foreground'),
		mutedForegroundL: L('muted-foreground'),
		subtleForegroundL: L('subtle-foreground'),
		sidebarL: L('sidebar'),
		accentL: accent.l,
		accentC: accent.c,
		accentH: accent.h,
		accentForegroundL: L('primary-foreground'),
	};
}

/**
 * Derive the neutral + accent token set for one mode.
 *
 * Neutral chroma comes from `NEUTRAL_CHROMA_WEIGHTS[key] * neutralChroma` —
 * the Phase 1 cool ramp as reference — with one shared `neutralHue`, so
 * tinting still works now that the shipped ramp is pure-neutral hsl.
 * `refL` is the tuning input for the token's family; each token keeps its
 * shipped lightness offset inside that family (e.g. sidebar-foreground sits
 * above foreground) so defaults reproduce the shipped map. The ring IS the
 * accent in this theme — only its lightness is tuned separately.
 */
export function deriveModeTokens(tuning: ModeTuning, base: ThemeTokenMap): Record<string, string> {
	const n = (key: string, refKey: string, refL: number) => {
		const shipped = parseColor(base[key]);
		const ref = parseColor(base[refKey]);
		return formatOklch(
			refL + (shipped.l - ref.l),
			(NEUTRAL_CHROMA_WEIGHTS[key] ?? 0) * tuning.neutralChroma,
			tuning.neutralHue,
		);
	};
	const primary = formatOklch(tuning.accentL, tuning.accentC, tuning.accentH);
	const ring = formatOklch(tuning.ringL, tuning.accentC, tuning.accentH);
	const background = n('background', 'background', tuning.backgroundL);
	const linkParts = linkColorFor(
		{ l: tuning.accentL, c: tuning.accentC, h: tuning.accentH },
		parseColor(background),
	);
	const link = formatOklch(linkParts.l, linkParts.c, linkParts.h);
	const accentForeground = formatOklch(
		tuning.accentForegroundL,
		parseColor(base['primary-foreground']).c,
		parseColor(base['primary-foreground']).h,
	);
	return {
		background,
		foreground: n('foreground', 'foreground', tuning.foregroundL),
		card: n('card', 'card', tuning.cardL),
		'card-foreground': n('card-foreground', 'foreground', tuning.foregroundL),
		popover: n('popover', 'popover', tuning.popoverL),
		'popover-foreground': n('popover-foreground', 'foreground', tuning.foregroundL),
		primary,
		'primary-foreground': accentForeground,
		secondary: n('secondary', 'muted', tuning.mutedL),
		'secondary-foreground': n('secondary-foreground', 'foreground', tuning.foregroundL),
		muted: n('muted', 'muted', tuning.mutedL),
		'muted-foreground': n('muted-foreground', 'muted-foreground', tuning.mutedForegroundL),
		'subtle-foreground': n('subtle-foreground', 'subtle-foreground', tuning.subtleForegroundL),
		accent: n('accent', 'muted', tuning.mutedL),
		'accent-foreground': n('accent-foreground', 'foreground', tuning.foregroundL),
		border: n('border', 'border', tuning.borderL),
		input: n('input', 'input', tuning.inputL),
		ring,
		link,
		sidebar: n('sidebar', 'sidebar', tuning.sidebarL),
		'sidebar-foreground': n('sidebar-foreground', 'foreground', tuning.foregroundL),
		'sidebar-primary': primary,
		'sidebar-primary-foreground': accentForeground,
		'sidebar-accent': n('sidebar-accent', 'muted', tuning.mutedL),
		'sidebar-accent-foreground': n('sidebar-accent-foreground', 'foreground', tuning.foregroundL),
		'sidebar-border': n('sidebar-border', 'border', tuning.borderL),
		'sidebar-ring': ring,
	};
}

/**
 * Hairline + stacked-drop recipe matching theme.ts so default tuning
 * reproduces shipped `--shadow-border` tokens exactly.
 *
 * Shipped hairline alphas differ per mode (light 0.055 / dark 0.10) — the
 * input tunes the light value and dark keeps the shipped 0.10/0.055 ratio.
 * Drops are the first three elevation-ladder layers scaled by `elevation`
 * on a neutral black umbra (light alpha 0.06, dark 0.22); dark prepends the
 * lit top edge.
 */
export function shadowBorderRecipe(hairlineAlpha: number, elevation: number, dark: boolean): string {
	const ringAlpha = dark ? Math.min(1, hairlineAlpha * (0.1 / 0.055)) : hairlineAlpha;
	const ringColor = dark ? `oklch(1 0 0 / ${round3(ringAlpha)})` : `oklch(0 0 0 / ${round3(ringAlpha)})`;
	const shade = '0 0 0';
	const alpha = round3((dark ? 0.22 : 0.06) * elevation);
	const scale = (v: number) => round3(v * elevation);
	const layers = [
		`0 ${scale(1)}px ${scale(1)}px -0.5px rgb(${shade} / ${alpha})`,
		`0 ${scale(3)}px ${scale(3)}px -1.5px rgb(${shade} / ${alpha})`,
		`0 ${scale(6)}px ${scale(6)}px -3px rgb(${shade} / ${alpha})`,
	];
	return [
		...(dark ? [`inset 0 1px 0 0 rgb(255 255 255 / ${round3(0.04 * elevation)})`] : []),
		`${dark ? 'inset ' : ''}0 0 0 1px ${ringColor}`,
		...layers,
	].join(', ');
}

/** Whole-theme tuning state — per-mode token tuning plus the shared knobs. */
export interface ThemeTuning {
	light: ModeTuning;
	dark: ModeTuning;
	/** --radius in rem. */
	radius: number;
	/** Light hairline alpha (dark keeps the shipped 0.10/0.055 ratio). */
	hairline: number;
	/** Umbra multiplier on the card drop layers. */
	elevation: number;
	/** CSS stack written to --font-sans. */
	fontSans: string;
	tiers: SpringTiers;
}

/** Tuning state that reproduces the shipped theme exactly. */
export function defaultThemeTuning(): ThemeTuning {
	return {
		light: modeTuningDefaults(constructiveTheme.light),
		dark: modeTuningDefaults(constructiveTheme.dark),
		radius: parseFloat(constructiveTheme.light.radius) || 0.625,
		hairline: 0.055,
		elevation: 1,
		fontSans: constructiveTheme.fonts['--font-sans'],
		tiers: {
			fast: { ...DEFAULT_SPRING_TIERS.fast },
			moderate: { ...DEFAULT_SPRING_TIERS.moderate },
			slow: { ...DEFAULT_SPRING_TIERS.slow },
		},
	};
}

/** Resolve a full tuning state to `:root`/`.dark`/shared token overrides. */
export function resolveThemeTuning(t: ThemeTuning): {
	light: Record<string, string>;
	dark: Record<string, string>;
	shared: Record<string, string>;
} {
	const light = deriveModeTokens(t.light, constructiveTheme.light);
	const dark = deriveModeTokens(t.dark, constructiveTheme.dark);
	light['shadow-border'] = shadowBorderRecipe(t.hairline, t.elevation, false);
	dark['shadow-border'] = shadowBorderRecipe(t.hairline, t.elevation, true);
	const shared: Record<string, string> = {
		radius: `${round3(t.radius)}rem`,
		'font-sans': t.fontSans,
		'duration-fast': `${Math.round(t.tiers.fast.duration * 1000)}ms`,
		'duration-moderate': `${Math.round(t.tiers.moderate.duration * 1000)}ms`,
		'duration-slow': `${Math.round(t.tiers.slow.duration * 1000)}ms`,
		'duration-fast-exit': `${Math.round(t.tiers.fast.exitDuration * 1000)}ms`,
		'duration-moderate-exit': `${Math.round(t.tiers.moderate.exitDuration * 1000)}ms`,
		'duration-slow-exit': `${Math.round(t.tiers.slow.exitDuration * 1000)}ms`,
	};
	return { light, dark, shared };
}

/** `  --k: v;` lines. */
export function toCssDeclarations(map: Record<string, string>, indent = '  ') {
	return Object.entries(map)
		.map(([key, value]) => `${indent}--${key}: ${value};`)
		.join('\n');
}

/**
 * `:root {…}\n.dark {…}` override sheet. Shared tokens live on `:root` only —
 * custom properties inherit, so `.dark` picks them up automatically.
 */
export function themeOverrideStyleSheet(overrides: {
	light: Record<string, string>;
	dark: Record<string, string>;
	shared: Record<string, string>;
}) {
	return `:root {\n${toCssDeclarations({ ...overrides.light, ...overrides.shared })}\n}\n.dark {\n${toCssDeclarations(overrides.dark)}\n}\n`;
}

import {
	contrastRatio,
	formatOklch,
	linkColorFor,
	NEUTRAL_CHROMA_WEIGHTS,
	NEUTRAL_REFERENCE_HUE,
	parseColor,
	type ModeTuning,
	type OklchParts,
} from './theme-tuning';

/**
 * Theme presets ported from popular terminal color schemes (the Ghostty
 * built-ins, sourced from iTerm2-Color-Schemes). Each scheme's background,
 * foreground, selection and 16-color palette are mapped onto the Constructive
 * token set with contrast guards, so a preset is a complete, AA-checked
 * light + dark token map — not just a tint.
 *
 * Everything here is pure data + math: the docs playground pins these tokens
 * on top of its derived tuning, and `scripts/generate-theme.ts` emits one
 * `registry:theme` item per preset (`@constructive/theme-<id>`).
 */

export type ThemePresetId =
	| 'catppuccin'
	| 'dracula'
	| 'nord'
	| 'gruvbox'
	| 'tokyo-night'
	| 'one-dark'
	| 'solarized'
	| 'rose-pine'
	| 'everforest'
	| 'kanagawa';

export type PresetMode = 'light' | 'dark';

/** The subset of a Ghostty theme file the mapping reads. */
export interface GhosttyScheme {
	background: string;
	foreground: string;
	selectionBackground: string;
	/** ANSI 0–15 (black, red, green, yellow, blue, magenta, cyan, white, then bright variants). */
	palette: readonly string[];
}

export interface ThemePresetSource {
	id: ThemePresetId;
	label: string;
	/** Upstream scheme name(s) as shipped in Ghostty. */
	upstream: { dark: string; light: string | null };
	/** The scheme's signature color, per mode (hex). Light is darkened to AA on white text. */
	accent: { dark: string; light: string };
	dark: GhosttyScheme;
	/** Official light sibling; `null` derives one from the dark scheme. */
	light: GhosttyScheme | null;
}

export interface ThemePreset {
	id: ThemePresetId;
	label: string;
	description: string;
	upstream: { dark: string; light: string | null };
	/** Pinned token values (oklch strings) per mode — color tokens only. */
	tokens: Record<PresetMode, Record<string, string>>;
	/** Five picker swatches per mode: background, muted, primary, chart-2, chart-3. */
	swatches: Record<PresetMode, string[]>;
}

/* ------------------------------------------------------------------ */
/* Source data — verbatim from the Ghostty theme files                  */
/* ------------------------------------------------------------------ */

export const THEME_PRESET_SOURCES: readonly ThemePresetSource[] = [
	{
		id: 'catppuccin',
		label: 'Catppuccin',
		upstream: { dark: 'Catppuccin Mocha', light: 'Catppuccin Latte' },
		accent: { dark: '#cba6f7', light: '#8839ef' },
		dark: {
			background: '#1e1e2e',
			foreground: '#cdd6f4',
			selectionBackground: '#f5e0dc',
			palette: ['#45475a', '#f38ba8', '#a6e3a1', '#f9e2af', '#89b4fa', '#f5c2e7', '#94e2d5', '#a6adc8', '#585b70', '#f38ba8', '#a6e3a1', '#f9e2af', '#89b4fa', '#f5c2e7', '#94e2d5', '#bac2de'],
		},
		light: {
			background: '#eff1f5',
			foreground: '#4c4f69',
			selectionBackground: '#dc8a78',
			palette: ['#5c5f77', '#d20f39', '#40a02b', '#df8e1d', '#1e66f5', '#ea76cb', '#179299', '#acb0be', '#6c6f85', '#d20f39', '#40a02b', '#df8e1d', '#1e66f5', '#ea76cb', '#179299', '#bcc0cc'],
		},
	},
	{
		id: 'dracula',
		label: 'Dracula',
		upstream: { dark: 'Dracula', light: null },
		accent: { dark: '#bd93f9', light: '#7c4dcc' },
		dark: {
			background: '#282a36',
			foreground: '#f8f8f2',
			selectionBackground: '#44475a',
			palette: ['#21222c', '#ff5555', '#50fa7b', '#f1fa8c', '#bd93f9', '#ff79c6', '#8be9fd', '#f8f8f2', '#6272a4', '#ff6e6e', '#69ff94', '#ffffa5', '#d6acff', '#ff92df', '#a4ffff', '#ffffff'],
		},
		light: null,
	},
	{
		id: 'nord',
		label: 'Nord',
		upstream: { dark: 'Nord', light: 'Nord Light' },
		accent: { dark: '#88c0d0', light: '#5e81ac' },
		dark: {
			background: '#2e3440',
			foreground: '#d8dee9',
			selectionBackground: '#eceff4',
			palette: ['#3b4252', '#bf616a', '#a3be8c', '#ebcb8b', '#81a1c1', '#b48ead', '#88c0d0', '#e5e9f0', '#596377', '#bf616a', '#a3be8c', '#ebcb8b', '#81a1c1', '#b48ead', '#8fbcbb', '#eceff4'],
		},
		light: {
			background: '#e5e9f0',
			foreground: '#414858',
			selectionBackground: '#d8dee9',
			palette: ['#3b4252', '#bf616a', '#96b17f', '#c5a565', '#81a1c1', '#b48ead', '#7bb3c3', '#a5abb6', '#4c566a', '#bf616a', '#96b17f', '#c5a565', '#81a1c1', '#b48ead', '#82afae', '#eceff4'],
		},
	},
	{
		id: 'gruvbox',
		label: 'Gruvbox',
		upstream: { dark: 'Gruvbox Dark', light: 'Gruvbox Light' },
		accent: { dark: '#fe8019', light: '#af3a03' },
		dark: {
			background: '#282828',
			foreground: '#ebdbb2',
			selectionBackground: '#665c54',
			palette: ['#282828', '#cc241d', '#98971a', '#d79921', '#458588', '#b16286', '#689d6a', '#a89984', '#928374', '#fb4934', '#b8bb26', '#fabd2f', '#83a598', '#d3869b', '#8ec07c', '#ebdbb2'],
		},
		light: {
			background: '#fbf1c7',
			foreground: '#3c3836',
			selectionBackground: '#3c3836',
			palette: ['#fbf1c7', '#cc241d', '#98971a', '#d79921', '#458588', '#b16286', '#689d6a', '#7c6f64', '#928374', '#9d0006', '#79740e', '#b57614', '#076678', '#8f3f71', '#427b58', '#3c3836'],
		},
	},
	{
		id: 'tokyo-night',
		label: 'Tokyo Night',
		upstream: { dark: 'TokyoNight', light: 'TokyoNight Day' },
		accent: { dark: '#7aa2f7', light: '#2e7de9' },
		dark: {
			background: '#1a1b26',
			foreground: '#c0caf5',
			selectionBackground: '#33467c',
			palette: ['#15161e', '#f7768e', '#9ece6a', '#e0af68', '#7aa2f7', '#bb9af7', '#7dcfff', '#a9b1d6', '#414868', '#f7768e', '#9ece6a', '#e0af68', '#7aa2f7', '#bb9af7', '#7dcfff', '#c0caf5'],
		},
		light: {
			background: '#e1e2e7',
			foreground: '#3760bf',
			selectionBackground: '#99a7df',
			palette: ['#e9e9ed', '#f52a65', '#587539', '#8c6c3e', '#2e7de9', '#9854f1', '#007197', '#6172b0', '#a1a6c5', '#f52a65', '#587539', '#8c6c3e', '#2e7de9', '#9854f1', '#007197', '#3760bf'],
		},
	},
	{
		id: 'one-dark',
		label: 'One Dark',
		upstream: { dark: 'Atom One Dark', light: 'Atom One Light' },
		accent: { dark: '#61afef', light: '#4078f2' },
		dark: {
			background: '#21252b',
			foreground: '#abb2bf',
			selectionBackground: '#323844',
			palette: ['#000000', '#e06c75', '#98c379', '#d19a66', '#61afef', '#c678dd', '#56b6c2', '#abb2bf', '#767676', '#e06c75', '#98c379', '#d19a66', '#61afef', '#c678dd', '#56b6c2', '#ffffff'],
		},
		light: {
			background: '#f9f9f9',
			foreground: '#2a2c33',
			selectionBackground: '#ededed',
			palette: ['#000000', '#de3e35', '#3f953a', '#d2b67c', '#2f5af3', '#950095', '#3f953a', '#bbbbbb', '#000000', '#de3e35', '#3f953a', '#d2b67c', '#2f5af3', '#a00095', '#3f953a', '#ffffff'],
		},
	},
	{
		id: 'solarized',
		label: 'Solarized',
		upstream: { dark: 'iTerm2 Solarized Dark', light: 'iTerm2 Solarized Light' },
		accent: { dark: '#268bd2', light: '#268bd2' },
		dark: {
			background: '#002b36',
			foreground: '#839496',
			selectionBackground: '#073642',
			palette: ['#073642', '#dc322f', '#859900', '#b58900', '#268bd2', '#d33682', '#2aa198', '#eee8d5', '#335e69', '#cb4b16', '#586e75', '#657b83', '#839496', '#6c71c4', '#93a1a1', '#fdf6e3'],
		},
		light: {
			background: '#fdf6e3',
			foreground: '#657b83',
			selectionBackground: '#eee8d5',
			palette: ['#073642', '#dc322f', '#859900', '#b58900', '#268bd2', '#d33682', '#2aa198', '#eee8d5', '#002b36', '#cb4b16', '#586e75', '#657b83', '#839496', '#6c71c4', '#93a1a1', '#fdf6e3'],
		},
	},
	{
		id: 'rose-pine',
		label: 'Rosé Pine',
		upstream: { dark: 'Rose Pine', light: 'Rose Pine Dawn' },
		accent: { dark: '#ebbcba', light: '#d7827e' },
		dark: {
			background: '#191724',
			foreground: '#e0def4',
			selectionBackground: '#403d52',
			palette: ['#26233a', '#eb6f92', '#31748f', '#f6c177', '#9ccfd8', '#c4a7e7', '#ebbcba', '#e0def4', '#6e6a86', '#eb6f92', '#31748f', '#f6c177', '#9ccfd8', '#c4a7e7', '#ebbcba', '#e0def4'],
		},
		light: {
			background: '#faf4ed',
			foreground: '#575279',
			selectionBackground: '#dfdad9',
			palette: ['#f2e9e1', '#b4637a', '#286983', '#ea9d34', '#56949f', '#907aa9', '#d7827e', '#575279', '#9893a5', '#b4637a', '#286983', '#ea9d34', '#56949f', '#907aa9', '#d7827e', '#575279'],
		},
	},
	{
		id: 'everforest',
		label: 'Everforest',
		upstream: { dark: 'Everforest Dark Med', light: 'Everforest Light Med' },
		accent: { dark: '#a7c080', light: '#8da101' },
		dark: {
			background: '#232a2e',
			foreground: '#d3c6aa',
			selectionBackground: '#543a48',
			palette: ['#4b565c', '#e67e80', '#a7c080', '#dbbc7f', '#7fbbb3', '#d699b6', '#83c092', '#d3c6aa', '#a6b0a0', '#e67e80', '#a7c080', '#dbbc7f', '#7fbbb3', '#d699b6', '#83c092', '#d3c6aa'],
		},
		light: {
			background: '#efebd4',
			foreground: '#5c6a72',
			selectionBackground: '#eaedc8',
			palette: ['#5c6a72', '#f85552', '#8da101', '#dfa000', '#3a94c5', '#df69ba', '#35a77c', '#dfddc8', '#a6b0a0', '#f85552', '#8da101', '#dfa000', '#3a94c5', '#df69ba', '#35a77c', '#dfddc8'],
		},
	},
	{
		id: 'kanagawa',
		label: 'Kanagawa',
		upstream: { dark: 'Kanagawa Wave', light: 'Kanagawa Lotus' },
		accent: { dark: '#7e9cd8', light: '#4d699b' },
		dark: {
			background: '#1f1f28',
			foreground: '#dcd7ba',
			selectionBackground: '#dcd7ba',
			palette: ['#090618', '#c34043', '#76946a', '#c0a36e', '#7e9cd8', '#957fb8', '#6a9589', '#c8c093', '#727169', '#e82424', '#98bb6c', '#e6c384', '#7fb4ca', '#938aa9', '#7aa89f', '#dcd7ba'],
		},
		light: {
			background: '#f2ecbc',
			foreground: '#545464',
			selectionBackground: '#545464',
			palette: ['#1f1f28', '#c84053', '#6f894e', '#77713f', '#4d699b', '#b35b79', '#597b75', '#545464', '#8a8980', '#d7474b', '#6e915f', '#836f4a', '#6693bf', '#624c83', '#5e857a', '#43436c'],
		},
	},
];

/* ------------------------------------------------------------------ */
/* Mapping                                                              */
/* ------------------------------------------------------------------ */

const WHITE: OklchParts = { l: 0.985, c: 0, h: 0 };

function clamp01(n: number) {
	return Math.min(1, Math.max(0, n));
}

function withL(color: OklchParts, l: number): OklchParts {
	return { l: clamp01(l), c: color.c, h: color.h };
}

/** The value a token is actually emitted as — contrast checks measure this, not the unrounded math. */
function emitted(color: OklchParts): OklchParts {
	return parseColor(formatOklch(color.l, color.c, color.h));
}

function fmt(color: OklchParts) {
	return formatOklch(color.l, color.c, color.h);
}

/** Interpolate lightness/chroma toward `to` (hue stays with `from`). */
function mix(from: OklchParts, to: OklchParts, t: number): OklchParts {
	return { l: from.l + (to.l - from.l) * t, c: from.c + (to.c - from.c) * t, h: from.h };
}

function hueDistance(a: number, b: number) {
	const d = Math.abs(a - b) % 360;
	return d > 180 ? 360 - d : d;
}

/**
 * Step lightness toward `toward` until `contrastRatio(color, against)` reaches
 * `target`; hue and chroma are kept. Bounded at 60 × 0.01 steps.
 */
function ensureContrast(color: OklchParts, against: OklchParts, target: number, toward: 'lighter' | 'darker'): OklchParts {
	let current = color;
	const step = toward === 'lighter' ? 0.01 : -0.01;
	for (let i = 0; i < 60 && contrastRatio(emitted(current), emitted(against)) < target; i++) {
		current = withL(current, current.l + step);
	}
	return current;
}

/** Pull an over-contrasted "muted" text color back toward the surface. */
function capContrast(color: OklchParts, against: OklchParts, max: number, toward: 'lighter' | 'darker'): OklchParts {
	let current = color;
	const step = toward === 'lighter' ? 0.01 : -0.01;
	for (let i = 0; i < 60 && contrastRatio(emitted(current), emitted(against)) > max; i++) {
		current = withL(current, current.l + step);
	}
	return current;
}

/**
 * Solid accent + its text at AA: white text when it clears 4.5:1, else the
 * scheme's dark ink when that does, else the fill is darkened until white
 * text clears (light mode always takes this last path).
 */
function solidPair(fill: OklchParts, ink: OklchParts, dark: boolean): { fill: OklchParts; text: OklchParts } {
	if (dark && contrastRatio(WHITE, fill) >= 4.5) return { fill, text: WHITE };
	if (dark && contrastRatio(ink, fill) >= 4.5) return { fill, text: ink };
	return { fill: ensureContrast(fill, WHITE, 4.5, 'darker'), text: WHITE };
}

/**
 * Light sibling for a dark-only scheme: background/foreground swap, chromatic
 * palette entries darkened to mid lightness so they read on a light surface.
 */
export function deriveLightScheme(dark: GhosttyScheme): GhosttyScheme {
	return {
		background: dark.foreground,
		foreground: dark.background,
		selectionBackground: dark.background,
		palette: dark.palette.map((hex, index) => {
			const color = parseColor(hex);
			if (index === 0 || index === 8) return fmt(mix(parseColor(dark.background), parseColor(dark.foreground), index === 8 ? 0.45 : 0.15));
			if (index === 7 || index === 15) return fmt(withL(color, index === 15 ? 0.99 : 0.9));
			return fmt(withL(color, Math.min(color.l, 0.58)));
		}),
	};
}

/**
 * Map one scheme + accent onto the Constructive color tokens for `mode`.
 *
 * Surfaces step from the background along its own hue/chroma (terminal themes
 * tint every surface equally); text comes from the foreground and the
 * "bright black" comment color, clamped into the 4.5–9:1 band against the
 * card; feedback and chart colors come from the ANSI palette with lightness
 * normalised for the mode.
 */
export function schemeToTokens(scheme: GhosttyScheme, accentHex: string, mode: PresetMode, ink: OklchParts): Record<string, string> {
	const dark = mode === 'dark';
	const bg = parseColor(scheme.background);
	const fg = parseColor(scheme.foreground);
	const sel = parseColor(scheme.selectionBackground);
	const p = scheme.palette.map((hex) => parseColor(hex));
	const dir = dark ? 1 : -1;

	const card = dark ? withL(bg, bg.l + 0.035) : withL(bg, Math.min(bg.l + 0.02, 0.995));
	const popover = dark ? withL(bg, bg.l + 0.05) : card;
	const selDelta = (sel.l - bg.l) * dir;
	const muted = selDelta >= 0.04 && selDelta <= 0.18 ? sel : withL(bg, bg.l + (dark ? 0.08 : -0.045));
	const border = withL(bg, bg.l + (dark ? 0.1 : -0.075));
	const input = withL(bg, bg.l + (dark ? 0.13 : -0.105));
	const sidebar = withL(bg, bg.l - (dark ? 0.015 : 0.012));

	const foreground = ensureContrast(fg, card, 7, dark ? 'lighter' : 'darker');
	let mutedFg = p[8] ?? mix(fg, bg, 0.6);
	if (contrastRatio(mutedFg, card) < 2 || contrastRatio(mutedFg, card) > 12) mutedFg = mix(fg, bg, 0.65);
	mutedFg = ensureContrast(mutedFg, card, 4.5, dark ? 'lighter' : 'darker');
	mutedFg = capContrast(mutedFg, card, 9, dark ? 'darker' : 'lighter');
	let subtleFg = withL(mutedFg, mutedFg.l - dir * 0.09);
	subtleFg = ensureContrast(subtleFg, card, 3, dark ? 'lighter' : 'darker');

	const { fill: primary, text: primaryFg } = solidPair(parseColor(accentHex), ink, dark);

	// Destructive buttons carry white text: 4.5:1 in light, 4:1 in dark (the
	// shipped dark value sits there too — terminal reds are bright by design).
	const destructive = ensureContrast(p[1] ?? { l: 0.56, c: 0.21, h: 27 }, WHITE, dark ? 4 : 4.5, 'darker');
	const feedback = (index: number, fallbackHue: number) => {
		const base = p[index] ?? { l: 0.6, c: 0.15, h: fallbackHue };
		const fill = dark ? withL(base, Math.max(base.l, 0.62)) : withL(base, Math.min(base.l, 0.66));
		const text = ensureContrast(withL(base, dark ? 0.8 : 0.42), card, 4.5, dark ? 'lighter' : 'darker');
		return { fill, text };
	};
	const success = feedback(2, 150);
	const warning = feedback(3, 80);
	const info = feedback(4, 250);

	const charts = pickChartColors(primary, p, dark);

	return {
		background: fmt(bg),
		foreground: fmt(foreground),
		card: fmt(card),
		'card-foreground': fmt(foreground),
		popover: fmt(popover),
		'popover-foreground': fmt(foreground),
		primary: fmt(primary),
		'primary-foreground': fmt(primaryFg),
		secondary: fmt(muted),
		'secondary-foreground': fmt(foreground),
		muted: fmt(muted),
		'muted-foreground': fmt(mutedFg),
		'subtle-foreground': fmt(subtleFg),
		accent: fmt(muted),
		'accent-foreground': fmt(foreground),
		destructive: fmt(destructive),
		'destructive-foreground': fmt(WHITE),
		border: fmt(border),
		input: fmt(input),
		ring: fmt(primary),
		link: fmt(linkColorFor(primary, bg)),
		'chart-1': charts[0]!,
		'chart-2': charts[1]!,
		'chart-3': charts[2]!,
		'chart-4': charts[3]!,
		'chart-5': charts[4]!,
		sidebar: fmt(sidebar),
		'sidebar-foreground': fmt(foreground),
		'sidebar-primary': fmt(primary),
		'sidebar-primary-foreground': fmt(primaryFg),
		'sidebar-accent': fmt(muted),
		'sidebar-accent-foreground': fmt(foreground),
		'sidebar-border': fmt(border),
		'sidebar-ring': fmt(primary),
		info: fmt(info.fill),
		'info-foreground': fmt(info.text),
		success: fmt(success.fill),
		'success-foreground': fmt(success.text),
		warning: fmt(warning.fill),
		'warning-foreground': fmt(warning.text),
	};
}

/**
 * chart-1 is the accent; chart-2..5 are palette colors picked greedily for hue
 * separation (≥ 30°, relaxed to 18° when the palette is narrow), lightness
 * normalised so every series reads on the mode's card.
 */
function pickChartColors(primary: OklchParts, palette: OklchParts[], dark: boolean): string[] {
	const normalise = (c: OklchParts) => (dark ? withL(c, Math.min(Math.max(c.l, 0.62), 0.85)) : withL(c, Math.min(Math.max(c.l, 0.45), 0.68)));
	const pool = [6, 5, 3, 2, 4, 1, 14, 13, 11, 10, 12, 9]
		.map((index) => palette[index])
		.filter((c): c is OklchParts => Boolean(c) && c.c > 0.03);
	const chosen: OklchParts[] = [primary];
	for (const minDistance of [30, 18, 0]) {
		for (const candidate of pool) {
			if (chosen.length >= 5) break;
			if (chosen.some((c) => hueDistance(c.h, candidate.h) < minDistance || (c.h === candidate.h && c.c === candidate.c && c.l === candidate.l))) continue;
			chosen.push(candidate);
		}
	}
	return chosen.slice(0, 5).map((c, index) => fmt(index === 0 ? c : normalise(c)));
}

/**
 * Tuning inputs that best describe a pinned token map — what the dials show
 * while a preset is active, and what tokens release to when a dial moves.
 * `neutralChroma` is the least-squares multiplier over the reference weights.
 */
export function fitModeTuning(tokens: Record<string, string>): ModeTuning {
	const L = (key: string) => parseColor(tokens[key]).l;
	const bg = parseColor(tokens.background);
	const fg = parseColor(tokens.foreground);
	const accent = parseColor(tokens.primary);
	let num = 0;
	let den = 0;
	for (const [key, weight] of Object.entries(NEUTRAL_CHROMA_WEIGHTS)) {
		if (!tokens[key] || weight === 0) continue;
		num += weight * parseColor(tokens[key]).c;
		den += weight * weight;
	}
	const chromaSource = bg.c > 0.003 ? bg : fg;
	return {
		neutralHue: chromaSource.c > 0.003 ? chromaSource.h : NEUTRAL_REFERENCE_HUE,
		// Clamped to the neutral-chroma dial's range so a fitted preset is always
		// expressible by the dials (an out-of-range push would echo back changed).
		neutralChroma: den > 0 ? Math.min(3, Math.max(0, num / den)) : 0,
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
 * Which pinned tokens a tuning field owns. Moving that dial releases these
 * pins so the derived value takes over — the rest of the preset stays exact.
 */
export const PIN_FAMILIES: Record<keyof ModeTuning, readonly string[]> = {
	neutralHue: NEUTRAL_TOKENS(),
	neutralChroma: NEUTRAL_TOKENS(),
	backgroundL: ['background'],
	cardL: ['card', 'card-foreground'],
	popoverL: ['popover', 'popover-foreground'],
	mutedL: ['muted', 'secondary', 'accent', 'sidebar-accent'],
	borderL: ['border', 'sidebar-border'],
	inputL: ['input'],
	ringL: ['ring', 'sidebar-ring'],
	foregroundL: [
		'foreground',
		'card-foreground',
		'popover-foreground',
		'secondary-foreground',
		'accent-foreground',
		'sidebar-foreground',
		'sidebar-accent-foreground',
	],
	mutedForegroundL: ['muted-foreground'],
	subtleForegroundL: ['subtle-foreground'],
	sidebarL: ['sidebar'],
	accentL: ACCENT_TOKENS(),
	accentC: ACCENT_TOKENS(),
	accentH: ACCENT_TOKENS(),
	accentForegroundL: ['primary-foreground', 'sidebar-primary-foreground'],
};

function NEUTRAL_TOKENS(): readonly string[] {
	return Object.keys(NEUTRAL_CHROMA_WEIGHTS);
}

function ACCENT_TOKENS(): readonly string[] {
	return ['primary', 'primary-foreground', 'ring', 'link', 'sidebar-primary', 'sidebar-primary-foreground', 'sidebar-ring', 'chart-1'];
}

/* ------------------------------------------------------------------ */
/* Built presets                                                        */
/* ------------------------------------------------------------------ */

function buildPreset(source: ThemePresetSource): ThemePreset {
	const ink = parseColor(source.dark.background);
	const lightScheme = source.light ?? deriveLightScheme(source.dark);
	const tokens = {
		light: schemeToTokens(lightScheme, source.accent.light, 'light', ink),
		dark: schemeToTokens(source.dark, source.accent.dark, 'dark', ink),
	};
	const swatches = (mode: PresetMode) => {
		const t = tokens[mode];
		return [t.background!, t.muted!, t.primary!, t['chart-2']!, t['chart-3']!];
	};
	const lightNote = source.upstream.light ? `${source.upstream.light} for light mode` : 'a derived light mode';
	return {
		id: source.id,
		label: source.label,
		description: `${source.upstream.dark} mapped onto the Constructive token set, with ${lightNote}. Ported from the Ghostty built-in color schemes.`,
		upstream: source.upstream,
		tokens,
		swatches: { light: swatches('light'), dark: swatches('dark') },
	};
}

export const THEME_PRESETS: readonly ThemePreset[] = THEME_PRESET_SOURCES.map(buildPreset);

export const THEME_PRESET_IDS = THEME_PRESETS.map((preset) => preset.id) as ThemePresetId[];

export function getThemePreset(id: ThemePresetId): ThemePreset {
	return THEME_PRESETS.find((preset) => preset.id === id) ?? THEME_PRESETS[0]!;
}

export function isThemePresetId(value: unknown): value is ThemePresetId {
	return typeof value === 'string' && (THEME_PRESET_IDS as string[]).includes(value);
}

/** Registry item name for a preset: `@constructive/theme-<id>`. */
export function themePresetRegistryName(id: ThemePresetId) {
	return `theme-${id}`;
}

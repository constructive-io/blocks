import { DEFAULT_SPRING_TIERS, type SpringTier } from '@constructive-io/ui';
import { constructiveTheme, type ThemeTokenMap } from '@constructive-io/ui/theme';
import {
  fitModeTuning,
  getThemePreset,
  isThemePresetId,
  PIN_FAMILIES,
  THEME_PRESET_IDS,
  type ThemePresetId,
} from '@constructive-io/ui/theme-presets';
import {
  defaultThemeTuning,
  NEUTRAL_REFERENCE_HUE,
  parseColor,
  resolveThemeTuning,
  themeOverrideStyleSheet,
  toCssDeclarations,
  type ModeTuning,
  type ThemeTuning,
} from '@constructive-io/ui/theme-tuning';

/**
 * Theme playground draft model (v2).
 *
 * A ThemeDraft IS the shared `ThemeTuning` state — the same shape the
 * Storybook DialKit panel edits — plus two host-owned fields (`mode`,
 * `font`) that never reach the exported CSS. Presets compose: each
 * `applyXPreset` writes the tuning fields it owns, so presets and the
 * dial surface stay interchangeable. Preset values are contrast-verified —
 * blue reads straight from the shipped primary rather than duplicating
 * literals.
 */

export type ColorMode = 'light' | 'dark' | 'system';
export type NeutralId = 'gray' | 'cool' | 'slate' | 'azure' | 'stone' | 'mauve' | 'sage';
export type AccentId = 'blue' | 'indigo' | 'violet' | 'teal' | 'emerald' | 'amber' | 'rose' | 'ink';
export type RadiusId = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type FontId = 'inter' | 'open-sans' | 'geist' | 'plex' | 'system';
export type ElevationId = 'flat' | 'soft' | 'lifted';
export type MotionId = 'quick' | 'balanced' | 'relaxed';

export interface ThemeDraft extends ThemeTuning {
  /** Preview-only, never exported. */
  mode: ColorMode;
  /** Which preset `fontSans` came from — drives the preview font stack. */
  font: FontId;
  /** Active token preset (Ghostty-derived); null = the Constructive default. */
  theme: ThemePresetId | null;
  /** Tuning fields whose preset pins are released, per mode — a moved dial owns them again. */
  released: { light: (keyof ModeTuning)[]; dark: (keyof ModeTuning)[] };
}

export const DEFAULT_DRAFT: ThemeDraft = {
  ...defaultThemeTuning(),
  mode: 'system',
  font: 'inter',
  theme: null,
  released: { light: [], dark: [] },
};

/* ------------------------------------------------------------------ */
/* Presets                                                             */
/* ------------------------------------------------------------------ */

export interface NeutralPreset {
  id: NeutralId;
  label: string;
  hue: number;
  /** Multiplier on the reference chroma weights (0 = pure neutral, 1 = cool ramp). */
  chroma: number;
}

export const NEUTRAL_PRESETS: readonly NeutralPreset[] = [
  // Shipped ramp is pure neutral; the old cool tint survives as a preset.
  { id: 'gray', label: 'Gray', hue: NEUTRAL_REFERENCE_HUE, chroma: 0 },
  { id: 'cool', label: 'Cool', hue: 250, chroma: 1 },
  { id: 'slate', label: 'Slate', hue: 245, chroma: 1.8 },
  { id: 'azure', label: 'Azure', hue: 230, chroma: 2.4 },
  { id: 'stone', label: 'Stone', hue: 70, chroma: 1.4 },
  { id: 'mauve', label: 'Mauve', hue: 320, chroma: 1.6 },
  { id: 'sage', label: 'Sage', hue: 150, chroma: 1.3 },
];

export type AccentForeground = 'light' | 'dark';

export interface AccentModeValue {
  l: number;
  c: number;
  h: number;
  /** 'light' → foreground L 0.985; 'dark' → foreground L 0.18. */
  fg: AccentForeground;
}

export interface AccentPreset {
  id: AccentId;
  label: string;
  light: AccentModeValue;
  dark: AccentModeValue;
}

const shippedLightPrimary = parseColor(constructiveTheme.light.primary);
const shippedDarkPrimary = parseColor(constructiveTheme.dark.primary);

export const ACCENT_PRESETS: readonly AccentPreset[] = [
  {
    id: 'blue',
    label: 'Blue',
    light: { ...shippedLightPrimary, fg: 'light' },
    dark: { ...shippedDarkPrimary, fg: 'light' },
  },
  {
    id: 'indigo',
    label: 'Indigo',
    light: { l: 0.52, c: 0.21, h: 277, fg: 'light' },
    dark: { l: 0.55, c: 0.19, h: 277, fg: 'light' },
  },
  {
    id: 'violet',
    label: 'Violet',
    light: { l: 0.53, c: 0.23, h: 297, fg: 'light' },
    dark: { l: 0.56, c: 0.2, h: 297, fg: 'light' },
  },
  {
    id: 'teal',
    label: 'Teal',
    light: { l: 0.52, c: 0.085, h: 195, fg: 'light' },
    dark: { l: 0.72, c: 0.11, h: 192, fg: 'dark' },
  },
  {
    id: 'emerald',
    label: 'Emerald',
    light: { l: 0.52, c: 0.12, h: 158, fg: 'light' },
    dark: { l: 0.74, c: 0.14, h: 158, fg: 'dark' },
  },
  {
    id: 'amber',
    label: 'Amber',
    light: { l: 0.72, c: 0.15, h: 70, fg: 'dark' },
    dark: { l: 0.82, c: 0.15, h: 82, fg: 'dark' },
  },
  {
    id: 'rose',
    label: 'Rose',
    light: { l: 0.57, c: 0.21, h: 12, fg: 'light' },
    dark: { l: 0.57, c: 0.2, h: 12, fg: 'light' },
  },
  {
    id: 'ink',
    label: 'Ink',
    light: { l: 0.22, c: 0.015, h: 255, fg: 'light' },
    dark: { l: 0.93, c: 0.008, h: 255, fg: 'dark' },
  },
];

const shippedRadiusRem = parseFloat(constructiveTheme.light.radius) || 0.625;

export interface RadiusPreset {
  id: RadiusId;
  label: string;
  rem: number;
}

export const RADIUS_PRESETS: readonly RadiusPreset[] = [
  { id: 'none', label: 'None', rem: 0 },
  { id: 'sm', label: 'Small', rem: 0.375 },
  // The shipped --radius, read from the theme rather than duplicated.
  { id: 'md', label: 'Medium', rem: shippedRadiusRem },
  { id: 'lg', label: 'Large', rem: 0.875 },
  { id: 'xl', label: 'XL', rem: 1.25 },
];

export interface FontPreset {
  id: FontId;
  label: string;
  /** Stack written to --font-sans in exported CSS. */
  exportStack: string;
  /** Stack used inside the preview iframe (loaded next/font variables). */
  previewStack: string;
}

export const FONT_PRESETS: readonly FontPreset[] = [
  {
    id: 'inter',
    label: 'Inter',
    exportStack: '"Inter", ui-sans-serif, system-ui, sans-serif',
    // Inter is the shipped --font-sans and the root layout already loads it
    // into --font-sans-loaded, which reaches the preview document's :root.
    previewStack: 'var(--font-sans-loaded, "Inter"), ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'open-sans',
    label: 'Open Sans',
    exportStack: '"Open Sans", ui-sans-serif, system-ui, sans-serif',
    previewStack: 'var(--font-open-sans), ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'geist',
    label: 'Geist',
    exportStack: '"Geist", ui-sans-serif, system-ui, sans-serif',
    previewStack: 'var(--font-geist), ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'plex',
    label: 'IBM Plex Sans',
    exportStack: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    previewStack: 'var(--font-plex), ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'system',
    label: 'System',
    exportStack: 'ui-sans-serif, system-ui, sans-serif',
    previewStack: 'ui-sans-serif, system-ui, sans-serif',
  },
];

export interface ElevationPreset {
  id: ElevationId;
  label: string;
  hairline: number;
  elevation: number;
}

export const ELEVATION_PRESETS: readonly ElevationPreset[] = [
  { id: 'flat', label: 'Flat', hairline: 0.08, elevation: 0 },
  // Shipped recipe: 0.055 hairline + unit elevation.
  { id: 'soft', label: 'Soft', hairline: 0.055, elevation: 1 },
  { id: 'lifted', label: 'Lifted', hairline: 0.055, elevation: 1.6 },
];

export interface MotionPreset {
  id: MotionId;
  label: string;
  /** Multiplier on the shipped --duration-* tokens and spring tiers. */
  multiplier: number;
}

export const MOTION_PRESETS: readonly MotionPreset[] = [
  { id: 'quick', label: 'Quick', multiplier: 0.6 },
  { id: 'balanced', label: 'Balanced', multiplier: 1 },
  { id: 'relaxed', label: 'Relaxed', multiplier: 1.5 },
];

export const COLOR_MODES: readonly ColorMode[] = ['light', 'dark', 'system'];
export const NEUTRAL_IDS = NEUTRAL_PRESETS.map((p) => p.id) as NeutralId[];
export const ACCENT_IDS = ACCENT_PRESETS.map((p) => p.id) as AccentId[];
export const RADIUS_IDS = RADIUS_PRESETS.map((p) => p.id) as RadiusId[];
export const FONT_IDS = FONT_PRESETS.map((p) => p.id) as FontId[];
export const ELEVATION_IDS = ELEVATION_PRESETS.map((p) => p.id) as ElevationId[];
export const MOTION_IDS = MOTION_PRESETS.map((p) => p.id) as MotionId[];

export function getNeutralPreset(id: NeutralId): NeutralPreset {
  return NEUTRAL_PRESETS.find((p) => p.id === id) ?? NEUTRAL_PRESETS[0]!;
}
export function getAccentPreset(id: AccentId): AccentPreset {
  return ACCENT_PRESETS.find((p) => p.id === id) ?? ACCENT_PRESETS[0]!;
}
export function getRadiusPreset(id: RadiusId): RadiusPreset {
  return RADIUS_PRESETS.find((p) => p.id === id) ?? RADIUS_PRESETS[2]!;
}
export function getFontPreset(id: FontId): FontPreset {
  return FONT_PRESETS.find((p) => p.id === id) ?? FONT_PRESETS[0]!;
}
export function getElevationPreset(id: ElevationId): ElevationPreset {
  return ELEVATION_PRESETS.find((p) => p.id === id) ?? ELEVATION_PRESETS[1]!;
}
export function getMotionPreset(id: MotionId): MotionPreset {
  return MOTION_PRESETS.find((p) => p.id === id) ?? MOTION_PRESETS[1]!;
}

/* ------------------------------------------------------------------ */
/* Preset appliers — each writes only the tuning fields it owns         */
/* ------------------------------------------------------------------ */

/** Foreground lightness for an accent preset ('light' → 0.985, 'dark' → 0.18). */
export function accentForegroundL(fg: AccentForeground): number {
  return fg === 'light' ? 0.985 : 0.18;
}

/** Union tuning fields into the released set (both modes). */
function releaseKeys(draft: ThemeDraft, keys: (keyof ModeTuning)[]): ThemeDraft['released'] {
  // Nothing is pinned without a theme — keep the released set empty so the
  // draft stays canonical (sanitizeDraft enforces the same invariant).
  if (draft.theme === null) return { light: [], dark: [] };
  return {
    light: [...new Set([...draft.released.light, ...keys])],
    dark: [...new Set([...draft.released.dark, ...keys])],
  };
}

/** One shared neutral hue across both modes. */
export function applyNeutralPreset(draft: ThemeDraft, id: NeutralId): ThemeDraft {
  const preset = getNeutralPreset(id);
  return {
    ...draft,
    released: releaseKeys(draft, ['neutralHue', 'neutralChroma']),
    light: { ...draft.light, neutralHue: preset.hue, neutralChroma: preset.chroma },
    dark: { ...draft.dark, neutralHue: preset.hue, neutralChroma: preset.chroma },
  };
}

export function applyAccentPreset(draft: ThemeDraft, id: AccentId): ThemeDraft {
  const preset = getAccentPreset(id);
  return {
    ...draft,
    released: releaseKeys(draft, ['accentL', 'accentC', 'accentH', 'accentForegroundL']),
    light: {
      ...draft.light,
      accentL: preset.light.l,
      accentC: preset.light.c,
      accentH: preset.light.h,
      accentForegroundL: accentForegroundL(preset.light.fg),
    },
    dark: {
      ...draft.dark,
      accentL: preset.dark.l,
      accentC: preset.dark.c,
      accentH: preset.dark.h,
      accentForegroundL: accentForegroundL(preset.dark.fg),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Token presets — Ghostty-derived maps pinned over the derived tuning  */
/* ------------------------------------------------------------------ */

/**
 * Pin a preset's token map: the dials show the fitted tuning and every color
 * token resolves to the preset exactly until its owning dial moves (release).
 * Radius/hairline/elevation/font/tiers are untouched — presets are colors.
 */
export function applyThemePreset(draft: ThemeDraft, id: ThemePresetId): ThemeDraft {
  const preset = getThemePreset(id);
  return {
    ...draft,
    theme: preset.id,
    released: { light: [], dark: [] },
    light: fitModeTuning(preset.tokens.light),
    dark: fitModeTuning(preset.tokens.dark),
    // All ten presets are dark-first — land on the dark variant.
    mode: draft.mode === 'system' ? 'dark' : draft.mode,
  };
}

/** Back to the Constructive default; tuning keeps the fitted approximation. */
export function clearThemePreset(draft: ThemeDraft): ThemeDraft {
  return { ...draft, theme: null, released: { light: [], dark: [] } };
}

/** Pinned tokens for one mode — the preset minus every released family. */
export function pinnedTokens(draft: ThemeDraft, mode: 'light' | 'dark'): Record<string, string> {
  if (!draft.theme) return {};
  const tokens = { ...getThemePreset(draft.theme).tokens[mode] };
  for (const key of draft.released[mode]) {
    for (const token of PIN_FAMILIES[key] ?? []) {
      delete tokens[token];
    }
  }
  return tokens;
}

export function applyRadiusPreset(draft: ThemeDraft, id: RadiusId): ThemeDraft {
  return { ...draft, radius: getRadiusPreset(id).rem };
}

export function applyElevationPreset(draft: ThemeDraft, id: ElevationId): ThemeDraft {
  const preset = getElevationPreset(id);
  return { ...draft, hairline: preset.hairline, elevation: preset.elevation };
}

export function applyMotionPreset(draft: ThemeDraft, id: MotionId): ThemeDraft {
  const multiplier = getMotionPreset(id).multiplier;
  const scale = (tier: SpringTier): SpringTier => ({
    duration: tier.duration * multiplier,
    bounce: tier.bounce,
    exitDuration: tier.exitDuration * multiplier,
  });
  return {
    ...draft,
    tiers: {
      fast: scale(DEFAULT_SPRING_TIERS.fast),
      moderate: scale(DEFAULT_SPRING_TIERS.moderate),
      slow: scale(DEFAULT_SPRING_TIERS.slow),
    },
  };
}

export function applyFontPreset(draft: ThemeDraft, id: FontId): ThemeDraft {
  const preset = getFontPreset(id);
  return { ...draft, font: preset.id, fontSans: preset.exportStack };
}

/* ------------------------------------------------------------------ */
/* Preset detection — which preset (if any) the tuning still matches    */
/* ------------------------------------------------------------------ */

const TOLERANCE = 1e-3;
const near = (a: number, b: number) => Math.abs(a - b) <= TOLERANCE;

export function detectNeutralPreset(draft: ThemeDraft): NeutralId | null {
  for (const preset of NEUTRAL_PRESETS) {
    if (
      near(draft.light.neutralHue, preset.hue) &&
      near(draft.dark.neutralHue, preset.hue) &&
      near(draft.light.neutralChroma, preset.chroma) &&
      near(draft.dark.neutralChroma, preset.chroma)
    ) {
      return preset.id;
    }
  }
  return null;
}

export function detectAccentPreset(draft: ThemeDraft): AccentId | null {
  for (const preset of ACCENT_PRESETS) {
    if (
      near(draft.light.accentL, preset.light.l) &&
      near(draft.light.accentC, preset.light.c) &&
      near(draft.light.accentH, preset.light.h) &&
      near(draft.dark.accentL, preset.dark.l) &&
      near(draft.dark.accentC, preset.dark.c) &&
      near(draft.dark.accentH, preset.dark.h)
    ) {
      return preset.id;
    }
  }
  return null;
}

export function detectRadiusPreset(draft: ThemeDraft): RadiusId | null {
  return RADIUS_PRESETS.find((p) => near(draft.radius, p.rem))?.id ?? null;
}

export function detectElevationPreset(draft: ThemeDraft): ElevationId | null {
  return (
    ELEVATION_PRESETS.find((p) => near(draft.hairline, p.hairline) && near(draft.elevation, p.elevation))?.id ?? null
  );
}

export function detectMotionPreset(draft: ThemeDraft): MotionId | null {
  return (
    MOTION_PRESETS.find((p) =>
      near(draft.tiers.moderate.duration, DEFAULT_SPRING_TIERS.moderate.duration * p.multiplier),
    )?.id ?? null
  );
}

/** FontId for a --font-sans stack, or null when the stack is custom. */
export function fontIdForStack(stack: string): FontId | null {
  return FONT_PRESETS.find((p) => p.exportStack === stack)?.id ?? null;
}

/** The accent color a draft resolves to in one mode. */
export function draftAccentValue(
  draft: ThemeDraft,
  mode: 'light' | 'dark',
): { l: number; c: number; h: number; foregroundL: number } {
  const tuning = draft[mode];
  return {
    l: tuning.accentL,
    c: tuning.accentC,
    h: tuning.accentH,
    foregroundL: tuning.accentForegroundL,
  };
}

/* ------------------------------------------------------------------ */
/* Resolution                                                          */
/* ------------------------------------------------------------------ */

export interface ResolvedThemeTokens {
  light: Record<string, string>;
  dark: Record<string, string>;
  shared: Record<string, string>;
}

/**
 * Map a draft onto the shared derive math. `preview` swaps --font-sans for
 * the iframe's loaded-font stack; the exported sheet always uses fontSans.
 */
export function resolveDraftTokens(draft: ThemeDraft, options?: { preview?: boolean }): ResolvedThemeTokens {
  const resolved = resolveThemeTuning(draft);
  // Preset pins overlay the derived tuning — pinned tokens win.
  Object.assign(resolved.light, pinnedTokens(draft, 'light'));
  Object.assign(resolved.dark, pinnedTokens(draft, 'dark'));
  if (options?.preview) {
    const preset = fontIdForStack(draft.fontSans);
    resolved.shared['font-sans'] = preset ? getFontPreset(preset).previewStack : draft.fontSans;
  }
  return resolved;
}

/* ------------------------------------------------------------------ */
/* Export + preview stylesheets                                        */
/* ------------------------------------------------------------------ */

/**
 * Numeric token equality — parseColor reads both the derived oklch() output
 * and the shipped hsl() values; hue only counts when both sides carry chroma
 * (a pure-neutral token has no meaningful hue).
 */
function tokenEquals(value: string, shipped: string | undefined): boolean {
  if (shipped === undefined) return false;
  if (value === shipped) return true;
  const a = parseColor(value);
  const b = parseColor(shipped);
  if (a.l === 0 && a.c === 0 && a.h === 0) return false;
  return (
    Math.abs(a.l - b.l) <= 1e-3 &&
    Math.abs(a.c - b.c) <= 1e-3 &&
    (a.c <= 1e-3 || b.c <= 1e-3 || Math.abs(a.h - b.h) <= 1e-3)
  );
}

const DURATION_KEYS = [
  'duration-fast',
  'duration-moderate',
  'duration-slow',
  'duration-fast-exit',
  'duration-moderate-exit',
  'duration-slow-exit',
] as const;

function shippedShared(): Record<string, string> {
  return {
    radius: constructiveTheme.light.radius,
    'font-sans': constructiveTheme.fonts['--font-sans'],
    ...Object.fromEntries(DURATION_KEYS.map((key) => [key, constructiveTheme.light[key] ?? ''])),
  };
}

/** Per-mode + shared token diffs vs the shipped theme (the export basis). */
function themeDiffs(draft: ThemeDraft): {
  lightDiff: Record<string, string>;
  darkDiff: Record<string, string>;
  sharedDiff: Record<string, string>;
} {
  const resolved = resolveDraftTokens(draft);
  const lightDiff: Record<string, string> = {};
  const darkDiff: Record<string, string> = {};
  const sharedDiff: Record<string, string> = {};
  const shippedLight: ThemeTokenMap = constructiveTheme.light;
  const shippedDark: ThemeTokenMap = constructiveTheme.dark;

  for (const [key, value] of Object.entries(resolved.light)) {
    if (!tokenEquals(value, shippedLight[key])) lightDiff[key] = value;
  }
  for (const [key, value] of Object.entries(resolved.dark)) {
    if (!tokenEquals(value, shippedDark[key])) darkDiff[key] = value;
  }
  const shipped = shippedShared();
  for (const [key, value] of Object.entries(resolved.shared)) {
    if (!tokenEquals(value, shipped[key])) sharedDiff[key] = value;
  }
  return { lightDiff, darkDiff, sharedDiff };
}

/**
 * Exported override CSS — only declarations that differ from the shipped
 * theme. `null` when the draft IS the shipped theme.
 */
export function buildThemeCss(draft: ThemeDraft): string | null {
  const { lightDiff, darkDiff, sharedDiff } = themeDiffs(draft);
  const rootDecl = { ...lightDiff, ...sharedDiff };
  const blocks: string[] = [];
  if (Object.keys(rootDecl).length > 0) {
    blocks.push(`:root {\n${toCssDeclarations(rootDecl)}\n}`);
  }
  if (Object.keys(darkDiff).length > 0) {
    blocks.push(`.dark {\n${toCssDeclarations(darkDiff)}\n}`);
  }
  if (blocks.length === 0) return null;

  let css = blocks.join('\n\n');
  if (sharedDiff['font-sans']) {
    css += '\n\n/* Load the font (e.g. next/font) and point --font-sans at its CSS variable. */';
  }
  return css;
}

/**
 * A standalone `registry:theme` item for the draft — the same diff
 * `buildThemeCss` computes, keys without `--`. `shadcn add` merges it into
 * the project's globals.css. `null` when nothing differs.
 */
export function buildRegistryItem(draft: ThemeDraft) {
  const { lightDiff, darkDiff, sharedDiff } = themeDiffs(draft);
  const { 'font-sans': fontSans, ...sharedRest } = sharedDiff;
  const light = { ...lightDiff, ...sharedRest };
  if (Object.keys(light).length === 0 && Object.keys(darkDiff).length === 0 && !fontSans) {
    return null;
  }
  const cssVars: Record<string, Record<string, string>> = { light, dark: darkDiff };
  if (fontSans) cssVars.theme = { 'font-sans': fontSans };
  return {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: 'constructive-theme-custom',
    type: 'registry:theme',
    title: 'Constructive theme (custom)',
    cssVars,
  };
}

/**
 * Full override sheet for the preview iframe — every derived token (not just
 * diffs) so the iframe stands alone, with --font-sans pointed at the loaded
 * preview stack.
 */
export function previewStyleSheet(draft: ThemeDraft): string {
  return themeOverrideStyleSheet(resolveDraftTokens(draft, { preview: true }));
}

/* ------------------------------------------------------------------ */
/* URL encoding — '2.' + base64url(JSON diff vs DEFAULT_DRAFT)          */
/* ------------------------------------------------------------------ */

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Diff `value` against `shipped`, visiting keys in sorted order so the result
 * is independent of how the draft object was assembled. The encoded string is
 * used as an equality token by the dial-panel sync guards, so two drafts with
 * the same content must encode identically regardless of key order.
 */
function diffValue(shipped: unknown, value: unknown): unknown {
  if (isPlainObject(shipped) && isPlainObject(value)) {
    const diff: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const inner = diffValue(shipped[key], value[key]);
      if (inner !== undefined) diff[key] = inner;
    }
    return Object.keys(diff).length > 0 ? diff : undefined;
  }
  // Arrays (released families) compare as sets — order and duplicates don't matter.
  if (Array.isArray(shipped) && Array.isArray(value)) {
    const next = [...new Set(value)].sort();
    return JSON.stringify([...new Set(shipped)].sort()) === JSON.stringify(next) ? undefined : next;
  }
  const a = typeof shipped === 'number' ? round3(shipped) : shipped;
  const b = typeof value === 'number' ? round3(value) : value;
  return a === b ? undefined : b;
}

/** `'2.' + base64url(canonical JSON of keys that differ from DEFAULT_DRAFT, rounded to 3dp)`. */
export function encodeDraft(draft: ThemeDraft): string {
  const diff = diffValue(DEFAULT_DRAFT, draft) ?? {};
  return `2.${btoa(JSON.stringify(diff)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? round3(value) : fallback;
}

function finiteObject<T extends object>(value: unknown, defaults: { [K in keyof T]: number }): T {
  const input = isPlainObject(value) ? value : {};
  const out = {} as { [K in keyof T]: number };
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    out[key] = finite(input[String(key)], defaults[key]);
  }
  return out as T;
}

const MODE_TUNING_KEY_SET = new Set<string>(Object.keys(DEFAULT_DRAFT.light));

/** Keep only real ModeTuning keys, deduped. */
function sanitizeReleased(value: unknown): (keyof ModeTuning)[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<keyof ModeTuning>();
  for (const key of value) {
    if (typeof key === 'string' && MODE_TUNING_KEY_SET.has(key)) {
      seen.add(key as keyof ModeTuning);
    }
  }
  return [...seen];
}

/** Per-field tolerant sanitising of an unknown draft payload. */
export function sanitizeDraft(value: unknown): ThemeDraft {
  const input = isPlainObject(value) ? value : {};
  const defaults = DEFAULT_DRAFT;
  const draft: ThemeDraft = {
    mode:
      typeof input.mode === 'string' && COLOR_MODES.includes(input.mode as ColorMode)
        ? (input.mode as ColorMode)
        : defaults.mode,
    font:
      typeof input.font === 'string' && FONT_IDS.includes(input.font as FontId)
        ? (input.font as FontId)
        : defaults.font,
    theme: isThemePresetId(input.theme) ? input.theme : null,
    released: {
      light: sanitizeReleased(isPlainObject(input.released) ? input.released.light : undefined),
      dark: sanitizeReleased(isPlainObject(input.released) ? input.released.dark : undefined),
    },
    light: finiteObject<ThemeDraft['light']>(input.light, defaults.light),
    dark: finiteObject<ThemeDraft['dark']>(input.dark, defaults.dark),
    radius: finite(input.radius, defaults.radius),
    hairline: finite(input.hairline, defaults.hairline),
    elevation: finite(input.elevation, defaults.elevation),
    fontSans: typeof input.fontSans === 'string' && input.fontSans.length > 0 ? input.fontSans : defaults.fontSans,
    tiers: {
      fast: finiteObject<SpringTier>(isPlainObject(input.tiers) ? input.tiers.fast : undefined, defaults.tiers.fast),
      moderate: finiteObject<SpringTier>(
        isPlainObject(input.tiers) ? input.tiers.moderate : undefined,
        defaults.tiers.moderate,
      ),
      slow: finiteObject<SpringTier>(isPlainObject(input.tiers) ? input.tiers.slow : undefined, defaults.tiers.slow),
    },
  };
  // font + fontSans describe the same choice — reconcile toward the stack.
  const matched = fontIdForStack(draft.fontSans);
  if (matched) draft.font = matched;
  // Released families only mean something while a preset is pinned.
  if (draft.theme === null) draft.released = { light: [], dark: [] };
  return draft;
}

/** Tolerant decode: bad prefix/JSON/unknown fields all fall back to defaults. */
export function decodeDraft(code: string | null | undefined): ThemeDraft {
  if (!code || !code.startsWith('2.')) return structuredClone(DEFAULT_DRAFT);
  try {
    const base64 = code.slice(2).replace(/-/g, '+').replace(/_/g, '/');
    const parsed: unknown = JSON.parse(atob(base64));
    return sanitizeDraft(parsed);
  } catch {
    return structuredClone(DEFAULT_DRAFT);
  }
}

/** Random neutral/accent/radius/font/elevation; mode + motion survive. */
/**
 * A random but usable look: either one of the theme presets or a combination
 * of the authored neutral / accent / radius / font / elevation presets (all of
 * which are contrast-verified). Never hands back the look already applied.
 */
export function randomDraft(current: ThemeDraft = DEFAULT_DRAFT, random: () => number = Math.random): ThemeDraft {
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!;
  const roll = (): ThemeDraft => {
    // Half the rolls land on a Ghostty-derived theme preset.
    if (random() < 0.5) {
      return applyThemePreset(current, pick(THEME_PRESET_IDS));
    }
    let draft = applyNeutralPreset({ ...current, theme: null, released: { light: [], dark: [] } }, pick(NEUTRAL_IDS));
    draft = applyAccentPreset(draft, pick(ACCENT_IDS));
    draft = applyRadiusPreset(draft, pick(RADIUS_IDS));
    draft = applyFontPreset(draft, pick(FONT_IDS));
    draft = applyElevationPreset(draft, pick(ELEVATION_IDS));
    return draft;
  };
  const before = encodeDraft(current);
  let next = roll();
  for (let attempt = 0; attempt < 8 && encodeDraft(next) === before; attempt += 1) next = roll();
  return next;
}

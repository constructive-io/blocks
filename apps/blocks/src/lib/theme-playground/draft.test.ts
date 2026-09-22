import { describe, expect, it } from 'vitest';

import {
  constructiveTheme,
  defaultThemeTuning,
  getThemePreset,
  parseColor,
  THEME_PRESET_IDS,
} from '@constructive-io/ui';

import { contrastRatio } from './color';
import {
  ACCENT_PRESETS,
  accentForegroundL,
  applyAccentPreset,
  applyMotionPreset,
  applyNeutralPreset,
  applyRadiusPreset,
  applyThemePreset,
  buildRegistryItem,
  buildThemeCss,
  clearThemePreset,
  decodeDraft,
  DEFAULT_DRAFT,
  detectAccentPreset,
  detectMotionPreset,
  detectNeutralPreset,
  detectRadiusPreset,
  draftAccentValue,
  encodeDraft,
  pinnedTokens,
  previewStyleSheet,
  randomDraft,
  resolveDraftTokens,
  sanitizeDraft,
  type ThemeDraft,
} from './draft';

function expectOklchClose(actual: string, expected: string, key: string) {
  const a = parseColor(actual);
  const e = parseColor(expected);
  expect(Math.abs(a.l - e.l), `${key} lightness`).toBeLessThanOrEqual(1e-3);
  expect(Math.abs(a.c - e.c), `${key} chroma`).toBeLessThanOrEqual(1e-3);
  // Pure-neutral tokens carry no meaningful hue — only compare chromatic ones.
  if (a.c > 1e-3 && e.c > 1e-3) {
    expect(Math.abs(a.h - e.h), `${key} hue`).toBeLessThanOrEqual(1e-3);
  }
}

const TUNED_DRAFT: ThemeDraft = (() => {
  let draft: ThemeDraft = { ...DEFAULT_DRAFT, mode: 'dark' };
  draft = applyNeutralPreset(draft, 'slate');
  draft = applyAccentPreset(draft, 'violet');
  draft = applyRadiusPreset(draft, 'xl');
  draft = applyMotionPreset(draft, 'relaxed');
  draft = {
    ...draft,
    font: 'geist',
    fontSans: '"Geist", ui-sans-serif, system-ui, sans-serif',
    hairline: 0.1,
    elevation: 1.6,
  };
  return draft;
})();

describe('encodeDraft / decodeDraft', () => {
  const drafts: ThemeDraft[] = [
    DEFAULT_DRAFT,
    { ...DEFAULT_DRAFT, mode: 'dark' },
    TUNED_DRAFT,
    { ...DEFAULT_DRAFT, light: { ...DEFAULT_DRAFT.light, accentH: 33.5 } },
  ];

  it('round-trips drafts', () => {
    for (const draft of drafts) {
      expect(decodeDraft(encodeDraft(draft))).toEqual(draft);
    }
  });

  it('produces a versioned base64url payload', () => {
    expect(encodeDraft(DEFAULT_DRAFT)).toBe('2.e30');
    expect(encodeDraft({ ...DEFAULT_DRAFT, mode: 'dark' })).toMatch(/^2\.[A-Za-z0-9_-]+$/);
  });

  it('rejects v1 payloads and garbage input', () => {
    expect(decodeDraft('1.e30')).toEqual(DEFAULT_DRAFT);
    expect(decodeDraft('garbage')).toEqual(DEFAULT_DRAFT);
    expect(decodeDraft('2.not-json!!!')).toEqual(DEFAULT_DRAFT);
    expect(decodeDraft(null)).toEqual(DEFAULT_DRAFT);
    expect(decodeDraft(undefined)).toEqual(DEFAULT_DRAFT);
    expect(decodeDraft('')).toEqual(DEFAULT_DRAFT);
  });

  it('falls back per-field on bad types', () => {
    const draft = sanitizeDraft({
      mode: 'bogus',
      font: 'comic-sans',
      light: { ...DEFAULT_DRAFT.light, accentH: 'nope', accentL: 0.9 },
      dark: null,
      radius: Number.NaN,
      hairline: 0.12,
      fontSans: '"Georgia", serif',
      tiers: { fast: { duration: 0.1, bounce: 'x', exitDuration: 0.05 } },
    });
    const defaults = defaultThemeTuning();
    expect(draft.mode).toBe(DEFAULT_DRAFT.mode);
    expect(draft.font).toBe(DEFAULT_DRAFT.font);
    expect(draft.light.accentH).toBe(defaults.light.accentH);
    expect(draft.light.accentL).toBe(0.9);
    expect(draft.dark).toEqual(defaults.dark);
    expect(draft.radius).toBe(defaults.radius);
    expect(draft.hairline).toBe(0.12);
    expect(draft.fontSans).toBe('"Georgia", serif');
    expect(draft.tiers.fast.duration).toBe(0.1);
    expect(draft.tiers.fast.bounce).toBe(defaults.tiers.fast.bounce);
    expect(draft.tiers.moderate).toEqual(defaults.tiers.moderate);
  });

  it('reconciles font id from a matching fontSans stack', () => {
    const draft = sanitizeDraft({ fontSans: '"Geist", ui-sans-serif, system-ui, sans-serif' });
    expect(draft.font).toBe('geist');
  });

  it('round-trips theme + released', () => {
    let draft = applyThemePreset(DEFAULT_DRAFT, 'nord');
    draft = {
      ...draft,
      released: { light: ['borderL', 'inputL'], dark: [] },
    };
    const decoded = decodeDraft(encodeDraft(draft));
    expect(decoded.theme).toBe('nord');
    expect(decoded.released).toEqual({ light: ['borderL', 'inputL'], dark: [] });
    expect(decoded.light.accentH).toBeCloseTo(draft.light.accentH, 2);
    expect(decoded.dark.backgroundL).toBeCloseTo(draft.dark.backgroundL, 2);
  });

  it('sanitises unknown theme ids to null and filters released keys', () => {
    expect(sanitizeDraft({ theme: 'not-a-preset' }).theme).toBeNull();
    expect(sanitizeDraft({ theme: 'dracula' }).theme).toBe('dracula');
    expect(
      sanitizeDraft({ theme: 'dracula', released: { light: ['borderL', 'bogus', 'borderL'], dark: 'x' } }).released,
    ).toEqual({
      light: ['borderL'],
      dark: [],
    });
  });

  it('drops released families when no theme is pinned', () => {
    // A persisted draft from a session that released keys without a theme must not carry them forward.
    const draft = sanitizeDraft({ released: { light: ['borderL'], dark: ['accentH'] } });
    expect(draft.theme).toBeNull();
    expect(draft.released).toEqual({ light: [], dark: [] });
  });

  it('encodes identically regardless of key order or released ordering', () => {
    // The dial-panel sync guards compare encoded strings, so the same content
    // assembled in a different key order (sanitizeDraft vs `{...tuning, mode}`)
    // must produce the same token or the two effects ping-pong forever.
    const themed = applyThemePreset({ ...DEFAULT_DRAFT, mode: 'dark' }, 'nord');
    // sanitizeDraft assembles keys as mode, font, theme, released, light, … — the persisted/URL order.
    const a: ThemeDraft = sanitizeDraft({ ...themed, released: { light: ['inputL', 'borderL'], dark: [] } });
    const { light, dark, radius, hairline, elevation, fontSans, tiers, mode, font, theme } = a;
    const b: ThemeDraft = {
      light,
      dark,
      radius,
      hairline,
      elevation,
      fontSans,
      tiers,
      mode,
      font,
      theme,
      released: { light: ['borderL', 'inputL'], dark: [] },
    };
    expect(Object.keys(a)).not.toEqual(Object.keys(b));
    expect(encodeDraft(a)).toBe(encodeDraft(b));
    expect(encodeDraft(sanitizeDraft(JSON.parse(JSON.stringify(a))))).toBe(encodeDraft(a));
  });
});

describe('preset appliers and detection', () => {
  it('default draft detects the shipped presets', () => {
    expect(detectNeutralPreset(DEFAULT_DRAFT)).toBe('gray');
    expect(detectAccentPreset(DEFAULT_DRAFT)).toBe('blue');
    expect(detectRadiusPreset(DEFAULT_DRAFT)).toBe('md');
    expect(detectMotionPreset(DEFAULT_DRAFT)).toBe('balanced');
  });

  it('appliers produce detectable presets', () => {
    let draft = applyNeutralPreset(DEFAULT_DRAFT, 'mauve');
    expect(detectNeutralPreset(draft)).toBe('mauve');
    draft = applyAccentPreset(draft, 'amber');
    expect(detectAccentPreset(draft)).toBe('amber');
    draft = applyRadiusPreset(draft, 'none');
    expect(detectRadiusPreset(draft)).toBe('none');
    draft = applyMotionPreset(draft, 'quick');
    expect(detectMotionPreset(draft)).toBe('quick');
  });

  it('returns null once dials move the tuning off-preset', () => {
    const draft = {
      ...DEFAULT_DRAFT,
      light: { ...DEFAULT_DRAFT.light, accentH: DEFAULT_DRAFT.light.accentH + 40 },
    };
    expect(detectAccentPreset(draft)).toBeNull();
  });

  it('neutral presets share one hue across both modes', () => {
    const draft = applyNeutralPreset(DEFAULT_DRAFT, 'slate');
    expect(draft.dark.neutralHue).toBe(draft.light.neutralHue);
  });

  it('the cool preset tints the neutral ramp through the reference weights', () => {
    const resolved = resolveDraftTokens(applyNeutralPreset(DEFAULT_DRAFT, 'cool'));
    const border = parseColor(resolved.light.border);
    expect(border.c).toBeCloseTo(0.008, 3);
    expect(border.h).toBeCloseTo(250, 1);
  });
});

describe('resolveDraftTokens', () => {
  it('reproduces shipped tokens for the default draft', () => {
    const resolved = resolveDraftTokens(DEFAULT_DRAFT);
    const shippedLight: Record<string, string> = constructiveTheme.light;
    const shippedDark: Record<string, string> = constructiveTheme.dark;
    for (const [key, value] of Object.entries(resolved.light)) {
      expect(shippedLight[key], `light ${key} missing from shipped map`).toBeDefined();
      if (/oklch\(/.test(value)) {
        expectOklchClose(value, shippedLight[key], `light ${key}`);
      } else {
        expect(value, `light ${key}`).toBe(shippedLight[key]);
      }
    }
    for (const [key, value] of Object.entries(resolved.dark)) {
      expect(shippedDark[key], `dark ${key} missing from shipped map`).toBeDefined();
      if (/oklch\(/.test(value)) {
        expectOklchClose(value, shippedDark[key], `dark ${key}`);
      } else {
        expect(value, `dark ${key}`).toBe(shippedDark[key]);
      }
    }
    expect(resolved.shared.radius).toBe(constructiveTheme.light.radius);
    expect(resolved.shared['font-sans']).toBe(constructiveTheme.fonts['--font-sans']);
    for (const key of [
      'duration-fast',
      'duration-moderate',
      'duration-slow',
      'duration-fast-exit',
      'duration-moderate-exit',
      'duration-slow-exit',
    ]) {
      expect(resolved.shared[key]).toBe(shippedLight[key]);
    }
  });
});

describe('buildThemeCss', () => {
  it('returns null for the default draft', () => {
    expect(buildThemeCss(DEFAULT_DRAFT)).toBeNull();
  });

  it('emits only changed declarations for a tuned draft', () => {
    let draft = applyNeutralPreset(DEFAULT_DRAFT, 'slate');
    draft = applyAccentPreset(draft, 'violet');
    draft = applyRadiusPreset(draft, 'xl');
    const css = buildThemeCss(draft);
    expect(css).not.toBeNull();
    expect(css).toContain(':root {');
    expect(css).toContain('.dark {');
    expect(css).toContain('--primary:');
    expect(css).toContain('--border:');
    expect(css).toContain('--radius: 1.25rem;');
    // Unchanged tokens stay out of the export.
    expect(css).not.toContain('--font-sans:');
    expect(css).not.toContain('--duration-fast:');
    expect(css).not.toContain('--destructive:');
  });

  it('keeps preview mode out of the export', () => {
    expect(buildThemeCss({ ...DEFAULT_DRAFT, mode: 'dark' })).toBeNull();
  });

  it('adds the font-loading note when the font changes', () => {
    const css = buildThemeCss({
      ...DEFAULT_DRAFT,
      font: 'open-sans',
      fontSans: '"Open Sans", ui-sans-serif, system-ui, sans-serif',
    });
    expect(css).toContain('--font-sans: "Open Sans", ui-sans-serif, system-ui, sans-serif;');
    expect(css).toContain('next/font');
  });
});

describe('theme presets', () => {
  it('applies a preset: every color token pins in both modes', () => {
    const draft = applyThemePreset(DEFAULT_DRAFT, 'dracula');
    const preset = getThemePreset('dracula');
    expect(draft.theme).toBe('dracula');
    expect(draft.mode).toBe('dark'); // system → dark
    expect(draft.released).toEqual({ light: [], dark: [] });
    const resolved = resolveDraftTokens(draft);
    for (const [key, value] of Object.entries(preset.tokens.light)) {
      expectOklchClose(resolved.light[key]!, value, `light ${key}`);
    }
    for (const [key, value] of Object.entries(preset.tokens.dark)) {
      expectOklchClose(resolved.dark[key]!, value, `dark ${key}`);
    }
    // Non-color knobs are untouched.
    expect(draft.radius).toBe(DEFAULT_DRAFT.radius);
    expect(draft.font).toBe(DEFAULT_DRAFT.font);
  });

  it('clearThemePreset keeps the fitted tuning but drops the pins', () => {
    const themed = applyThemePreset(DEFAULT_DRAFT, 'dracula');
    const cleared = clearThemePreset(themed);
    expect(cleared.theme).toBeNull();
    expect(cleared.released).toEqual({ light: [], dark: [] });
    expect(cleared.light).toEqual(themed.light);
    // Without pins, chart/feedback tokens fall back to the shipped theme.
    const resolved = resolveDraftTokens(cleared);
    expect(resolved.dark['chart-1']).toBeUndefined();
  });

  it('a released family drops only its tokens', () => {
    const preset = getThemePreset('dracula');
    let draft = applyThemePreset(DEFAULT_DRAFT, 'dracula');
    draft = {
      ...draft,
      released: { light: ['borderL'], dark: [] },
      light: { ...draft.light, borderL: draft.light.borderL + 0.05 },
    };
    const pins = pinnedTokens(draft, 'light');
    expect(pins.border).toBeUndefined();
    expect(pins['sidebar-border']).toBeUndefined();
    expect(pins.primary).toBe(preset.tokens.light.primary);
    const resolved = resolveDraftTokens(draft);
    // The released token resolves from the moved dial; dark stays fully pinned.
    expect(resolved.light.border).not.toBe(preset.tokens.light.border);
    expect(resolved.light.primary).toBe(preset.tokens.light.primary);
    expect(resolved.dark.border).toBe(preset.tokens.dark.border);
  });

  it('buildThemeCss for a preset emits --chart-1 and --success inside .dark', () => {
    const css = buildThemeCss(applyThemePreset(DEFAULT_DRAFT, 'dracula'))!;
    const darkBlock = css.slice(css.indexOf('.dark {'));
    expect(darkBlock).toContain('--chart-1:');
    expect(darkBlock).toContain('--success:');
  });

  it('buildRegistryItem emits the same diff as a registry:theme item', () => {
    const item = buildRegistryItem(applyThemePreset(DEFAULT_DRAFT, 'nord'))!;
    expect(item.type).toBe('registry:theme');
    expect(item.name).toBe('constructive-theme-custom');
    expect(item.cssVars.dark['chart-1']).toBe(getThemePreset('nord').tokens.dark['chart-1']);
    expect(item.cssVars.light.radius).toBeUndefined(); // unchanged → omitted
    expect(item.cssVars.theme).toBeUndefined();
    expect(buildRegistryItem(DEFAULT_DRAFT)).toBeNull();
    const withFont = buildRegistryItem({
      ...DEFAULT_DRAFT,
      font: 'geist',
      fontSans: '"Geist", ui-sans-serif, system-ui, sans-serif',
    })!;
    expect(withFont.cssVars.theme).toEqual({
      'font-sans': '"Geist", ui-sans-serif, system-ui, sans-serif',
    });
  });
});

describe('previewStyleSheet', () => {
  it('emits a full :root + .dark override with the preview font stack', () => {
    const sheet = previewStyleSheet({
      ...DEFAULT_DRAFT,
      font: 'geist',
      fontSans: '"Geist", ui-sans-serif, system-ui, sans-serif',
    });
    expect(sheet).toContain(':root {');
    expect(sheet).toContain('.dark {');
    expect(sheet).toContain('--font-sans: var(--font-geist)');
    expect(sheet).toContain('--primary:');
  });
});

describe('accent presets', () => {
  it('meet the 4.5:1 contrast bar in both modes (brand blue exempt)', () => {
    for (const preset of ACCENT_PRESETS) {
      for (const mode of ['light', 'dark'] as const) {
        const base = constructiveTheme[mode];
        const value = preset[mode];
        const fg = {
          l: accentForegroundL(value.fg),
          c: parseColor(base['primary-foreground']).c,
          h: parseColor(base['primary-foreground']).h,
        };
        const ratio = contrastRatio({ l: value.l, c: value.c, h: value.h }, fg);
        if (preset.id === 'blue') {
          // The shipped blue is the Constructive brand blue exactly as constructive.io
          // renders its CTA (#00A2FF with white text) — brand fidelity wins over the
          // body-text bar here; the panel's contrast badge reports it honestly.
          expect(value.l).toBeCloseTo(parseColor(base.primary).l, 3);
          continue;
        }
        expect(ratio, `${preset.id} ${mode} (${ratio.toFixed(2)}:1)`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('blue equals the shipped primary in both modes', () => {
    const blue = ACCENT_PRESETS.find((p) => p.id === 'blue')!;
    expectOklchClose(
      `oklch(${blue.light.l} ${blue.light.c} ${blue.light.h})`,
      constructiveTheme.light.primary,
      'blue light',
    );
    expectOklchClose(
      `oklch(${blue.dark.l} ${blue.dark.c} ${blue.dark.h})`,
      constructiveTheme.dark.primary,
      'blue dark',
    );
  });

  it('draftAccentValue exposes the tuned accent and foreground', () => {
    const tuned = applyAccentPreset(DEFAULT_DRAFT, 'amber');
    const light = draftAccentValue(tuned, 'light');
    expect(light.h).toBe(70);
    expect(light.foregroundL).toBe(0.18);
  });
});

describe('randomDraft', () => {
  it('keeps mode and tiers, always resolves to presets', () => {
    const current: ThemeDraft = applyMotionPreset({ ...DEFAULT_DRAFT, mode: 'dark' }, 'relaxed');
    for (let i = 0; i < 25; i += 1) {
      const draft = randomDraft(current);
      expect(draft.mode).toBe('dark');
      expect(draft.tiers).toEqual(current.tiers);
      if (draft.theme === null) {
        expect(detectNeutralPreset(draft)).not.toBeNull();
        expect(detectAccentPreset(draft)).not.toBeNull();
        expect(detectRadiusPreset(draft)).not.toBeNull();
      } else {
        expect(THEME_PRESET_IDS).toContain(draft.theme);
      }
    }
  });

  it('can yield a theme preset', () => {
    const draft = randomDraft(DEFAULT_DRAFT, () => 0);
    expect(draft.theme).toBe(THEME_PRESET_IDS[0]);
  });
});

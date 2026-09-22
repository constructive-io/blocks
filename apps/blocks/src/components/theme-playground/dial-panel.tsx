'use client';

import dynamic from 'next/dynamic';
import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Code, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useDialKitController, DialRoot, type DialKitValueUpdates } from 'dialkit';

import { constructiveTheme } from '@constructive-io/ui/theme';
import { buildThemeDialConfig, dialValuesToTuning, tuningToDialValues } from '@constructive-io/ui/theme-dials-config';
import { THEME_PRESETS, type ThemePresetId } from '@constructive-io/ui/theme-presets';
import { defaultThemeTuning, parseOklch, type ModeTuning } from '@constructive-io/ui/theme-tuning';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@constructive-io/ui/select';

import { contrastRatio } from '@/lib/theme-playground/color';
import {
  ACCENT_PRESETS,
  applyAccentPreset,
  applyElevationPreset,
  applyMotionPreset,
  applyNeutralPreset,
  applyRadiusPreset,
  applyThemePreset,
  buildThemeCss,
  clearThemePreset,
  detectAccentPreset,
  detectElevationPreset,
  detectMotionPreset,
  detectNeutralPreset,
  detectRadiusPreset,
  draftAccentValue,
  encodeDraft,
  ELEVATION_PRESETS,
  FONT_PRESETS,
  fontIdForStack,
  MOTION_PRESETS,
  NEUTRAL_PRESETS,
  RADIUS_PRESETS,
  randomDraft,
  type AccentId,
  type ColorMode,
  type ElevationId,
  type MotionId,
  type NeutralId,
  type RadiusId,
  type ThemeDraft,
} from '@/lib/theme-playground/draft';
import { cn } from '@/lib/utils';

import { useThemeDraft } from './use-theme-draft';

// CodeBlock + sugar-high + InstallToggle only load after the first
// "Get code" click; once mounted the dialog stays mounted so later closes
// keep their exit animation.
const GetCodeDialog = dynamic(() => import('./get-code-dialog').then((m) => m.GetCodeDialog), {
  ssr: false,
});

/* ------------------------------------------------------------------ */
/* DialKit config — shared with the Storybook theme dials               */
/* ------------------------------------------------------------------ */

const DEFAULTS = defaultThemeTuning();

const DIAL_CONFIG = {
  ...buildThemeDialConfig(
    DEFAULTS,
    FONT_PRESETS.map((preset) => ({ value: preset.exportStack, label: preset.label })),
  ),
  actions: {
    shuffle: { type: 'action' as const, label: 'Shuffle' },
    reset: { type: 'action' as const, label: 'Reset' },
    copyCss: { type: 'action' as const, label: 'Copy CSS' },
    share: { type: 'action' as const, label: 'Copy share link' },
  },
};

/* ------------------------------------------------------------------ */
/* Host-owned controls                                                  */
/* ------------------------------------------------------------------ */

const SEGMENT_ITEM =
  'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-muted-foreground outline-none transition-[background-color,color,box-shadow] duration-(--duration-moderate) ease-out hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 data-checked:bg-background data-checked:text-foreground data-checked:shadow-sm motion-reduce:transition-none';

const MODE_OPTIONS: { value: ColorMode; label: string; icon: ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <Sun className="size-3.5" aria-hidden /> },
  { value: 'dark', label: 'Dark', icon: <Moon className="size-3.5" aria-hidden /> },
  { value: 'system', label: 'System', icon: <Monitor className="size-3.5" aria-hidden /> },
];

function ModeControl({ value, onChange }: { value: ColorMode; onChange: (mode: ColorMode) => void }) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onChange(next as ColorMode)}
      aria-label="Preview mode"
      className="flex rounded-lg bg-muted/70 p-0.5"
    >
      {MODE_OPTIONS.map((option) => (
        <Radio.Root key={option.value} value={option.value} aria-label={option.label} className={SEGMENT_ITEM}>
          {option.icon}
          {option.label}
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}

const MODE_TUNING_KEYS = Object.keys(DEFAULTS.light) as (keyof ModeTuning)[];

/** Shipped-token swatches for the default ("Constructive") tile. */
function constructiveSwatches(mode: 'light' | 'dark'): string[] {
  const tokens = constructiveTheme[mode];
  return [tokens.background, tokens.muted, tokens.primary, tokens['chart-2'], tokens['chart-3']];
}

function ThemeTile({
  label,
  swatches,
  selected,
  onSelect,
}: {
  label: string;
  swatches: string[];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'rounded-md bg-muted/50 p-2.5 text-left transition-[background-color,box-shadow] duration-(--duration-moderate) ease-out hover:bg-muted',
        selected && 'bg-accent shadow-[inset_0_0_0_1px_var(--ring)]',
      )}
    >
      <span className="flex gap-1">
        {swatches.map((color, index) => (
          <span
            key={index}
            aria-hidden
            className="size-3 rounded-full shadow-[inset_0_0_0_1px_oklch(0_0_0/0.08)] dark:shadow-[inset_0_0_0_1px_oklch(1_0_0/0.1)]"
            style={{ background: color }}
          />
        ))}
      </span>
      <span className="mt-2 block text-[12.5px] font-medium">{label}</span>
    </button>
  );
}

function PresetSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  options: readonly { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <Select
        value={value}
        onValueChange={(next) => onChange(next as T)}
        items={Object.fromEntries(options.map((option) => [option.id, option.label]))}
      >
        <SelectTrigger aria-label={label} className="h-8 w-full text-[12px]">
          <SelectValue placeholder="Custom" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

interface ThemePresetPickerProps {
  theme: ThemePresetId | null;
  previewMode: 'light' | 'dark';
  onSelect: (id: ThemePresetId | null) => void;
}

const ThemePresetPicker = memo(function ThemePresetPicker({ theme, previewMode, onSelect }: ThemePresetPickerProps) {
  return (
    <div className="mt-1.5 grid grid-cols-2 gap-2">
      <ThemeTile
        label="Constructive"
        swatches={constructiveSwatches(previewMode)}
        selected={theme === null}
        onSelect={() => onSelect(null)}
      />
      {THEME_PRESETS.map((preset) => (
        <ThemeTile
          key={preset.id}
          label={preset.label}
          swatches={preset.swatches[previewMode]}
          selected={theme === preset.id}
          onSelect={() => onSelect(preset.id)}
        />
      ))}
    </div>
  );
});

interface PresetRowProps {
  neutral: NeutralId | null;
  accent: AccentId | null;
  radius: RadiusId | null;
  elevation: ElevationId | null;
  motion: MotionId | null;
  onNeutral: (id: NeutralId) => void;
  onAccent: (id: AccentId) => void;
  onRadius: (id: RadiusId) => void;
  onElevation: (id: ElevationId) => void;
  onMotion: (id: MotionId) => void;
}

const PresetRow = memo(function PresetRow({
  neutral,
  accent,
  radius,
  elevation,
  motion,
  onNeutral,
  onAccent,
  onRadius,
  onElevation,
  onMotion,
}: PresetRowProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <PresetSelect<NeutralId> label="Neutral" value={neutral} options={NEUTRAL_PRESETS} onChange={onNeutral} />
      <PresetSelect<AccentId> label="Accent" value={accent} options={ACCENT_PRESETS} onChange={onAccent} />
      <PresetSelect<RadiusId> label="Radius" value={radius} options={RADIUS_PRESETS} onChange={onRadius} />
      <PresetSelect<ElevationId>
        label="Elevation"
        value={elevation}
        options={ELEVATION_PRESETS}
        onChange={onElevation}
      />
      <PresetSelect<MotionId> label="Motion" value={motion} options={MOTION_PRESETS} onChange={onMotion} />
    </div>
  );
});

/** WCAG contrast of the active accent against its foreground (worst of both modes). */
function AccentContrastBadge({ draft }: { draft: ThemeDraft }) {
  const ratios = (['light', 'dark'] as const).map((mode) => {
    const accent = draftAccentValue(draft, mode);
    const shippedFg = parseOklch(constructiveTheme[mode]['primary-foreground']);
    return contrastRatio(accent, {
      l: accent.foregroundL,
      c: shippedFg.c,
      h: shippedFg.h,
    });
  });
  const worst = Math.min(...ratios);
  return (
    <Badge
      variant={worst >= 4.5 ? 'success' : 'warning'}
      title={`Light ${ratios[0].toFixed(2)}:1 · Dark ${ratios[1].toFixed(2)}:1`}
    >
      {worst >= 4.5 ? 'AA' : 'Below AA'} {worst.toFixed(1)}:1
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                                */
/* ------------------------------------------------------------------ */

/**
 * The Create panel: host-owned header / preset selects / preview-mode switch
 * around an embedded DialKit surface (`mode="inline"`).
 *
 * Two-way sync is guarded both directions so neither side echoes:
 *  - draft → dials: the draft's encoded form is recorded as "synced" before
 *    `setValues`, so when the store echoes those values back the dial→draft
 *    effect sees equality and skips.
 *  - dials → draft: the derived draft's encoded form is recorded before
 *    `setDraft`, so the draft→dials effect sees equality and skips.
 *  - The dial→draft effect stays unarmed until the store has echoed the
 *    pushed draft once. DialKit emits config-default (or persisted) values
 *    more than once during mount — a single skipped run is not enough, and
 *    any later stale emission would stomp a `?d=`/localStorage draft. While
 *    unarmed, diverging emissions re-assert the draft into the store so the
 *    store converges to the draft rather than the reverse.
 */
export function DialPanel() {
  const { draft, setDraft, reset, shareUrl } = useThemeDraft();
  const { resolvedTheme } = useTheme();
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeMounted, setCodeMounted] = useState(false);
  const previewMode: 'light' | 'dark' =
    draft.mode === 'system' ? (resolvedTheme === 'dark' ? 'dark' : 'light') : draft.mode;
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const syncedEncodedRef = useRef<string | null>(null);
  const primedRef = useRef(false);
  // Unarmed re-asserts are bounded: if the store ever normalised a pushed
  // value, an unbounded push/echo cycle would spin forever — after a few
  // rounds the store's values win and become the draft.
  const reassertsRef = useRef(0);
  const MAX_REASSERTS = 3;

  // Stable handlers — read the live draft through draftRef so the memoized
  // picker/row props never change identity on a dial tick.
  const onPresetSelect = useCallback(
    (id: ThemePresetId | null) =>
      setDraft(id === null ? clearThemePreset(draftRef.current) : applyThemePreset(draftRef.current, id)),
    [setDraft],
  );
  const onNeutral = useCallback((id: NeutralId) => setDraft(applyNeutralPreset(draftRef.current, id)), [setDraft]);
  const onAccent = useCallback((id: AccentId) => setDraft(applyAccentPreset(draftRef.current, id)), [setDraft]);
  const onRadius = useCallback((id: RadiusId) => setDraft(applyRadiusPreset(draftRef.current, id)), [setDraft]);
  const onElevation = useCallback(
    (id: ElevationId) => setDraft(applyElevationPreset(draftRef.current, id)),
    [setDraft],
  );
  const onMotion = useCallback((id: MotionId) => setDraft(applyMotionPreset(draftRef.current, id)), [setDraft]);

  const controller = useDialKitController('Constructive theme', DIAL_CONFIG, {
    onAction: (action) => {
      if (action === 'shuffle') {
        setDraft(randomDraft(draftRef.current));
      } else if (action === 'reset') {
        reset();
      } else if (action === 'copyCss') {
        void navigator.clipboard?.writeText(
          buildThemeCss(draftRef.current) ?? '/* Draft matches the shipped theme — no overrides needed. */',
        );
      } else if (action === 'share') {
        void navigator.clipboard?.writeText(shareUrl);
      }
    },
  });
  const { values, setValues } = controller;

  // draft → dials
  useEffect(() => {
    const encoded = encodeDraft(draft);
    if (syncedEncodedRef.current === encoded) return;
    syncedEncodedRef.current = encoded;
    setValues(tuningToDialValues(draft) as DialKitValueUpdates<typeof DIAL_CONFIG>);
  }, [draft, setValues]);

  // dials → draft
  useEffect(() => {
    const tuning = dialValuesToTuning(values, DEFAULTS);
    const font = fontIdForStack(tuning.fontSans) ?? draftRef.current.font;
    const base = draftRef.current;
    // Release the pin on every tuning field the dials actually changed — the
    // rest of the preset stays exact. Only user-driven moves count: nothing is
    // pinned without a theme, and until the store has echoed the pushed draft
    // (primed) its emissions are DialKit defaults, not edits. Compare against
    // the round-tripped base (the tuning the dial layer would express for
    // `base` untouched): the shared neutral dial collapses per-mode hues and
    // the accent foreground round-trips through its darkText toggle, so a raw
    // compare would release fields nobody moved.
    const released = {
      light: new Set(base.released.light),
      dark: new Set(base.released.dark),
    };
    if (primedRef.current && base.theme !== null) {
      const expressed = dialValuesToTuning(tuningToDialValues(base), DEFAULTS);
      for (const mode of ['light', 'dark'] as const) {
        for (const key of MODE_TUNING_KEYS) {
          if (Math.abs(tuning[mode][key] - expressed[mode][key]) > 1e-6) released[mode].add(key);
        }
      }
    }
    const next: ThemeDraft = {
      ...tuning,
      mode: base.mode,
      font,
      theme: base.theme,
      released: { light: [...released.light], dark: [...released.dark] },
    };
    const encoded = encodeDraft(next);
    if (!primedRef.current) {
      if (encoded === syncedEncodedRef.current || reassertsRef.current >= MAX_REASSERTS) {
        primedRef.current = true;
        if (encoded === syncedEncodedRef.current) return;
      } else {
        reassertsRef.current += 1;
        setValues(tuningToDialValues(base) as DialKitValueUpdates<typeof DIAL_CONFIG>);
        return;
      }
    }
    if (encoded === syncedEncodedRef.current) return;
    syncedEncodedRef.current = encoded;
    setDraft(next);
  }, [values, setDraft, setValues]);

  return (
    <aside className="flex min-h-0 flex-col rounded-xl bg-card shadow-card">
      <header className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">Create</h2>
          <AccentContrastBadge draft={draft} />
        </div>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
          Pick a theme or tune every token, then install it.
        </p>
      </header>

      <div className="create-dials min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3 border-b border-border p-4">
          <ModeControl value={draft.mode} onChange={(mode) => setDraft({ mode })} />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">Theme</span>
              {draft.theme !== null && draft.released.light.length + draft.released.dark.length > 0 ? (
                <Badge variant="secondary">Modified</Badge>
              ) : null}
            </div>
            <ThemePresetPicker theme={draft.theme} previewMode={previewMode} onSelect={onPresetSelect} />
          </div>
          <PresetRow
            neutral={detectNeutralPreset(draft)}
            accent={detectAccentPreset(draft)}
            radius={detectRadiusPreset(draft)}
            elevation={detectElevationPreset(draft)}
            motion={detectMotionPreset(draft)}
            onNeutral={onNeutral}
            onAccent={onAccent}
            onRadius={onRadius}
            onElevation={onElevation}
            onMotion={onMotion}
          />
        </div>

        <DialRoot
          mode="inline"
          theme={resolvedTheme === 'dark' || resolvedTheme === 'light' ? resolvedTheme : 'system'}
          productionEnabled
          defaultOpen
        />
      </div>

      <footer className="border-t border-border p-4">
        <Button
          type="button"
          className="w-full"
          onClick={() => {
            setCodeMounted(true);
            setCodeOpen(true);
          }}
        >
          <Code data-icon="inline-start" aria-hidden />
          Get code
        </Button>
      </footer>

      {codeMounted ? <GetCodeDialog open={codeOpen} onOpenChange={setCodeOpen} /> : null}
    </aside>
  );
}

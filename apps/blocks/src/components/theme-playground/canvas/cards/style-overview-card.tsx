import { getThemePreset } from '@constructive-io/ui/theme-presets';

import { ACCENT_PRESETS, detectAccentPreset, FONT_PRESETS } from '@/lib/theme-playground/draft';
import { usePreviewThemeDraft } from '../../preview-document';
import { SinkCard } from './sink-card';

const SWATCH_TOKENS = [
  'background',
  'foreground',
  'primary',
  'secondary',
  'muted',
  'accent',
  'border',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
];

export function StyleOverviewCard() {
  const draft = usePreviewThemeDraft();
  const font = FONT_PRESETS.find((p) => p.id === draft.font)?.label ?? 'Inter';
  const accentId = detectAccentPreset(draft);
  const accent = draft.theme
    ? getThemePreset(draft.theme).label
    : (ACCENT_PRESETS.find((p) => p.id === accentId)?.label ?? 'Custom');

  return (
    <SinkCard contentClassName="flex flex-col gap-4">
      <div>
        <p className="text-2xl font-medium tracking-tight">
          {font} · {accent}
        </p>
        <p className="mt-1 text-[13px] text-muted-foreground">A preview of the current type and color tokens.</p>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {SWATCH_TOKENS.map((token) => (
          <div key={token} className="flex min-w-0 flex-col gap-1">
            <div
              aria-hidden
              className="aspect-square rounded-md shadow-[inset_0_0_0_1px_var(--border)]"
              style={{ background: `var(--${token})` }}
            />
            <span className="truncate font-mono text-[10px] text-muted-foreground">{token}</span>
          </div>
        ))}
      </div>
    </SinkCard>
  );
}

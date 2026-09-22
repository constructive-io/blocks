'use client';

import { THEME_PRESETS, themePresetRegistryName } from '@constructive-io/ui/theme-presets';

export function ThemePresetGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {THEME_PRESETS.map((preset) => (
        <div key={preset.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">{preset.label}</p>
            <span className="flex gap-1" aria-hidden>
              {preset.swatches.dark.map((color, index) => (
                <span
                  key={index}
                  className="size-3 rounded-full shadow-[inset_0_0_0_1px_oklch(1_0_0/0.1)]"
                  style={{ background: color }}
                />
              ))}
            </span>
          </div>
          <p className="mt-1.5 text-pretty text-[13px] leading-5 text-muted-foreground">{preset.description}</p>
          <p className="mt-2 overflow-x-auto rounded-md bg-muted px-2 py-1.5 font-mono text-[12px] whitespace-nowrap text-muted-foreground">
            pnpm dlx shadcn@latest add @constructive/{themePresetRegistryName(preset.id)}
          </p>
        </div>
      ))}
    </div>
  );
}

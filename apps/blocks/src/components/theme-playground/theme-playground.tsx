'use client';

import { DialPanel } from './dial-panel';
import { PreviewFrame } from './preview-frame';
import { ThemeDraftProvider } from './use-theme-draft';

/**
 * /blocks/create — embedded DialKit panel beside a live kitchen-sink iframe.
 *
 * Desktop (≥861px, where the docs nav is already on the left): preview left,
 * controls right. Below that the preview leads and the panel stacks under it.
 */
export function ThemePlayground() {
  return (
    <ThemeDraftProvider>
      <div className="flex min-h-[calc(100dvh-var(--registry-topbar-h))] flex-col gap-4 p-4 min-[861px]:grid min-[861px]:h-[calc(100dvh-var(--registry-topbar-h))] min-[861px]:min-h-0 min-[861px]:grid-cols-[minmax(0,1fr)_320px]">
        <PreviewFrame />
        <DialPanel />
      </div>
    </ThemeDraftProvider>
  );
}

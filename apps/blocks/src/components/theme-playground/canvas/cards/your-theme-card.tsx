'use client';

import { CodeBlock } from '@/components/docs/code-block';
import { buildThemeCss } from '@/lib/theme-playground/draft';

import { usePreviewThemeDraft } from '../../preview-document';
import { SinkCard } from './sink-card';

const PLACEHOLDER = '/* Default theme — no overrides needed */';

/** Live readout of the draft's generated token overrides. */
export function YourThemeCard() {
  const draft = usePreviewThemeDraft();
  const css = buildThemeCss(draft) ?? PLACEHOLDER;

  return (
    <SinkCard title="Your theme" contentClassName="px-0 py-0">
      <CodeBlock className="max-h-64 overflow-y-auto rounded-none border-0 text-[11px]">{css}</CodeBlock>
    </SinkCard>
  );
}

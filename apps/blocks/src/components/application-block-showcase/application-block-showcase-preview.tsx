'use client';

import { Badge } from '@constructive-io/ui/badge';

import { LivePreview } from '@/components/docs/live-preview';

export type LivePreviewBlock = Readonly<{
  previewDescription: string;
  previewHeight: number;
  title: string;
}>;

export function ApplicationBlockShowcasePreview({
  block,
  previewPath,
}: {
  block: LivePreviewBlock;
  previewPath: string;
}) {
  return (
    <LivePreview
      defaultViewport="mobile"
      frameSlot="application-block-preview-frame"
      height={block.previewHeight}
      meta={<Badge variant="secondary">Host-controlled</Badge>}
      name={block.title}
      responsive
      slot="application-block-showcase-preview"
      src={previewPath}
    />
  );
}

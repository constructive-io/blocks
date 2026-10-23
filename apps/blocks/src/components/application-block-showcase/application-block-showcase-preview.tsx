'use client';

import { useId, useState } from 'react';

import { Badge } from '@constructive-io/ui/badge';
import { Field } from '@constructive-io/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@constructive-io/ui/select';

import { LivePreview } from '@/components/docs/live-preview';
import type { ApplicationBlockExample } from '@/lib/application-blocks';

export type LivePreviewBlock = Readonly<{
  previewDescription: string;
  previewHeight: number;
  title: string;
  /** Named ways to open the preview, passed to the preview route as `?example=`. The first is the default. */
  examples?: readonly ApplicationBlockExample[];
}>;

export function ApplicationBlockShowcasePreview({
  block,
  previewPath,
}: {
  block: LivePreviewBlock;
  previewPath: string;
}) {
  const controlId = useId();
  const examples = block.examples ?? [];
  const [example, setExample] = useState(examples[0]?.value);
  const selected = examples.find((option) => option.value === example);

  return (
    <LivePreview
      controls={
        examples.length > 1 ? (
          <Field className="w-full sm:w-56" htmlFor={controlId} label="Example">
            <Select
              value={example}
              onValueChange={(value) => {
                if (examples.some((option) => option.value === value)) setExample(value as string);
              }}
            >
              <SelectTrigger id={controlId} size="lg">
                <SelectValue>{() => selected?.label ?? 'Choose an example'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {examples.map((option) => (
                    <SelectItem className="min-h-11 sm:min-h-11" key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        ) : undefined
      }
      defaultViewport="mobile"
      frameSlot="application-block-preview-frame"
      height={block.previewHeight}
      meta={<Badge variant="secondary">Host-controlled</Badge>}
      name={block.title}
      responsive
      slot="application-block-showcase-preview"
      src={example ? `${previewPath}?example=${encodeURIComponent(example)}` : previewPath}
    />
  );
}

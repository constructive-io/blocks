'use client';

import { useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@constructive-io/ui/tabs';

import type { BasePrimitiveName } from '@/lib/base-primitives';
import type { InstallMode } from '@/lib/install-mode';
import { useInstallMode } from '@/hooks/use-install-mode';

import { CodeBlock } from './code-block';
import { PrimitivePreview } from './primitive-preview';

type DemoSource = Record<InstallMode, string>;

function SourcePanel({ source }: { source: DemoSource }) {
  const [mode] = useInstallMode();
  return (
    <CodeBlock
      className="rounded-none border-0 shadow-none"
      label={`${mode} source`}
      language="tsx"
    >
      {source[mode]}
    </CodeBlock>
  );
}

export function DemoSourceBlock({ source }: { source: DemoSource }) {
  return <SourcePanel source={source} />;
}

export function ComponentExample({
  demo,
  description,
  index,
  name,
  source,
  title,
}: {
  demo: string;
  description?: string;
  /** 0-based position — renders a numbered eyebrow before the title. */
  index?: number;
  name: BasePrimitiveName;
  source: DemoSource;
  title: string;
}) {
  const [view, setView] = useState<'preview' | 'source'>('preview');

  return (
    <Tabs
      value={view}
      onValueChange={(value) => setView(value as 'preview' | 'source')}
      className="registry-block min-w-0 gap-0"
    >
      <div className="registry-block-bar flex-wrap">
        {index !== undefined ? (
          <span className="font-mono text-[11px] font-normal tabular-nums text-muted-foreground">
            {String(index + 1).padStart(2, '0')}
          </span>
        ) : null}
        <span>{title}</span>
        <span className="min-w-0 flex-1 truncate text-pretty font-normal text-muted-foreground">
          {description}
        </span>
        <TabsList aria-label={`${title} view`} className="bg-muted/70">
          {(['preview', 'source'] as const).map((option) => (
            <TabsTrigger key={option} value={option} className="min-h-8 px-2.5 py-1 text-xs capitalize">
              {option}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent
        value="preview"
        className="registry-block-stage center min-h-64 justify-center !p-8 sm:!p-10"
      >
        <PrimitivePreview name={name} demo={demo} framed={false} />
      </TabsContent>
      <TabsContent value="source" className="min-w-0">
        <SourcePanel source={source} />
      </TabsContent>
    </Tabs>
  );
}

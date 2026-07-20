'use client';

import { useId, useState } from 'react';

import type { BasePrimitiveName } from '@/lib/base-primitives';
import type { InstallMode } from '@/lib/install-mode';
import { useInstallMode } from '@/hooks/use-install-mode';
import { cn } from '@/lib/utils';

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
  name,
  source,
  title,
}: {
  demo: string;
  description?: string;
  name: BasePrimitiveName;
  source: DemoSource;
  title: string;
}) {
  const [view, setView] = useState<'preview' | 'source'>('preview');
  const tabId = useId();

  return (
    <div className="registry-block min-w-0">
      <div className="registry-block-bar flex-wrap">
        <span>{title}</span>
        <span className="min-w-0 flex-1 truncate text-pretty font-normal text-muted-foreground">
          {description}
        </span>
        <div role="tablist" aria-label={`${title} view`} className="inline-flex rounded-lg bg-muted/70 p-0.5">
          {(['preview', 'source'] as const).map((option, index, options) => (
            <button
              key={option}
              type="button"
              role="tab"
              id={`${tabId}-${option}`}
              aria-controls={`${tabId}-panel`}
              aria-selected={view === option}
              tabIndex={view === option ? 0 : -1}
              className={cn(
                'min-h-8 rounded-md px-2.5 py-1 text-xs font-medium capitalize outline-none transition-[background-color,color,box-shadow] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring',
                view === option
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setView(option)}
              onKeyDown={(event) => {
                let nextIndex: number | undefined;
                if (event.key === 'ArrowRight') nextIndex = (index + 1) % options.length;
                if (event.key === 'ArrowLeft') nextIndex = (index - 1 + options.length) % options.length;
                if (event.key === 'Home') nextIndex = 0;
                if (event.key === 'End') nextIndex = options.length - 1;
                if (nextIndex === undefined) return;
                event.preventDefault();
                const nextView = options[nextIndex];
                if (!nextView) return;
                setView(nextView);
                event.currentTarget.parentElement
                  ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                  .item(nextIndex)
                  .focus();
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div
        id={`${tabId}-panel`}
        role="tabpanel"
        aria-labelledby={`${tabId}-${view}`}
        className={cn(view === 'preview' ? 'registry-block-stage center min-h-64 justify-center !p-8 sm:!p-10' : 'min-w-0')}
      >
        {view === 'preview' ? <PrimitivePreview name={name} demo={demo} framed={false} /> : <SourcePanel source={source} />}
      </div>
    </div>
  );
}

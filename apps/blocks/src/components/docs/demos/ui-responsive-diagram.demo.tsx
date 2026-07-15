'use client';

import { ResponsiveDiagram } from '@constructive-io/ui/responsive-diagram';

import { Demo } from '@/components/docs/showcase-kit';

function Node({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="w-44 shrink-0 rounded-lg border bg-background px-4 py-3 text-center shadow-sm">
      <p className="text-pretty text-sm font-medium">{title}</p>
      <p className="text-pretty mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Arrow() {
  return <div className="h-px w-10 shrink-0 bg-border" aria-hidden />;
}

export function BlockDemo() {
  return (
    <Demo>
      <div className="w-full max-w-3xl">
        <ResponsiveDiagram>
          <div className="flex items-center">
            <Node title="PostgreSQL" subtitle="schema + RLS" />
            <Arrow />
            <Node title="PostGraphile" subtitle="GraphQL API" />
            <Arrow />
            <Node title="Frontend" subtitle="Blocks + UI" />
          </div>
        </ResponsiveDiagram>
      </div>
    </Demo>
  );
}

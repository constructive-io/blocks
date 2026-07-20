'use client';

import { useState } from 'react';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@constructive-io/ui/resizable';

import { Demo } from '@/components/docs/showcase-kit';

const TABLES = ['users', 'organizations', 'databases', 'api_keys', 'sessions'];

export function BasicResizableDemo() {
  return (
    <Demo>
      <div className="h-64 w-full max-w-4xl overflow-hidden rounded-lg border bg-background">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={32} minSize={20}>
            <div className="h-full p-4">
              <p className="text-pretty mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tables</p>
              <ul className="flex flex-col gap-1 text-sm">
                {TABLES.map((t) => (
                  <li key={t} className="rounded px-2 py-1 hover:bg-muted/50">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle aria-label="Resize table browser panels" />
          <ResizablePanel defaultSize={68}>
            <div className="flex h-full flex-col p-4">
              <p className="text-pretty text-sm font-medium">users</p>
              <p className="text-pretty mt-1 text-sm text-muted-foreground">
                8 columns · 1,250 rows. Drag the divider to resize the panels.
              </p>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </Demo>
  );
}

export function ObservedResizableDemo() {
  const [layout, setLayout] = useState([40, 60]);

  return (
    <Demo>
      <div className="flex w-full max-w-2xl flex-col gap-3">
        <p className="text-center text-xs text-muted-foreground tabular-nums">
          Sidebar {Math.round(layout[0] ?? 0)}% · Content {Math.round(layout[1] ?? 0)}%
        </p>
        <div className="h-48 overflow-hidden rounded-lg border bg-background">
          <ResizablePanelGroup direction="horizontal" onLayout={setLayout}>
            <ResizablePanel defaultSize={40} minSize={20}>
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sidebar</div>
            </ResizablePanel>
            <ResizableHandle withHandle aria-label="Resize sidebar and content" />
            <ResizablePanel defaultSize={60} minSize={30}>
              <div className="flex h-full items-center justify-center text-sm">Content</div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </Demo>
  );
}

export function VerticalResizableDemo() {
  return (
    <Demo>
      <div className="h-64 w-full max-w-2xl overflow-hidden rounded-lg border bg-background">
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={60} minSize={30}>
            <div className="flex h-full items-center justify-center text-sm">Query editor</div>
          </ResizablePanel>
          <ResizableHandle withHandle aria-label="Resize editor and results" />
          <ResizablePanel defaultSize={40} minSize={20}>
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Results</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </Demo>
  );
}

export function BlockDemo() {
  return <BasicResizableDemo />;
}

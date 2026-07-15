'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@constructive-io/ui/resizable';

import { Demo } from '@/components/docs/showcase-kit';

const TABLES = ['users', 'organizations', 'databases', 'api_keys', 'sessions'];

export function BlockDemo() {
  return (
    <Demo>
      <div className="h-64 w-full max-w-4xl overflow-hidden rounded-lg border bg-background">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={32} minSize={20}>
            <div className="h-full p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tables</p>
              <ul className="space-y-1 text-sm">
                {TABLES.map((t) => (
                  <li key={t} className="rounded px-2 py-1 hover:bg-muted/50">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={68}>
            <div className="flex h-full flex-col p-4">
              <p className="text-sm font-medium">users</p>
              <p className="mt-1 text-sm text-muted-foreground">
                8 columns · 1,250 rows. Drag the divider to resize the panels.
              </p>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </Demo>
  );
}

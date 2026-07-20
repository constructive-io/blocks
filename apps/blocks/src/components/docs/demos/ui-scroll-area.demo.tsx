'use client';

import { ScrollArea } from '@constructive-io/ui/scroll-area';

import { Demo } from '@/components/docs/showcase-kit';

const TAGS = Array.from({ length: 24 }, (_, i) => `v1.${String(24 - i).padStart(2, '0')}.0`);

export function BasicScrollAreaDemo() {
  return (
    <Demo>
      <div className="w-full max-w-xs">
        <ScrollArea scrollFade className="h-72 w-full rounded-md border bg-background">
          <div className="p-4">
            <h4 className="mb-3 text-balance text-sm font-medium leading-none">Releases</h4>
            {TAGS.map((tag) => (
              <div key={tag} className="border-b py-2 text-sm last:border-0">
                production-db <span className="text-muted-foreground">· {tag}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </Demo>
  );
}

export function HorizontalScrollAreaDemo() {
  return (
    <Demo>
      <ScrollArea className="h-36 w-full max-w-lg rounded-md border bg-background">
        <div className="flex w-max gap-3 p-4">
          {['Production', 'Staging', 'Development', 'Preview', 'Local'].map((environment) => (
            <div key={environment} className="w-40 shrink-0 rounded-md border bg-card p-4">
              <p className="text-sm font-medium">{environment}</p>
              <p className="mt-1 text-xs text-muted-foreground">Database environment</p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Demo>
  );
}

export function ScrollAreaGutterDemo() {
  return (
    <Demo>
      <ScrollArea scrollbarGutter className="h-56 w-full max-w-xs rounded-md border bg-background">
        <div className="flex flex-col gap-2 p-4">
          {TAGS.slice(0, 12).map((tag) => (
            <div key={tag} className="rounded-md border p-3 text-sm">
              Release {tag}
            </div>
          ))}
        </div>
      </ScrollArea>
    </Demo>
  );
}

export function BlockDemo() {
  return <BasicScrollAreaDemo />;
}

'use client';

import { ScrollArea } from '@constructive-io/ui/scroll-area';

import { Demo } from '@/components/docs/showcase-kit';

const TAGS = Array.from({ length: 24 }, (_, i) => `v1.${String(24 - i).padStart(2, '0')}.0`);

export function BlockDemo() {
  return (
    <Demo>
      <div className="w-full max-w-xs">
        <ScrollArea scrollFade className="h-72 w-full rounded-md border bg-background">
          <div className="p-4">
            <h4 className="mb-3 text-sm font-medium leading-none">Releases</h4>
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

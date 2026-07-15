'use client';

import { FlickeringGrid } from '@constructive-io/ui/flickering-grid';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <div className="relative h-48 w-full overflow-hidden rounded-lg border bg-background">
        <FlickeringGrid
          className="absolute inset-0"
          squareSize={4}
          gridGap={6}
          flickerChance={0.3}
          maxOpacity={0.35}
          color="rgb(99, 102, 241)"
        />
        <div className="relative flex h-full items-center justify-center">
          <span className="rounded-md bg-background/70 px-3 py-1 text-sm font-medium backdrop-blur-sm">
            Ambient grid
          </span>
        </div>
      </div>
    </Demo>
  );
}

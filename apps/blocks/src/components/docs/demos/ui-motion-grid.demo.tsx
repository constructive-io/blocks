'use client';

import { MotionGrid } from '@constructive-io/ui/motion-grid';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <div className="flex h-48 w-full max-w-md items-center justify-center gap-3 rounded-lg border bg-background">
        <MotionGrid gridSize={[8, 4]} duration={180} />
        <span className="text-sm text-muted-foreground">Provisioning…</span>
      </div>
    </Demo>
  );
}

'use client';

import { Separator } from '@constructive-io/ui/separator';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <div className="w-full max-w-sm rounded-lg border bg-background p-6">
        <div className="flex flex-col gap-1">
          <h4 className="text-balance text-sm font-medium leading-none">Constructive UI</h4>
          <p className="text-pretty text-sm text-muted-foreground">React primitives for Postgres apps.</p>
        </div>
        <Separator className="my-4" />
        <div className="flex h-5 items-center gap-4 text-sm">
          <span>Overview</span>
          <Separator orientation="vertical" />
          <span>Members</span>
          <Separator orientation="vertical" />
          <span>Settings</span>
        </div>
      </div>
    </Demo>
  );
}

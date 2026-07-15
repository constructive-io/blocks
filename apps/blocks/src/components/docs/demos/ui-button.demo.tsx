'use client';

import { Loader2, Plus } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <div className="flex w-full max-w-md flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Create database</Button>
          <Button variant="secondary">Invite member</Button>
          <Button variant="outline">Export</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="link">View docs</Button>
          <Button variant="destructive">Delete</Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="xs">Extra small</Button>
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Add">
            <Plus />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button disabled>Disabled</Button>
          <Button disabled>
            <Loader2 className="animate-spin" />
            Provisioning…
          </Button>
        </div>
      </div>
    </Demo>
  );
}

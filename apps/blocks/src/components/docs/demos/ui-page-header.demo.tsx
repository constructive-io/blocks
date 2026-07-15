'use client';

import { Plus } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { PageHeader } from '@constructive-io/ui/page-header';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <div className="w-full max-w-2xl overflow-hidden rounded-lg border">
        <PageHeader
          title="Members"
          description="Manage who can access this organization."
          actions={
            <Button size="sm">
              <Plus className="size-4" />
              Invite member
            </Button>
          }
        />
      </div>
    </Demo>
  );
}

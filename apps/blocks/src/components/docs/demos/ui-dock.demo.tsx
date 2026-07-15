'use client';

import { Bell, Database, Home, Settings, Users } from 'lucide-react';

import { Dock, DockIcon } from '@constructive-io/ui/dock';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <Dock className="mt-0" iconMagnification={56} iconDistance={120}>
        <DockIcon>
          <Home className="size-5 text-muted-foreground" />
        </DockIcon>
        <DockIcon>
          <Database className="size-5 text-muted-foreground" />
        </DockIcon>
        <DockIcon>
          <Users className="size-5 text-muted-foreground" />
        </DockIcon>
        <DockIcon>
          <Bell className="size-5 text-muted-foreground" />
        </DockIcon>
        <DockIcon>
          <Settings className="size-5 text-muted-foreground" />
        </DockIcon>
      </Dock>
    </Demo>
  );
}

'use client';

import { ArrowRight, Loader2, Plus } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';

import { Demo } from '@/components/docs/showcase-kit';

export function BasicButtonDemo() {
  return (
    <Demo>
      <Button>
        <Plus aria-hidden="true" data-icon="inline-start" />
        Create database
      </Button>
    </Demo>
  );
}

export function ButtonVariantsDemo() {
  return (
    <Demo>
      <div className="flex w-full max-w-md flex-wrap items-center gap-2">
        <Button>Create database</Button>
        <Button variant="secondary">Invite member</Button>
        <Button variant="outline">Export</Button>
        <Button variant="ghost">Cancel</Button>
        <Button variant="link">Show details</Button>
        <Button variant="destructive">Delete</Button>
        <Button variant="destructive-outline">Revoke access</Button>
        <Button disabled>Disabled</Button>
        <Button disabled aria-busy="true">
          <Loader2 aria-hidden="true" className="motion-safe:animate-spin" data-icon="inline-start" />
          Provisioning…
        </Button>
      </div>
    </Demo>
  );
}

export function ButtonSizesDemo() {
  return (
    <Demo>
      <div className="flex w-full max-w-lg flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="xs">Extra small</Button>
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="xl">Extra large</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['icon-xs', 'icon-sm', 'icon', 'icon-lg', 'icon-xl'] as const).map((size) => (
            <Button key={size} size={size} variant="outline" aria-label={`Add with ${size} size`}>
              <Plus aria-hidden="true" />
            </Button>
          ))}
        </div>
      </div>
    </Demo>
  );
}

export function ButtonAsChildDemo() {
  return (
    <Demo>
      <Button asChild variant="outline">
        <a href="/blocks">
          Browse blocks
          <ArrowRight aria-hidden="true" data-icon="inline-end" />
        </a>
      </Button>
    </Demo>
  );
}

export function BlockDemo() {
  return <ButtonVariantsDemo />;
}

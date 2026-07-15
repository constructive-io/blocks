'use client';

import { useState } from 'react';

import { ShellBreadcrumbs, type BreadcrumbSegment } from '@/blocks/shell/breadcrumbs/breadcrumbs';
import { Demo, Segmented } from '@/components/docs/showcase-kit';

type Depth = 'shallow' | 'deep' | 'collapsed';

const SEGMENTS: Record<Depth, BreadcrumbSegment[]> = {
  shallow: [
    { label: 'Settings', href: '#/settings' },
    { label: 'Profile', href: undefined },
  ],
  deep: [
    { label: 'Organizations', href: '#/orgs' },
    { label: 'Acme Corp', href: '#/orgs/acme' },
    { label: 'Databases', href: '#/orgs/acme/databases' },
    { label: 'production-db', href: '#/orgs/acme/databases/prod' },
    { label: 'Schema Builder', href: undefined },
  ],
  collapsed: [
    { label: 'Organizations', href: '#/orgs' },
    { label: 'Acme Corp', href: '#/orgs/acme' },
    { label: 'Databases', href: '#/orgs/acme/databases' },
    { label: 'production-db', href: '#/orgs/acme/databases/prod' },
    { label: 'Tables', href: '#/orgs/acme/databases/prod/tables' },
    { label: 'users', href: undefined },
  ],
};

const DEPTHS: readonly Depth[] = ['shallow', 'deep', 'collapsed'];

export function BlockDemo() {
  const [depth, setDepth] = useState<Depth>('shallow');

  return (
    <Demo>
      <Segmented label="Depth" value={depth} options={DEPTHS} onChange={setDepth} />
      <div className="w-full max-w-lg rounded-lg border bg-background p-4">
        <ShellBreadcrumbs
          segments={SEGMENTS[depth]}
          showHome
          homeHref="#"
          maxVisible={4}
        />
      </div>
    </Demo>
  );
}

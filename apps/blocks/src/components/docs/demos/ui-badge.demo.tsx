'use client';

import { Check } from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';

import { Demo } from '@/components/docs/showcase-kit';

export function BasicBadgeDemo() {
  return (
    <Demo>
      <Badge variant="success">
        <Check aria-hidden="true" />
        Active
      </Badge>
    </Demo>
  );
}

export function BadgeVariantsDemo() {
  return (
    <Demo>
      <div className="flex w-full max-w-md flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success">Active</Badge>
          <Badge variant="warning">Pending</Badge>
          <Badge variant="info">Beta</Badge>
          <Badge variant="error">Failed</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success">
            <Check aria-hidden="true" />
            Verified
          </Badge>
          <Badge variant="secondary">12 members</Badge>
          <Badge variant="outline">Pro plan</Badge>
        </div>
      </div>
    </Demo>
  );
}

export function BadgeSizesDemo() {
  return (
    <Demo>
      <div className="flex flex-wrap items-center gap-2">
        <Badge size="sm" variant="secondary">
          Small
        </Badge>
        <Badge size="default" variant="secondary">
          Default
        </Badge>
        <Badge size="lg" variant="secondary">
          Large
        </Badge>
      </div>
    </Demo>
  );
}

export function BlockDemo() {
  return <BadgeVariantsDemo />;
}

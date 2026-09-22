'use client';

import { Spinner } from '@constructive-io/ui/spinner';

import { Demo } from '@/components/docs/showcase-kit';

export function BasicSpinnerDemo() {
  return (
    <Demo>
      <Spinner />
    </Demo>
  );
}

export function SpinnerInlineDemo() {
  return (
    <Demo>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-4" aria-label="Deploying" />
        Deploying to acme-prod…
      </div>
    </Demo>
  );
}

export function SpinnerSizesDemo() {
  return (
    <Demo>
      <div className="flex items-center gap-4">
        <Spinner className="size-3" aria-label="Loading, small" />
        <Spinner className="size-4" />
        <Spinner className="size-6" aria-label="Loading, large" />
      </div>
    </Demo>
  );
}

export function BlockDemo() {
  return <SpinnerInlineDemo />;
}

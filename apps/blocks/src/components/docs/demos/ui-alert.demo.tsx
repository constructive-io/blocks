'use client';

import { CircleAlert, Info } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <div className="flex w-full max-w-md flex-col gap-4">
        <Alert>
          <Info />
          <AlertTitle>Schema published</AlertTitle>
          <AlertDescription>Your tables are live and reachable over GraphQL.</AlertDescription>
        </Alert>

        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Migration failed</AlertTitle>
          <AlertDescription>
            Column <code>owner_id</code> can&rsquo;t be dropped while a policy references it.
          </AlertDescription>
        </Alert>
      </div>
    </Demo>
  );
}

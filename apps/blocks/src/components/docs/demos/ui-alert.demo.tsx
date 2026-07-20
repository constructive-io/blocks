'use client';

import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';

import { Demo } from '@/components/docs/showcase-kit';

export function BasicAlertDemo() {
  return (
    <Demo>
      <div className="w-full max-w-md">
        <Alert>
          <Info aria-hidden="true" />
          <AlertTitle>Schema published</AlertTitle>
          <AlertDescription>Your tables are live and reachable over GraphQL.</AlertDescription>
        </Alert>
      </div>
    </Demo>
  );
}

export function AlertVariantsDemo() {
  return (
    <Demo>
      <div className="flex w-full max-w-md flex-col gap-3">
        <Alert>
          <Info aria-hidden="true" />
          <AlertTitle>Schema published</AlertTitle>
          <AlertDescription>Your tables are live and reachable over GraphQL.</AlertDescription>
        </Alert>

        <Alert variant="info">
          <Info aria-hidden="true" />
          <AlertTitle>Migration in progress</AlertTitle>
          <AlertDescription>Applying 3 pending changes. This usually takes under a minute.</AlertDescription>
        </Alert>

        <Alert variant="success">
          <CircleCheck aria-hidden="true" />
          <AlertTitle>Backup complete</AlertTitle>
          <AlertDescription>Snapshot saved to the primary region.</AlertDescription>
        </Alert>

        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>Quota nearly full</AlertTitle>
          <AlertDescription>You have used 92% of storage on this project.</AlertDescription>
        </Alert>

        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Migration failed</AlertTitle>
          <AlertDescription>
            Column <code>owner_id</code> can&apos;t be dropped while a policy references it.
          </AlertDescription>
        </Alert>
      </div>
    </Demo>
  );
}

export function BlockDemo() {
  return <AlertVariantsDemo />;
}

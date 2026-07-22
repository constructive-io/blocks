'use client';

import * as React from 'react';
import { CheckCircle2Icon, DatabaseIcon } from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';
import { Field } from '@constructive-io/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@constructive-io/ui/select';

import {
  ConstructiveConsoleKit,
  type ConstructiveTenantDatabase
} from '@/blocks/console-kit/constructive';

export type ConsoleKitProofTenant = Readonly<{
  preset: string;
  blueprint: string;
  dataset: string;
  database: ConstructiveTenantDatabase;
  endpointSummary: string;
}>;

export function ConsoleKitProofClient({
  runId,
  status,
  tenants
}: Readonly<{
  runId: string;
  status: string;
  tenants: readonly ConsoleKitProofTenant[];
}>) {
  const [databaseId, setDatabaseId] = React.useState(tenants[0]?.database.id ?? '');
  const tenant = tenants.find((candidate) => candidate.database.id === databaseId) ?? tenants[0];

  if (!tenant) {
    return (
      <main className='flex min-h-screen items-center justify-center p-8'>
        <p className='text-muted-foreground text-sm'>The proof manifest does not contain a tenant database.</p>
      </main>
    );
  }

  return (
    <main
      className='min-h-svh bg-background'
      data-database-id={tenant.database.id}
      data-proof-status={status}
      data-testid='console-kit-proof-root'
    >
      <aside aria-label='Tenant proof controls' className='fixed inset-x-3 bottom-3 z-50 ml-auto max-w-[26rem] rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur sm:left-auto'>
        <div className='mb-2 flex min-w-0 items-center gap-2'>
          <Badge className='shrink-0' variant='secondary'>Live proof</Badge>
          <Badge className='shrink-0' variant='outline'>
            <CheckCircle2Icon data-icon='inline-start' />
            {status}
          </Badge>
          <span className='text-muted-foreground truncate font-mono text-[0.6875rem]' title={runId}>{runId}</span>
        </div>
        <div>
          <Field label='Tenant database'>
            <Select onValueChange={setDatabaseId} value={tenant.database.id}>
              <SelectTrigger aria-label='Tenant database'>
                <DatabaseIcon data-icon='inline-start' />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {tenants.map((candidate) => (
                    <SelectItem key={candidate.database.id} value={candidate.database.id}>
                      {candidate.preset} · {candidate.blueprint}/{candidate.dataset}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <p className='text-muted-foreground mt-1.5 text-xs'>{tenant.endpointSummary}</p>
        </div>
      </aside>
      <ConstructiveConsoleKit
        className='min-h-svh'
        database={tenant.database}
        showUnavailable
      />
    </main>
  );
}

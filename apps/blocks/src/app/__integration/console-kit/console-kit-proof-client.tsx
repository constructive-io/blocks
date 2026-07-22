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
      className='flex min-h-screen flex-col bg-background'
      data-database-id={tenant.database.id}
      data-proof-status={status}
      data-testid='console-kit-proof-root'
    >
      <header className='flex flex-col gap-4 border-b bg-card px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6'>
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='secondary'>Live tenant proof</Badge>
            <Badge variant='outline'>
              <CheckCircle2Icon data-icon='inline-start' />
              {status}
            </Badge>
          </div>
          <h1 className='mt-2 truncate text-lg font-semibold tracking-tight'>Console Kit tenant matrix</h1>
          <p className='text-muted-foreground mt-1 truncate font-mono text-xs'>{runId}</p>
        </div>
        <div className='w-full sm:w-[26rem]'>
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
      </header>
      <ConstructiveConsoleKit
        className='min-h-0 flex-1'
        database={tenant.database}
        showUnavailable
      />
    </main>
  );
}

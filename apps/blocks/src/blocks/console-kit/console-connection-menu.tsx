'use client';

import * as React from 'react';
import { CheckIcon, CopyIcon, DatabaseIcon } from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger
} from '@constructive-io/ui/popover';

import {
  CONSOLE_ENDPOINT_KINDS,
  type ConsoleEndpoint,
  type ConsoleEndpointKind
} from '../console-runtime';
import type { ConsoleKitMetadataState } from './console-kit-contracts';
import { cn } from '@/lib/utils';

type ConsoleConnectionMenuProps = Readonly<{
  databaseId: string;
  databaseLabel?: React.ReactNode;
  endpoints: Readonly<Partial<Record<ConsoleEndpointKind, ConsoleEndpoint>>>;
  metadataStatus?: ConsoleKitMetadataState['status'];
}>;

type CopyFeedback = Readonly<{
  target: string;
  message: string;
  status: 'copied' | 'error';
}>;

function endpointLabel(kind: ConsoleEndpointKind): string {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function metadataBadge(status: ConsoleKitMetadataState['status'] | undefined) {
  if (!status || status === 'compatible') {
    return { label: '_meta ready', variant: 'outline' as const };
  }
  if (status === 'checking') {
    return { label: 'Checking _meta', variant: 'secondary' as const };
  }
  if (status === 'incompatible') {
    return { label: 'Incompatible _meta', variant: 'destructive' as const };
  }
  return { label: 'Metadata issue', variant: 'destructive' as const };
}

export function ConsoleConnectionMenu({
  databaseId,
  databaseLabel,
  endpoints,
  metadataStatus
}: ConsoleConnectionMenuProps) {
  const [feedback, setFeedback] = React.useState<CopyFeedback | null>(null);
  const resolvedEndpoints = CONSOLE_ENDPOINT_KINDS.flatMap((kind) => {
    const endpoint = endpoints[kind];
    return endpoint ? [{ endpoint, kind }] : [];
  });
  const meta = metadataBadge(metadataStatus);
  const triggerLabel = metadataStatus === 'compatible' || !metadataStatus
    ? 'Connection'
    : metadataStatus === 'checking'
      ? 'Checking…'
      : 'Connection issue';

  const copy = async (target: string, label: string, value: string) => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard access is unavailable.');
      }
      await navigator.clipboard.writeText(value);
      setFeedback({
        target,
        message: `${label} copied.`,
        status: 'copied'
      });
    } catch {
      setFeedback({
        target,
        message: `${label} could not be copied.`,
        status: 'error'
      });
    }
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            aria-label={`${triggerLabel}. Open connection details.`}
            className='max-w-[11rem] sm:max-w-none'
            size='sm'
            variant='outline'
          />
        }
      >
        <DatabaseIcon aria-hidden='true' data-icon='inline-start' />
        <span className='truncate'>{triggerLabel}</span>
        <Badge
          className='hidden max-w-24 truncate sm:inline-flex'
          size='sm'
          variant={meta.variant}
        >
          {meta.label}
        </Badge>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-[calc(100vw-1rem)] max-w-96 sm:w-96'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <PopoverTitle className='text-balance'>Database connection</PopoverTitle>
            <PopoverDescription className='mt-1 text-pretty'>
              Resolved tenant identity, metadata status, and GraphQL routes for this console.
            </PopoverDescription>
          </div>
          <Badge className='shrink-0' size='sm' variant={meta.variant}>
            {meta.label}
          </Badge>
        </div>

        <div className='mt-4 grid gap-4'>
          <div className='grid gap-2'>
            <p className='text-muted-foreground text-xs font-medium'>Database</p>
            {databaseLabel ? (
              <div className='min-w-0 truncate text-sm font-medium'>
                {databaseLabel}
              </div>
            ) : null}
            <div className='bg-muted flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5'>
              <code className='min-w-0 flex-1 truncate text-xs' title={databaseId}>
                {databaseId}
              </code>
              <Button
                aria-label='Copy database ID'
                onClick={() => void copy('database', 'Database ID', databaseId)}
                size='icon-sm'
                type='button'
                variant='ghost'
              >
                {feedback?.target === 'database' && feedback.status === 'copied'
                  ? <CheckIcon aria-hidden='true' />
                  : <CopyIcon aria-hidden='true' />}
              </Button>
            </div>
          </div>

          <div className='grid gap-2'>
            <p className='text-muted-foreground text-xs font-medium'>Endpoints</p>
            {resolvedEndpoints.length > 0 ? (
              <div className='grid max-h-72 gap-2 overflow-y-auto'>
                {resolvedEndpoints.map(({ endpoint, kind }) => {
                  const target = `endpoint-${kind}`;
                  const label = `${endpointLabel(kind)} endpoint URL`;
                  return (
                    <div
                      className='bg-muted flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5'
                      key={kind}
                    >
                      <Badge className='shrink-0' size='sm' variant='outline'>
                        {endpointLabel(kind)}
                      </Badge>
                      <code className='min-w-0 flex-1 truncate text-xs' title={endpoint.url}>
                        {endpoint.url}
                      </code>
                      <Button
                        aria-label={`Copy ${label.toLowerCase()}`}
                        onClick={() => void copy(target, label, endpoint.url)}
                        size='icon-sm'
                        type='button'
                        variant='ghost'
                      >
                        {feedback?.target === target && feedback.status === 'copied'
                          ? <CheckIcon aria-hidden='true' />
                          : <CopyIcon aria-hidden='true' />}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className='text-muted-foreground text-pretty text-sm'>
                No endpoint URLs are resolved. Configure at least the data route to connect this console.
              </p>
            )}
          </div>

          <p
            aria-live='polite'
            className={cn(
              'text-muted-foreground min-h-4 text-pretty text-xs',
              feedback?.status === 'error' && 'text-destructive'
            )}
            role={feedback?.status === 'error' ? 'alert' : 'status'}
          >
            {feedback?.message}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

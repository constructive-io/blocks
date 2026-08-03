'use client';

import * as React from 'react';
import { XIcon } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { Separator } from '@constructive-io/ui/separator';

export type AppActionItem = Readonly<{
  id: string;
  label: string;
  disabledReason?: string;
  destructive?: boolean;
  pending?: boolean;
  onExecute: () => void | Promise<void>;
}>;

export type AppActionBarProps = Readonly<{
  actions: readonly AppActionItem[];
  label?: string;
  className?: string;
}>;

export function AppActionBar({
  actions,
  label = 'Record actions',
  className
}: AppActionBarProps) {
  return (
    <div
      aria-label={label}
      className={className ?? 'flex flex-wrap items-center gap-2'}
      role='toolbar'
    >
      {actions.map((action) => (
        <Button
          aria-describedby={action.disabledReason ? `${action.id}-reason` : undefined}
          disabled={Boolean(action.disabledReason) || action.pending}
          key={action.id}
          onClick={() => void action.onExecute()}
          size='sm'
          variant={action.destructive ? 'destructive-outline' : 'outline'}
        >
          {action.pending ? `${action.label}…` : action.label}
          {action.disabledReason ? (
            <span className='sr-only' id={`${action.id}-reason`}>
              {action.disabledReason}
            </span>
          ) : null}
        </Button>
      ))}
    </div>
  );
}

export type AppBulkActionBarProps = AppActionBarProps &
  Readonly<{
    selectedCount: number;
    onClearSelection: () => void;
  }>;

export function AppBulkActionBar({
  selectedCount,
  onClearSelection,
  actions,
  className
}: AppBulkActionBarProps) {
  if (selectedCount === 0) return null;
  return (
    <div
      aria-label='Bulk actions'
      className={
        className ??
        'flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center'
      }
      role='region'
    >
      <p aria-live='polite' className='text-sm font-medium'>
        {selectedCount} selected
      </p>
      <Separator className='hidden h-6 sm:block' orientation='vertical' />
      <AppActionBar actions={actions} label='Selected record actions' />
      <Button className='sm:ms-auto' onClick={onClearSelection} size='sm' variant='ghost'>
        <XIcon data-icon='inline-start' />
        Clear selection
      </Button>
    </div>
  );
}

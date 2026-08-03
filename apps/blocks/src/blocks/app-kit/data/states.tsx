'use client';

import * as React from 'react';
import {
  CircleAlertIcon,
  LockKeyholeIcon,
  RefreshCwIcon,
  Rows3Icon
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';
import { Button } from '@constructive-io/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@constructive-io/ui/empty';
import { Skeleton } from '@constructive-io/ui/skeleton';

import type { AppDataState } from './types';

export type AppDataStateViewProps<T> = Readonly<{
  state: AppDataState<T>;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  children: (data: T) => React.ReactNode;
}>;

export function AppDataStateView<T>({
  state,
  emptyTitle = 'Nothing here yet',
  emptyDescription = 'No records match the current view.',
  onRetry,
  children
}: AppDataStateViewProps<T>) {
  if (state.status === 'loading') {
    return (
      <div
        aria-busy='true'
        aria-label='Loading records'
        className='flex flex-col gap-3 p-4'
      >
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton className='h-12 w-full' key={index} />
        ))}
      </div>
    );
  }

  if (state.status === 'denied') {
    return (
      <Alert variant='destructive'>
        <LockKeyholeIcon aria-hidden='true' />
        <AlertTitle>Access denied</AlertTitle>
        <AlertDescription>
          {state.error?.message ??
            'Your database grants or row-level policies do not allow this view.'}
        </AlertDescription>
      </Alert>
    );
  }

  if (state.status === 'error') {
    const retry = state.retry ?? onRetry;
    return (
      <Alert variant='destructive'>
        <CircleAlertIcon aria-hidden='true' />
        <AlertTitle>Records could not be loaded</AlertTitle>
        <AlertDescription className='flex flex-col items-start gap-3'>
          <span>{state.error.message}</span>
          {retry ? (
            <Button onClick={retry} size='sm' variant='outline'>
              <RefreshCwIcon data-icon='inline-start' />
              Try again
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }

  if (state.status === 'empty') {
    return (
      <Empty className='border'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <Rows3Icon aria-hidden='true' />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
        {onRetry ? (
          <EmptyContent>
            <Button onClick={onRetry} size='sm' variant='outline'>
              <RefreshCwIcon data-icon='inline-start' />
              Refresh
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  return <>{children(state.data)}</>;
}

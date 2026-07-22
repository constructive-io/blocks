'use client';

import * as React from 'react';
import { CircleAlertIcon, InboxIcon, RefreshCwIcon } from 'lucide-react';

import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@constructive-io/ui/alert';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@constructive-io/ui/card';
import { Skeleton } from '@constructive-io/ui/skeleton';

import type { FeaturePackResource } from './feature-pack-contracts';

export type FeaturePackBoundaryProps<T> = Readonly<{
  resource: FeaturePackResource<T>;
  children: (data: T) => React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
  loadingRows?: number;
  errorTitle?: string;
}>;

export function FeaturePackBoundary<T>({
  resource,
  children,
  emptyTitle,
  emptyDescription,
  emptyAction,
  loadingRows = 4,
  errorTitle = 'This view could not be loaded'
}: FeaturePackBoundaryProps<T>) {
  if (resource.status === 'loading') {
    return (
      <Card aria-busy='true' aria-label='Loading content'>
        <CardHeader>
          <Skeleton className='h-5 w-40' />
          <Skeleton className='h-4 w-64 max-w-full' />
        </CardHeader>
        <CardContent className='flex flex-col gap-3'>
          {Array.from({ length: loadingRows }, (_, index) => (
            <Skeleton className='h-11 w-full' key={index} />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (resource.status === 'error') {
    return (
      <Alert variant='destructive'>
        <CircleAlertIcon aria-hidden='true' />
        <AlertTitle>{errorTitle}</AlertTitle>
        <AlertDescription className='flex flex-col items-start gap-3'>
          <span className='text-pretty'>{resource.error.message}</span>
          {resource.retry ? (
            <Button onClick={() => void resource.retry?.()} size='sm' variant='outline'>
              <RefreshCwIcon data-icon='inline-start' />
              Try again
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }

  if (resource.status === 'empty') {
    return (
      <Card>
        <CardHeader className='items-start'>
          <div className='bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-lg'>
            <InboxIcon aria-hidden='true' />
          </div>
          <CardTitle className='text-balance'>{emptyTitle}</CardTitle>
          <CardDescription className='max-w-xl text-pretty'>
            {emptyDescription}
          </CardDescription>
        </CardHeader>
        {emptyAction ? <CardContent>{emptyAction}</CardContent> : null}
      </Card>
    );
  }

  return children(resource.data);
}

export type FeaturePackPageHeaderProps = Readonly<{
  title: string;
  description: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}>;

export function FeaturePackPageHeader({
  title,
  description,
  eyebrow,
  actions
}: FeaturePackPageHeaderProps) {
  return (
    <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
      <div className='flex max-w-2xl flex-col gap-1.5'>
        {eyebrow ? (
          <span className='text-muted-foreground text-sm font-medium'>{eyebrow}</span>
        ) : null}
        <h1 className='text-balance text-2xl font-semibold'>{title}</h1>
        <p className='text-muted-foreground text-pretty text-sm'>{description}</p>
      </div>
      {actions ? <div className='flex shrink-0 items-center gap-2'>{actions}</div> : null}
    </div>
  );
}

export function FeatureStatusBadge({
  status
}: Readonly<{ status: string }>) {
  const normalized = status.trim().toLowerCase();
  const variant =
    normalized === 'active' || normalized === 'accepted' || normalized === 'read'
      ? 'default'
      : normalized === 'disabled' || normalized === 'failed' || normalized === 'revoked'
        ? 'destructive'
        : normalized === 'pending' || normalized === 'invited'
          ? 'secondary'
          : 'outline';

  return <Badge variant={variant}>{status}</Badge>;
}

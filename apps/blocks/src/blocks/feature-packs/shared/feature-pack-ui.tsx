'use client';

import * as React from 'react';
import {
  CheckIcon,
  CircleAlertIcon,
  CopyIcon,
  InboxIcon,
  RefreshCwIcon,
  SearchXIcon
} from 'lucide-react';

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
  CardFooter,
  CardHeader,
  CardTitle
} from '@constructive-io/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@constructive-io/ui/empty';
import { Skeleton } from '@constructive-io/ui/skeleton';

import type {
  FeaturePackLimitation,
  FeaturePackResource
} from './feature-pack-contracts';

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
      <Card aria-busy='true' aria-label='Loading content' variant='flat'>
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
      <Card variant='flat'>
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

/**
 * Local filter/tab produced no rows even though the resource itself is ready.
 * Distinct from a true empty resource so operators know to clear the filter.
 */
export function FeaturePackFilteredEmpty({
  title = 'No matches',
  description = 'Nothing matches the current search or filter. Clear it to see all records again.',
  query,
  onClear,
  clearLabel = 'Clear search'
}: Readonly<{
  title?: string;
  description?: string;
  query?: string;
  onClear?: () => void;
  clearLabel?: string;
}>) {
  return (
    <Empty className='min-h-52 border border-dashed' role='status'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <SearchXIcon aria-hidden='true' />
        </EmptyMedia>
        <EmptyTitle className='text-balance'>{title}</EmptyTitle>
        <EmptyDescription className='text-pretty'>
          {query?.trim()
            ? `No results for “${query.trim()}”. ${description}`
            : description}
        </EmptyDescription>
      </EmptyHeader>
      {onClear ? (
        <EmptyContent>
          <Button onClick={onClear} size='sm' type='button' variant='outline'>
            {clearLabel}
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}

export type FeaturePackDiagnostic = Readonly<{
  label: string;
  value: string;
}>;

/**
 * Actionable unavailable / setup / unauthorized surface shared by Console Kit
 * and standalone packs. Prefer endpoint-specific evidence over generic copy.
 */
export function FeaturePackDiagnosticPanel({
  title,
  description,
  guidance,
  icon,
  tone = 'muted',
  diagnostics,
  onRetry,
  retryLabel = 'Try again',
  actions
}: Readonly<{
  title: string;
  description: string;
  guidance?: string;
  icon?: React.ReactNode;
  tone?: 'muted' | 'warning' | 'destructive';
  diagnostics?: readonly FeaturePackDiagnostic[];
  onRetry?: () => void;
  retryLabel?: string;
  actions?: React.ReactNode;
}>) {
  const [copyState, setCopyState] = React.useState<'idle' | 'copied' | 'error'>('idle');
  const diagnosticText = diagnostics?.length
    ? diagnostics.map((item) => `${item.label}: ${item.value}`).join('\n')
    : undefined;

  const copyDiagnostics = async () => {
    if (!diagnosticText) return;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard access is unavailable.');
      }
      await navigator.clipboard.writeText(diagnosticText);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  };

  const iconTone =
    tone === 'destructive'
      ? 'bg-destructive/10 text-destructive'
      : tone === 'warning'
        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
        : 'bg-muted text-muted-foreground';

  return (
    <Card className='w-full max-w-2xl border-border/70 shadow-sm' variant='flat'>
      <CardHeader className='pb-3'>
        <div className={`mb-3 flex size-10 items-center justify-center rounded-lg ${iconTone}`}>
          {icon ?? <CircleAlertIcon aria-hidden='true' />}
        </div>
        <CardTitle className='text-balance'>
          <h1 className='text-base font-semibold tracking-tight lg:text-xl'>{title}</h1>
        </CardTitle>
        <CardDescription className='text-pretty text-sm lg:text-base'>{description}</CardDescription>
      </CardHeader>
      {(guidance || diagnostics?.length) ? (
        <CardContent className='flex flex-col gap-4'>
          {guidance ? (
            <p className='text-muted-foreground text-pretty text-sm'>{guidance}</p>
          ) : null}
          {diagnostics?.length ? (
            <div className='grid gap-2'>
              <p className='text-muted-foreground text-xs font-medium'>Diagnostic evidence</p>
              <dl className='bg-muted/60 grid gap-2 rounded-lg p-3'>
                {diagnostics.map((item) => (
                  <div className='grid min-w-0 gap-0.5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3' key={item.label}>
                    <dt className='text-muted-foreground text-xs font-medium'>{item.label}</dt>
                    <dd className='min-w-0 break-words font-mono text-xs'>{item.value}</dd>
                  </div>
                ))}
              </dl>
              <div className='flex flex-wrap items-center gap-2'>
                <Button
                  onClick={() => void copyDiagnostics()}
                  size='sm'
                  type='button'
                  variant='outline'
                >
                  {copyState === 'copied'
                    ? <CheckIcon data-icon='inline-start' />
                    : <CopyIcon data-icon='inline-start' />}
                  {copyState === 'copied' ? 'Copied' : 'Copy diagnostics'}
                </Button>
                <span
                  aria-live='polite'
                  className='text-muted-foreground text-xs'
                  role={copyState === 'error' ? 'alert' : 'status'}
                >
                  {copyState === 'error' ? 'Could not copy diagnostics.' : null}
                </span>
              </div>
            </div>
          ) : null}
        </CardContent>
      ) : null}
      {(onRetry || actions) ? (
        <CardFooter className='flex flex-wrap gap-2 border-t pt-4'>
          {onRetry ? (
            <Button onClick={onRetry} size='sm' type='button' variant='outline'>
              <RefreshCwIcon data-icon='inline-start' />
              {retryLabel}
            </Button>
          ) : null}
          {actions}
        </CardFooter>
      ) : null}
    </Card>
  );
}

export function FeaturePackLimitations({
  limitations
}: Readonly<{ limitations: readonly FeaturePackLimitation[] | undefined }>) {
  if (!limitations?.length) return null;

  return (
    <Alert>
      <CircleAlertIcon aria-hidden='true' />
      <AlertTitle>Some policy details are unavailable</AlertTitle>
      <AlertDescription>
        <ul className='list-disc space-y-1 pl-4'>
          {limitations.map((limitation) => (
            <li key={limitation.code}>{limitation.message}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

export type FeaturePackPageHeaderProps = Readonly<{
  title: string;
  /** Optional supporting copy — omit for table/list pages where actions matter more. */
  description?: string;
  actions?: React.ReactNode;
}>;

/**
 * Single page title + trailing actions. No app-bar duplicate, no eyebrow stack.
 */
export function FeaturePackPageHeader({
  title,
  description,
  actions
}: FeaturePackPageHeaderProps) {
  return (
    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
      <div className='min-w-0 flex-1'>
        <h1 className='text-balance text-base font-semibold tracking-tight lg:text-xl'>
          {title}
        </h1>
        {description ? (
          <p className='text-muted-foreground mt-1 max-w-2xl text-pretty text-sm leading-6'>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className='flex shrink-0 flex-wrap items-center gap-2'>{actions}</div>
      ) : null}
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

export function FeaturePackTimestamp({
  value,
  fallback = '—'
}: Readonly<{ value: string | undefined; fallback?: string }>) {
  if (!value) return <>{fallback}</>;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return <>{value}</>;

  return (
    <time
      className='tabular-nums'
      dateTime={value}
      suppressHydrationWarning
      title={new Date(timestamp).toISOString()}
    >
      {new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(timestamp)}
    </time>
  );
}

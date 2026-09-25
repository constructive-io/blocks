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
import { EmptyState } from '@/components/ui/workspace-kit/surface';
import { cn } from '@/lib/utils';

import type {
  FeaturePackLimitation,
  FeaturePackResource
} from './feature-pack-contracts';

function FeaturePackRetryAction({
  retry
}: Readonly<{ retry: () => void | Promise<void> }>) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();

  const run = async () => {
    if (pending) return;
    setPending(true);
    setError(undefined);
    try {
      await retry();
    } catch (cause) {
      setError(cause instanceof Error
        ? cause.message
        : 'The retry did not complete. Check the connection and try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className='flex flex-col items-start gap-2'>
      <Button
        aria-busy={pending}
        disabled={pending}
        onClick={() => void run()}
        size='sm'
        type='button'
        variant='outline'
      >
        <RefreshCwIcon data-icon='inline-start' />
        {pending ? 'Trying again…' : 'Try again'}
      </Button>
      {error ? (
        <span className='break-words text-pretty text-sm'>{error}</span>
      ) : null}
    </div>
  );
}

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
      <div aria-busy='true' aria-label='Loading content' className='bg-card overflow-hidden rounded-xl shadow-card' role='status'>
        <div className='flex flex-col gap-2 px-4 pt-4 pb-3'>
          <Skeleton className='h-3.5 w-40 rounded-full' />
          <Skeleton className='h-3 w-64 max-w-full rounded-full' />
        </div>
        <div className='flex flex-col'>
          {Array.from({ length: loadingRows }, (_, index) => (
            <div className='border-border flex items-center gap-3 border-t px-4 py-3' key={index}>
              <Skeleton className='size-7 shrink-0 rounded-lg' />
              <Skeleton className='h-3 rounded-full' style={{ width: `${40 + ((index * 17) % 35)}%` }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (resource.status === 'error') {
    return (
      <Alert variant='destructive'>
        <CircleAlertIcon aria-hidden='true' />
        <AlertTitle>{errorTitle}</AlertTitle>
        <AlertDescription className='flex flex-col items-start gap-3'>
          <span className='break-words text-pretty'>{resource.error.message}</span>
          {resource.retry ? (
            <FeaturePackRetryAction retry={resource.retry} />
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }

  if (resource.status === 'empty') {
    return (
      <div className='bg-card rounded-xl shadow-card'>
        <EmptyState action={emptyAction} description={emptyDescription} icon={InboxIcon} title={emptyTitle} />
      </div>
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
        <div className={cn('mb-3 flex size-10 items-center justify-center rounded-lg', iconTone)}>
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
        <ul className='flex list-disc flex-col gap-1 pl-4'>
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
        <div className='flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto'>{actions}</div>
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

  return (
    <Badge className='max-w-full' title={status} variant={variant}>
      <span className='truncate'>{status}</span>
    </Badge>
  );
}

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const DATE_TIME_FORMAT = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function FeaturePackTimestamp({
  value,
  fallback = '—'
}: Readonly<{ value: string | undefined; fallback?: string }>) {
  if (!value) return <>{fallback}</>;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return <span className='break-words' title={value}>{value}</span>;
  }

  const date = new Date(timestamp);
  // A date with no time of day (e.g. "2026-07-22" or "Jul 22, 2026") shows as a date only, not "12:00 AM".
  const dateOnly = date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0;

  return (
    <time
      className='whitespace-nowrap tabular-nums'
      dateTime={value}
      suppressHydrationWarning
      title={date.toISOString()}
    >
      {(dateOnly ? DATE_FORMAT : DATE_TIME_FORMAT).format(timestamp)}
    </time>
  );
}

'use client';

import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';
import { Skeleton } from '@constructive-io/ui/skeleton';
import type { AppQueryDefinition } from '../core/contracts';
import { useAppQuery } from '../core/runtime';
import {
  AppCalendar,
  getAppCalendarRange,
  type AppCalendarEvent,
  type AppCalendarProps,
  type AppCalendarRange
} from './calendar';

export interface ConnectedAppCalendarProps<TRecord> extends Omit<
  AppCalendarProps<TRecord>,
  'events'
> {
  query: AppQueryDefinition<
    AppCalendarRange,
    readonly AppCalendarEvent<TRecord>[]
  >;
}

/** Range-connected calendar with explicit timezone in both UI and query input. */
export function ConnectedAppCalendar<TRecord>({
  query,
  month,
  timeZone,
  weekStartsOn = 0,
  ...props
}: ConnectedAppCalendarProps<TRecord>) {
  const range = getAppCalendarRange(month, timeZone, weekStartsOn);
  const result = useAppQuery(query, range);
  if (result.isPending) {
    return (
      <div aria-label="Loading calendar" className="flex flex-col gap-3" role="status">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (result.error) {
    const denied =
      result.error.appError.kind === 'authorization' ||
      result.error.appError.kind === 'authentication';
    return (
      <Alert variant="destructive">
        <AlertTitle>{denied ? 'Access denied' : 'Calendar unavailable'}</AlertTitle>
        <AlertDescription>{result.error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <AppCalendar
      {...props}
      events={result.data ?? []}
      month={month}
      timeZone={timeZone}
      weekStartsOn={weekStartsOn}
    />
  );
}

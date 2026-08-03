'use client';

import * as React from 'react';
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@constructive-io/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@constructive-io/ui/empty';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@constructive-io/ui/tabs';
import { cn } from '@/lib/utils';

export interface AppCalendarMonth {
  year: number;
  /** One-based ISO month (1–12). */
  month: number;
}

export interface AppCalendarRange {
  /** Inclusive ISO local date. */
  startDate: string;
  /** Exclusive ISO local date. */
  endDate: string;
  timeZone: string;
}

export interface AppCalendarEvent<TRecord = unknown> {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  record: TRecord;
  description?: string;
}

export interface AppCalendarProps<TRecord> {
  events: readonly AppCalendarEvent<TRecord>[];
  month: AppCalendarMonth;
  onMonthChange: (month: AppCalendarMonth) => void;
  timeZone: string;
  locale?: string;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  view: 'month' | 'agenda';
  onViewChange: (view: 'month' | 'agenda') => void;
  onOpenRecord?: (record: TRecord, event: AppCalendarEvent<TRecord>) => void;
  density?: 'compact' | 'comfortable';
  surface?: 'page' | 'card' | 'embedded';
  className?: string;
}

interface CalendarDay {
  date: Date;
  dateKey: string;
  dayNumber: number;
  inMonth: boolean;
}

const ISO_CALENDAR_LOCALE = 'en-US-u-ca-iso8601-nu-latn';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function plainDateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function monthDate(month: AppCalendarMonth) {
  return new Date(Date.UTC(month.year, month.month - 1, 1, 12));
}

function calendarGrid(
  month: AppCalendarMonth,
  weekStartsOn: number
): Readonly<{ cellCount: number; start: Date }> {
  const first = monthDate(month);
  const daysInMonth = new Date(Date.UTC(month.year, month.month, 0, 12)).getUTCDate();
  const leading = (first.getUTCDay() - weekStartsOn + 7) % 7;
  return {
    cellCount: Math.ceil((leading + daysInMonth) / 7) * 7,
    start: new Date(Date.UTC(month.year, month.month - 1, 1 - leading, 12))
  };
}

export function shiftAppCalendarMonth(
  month: AppCalendarMonth,
  offset: number
): AppCalendarMonth {
  const value = new Date(Date.UTC(month.year, month.month - 1 + offset, 1, 12));
  return { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1 };
}

export function getAppCalendarRange(
  month: AppCalendarMonth,
  timeZone: string,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0
): AppCalendarRange {
  const { cellCount, start } = calendarGrid(month, weekStartsOn);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + cellCount);
  return {
    startDate: plainDateKey(
      start.getUTCFullYear(),
      start.getUTCMonth() + 1,
      start.getUTCDate()
    ),
    endDate: plainDateKey(
      end.getUTCFullYear(),
      end.getUTCMonth() + 1,
      end.getUTCDate()
    ),
    timeZone
  };
}

export function appCalendarDateKey(instant: string | Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat(ISO_CALENDAR_LOCALE, {
    calendar: 'iso8601',
    day: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric'
  }).formatToParts(typeof instant === 'string' ? new Date(instant) : instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => (
    parts.find((part) => part.type === type)?.value ?? ''
  );
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function calendarDays(month: AppCalendarMonth, weekStartsOn: number): CalendarDay[] {
  const { cellCount, start } = calendarGrid(month, weekStartsOn);

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const valueMonth = date.getUTCMonth() + 1;
    return {
      date,
      dateKey: plainDateKey(date.getUTCFullYear(), valueMonth, date.getUTCDate()),
      dayNumber: date.getUTCDate(),
      inMonth: date.getUTCFullYear() === month.year && valueMonth === month.month
    };
  });
}

function weekdayLabels(locale: string, weekStartsOn: number) {
  const sunday = new Date(Date.UTC(2024, 0, 7, 12));
  const formatter = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: 'UTC'
  });
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sunday);
    date.setUTCDate(sunday.getUTCDate() + ((weekStartsOn + index) % 7));
    return formatter.format(date);
  });
}

function formatMonth(month: AppCalendarMonth, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric'
  }).format(monthDate(month));
}

function formatDay(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric'
  }).format(date);
}

function formatTime(instant: string, locale: string, timeZone: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short'
  }).format(new Date(instant));
}

function AppMonthView<TRecord>({
  days,
  eventsByDay,
  locale,
  timeZone,
  weekStartsOn,
  onOpenRecord
}: {
  days: readonly CalendarDay[];
  eventsByDay: ReadonlyMap<string, readonly AppCalendarEvent<TRecord>[]>;
  locale: string;
  timeZone: string;
  weekStartsOn: number;
  onOpenRecord?: AppCalendarProps<TRecord>['onOpenRecord'];
}) {
  const todayKey = appCalendarDateKey(new Date(), timeZone);
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table aria-label="Month calendar" className="w-full min-w-176 table-fixed border-collapse">
        <thead>
          <tr>
            {weekdayLabels(locale, weekStartsOn).map((weekday) => (
              <th className="bg-muted/35 p-2 text-left text-xs font-medium" key={weekday} scope="col">
                {weekday}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: days.length / 7 }, (_, week) => (
            <tr key={week}>
              {days.slice(week * 7, week * 7 + 7).map((day) => {
                const events = eventsByDay.get(day.dateKey) ?? [];
                return (
                  <td
                    className={cn(
                      'h-32 border p-2 align-top',
                      !day.inMonth && 'bg-muted/20 text-muted-foreground'
                    )}
                    key={day.dateKey}
                  >
                    <div className="flex flex-col gap-2">
                      <time
                        className={cn(
                          'text-xs tabular-nums',
                          day.dateKey === todayKey && 'font-semibold text-primary'
                        )}
                        dateTime={day.dateKey}
                      >
                        {day.dayNumber}
                        {day.dateKey === todayKey ? <span className="sr-only">, today</span> : null}
                      </time>
                      <div className="flex flex-col gap-1">
                        {events.slice(0, 3).map((event) => (
                          <Button
                            aria-label={`Open ${event.title}, ${formatTime(event.startsAt, locale, timeZone)}`}
                            disabled={!onOpenRecord}
                            key={event.id}
                            onClick={() => onOpenRecord?.(event.record, event)}
                            size="xs"
                            variant="secondary"
                          >
                            <span className="truncate">{event.title}</span>
                          </Button>
                        ))}
                        {events.length > 3 ? (
                          <span className="text-muted-foreground px-1 text-xs tabular-nums">
                            +{events.length - 3} more
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AppAgendaView<TRecord>({
  days,
  eventsByDay,
  locale,
  timeZone,
  onOpenRecord,
  onShowNextMonth,
  idPrefix
}: {
  days: readonly CalendarDay[];
  eventsByDay: ReadonlyMap<string, readonly AppCalendarEvent<TRecord>[]>;
  locale: string;
  timeZone: string;
  onOpenRecord?: AppCalendarProps<TRecord>['onOpenRecord'];
  onShowNextMonth: () => void;
  idPrefix: string;
}) {
  const activeDays = days.filter((day) => day.inMonth && (eventsByDay.get(day.dateKey)?.length ?? 0) > 0);
  if (activeDays.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><CalendarDaysIcon /></EmptyMedia>
          <EmptyTitle>No events this month</EmptyTitle>
          <EmptyDescription>There are no scheduled records in this calendar range.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onShowNextMonth} variant="outline">Show next month</Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {activeDays.map((day) => (
        <section aria-labelledby={`${idPrefix}-agenda-${day.dateKey}`} className="flex flex-col gap-2" key={day.dateKey}>
          <h3 className="text-balance font-semibold" id={`${idPrefix}-agenda-${day.dateKey}`}>
            {formatDay(day.date, locale)}
          </h3>
          <div className="flex flex-col gap-2">
            {(eventsByDay.get(day.dateKey) ?? []).map((event) => (
              <Button
                className="h-auto justify-start py-3"
                disabled={!onOpenRecord}
                key={event.id}
                onClick={() => onOpenRecord?.(event.record, event)}
                variant="outline"
              >
                <span className="flex min-w-0 flex-col items-start gap-1 text-left">
                  <span className="truncate font-medium">{event.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {formatTime(event.startsAt, locale, timeZone)}
                  </span>
                  {event.description ? (
                    <span className="text-muted-foreground line-clamp-2 text-pretty text-xs">
                      {event.description}
                    </span>
                  ) : null}
                </span>
              </Button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Localized month and agenda views over host-provided, range-loaded events. */
export function AppCalendar<TRecord>({
  events,
  month,
  onMonthChange,
  timeZone,
  locale = 'en-US',
  weekStartsOn = 0,
  view,
  onViewChange,
  onOpenRecord,
  density = 'comfortable',
  surface = 'page',
  className
}: AppCalendarProps<TRecord>) {
  const calendarId = React.useId();
  const days = React.useMemo(
    () => calendarDays(month, weekStartsOn),
    [month, weekStartsOn]
  );
  const eventsByDay = React.useMemo(() => {
    const grouped = new Map<string, AppCalendarEvent<TRecord>[]>();
    for (const event of [...events].sort((left, right) => left.startsAt.localeCompare(right.startsAt))) {
      const key = appCalendarDateKey(event.startsAt, timeZone);
      const existing = grouped.get(key) ?? [];
      existing.push(event);
      grouped.set(key, existing);
    }
    return grouped;
  }, [events, timeZone]);
  const heading = formatMonth(month, locale);

  return (
    <section
      aria-label="Calendar"
      className={cn('flex flex-col gap-4', className)}
      data-density={density}
      data-surface={surface}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            aria-label="Previous month"
            onClick={() => onMonthChange(shiftAppCalendarMonth(month, -1))}
            size="icon-sm"
            variant="outline"
          >
            <ChevronLeftIcon />
          </Button>
          <h2 aria-live="polite" className="min-w-40 text-center text-balance font-semibold">
            {heading}
          </h2>
          <Button
            aria-label="Next month"
            onClick={() => onMonthChange(shiftAppCalendarMonth(month, 1))}
            size="icon-sm"
            variant="outline"
          >
            <ChevronRightIcon />
          </Button>
        </div>
        <span className="text-muted-foreground text-xs">{timeZone}</span>
      </header>

      <Tabs onValueChange={(value) => onViewChange(value as 'month' | 'agenda')} value={view}>
        <TabsList aria-label="Calendar view">
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
        </TabsList>
        <TabsContent value="month">
          <AppMonthView
            days={days}
            eventsByDay={eventsByDay}
            locale={locale}
            onOpenRecord={onOpenRecord}
            timeZone={timeZone}
            weekStartsOn={weekStartsOn}
          />
        </TabsContent>
        <TabsContent value="agenda">
          <AppAgendaView
            days={days}
            eventsByDay={eventsByDay}
            idPrefix={calendarId}
            locale={locale}
            onOpenRecord={onOpenRecord}
            onShowNextMonth={() => onMonthChange(shiftAppCalendarMonth(month, 1))}
            timeZone={timeZone}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}

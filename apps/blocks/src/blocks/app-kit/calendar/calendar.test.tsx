import { QueryClient } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { defineQuery, type AppScope } from '../core/contracts';
import { AppKitProvider } from '../core/runtime';
import {
  AppCalendar,
  appCalendarDateKey,
  getAppCalendarRange,
  shiftAppCalendarMonth
} from './calendar';
import { ConnectedAppCalendar } from './connected-calendar';

const month = { year: 2026, month: 8 } as const;

describe('AppCalendar', () => {
  it('builds exclusive visible-grid ranges across year boundaries', () => {
    expect(getAppCalendarRange({ year: 2026, month: 12 }, 'Asia/Tokyo')).toEqual({
      startDate: '2026-11-29',
      endDate: '2027-01-03',
      timeZone: 'Asia/Tokyo'
    });
    expect(getAppCalendarRange({ year: 2026, month: 12 }, 'Asia/Tokyo', 1)).toEqual({
      startDate: '2026-11-30',
      endDate: '2027-01-04',
      timeZone: 'Asia/Tokyo'
    });
    expect(shiftAppCalendarMonth({ year: 2026, month: 1 }, -1))
      .toEqual({ year: 2025, month: 12 });
  });

  it('groups the same instant by the explicitly selected timezone', () => {
    const instant = '2026-08-03T23:30:00.000Z';
    expect(appCalendarDateKey(instant, 'Asia/Tokyo')).toBe('2026-08-04');
    expect(appCalendarDateKey(instant, 'America/Los_Angeles')).toBe('2026-08-03');
  });

  it('localizes the heading while keeping record opening host-controlled', async () => {
    const user = userEvent.setup();
    const onOpenRecord = vi.fn();
    render(
      <AppCalendar
        events={[{
          id: 'session-1',
          title: 'Atelier',
          startsAt: '2026-08-03T23:30:00.000Z',
          record: { id: 'session-1' }
        }]}
        locale="fr-FR"
        month={month}
        onMonthChange={vi.fn()}
        onOpenRecord={onOpenRecord}
        onViewChange={vi.fn()}
        timeZone="Asia/Tokyo"
        view="month"
        weekStartsOn={1}
      />
    );
    expect(screen.getByRole('heading', { name: /août 2026/i })).toBeInTheDocument();
    expect(screen.getByText('Asia/Tokyo')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Open Atelier/ }));
    expect(onOpenRecord).toHaveBeenCalledWith(
      { id: 'session-1' },
      expect.objectContaining({ id: 'session-1' })
    );
  });

  it('passes the visible grid range, week start, and timezone to a connected query', async () => {
    const execute = vi.fn().mockResolvedValue([]);
    const query = defineQuery({ id: 'sessions.range', execute });
    const scope: AppScope = {
      endpointId: 'graphql',
      databaseId: 'events',
      sessionPartition: 'user-1',
      organizationId: 'org-1',
      schemaRevision: 'schema-1',
      securityRevision: 'security-1'
    };
    render(
      <AppKitProvider queryClient={new QueryClient()} scope={scope}>
        <ConnectedAppCalendar
          locale="en-US"
          month={month}
          onMonthChange={vi.fn()}
          onViewChange={vi.fn()}
          query={query}
          timeZone="America/New_York"
          view="agenda"
          weekStartsOn={1}
        />
      </AppKitProvider>
    );

    await waitFor(() => expect(execute).toHaveBeenCalled());
    expect(execute.mock.calls[0]![0]).toEqual(expect.objectContaining({
      input: {
        startDate: '2026-07-27',
        endDate: '2026-09-07',
        timeZone: 'America/New_York'
      },
      scope
    }));
    expect(execute.mock.calls[0]![0].signal).toBeInstanceOf(AbortSignal);
  });
});

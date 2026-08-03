import { describe, expect, it } from 'vitest';

import {
  createEventStudioUrlStateAdapter,
  type EventStudioViewState,
} from './state';

const SESSION_ID = '22222222-2222-4222-8222-222222222222';

const defaults: EventStudioViewState = {
  view: 'dashboard',
  collection: 'sessions',
  collectionState: {
    search: '',
    filters: [],
    sort: [],
    page: 1,
    pageSize: 25,
  },
  selectedSessionId: null,
  calendarMonth: { year: 2026, month: 8 },
  calendarView: 'month',
};

describe('Event Studio URL state', () => {
  it('round-trips every shareable starter state field and preserves host parameters', () => {
    const adapter = createEventStudioUrlStateAdapter(defaults);
    const state: EventStudioViewState = {
      view: 'calendar',
      collection: 'people',
      collectionState: {
        search: 'keynote: asia',
        filters: [
          { id: 'status', value: 'published' },
          { id: 'startsAt', value: '2026-08-03T09:00:00+07:00' },
        ],
        sort: [
          { id: 'startsAt', direction: 'asc' },
          { id: 'title', direction: 'desc' },
        ],
        page: 4,
        pageSize: 50,
      },
      selectedSessionId: SESSION_ID,
      calendarMonth: { year: 2027, month: 1 },
      calendarView: 'agenda',
    };

    const written = adapter.write(
      state,
      '?host=event-shell&view=board&filter=stale&page=2',
    );

    expect(written.get('host')).toBe('event-shell');
    expect(written.getAll('filter')).toHaveLength(2);
    expect(adapter.read(written)).toEqual(state);
  });

  it('uses host defaults for malformed scalar values and ignores malformed pairs', () => {
    const adapter = createEventStudioUrlStateAdapter(defaults);
    const state = adapter.read(
      '?view=unknown&collection=unknown&page=0&pageSize=nope&month=2026-13'
        + '&calendarView=week&selected=session-42&filter=nope'
        + '&sort=%5B%22title%22%2C%22sideways%22%5D',
    );

    expect(state).toEqual({
      ...defaults,
      collectionState: {
        ...defaults.collectionState,
        filters: [],
        sort: [],
      },
    });
  });
});

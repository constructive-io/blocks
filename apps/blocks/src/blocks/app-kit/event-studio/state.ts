import { defineAppUrlStateAdapter, type AppUrlStateAdapter } from '../core/navigation';
import type { AppCalendarMonth } from '../calendar/calendar';
import type { AppCollectionState, AppFilter, AppSort } from '../data/types';
import {
  EVENT_STUDIO_ID_SCHEMA,
  type EventStudioCollectionKind,
} from './definitions';

export type EventStudioView = 'dashboard' | 'collections' | 'board' | 'calendar';

export type EventStudioViewState = Readonly<{
  view: EventStudioView;
  collection: EventStudioCollectionKind;
  collectionState: AppCollectionState;
  selectedSessionId?: string | null;
  calendarMonth: AppCalendarMonth;
  calendarView: 'month' | 'agenda';
}>;

export const EVENT_STUDIO_URL_KEYS = Object.freeze([
  'view',
  'collection',
  'q',
  'filter',
  'sort',
  'page',
  'pageSize',
  'selected',
  'month',
  'calendarView',
] as const);

const VIEWS = new Set<EventStudioView>([
  'dashboard',
  'collections',
  'board',
  'calendar',
]);
const COLLECTIONS = new Set<EventStudioCollectionKind>([
  'sessions',
  'programs',
  'people',
  'venues',
]);
const CALENDAR_VIEWS = new Set<EventStudioViewState['calendarView']>([
  'month',
  'agenda',
]);

function enumValue<T extends string>(
  value: string | null,
  values: ReadonlySet<T>,
  fallback: T,
): T {
  return value !== null && values.has(value as T) ? (value as T) : fallback;
}

function positiveInteger(value: string | null, fallback: number) {
  if (value === null) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function selectedSessionId(
  value: string | null,
  fallback: string | null | undefined,
) {
  if (value === null) return fallback;
  return EVENT_STUDIO_ID_SCHEMA.safeParse(value).success ? value : fallback;
}

function decodePair(value: string): readonly [string, string] | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      && parsed.length === 2
      && typeof parsed[0] === 'string'
      && typeof parsed[1] === 'string'
      ? [parsed[0], parsed[1]]
      : null;
  } catch {
    return null;
  }
}

function decodeFilters(params: URLSearchParams): readonly AppFilter[] {
  return params.getAll('filter').flatMap((value) => {
    const pair = decodePair(value);
    return pair && pair[0] ? [{ id: pair[0], value: pair[1] }] : [];
  });
}

function decodeSort(params: URLSearchParams): readonly AppSort[] {
  return params.getAll('sort').flatMap((value) => {
    const pair = decodePair(value);
    return pair && pair[0] && (pair[1] === 'asc' || pair[1] === 'desc')
      ? [{ id: pair[0], direction: pair[1] }]
      : [];
  });
}

function decodeMonth(value: string | null, fallback: AppCalendarMonth) {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? '');
  if (!match) return fallback;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return Number.isSafeInteger(year) && month >= 1 && month <= 12
    ? { year, month }
    : fallback;
}

function encodeMonth(month: AppCalendarMonth) {
  return `${String(month.year).padStart(4, '0')}-${String(month.month).padStart(2, '0')}`;
}

/**
 * Creates the host-owned URL boundary for Event Studio. The host supplies the
 * defaults so a missing or malformed parameter resolves predictably without
 * coupling App Kit to a router, the clock, or a global store.
 */
export function createEventStudioUrlStateAdapter(
  defaults: EventStudioViewState,
): AppUrlStateAdapter<EventStudioViewState> {
  return defineAppUrlStateAdapter<EventStudioViewState>({
    keys: EVENT_STUDIO_URL_KEYS,
    decode: (params) => ({
      view: enumValue(params.get('view'), VIEWS, defaults.view),
      collection: enumValue(
        params.get('collection'),
        COLLECTIONS,
        defaults.collection,
      ),
      collectionState: {
        search: params.get('q') ?? defaults.collectionState.search,
        filters: params.has('filter')
          ? decodeFilters(params)
          : defaults.collectionState.filters,
        sort: params.has('sort')
          ? decodeSort(params)
          : defaults.collectionState.sort,
        page: positiveInteger(params.get('page'), defaults.collectionState.page),
        pageSize: positiveInteger(
          params.get('pageSize'),
          defaults.collectionState.pageSize,
        ),
      },
      selectedSessionId: selectedSessionId(
        params.get('selected'),
        defaults.selectedSessionId,
      ),
      calendarMonth: decodeMonth(params.get('month'), defaults.calendarMonth),
      calendarView: enumValue(
        params.get('calendarView'),
        CALENDAR_VIEWS,
        defaults.calendarView,
      ),
    }),
    encode: (state) => {
      const params = new URLSearchParams();
      params.set('view', state.view);
      params.set('collection', state.collection);
      if (state.collectionState.search) params.set('q', state.collectionState.search);
      for (const filter of state.collectionState.filters) {
        params.append('filter', JSON.stringify([filter.id, filter.value]));
      }
      for (const sort of state.collectionState.sort) {
        params.append('sort', JSON.stringify([sort.id, sort.direction]));
      }
      params.set('page', String(state.collectionState.page));
      params.set('pageSize', String(state.collectionState.pageSize));
      if (state.selectedSessionId) params.set('selected', state.selectedSessionId);
      params.set('month', encodeMonth(state.calendarMonth));
      params.set('calendarView', state.calendarView);
      return params;
    },
  });
}

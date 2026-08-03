import * as React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import type { AppResourceSource, AppScope } from '../core';
import { AppKitProvider } from '../core/runtime';
import type { AppCollectionPage } from '../data';
import {
  createEventStudioDefinitions,
  type EventStudioAdapter,
  type EventStudioPerson,
  type EventStudioProgram,
  type EventStudioResourceSources,
  type EventStudioSession,
  type EventStudioVenue,
} from './definitions';
import { EventStudio } from './event-studio';
import type { EventStudioViewState } from './state';

const ORGANIZATION_ID = '00000000-0000-4000-8000-000000000001';
const PROGRAM_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_ID = '22222222-2222-4222-8222-222222222222';
const PERSON_ID = '33333333-3333-4333-8333-333333333333';
const VENUE_ID = '44444444-4444-4444-8444-444444444444';
const SESSION_PERSON_ID = '55555555-5555-4555-8555-555555555555';

const scope: AppScope = {
  endpointId: 'graphql-a',
  databaseId: 'database-a',
  sessionPartition: 'session-a',
  organizationId: ORGANIZATION_ID,
  schemaRevision: 'schema-a',
  securityRevision: 'security-a',
};

const currentSession: EventStudioSession = {
  id: SESSION_ID,
  organizationId: ORGANIZATION_ID,
  programId: PROGRAM_ID,
  venueId: null,
  title: 'Opening keynote',
  description: 'Constructive App Kit introduction',
  status: 'scheduled',
  startsAt: '2026-08-03T02:00:00.000Z',
  endsAt: '2026-08-03T03:00:00.000Z',
  capacity: 120,
  tags: ['keynote'],
};

const currentProgram: EventStudioProgram = {
  id: PROGRAM_ID,
  organizationId: ORGANIZATION_ID,
  name: 'App Kit Summit',
  description: null,
  status: 'draft',
};

function source(
  tableName: string,
  graphQLTypeName: string,
  listFieldName: string,
): AppResourceSource {
  return {
    schemaName: 'app_public',
    tableName,
    graphQLTypeName,
    listFieldName,
    detailFieldName: graphQLTypeName[0]!.toLocaleLowerCase() + graphQLTypeName.slice(1),
  };
}

const sources: EventStudioResourceSources = {
  programs: source('programs', 'Program', 'programs'),
  sessions: source('sessions', 'Session', 'sessions'),
  people: source('people', 'Person', 'people'),
  venues: source('venues', 'Venue', 'venues'),
  sessionPeople: source('session_people', 'SessionPerson', 'sessionPeople'),
};

function page<T>(items: readonly T[]): AppCollectionPage<T> {
  return {
    items,
    pageInfo: {
      page: 1,
      pageSize: 25,
      totalCount: items.length,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
}

function adapter(): EventStudioAdapter {
  return {
    listPrograms: () => page<EventStudioProgram>([]),
    getProgram: () => null,
    searchPrograms: () => ({ items: [], hasMore: false }),
    createProgram: ({ input }) => ({
      id: PROGRAM_ID,
      organizationId: ORGANIZATION_ID,
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? 'draft',
    }),
    updateProgram: ({ input }) => ({
      id: input.programId,
      organizationId: ORGANIZATION_ID,
      name: input.name ?? 'Program',
      description: input.description ?? null,
      status: input.status ?? 'draft',
    }),
    listSessions: () => page([currentSession]),
    getSession: () => currentSession,
    createSession: ({ input }) => ({
      ...currentSession,
      id: SESSION_ID,
      title: input.title,
      description: input.description ?? null,
      programId: input.programId,
      venueId: input.venueId ?? null,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      capacity: input.capacity ?? null,
      tags: input.tags ?? [],
    }),
    listPeople: () => page<EventStudioPerson>([]),
    getPerson: () => null,
    createPerson: ({ input }) => ({
      id: PERSON_ID,
      organizationId: ORGANIZATION_ID,
      displayName: input.displayName,
      email: input.email ?? null,
      role: input.role ?? null,
    }),
    updatePerson: ({ input }) => ({
      id: input.personId,
      organizationId: ORGANIZATION_ID,
      displayName: input.displayName ?? 'Person',
      email: input.email ?? null,
      role: input.role ?? null,
    }),
    searchPeople: () => ({ items: [], hasMore: false }),
    listVenues: () => page<EventStudioVenue>([]),
    getVenue: () => null,
    createVenue: ({ input }) => ({
      id: VENUE_ID,
      organizationId: ORGANIZATION_ID,
      name: input.name,
      address: input.address ?? null,
      timeZone: input.timeZone,
      capacity: input.capacity ?? null,
    }),
    updateVenue: ({ input }) => ({
      id: input.venueId,
      organizationId: ORGANIZATION_ID,
      name: input.name ?? 'Venue',
      address: input.address ?? null,
      timeZone: input.timeZone ?? 'UTC',
      capacity: input.capacity ?? null,
    }),
    listSessionPeople: () => [],
    listSessionPersonLinks: () => [],
    loadBoard: () => [currentSession],
    loadCalendar: () => [],
    loadSessionCount: () => ({ value: 1 }),
    loadPublishedCount: () => ({ value: 0 }),
    loadSessionsByStatus: () => ({ rows: [] }),
    loadSessionsOverTime: () => ({ rows: [] }),
    moveSession: ({ input }) => ({ ...currentSession, status: input.status }),
    updateSession: () => currentSession,
    publishSession: () => ({ ...currentSession, status: 'published' }),
    scheduleSession: () => currentSession,
    cancelSession: () => ({ ...currentSession, status: 'cancelled' }),
    linkPerson: ({ input }) => ({
      id: SESSION_PERSON_ID,
      organizationId: ORGANIZATION_ID,
      sessionId: input.sessionId,
      personId: input.personId,
      role: input.role ?? null,
    }),
    unlinkPerson: ({ input }) => ({
      id: SESSION_PERSON_ID,
      organizationId: ORGANIZATION_ID,
      sessionId: input.sessionId,
      personId: input.personId,
      role: input.role ?? null,
    }),
  };
}

const state: EventStudioViewState = {
  view: 'collections',
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

describe('Event Studio controlled starter', () => {
  it('renders adapter-backed collection data and reports view changes to the host', async () => {
    const onStateChange = vi.fn();
    const definitions = createEventStudioDefinitions(sources, adapter());
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <AppKitProvider queryClient={queryClient} scope={scope}>
        <EventStudio
          analyticsInput={{ timeZone: 'Asia/Ho_Chi_Minh' }}
          dashboardLayout={{ version: 1, placements: [] }}
          definitions={definitions}
          onDashboardLayoutChange={vi.fn()}
          onStateChange={onStateChange}
          state={state}
          timeZone="Asia/Ho_Chi_Minh"
        />
      </AppKitProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Event Studio' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Opening keynote')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('tab', { name: /Board/ }));
    expect(onStateChange).toHaveBeenCalledWith({ ...state, view: 'board' });
    expect(screen.getByText('Opening keynote')).toBeInTheDocument();
  });

  it('keeps a create permission denial visible in the generated form dialog', async () => {
    const deniedCreate = vi.fn((_context: Parameters<EventStudioAdapter['createProgram']>[0]) => ({
      ok: false as const,
      error: {
        kind: 'authorization' as const,
        message: 'Only organization admins can create programs.',
      },
    }));
    const definitions = createEventStudioDefinitions(sources, {
      ...adapter(),
      createProgram: deniedCreate,
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <AppKitProvider queryClient={queryClient} scope={scope}>
        <EventStudio
          analyticsInput={{ timeZone: 'Asia/Ho_Chi_Minh' }}
          dashboardLayout={{ version: 1, placements: [] }}
          definitions={definitions}
          onDashboardLayoutChange={vi.fn()}
          onStateChange={vi.fn()}
          state={{ ...state, collection: 'programs' }}
          timeZone="Asia/Ho_Chi_Minh"
        />
      </AppKitProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create program' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Name'), {
      target: { value: 'App Kit Summit' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create program' }));

    await waitFor(() => expect(deniedCreate).toHaveBeenCalledTimes(1));
    expect(within(dialog).getByText('Changes were not saved')).toBeInTheDocument();
    expect(within(dialog).getByText('Only organization admins can create programs.')).toBeInTheDocument();
  });

  it('selects the required program through server search before creating a session', async () => {
    const user = userEvent.setup();
    const searchPrograms = vi.fn((_context: Parameters<EventStudioAdapter['searchPrograms']>[0]) => ({
      items: [{
        value: currentProgram.id,
        label: currentProgram.name,
        description: currentProgram.status,
        record: currentProgram,
      }],
      hasMore: false,
    }));
    const createSession = vi.fn(adapter().createSession);
    const definitions = createEventStudioDefinitions(sources, {
      ...adapter(),
      searchPrograms,
      createSession,
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <AppKitProvider queryClient={queryClient} scope={scope}>
        <EventStudio
          analyticsInput={{ timeZone: 'Asia/Ho_Chi_Minh' }}
          dashboardLayout={{ version: 1, placements: [] }}
          definitions={definitions}
          onDashboardLayoutChange={vi.fn()}
          onStateChange={vi.fn()}
          state={state}
          timeZone="Asia/Ho_Chi_Minh"
        />
      </AppKitProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create session' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Title'), {
      target: { value: 'App Kit keynote' },
    });
    const programSearch = within(dialog).getByRole('combobox', { name: 'Program' });
    fireEvent.click(programSearch);
    fireEvent.change(programSearch, { target: { value: 'summit' } });

    await waitFor(() => expect(searchPrograms.mock.calls.some(
      ([context]) => context.input.search === 'summit',
    )).toBe(true));
    fireEvent.click(programSearch);
    fireEvent.keyDown(programSearch, { key: 'ArrowDown' });
    await user.click(await screen.findByText('App Kit Summit'));
    expect(programSearch).toHaveValue('App Kit Summit');
    await user.click(within(dialog).getByRole('button', { name: 'Create session' }));

    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    const createCall = createSession.mock.calls[0];
    expect(createCall).toBeDefined();
    if (!createCall) throw new Error('Expected the create session adapter to be called.');
    expect(createCall[0].input).toMatchObject({
      title: 'App Kit keynote',
      programId: currentProgram.id,
    });
  });

  it('renders a denied session update inside the existing edit form', async () => {
    const deniedUpdate = vi.fn((_context: Parameters<EventStudioAdapter['updateSession']>[0]) => ({
      ok: false as const,
      error: {
        kind: 'authorization' as const,
        message: 'This session is read-only for your organization role.',
      },
    }));
    const definitions = createEventStudioDefinitions(sources, {
      ...adapter(),
      updateSession: deniedUpdate,
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <AppKitProvider queryClient={queryClient} scope={scope}>
        <EventStudio
          analyticsInput={{ timeZone: 'Asia/Ho_Chi_Minh' }}
          dashboardLayout={{ version: 1, placements: [] }}
          definitions={definitions}
          onDashboardLayoutChange={vi.fn()}
          onStateChange={vi.fn()}
          state={{ ...state, selectedSessionId: currentSession.id }}
          timeZone="Asia/Ho_Chi_Minh"
        />
      </AppKitProvider>,
    );

    const title = await screen.findByLabelText('Title');
    fireEvent.change(title, { target: { value: 'Updated keynote' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save session' }));

    await waitFor(() => expect(deniedUpdate).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Changes were not saved')).toBeInTheDocument();
    expect(screen.getByText('This session is read-only for your organization role.')).toBeInTheDocument();
    const updateCall = deniedUpdate.mock.calls[0];
    expect(updateCall).toBeDefined();
    if (!updateCall) throw new Error('Expected the denied update adapter to be called.');
    expect(updateCall[0].input).toMatchObject({
      sessionId: currentSession.id,
      title: 'Updated keynote',
      programId: currentSession.programId,
      venueId: currentSession.venueId,
      tags: currentSession.tags,
    });
  });

  it('presents the declared unlink confirmation before executing the action', async () => {
    const person: EventStudioPerson = {
      id: PERSON_ID,
      organizationId: ORGANIZATION_ID,
      displayName: 'Ada Lovelace',
      email: 'ada@example.com',
      role: 'Speaker',
    };
    const unlinkPerson = vi.fn(adapter().unlinkPerson);
    const definitions = createEventStudioDefinitions(sources, {
      ...adapter(),
      listSessionPeople: () => [person],
      unlinkPerson,
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <AppKitProvider queryClient={queryClient} scope={scope}>
        <EventStudio
          analyticsInput={{ timeZone: 'Asia/Ho_Chi_Minh' }}
          dashboardLayout={{ version: 1, placements: [] }}
          definitions={definitions}
          onDashboardLayoutChange={vi.fn()}
          onStateChange={vi.fn()}
          state={{ ...state, selectedSessionId: currentSession.id }}
          timeZone="Asia/Ho_Chi_Minh"
        />
      </AppKitProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Unlink Ada Lovelace' }));
    expect(await screen.findByText('Unlink this person?')).toBeInTheDocument();
    expect(unlinkPerson).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Unlink person' }));
    await waitFor(() => expect(unlinkPerson).toHaveBeenCalledTimes(1));
    expect(unlinkPerson.mock.calls[0]?.[0].input).toEqual({
      sessionId: currentSession.id,
      personId: person.id,
    });
  });
});

import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { createAppQueryKey, type AppResourceSource, type AppScope } from '../core';
import {
  createEventStudioDefinitions,
  EVENT_STUDIO_QUERY_IDS,
  type EventStudioAdapter,
  type EventStudioResourceSources,
  type EventStudioSession,
} from './definitions';

const scope: AppScope = {
  endpointId: 'graphql-a',
  databaseId: 'database-a',
  sessionPartition: 'session-a',
  organizationId: 'org-a',
  schemaRevision: 'schema-a',
  securityRevision: 'security-a',
};

const PROGRAM_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_ID = '22222222-2222-4222-8222-222222222221';
const SECOND_SESSION_ID = '22222222-2222-4222-8222-222222222222';
const PERSON_ID = '33333333-3333-4333-8333-333333333333';
const VENUE_ID = '44444444-4444-4444-8444-444444444444';

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

const adapter = new Proxy({}, {
  get: () => () => {
    throw new Error('The adapter should not execute in definition contract tests.');
  },
}) as EventStudioAdapter;

function session(overrides: Partial<EventStudioSession> = {}): EventStudioSession {
  return {
    id: SESSION_ID,
    organizationId: 'org-a',
    programId: PROGRAM_ID,
    venueId: null,
    title: 'Opening keynote',
    description: null,
    status: 'draft',
    startsAt: null,
    endsAt: null,
    capacity: null,
    tags: [],
    ...overrides,
  };
}

describe('Event Studio definitions', () => {
  it('matches the blueprint database names and final inflected GraphQL fields', () => {
    const definitions = createEventStudioDefinitions(sources, adapter);
    const organizationFields = Object.values(definitions.resources).map((resource) =>
      resource.fields.find((field) => field.key === 'organizationId'),
    );

    expect(organizationFields).toHaveLength(5);
    expect(organizationFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ databaseName: 'org_id', graphQLName: 'orgId' }),
      ]),
    );
    expect(organizationFields.every((field) =>
      field?.databaseName === 'org_id'
        && field.graphQLName === 'orgId'
        && field.kind === 'string'
    )).toBe(true);

    expect(definitions.resources.sessions.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'programId',
          databaseName: 'program_id',
          graphQLName: 'programId',
          kind: 'string',
        }),
        expect.objectContaining({
          key: 'venueId',
          kind: 'string',
        }),
        expect.objectContaining({
          key: 'status',
          databaseName: 'status',
          graphQLName: 'status',
          kind: 'string',
        }),
        expect.objectContaining({
          key: 'tags',
          databaseName: 'tags',
          graphQLName: 'tags',
          kind: 'string-array',
        }),
      ]),
    );
  });

  it('models the DataId-backed session_people table with an id identity', () => {
    const resource = createEventStudioDefinitions(sources, adapter).resources.sessionPeople;

    expect(resource.source.tableName).toBe('session_people');
    expect(resource.identity?.fields).toEqual(['id']);
    expect(resource.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'id', databaseName: 'id', graphQLName: 'id', kind: 'string' }),
        expect.objectContaining({ key: 'sessionId', databaseName: 'session_id', graphQLName: 'sessionId', kind: 'string' }),
        expect.objectContaining({ key: 'personId', databaseName: 'person_id', graphQLName: 'personId', kind: 'string' }),
      ]),
    );
  });

  it('exposes validated create and update contracts through resource forms', () => {
    const definitions = createEventStudioDefinitions(sources, adapter);

    expect(Object.keys(definitions.actions)).toEqual(expect.arrayContaining([
      'createProgram',
      'updateProgram',
      'createSession',
      'updateSession',
      'createPerson',
      'updatePerson',
      'createVenue',
      'updateVenue',
    ]));
    expect(definitions.resources.programs.actions).toMatchObject({
      createProgram: { id: 'event-studio.programs.create' },
      updateProgram: { id: 'event-studio.programs.update' },
    });
    expect(definitions.resources.people.actions).toMatchObject({
      createPerson: { id: 'event-studio.people.create' },
      updatePerson: { id: 'event-studio.people.update' },
    });
    expect(definitions.resources.venues.actions).toMatchObject({
      createVenue: { id: 'event-studio.venues.create' },
      updateVenue: { id: 'event-studio.venues.update' },
    });

    const sessionUpdateFields = definitions.resources.sessions.forms?.update?.fields
      .map(({ field }) => field);
    expect(sessionUpdateFields).toEqual([
      'title',
      'description',
      'programId',
      'venueId',
      'startsAt',
      'endsAt',
      'capacity',
      'tags',
    ]);
    expect(sessionUpdateFields).not.toContain('status');
    expect(definitions.resources.sessions.fields.find(({ key }) => key === 'status')?.readOnly)
      .toBe(true);
    expect(definitions.resources.sessions.fields.find(({ key }) => key === 'programId')?.nullable)
      .not.toBe(true);
    expect(definitions.resources.sessions.forms?.create?.fields.find(({ field }) => field === 'programId'))
      .toEqual({ field: 'programId', required: true });
    expect(definitions.resources.sessions.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'program',
        graphQLName: 'program',
        targetTableName: 'programs',
      }),
      expect.objectContaining({
        id: 'venue',
        graphQLName: 'venue',
        targetTableName: 'venues',
      }),
      expect.objectContaining({
        id: 'people',
        graphQLName: 'sessionPeople',
        targetTableName: 'session_people',
      }),
    ]));

    expect(definitions.actions.createProgram.inputSchema?.safeParse({ name: '' }).success)
      .toBe(false);
    expect(definitions.actions.createPerson.inputSchema?.safeParse({
      displayName: 'Ada',
      email: 'not-an-email',
    }).success).toBe(false);
    expect(definitions.actions.createVenue.inputSchema?.safeParse({
      name: 'Hall A',
      timeZone: '',
    }).success).toBe(false);
    expect(definitions.actions.createSession.inputSchema?.safeParse({
      title: 'Opening keynote',
      capacity: -1,
    }).success).toBe(false);
    expect(definitions.actions.createSession.inputSchema?.safeParse({
      title: 'Opening keynote',
    }).success).toBe(false);
    expect(definitions.actions.createSession.inputSchema?.safeParse({
      title: 'Opening keynote',
      programId: null,
    }).success).toBe(false);
    expect(definitions.actions.createSession.inputSchema?.safeParse({
      title: 'Opening keynote',
      programId: PROGRAM_ID,
    }).success).toBe(true);
    expect(definitions.actions.updateSession.inputSchema?.safeParse({
      sessionId: SESSION_ID,
      programId: null,
    }).success).toBe(false);

    const malformedIds = [
      definitions.actions.updateProgram.inputSchema?.safeParse({ programId: 'program-1' }),
      definitions.actions.createSession.inputSchema?.safeParse({
        title: 'Opening keynote',
        programId: 'program-1',
      }),
      definitions.actions.updateSession.inputSchema?.safeParse({ sessionId: 'session-1' }),
      definitions.actions.updatePerson.inputSchema?.safeParse({ personId: 'person-1' }),
      definitions.actions.updateVenue.inputSchema?.safeParse({ venueId: 'venue-1' }),
      definitions.actions.linkPerson.inputSchema?.safeParse({
        sessionId: SESSION_ID,
        personId: 'person-1',
      }),
    ];
    expect(malformedIds.every((result) => result?.success === false)).toBe(true);
  });

  it('invalidates each writable resource without crossing unrelated scopes', () => {
    const definitions = createEventStudioDefinitions(sources, adapter);
    const programTargets = definitions.actions.createProgram.invalidate;
    const peopleTargets = definitions.actions.updatePerson.invalidate;
    const venueTargets = definitions.actions.updateVenue.invalidate;
    if (
      typeof programTargets !== 'function'
      || typeof peopleTargets !== 'function'
      || typeof venueTargets !== 'function'
    ) throw new Error('Expected dynamic resource invalidation.');

    expect(programTargets({
      input: { name: 'Summit' },
      output: {
        id: PROGRAM_ID,
        organizationId: 'org-a',
        name: 'Summit',
        description: null,
        status: 'draft',
      },
      scope,
    })).toEqual([
      { queryId: EVENT_STUDIO_QUERY_IDS.programs },
      { queryId: EVENT_STUDIO_QUERY_IDS.program, input: PROGRAM_ID, exact: true },
      { queryId: EVENT_STUDIO_QUERY_IDS.programSearch },
    ]);
    expect(peopleTargets({
      input: { personId: PERSON_ID, displayName: 'Ada' },
      output: {
        id: PERSON_ID,
        organizationId: 'org-a',
        displayName: 'Ada',
        email: null,
        role: null,
      },
      scope,
    }).map(({ queryId }) => queryId)).toEqual([
      EVENT_STUDIO_QUERY_IDS.people,
      EVENT_STUDIO_QUERY_IDS.person,
      EVENT_STUDIO_QUERY_IDS.peopleSearch,
      EVENT_STUDIO_QUERY_IDS.sessionPeople,
    ]);
    expect(venueTargets({
      input: { venueId: VENUE_ID, name: 'Hall A' },
      output: {
        id: VENUE_ID,
        organizationId: 'org-a',
        name: 'Hall A',
        address: null,
        timeZone: 'UTC',
        capacity: null,
      },
      scope,
    }).map(({ queryId }) => queryId)).toEqual([
      EVENT_STUDIO_QUERY_IDS.venues,
      EVENT_STUDIO_QUERY_IDS.venue,
      EVENT_STUDIO_QUERY_IDS.calendar,
    ]);
  });

  it('applies and rolls back the semantic board move in the exact scope partition', async () => {
    const definitions = createEventStudioDefinitions(sources, adapter);
    const queryClient = new QueryClient();
    const boardInput = { search: 'keynote', programId: null };
    const queryKey = createAppQueryKey(scope, EVENT_STUDIO_QUERY_IDS.board, boardInput);
    const previous = [session(), session({ id: SECOND_SESSION_ID, title: 'Workshop' })];
    queryClient.setQueryData(queryKey, previous);

    const optimisticContext = await definitions.actions.moveSession.optimistic!.apply({
      input: { sessionId: SESSION_ID, status: 'published', boardInput },
      queryClient,
      scope,
    });

    expect(queryClient.getQueryData<readonly EventStudioSession[]>(queryKey)?.[0]?.status)
      .toBe('published');

    await definitions.actions.moveSession.optimistic!.rollback({
      input: { sessionId: SESSION_ID, status: 'published', boardInput },
      queryClient,
      scope,
      optimisticContext,
      error: { kind: 'authorization', message: 'Denied by organization RLS.' },
    });

    expect(queryClient.getQueryData(queryKey)).toEqual(previous);
  });

  it('targets collection, board, calendar, analytics, and detail caches after publish', () => {
    const definitions = createEventStudioDefinitions(sources, adapter);
    const invalidate = definitions.actions.publishSession.invalidate;
    if (typeof invalidate !== 'function') throw new Error('Expected dynamic invalidation.');

    const targets = invalidate({
      input: { sessionId: SESSION_ID },
      output: session({ status: 'published' }),
      scope,
    });

    expect(targets.map((target) => target.queryId)).toEqual([
      EVENT_STUDIO_QUERY_IDS.sessions,
      EVENT_STUDIO_QUERY_IDS.board,
      EVENT_STUDIO_QUERY_IDS.calendar,
      EVENT_STUDIO_QUERY_IDS.sessionCount,
      EVENT_STUDIO_QUERY_IDS.publishedCount,
      EVENT_STUDIO_QUERY_IDS.sessionsByStatus,
      EVENT_STUDIO_QUERY_IDS.sessionsOverTime,
      EVENT_STUDIO_QUERY_IDS.session,
    ]);
    expect(targets.at(-1)).toEqual({
      queryId: EVENT_STUDIO_QUERY_IDS.session,
      input: SESSION_ID,
      exact: true,
    });
  });
});

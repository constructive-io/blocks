import { z } from 'zod';

import {
  createAppQueryKey,
  defineAction,
  defineQuery,
  defineResource,
  type AppExecutionContext,
  type AppExecutorResult,
  type AppQueryDefinition,
  type AppResourceSource,
} from '../core';
import type {
  AppCollectionPage,
  AppCollectionQueryInput,
  AppRelationSearchInput,
  AppRelationSearchPage,
} from '../data';
import type { AppCalendarEvent, AppCalendarRange } from '../calendar';
import type { AppDashboardRowsPayload, AppKpiWidgetPayload } from '../dashboard';

export const EVENT_STUDIO_STATUSES = [
  'draft',
  'scheduled',
  'published',
  'cancelled',
] as const;

export type EventStudioStatus = (typeof EVENT_STUDIO_STATUSES)[number];

export type EventStudioProgram = Readonly<{
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: EventStudioStatus;
}>;

export type EventStudioSession = Readonly<{
  id: string;
  organizationId: string;
  programId: string;
  venueId: string | null;
  title: string;
  description: string | null;
  status: EventStudioStatus;
  startsAt: string | null;
  endsAt: string | null;
  capacity: number | null;
  tags: readonly string[];
}>;

export type EventStudioPerson = Readonly<{
  id: string;
  organizationId: string;
  displayName: string;
  email: string | null;
  role: string | null;
}>;

export type EventStudioVenue = Readonly<{
  id: string;
  organizationId: string;
  name: string;
  address: string | null;
  timeZone: string;
  capacity: number | null;
}>;

export type EventStudioSessionPerson = Readonly<{
  id: string;
  sessionId: string;
  personId: string;
  organizationId: string;
  role: string | null;
}>;

export type EventStudioCollectionKind = 'sessions' | 'programs' | 'people' | 'venues';

export type EventStudioBoardInput = Readonly<{
  search?: string;
  programId?: string | null;
}>;

export type EventStudioAnalyticsInput = Readonly<{
  startDate?: string;
  endDate?: string;
  timeZone: string;
}>;

export type EventStudioMoveSessionInput = Readonly<{
  sessionId: string;
  status: EventStudioStatus;
  boardInput: EventStudioBoardInput;
}>;

export type EventStudioCreateProgramInput = Readonly<{
  name: string;
  description?: string | null;
  status?: EventStudioStatus;
}>;

export type EventStudioUpdateProgramInput = Readonly<{
  programId: string;
  name?: string;
  description?: string | null;
  status?: EventStudioStatus;
}>;

export type EventStudioCreateSessionInput = Readonly<{
  title: string;
  description?: string | null;
  programId: string;
  venueId?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  capacity?: number | null;
  tags?: readonly string[];
}>;

export type EventStudioUpdateSessionInput = Readonly<{
  sessionId: string;
  title?: string;
  description?: string | null;
  programId?: string;
  venueId?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  capacity?: number | null;
  tags?: readonly string[];
}>;

export type EventStudioScheduleSessionInput = Readonly<{
  sessionId: string;
  startsAt: string;
  endsAt: string;
  timeZone: string;
}>;

export type EventStudioCreatePersonInput = Readonly<{
  displayName: string;
  email?: string | null;
  role?: string | null;
}>;

export type EventStudioUpdatePersonInput = Readonly<{
  personId: string;
  displayName?: string;
  email?: string | null;
  role?: string | null;
}>;

export type EventStudioCreateVenueInput = Readonly<{
  name: string;
  address?: string | null;
  timeZone: string;
  capacity?: number | null;
}>;

export type EventStudioUpdateVenueInput = Readonly<{
  venueId: string;
  name?: string;
  address?: string | null;
  timeZone?: string;
  capacity?: number | null;
}>;

export type EventStudioSessionActionInput = Readonly<{ sessionId: string }>;

export type EventStudioSessionPersonInput = Readonly<{
  sessionId: string;
  personId: string;
  role?: string | null;
}>;

export type EventStudioResourceSources = Readonly<{
  programs: AppResourceSource;
  sessions: AppResourceSource;
  people: AppResourceSource;
  venues: AppResourceSource;
  sessionPeople: AppResourceSource;
}>;

type EventStudioExecution<TInput, TOutput> = (
  context: AppExecutionContext<TInput>,
) => AppExecutorResult<TOutput> | Promise<AppExecutorResult<TOutput>>;

export type EventStudioAdapter = Readonly<{
  listPrograms: EventStudioExecution<AppCollectionQueryInput, AppCollectionPage<EventStudioProgram>>;
  getProgram: EventStudioExecution<string, EventStudioProgram | null>;
  searchPrograms: EventStudioExecution<AppRelationSearchInput, AppRelationSearchPage<EventStudioProgram>>;
  createProgram: EventStudioExecution<EventStudioCreateProgramInput, EventStudioProgram>;
  updateProgram: EventStudioExecution<EventStudioUpdateProgramInput, EventStudioProgram>;
  listSessions: EventStudioExecution<AppCollectionQueryInput, AppCollectionPage<EventStudioSession>>;
  getSession: EventStudioExecution<string, EventStudioSession | null>;
  createSession: EventStudioExecution<EventStudioCreateSessionInput, EventStudioSession>;
  listPeople: EventStudioExecution<AppCollectionQueryInput, AppCollectionPage<EventStudioPerson>>;
  getPerson: EventStudioExecution<string, EventStudioPerson | null>;
  createPerson: EventStudioExecution<EventStudioCreatePersonInput, EventStudioPerson>;
  updatePerson: EventStudioExecution<EventStudioUpdatePersonInput, EventStudioPerson>;
  searchPeople: EventStudioExecution<AppRelationSearchInput, AppRelationSearchPage<EventStudioPerson>>;
  listVenues: EventStudioExecution<AppCollectionQueryInput, AppCollectionPage<EventStudioVenue>>;
  getVenue: EventStudioExecution<string, EventStudioVenue | null>;
  createVenue: EventStudioExecution<EventStudioCreateVenueInput, EventStudioVenue>;
  updateVenue: EventStudioExecution<EventStudioUpdateVenueInput, EventStudioVenue>;
  listSessionPeople: EventStudioExecution<string, readonly EventStudioPerson[]>;
  listSessionPersonLinks: EventStudioExecution<string, readonly EventStudioSessionPerson[]>;
  loadBoard: EventStudioExecution<EventStudioBoardInput, readonly EventStudioSession[]>;
  loadCalendar: EventStudioExecution<AppCalendarRange, readonly AppCalendarEvent<EventStudioSession>[]>;
  loadSessionCount: EventStudioExecution<EventStudioAnalyticsInput, AppKpiWidgetPayload>;
  loadPublishedCount: EventStudioExecution<EventStudioAnalyticsInput, AppKpiWidgetPayload>;
  loadSessionsByStatus: EventStudioExecution<EventStudioAnalyticsInput, AppDashboardRowsPayload>;
  loadSessionsOverTime: EventStudioExecution<EventStudioAnalyticsInput, AppDashboardRowsPayload>;
  moveSession: EventStudioExecution<EventStudioMoveSessionInput, EventStudioSession>;
  updateSession: EventStudioExecution<EventStudioUpdateSessionInput, EventStudioSession>;
  publishSession: EventStudioExecution<EventStudioSessionActionInput, EventStudioSession>;
  scheduleSession: EventStudioExecution<EventStudioScheduleSessionInput, EventStudioSession>;
  cancelSession: EventStudioExecution<EventStudioSessionActionInput, EventStudioSession>;
  linkPerson: EventStudioExecution<EventStudioSessionPersonInput, EventStudioSessionPerson>;
  unlinkPerson: EventStudioExecution<EventStudioSessionPersonInput, EventStudioSessionPerson>;
}>;

export const EVENT_STUDIO_QUERY_IDS = Object.freeze({
  programs: 'event-studio.programs.list',
  program: 'event-studio.programs.detail',
  programSearch: 'event-studio.programs.search',
  sessions: 'event-studio.sessions.list',
  session: 'event-studio.sessions.detail',
  people: 'event-studio.people.list',
  person: 'event-studio.people.detail',
  peopleSearch: 'event-studio.people.search',
  venues: 'event-studio.venues.list',
  venue: 'event-studio.venues.detail',
  sessionPeople: 'event-studio.session-people.people',
  sessionPersonLinks: 'event-studio.session-people.links',
  sessionPersonLinksCollection: 'event-studio.session-people.collection',
  board: 'event-studio.sessions.board',
  calendar: 'event-studio.sessions.calendar',
  sessionCount: 'event-studio.analytics.session-count',
  publishedCount: 'event-studio.analytics.published-count',
  sessionsByStatus: 'event-studio.analytics.sessions-by-status',
  sessionsOverTime: 'event-studio.analytics.sessions-over-time',
});

export const EVENT_STUDIO_ID_SCHEMA = z.uuid();
const sessionIdSchema = z.object({ sessionId: EVENT_STUDIO_ID_SCHEMA });
const createProgramSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  status: z.enum(EVENT_STUDIO_STATUSES).optional(),
});
const updateProgramSchema = createProgramSchema.partial().extend({
  programId: EVENT_STUDIO_ID_SCHEMA,
});
const createSessionSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  programId: EVENT_STUDIO_ID_SCHEMA,
  venueId: EVENT_STUDIO_ID_SCHEMA.nullable().optional(),
  startsAt: z.iso.datetime().nullable().optional(),
  endsAt: z.iso.datetime().nullable().optional(),
  capacity: z.number().int().nonnegative().nullable().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
});
const sessionPersonSchema = z.object({
  sessionId: EVENT_STUDIO_ID_SCHEMA,
  personId: EVENT_STUDIO_ID_SCHEMA,
  role: z.string().trim().min(1).nullable().optional(),
});
const moveSessionSchema = z.object({
  sessionId: EVENT_STUDIO_ID_SCHEMA,
  status: z.enum(EVENT_STUDIO_STATUSES),
  boardInput: z.object({
    search: z.string().optional(),
    programId: EVENT_STUDIO_ID_SCHEMA.nullable().optional(),
  }),
});
const updateSessionSchema = z.object({
  sessionId: EVENT_STUDIO_ID_SCHEMA,
  title: z.string().trim().min(1).optional(),
  description: z.string().nullable().optional(),
  programId: EVENT_STUDIO_ID_SCHEMA.optional(),
  venueId: EVENT_STUDIO_ID_SCHEMA.nullable().optional(),
  startsAt: z.iso.datetime().nullable().optional(),
  endsAt: z.iso.datetime().nullable().optional(),
  capacity: z.number().int().nonnegative().nullable().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
});
const scheduleSessionSchema = z.object({
  sessionId: EVENT_STUDIO_ID_SCHEMA,
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  timeZone: z.string().min(1),
});
const createPersonSchema = z.object({
  displayName: z.string().trim().min(1),
  email: z.string().trim().email().nullable().optional(),
  role: z.string().trim().min(1).nullable().optional(),
});
const updatePersonSchema = createPersonSchema.partial().extend({
  personId: EVENT_STUDIO_ID_SCHEMA,
});
const createVenueSchema = z.object({
  name: z.string().trim().min(1),
  address: z.string().nullable().optional(),
  timeZone: z.string().trim().min(1),
  capacity: z.number().int().nonnegative().nullable().optional(),
});
const updateVenueSchema = createVenueSchema.partial().extend({
  venueId: EVENT_STUDIO_ID_SCHEMA,
});

function createCollectionQuery<TRecord>(
  id: string,
  execute: EventStudioExecution<AppCollectionQueryInput, AppCollectionPage<TRecord>>,
): AppQueryDefinition<AppCollectionQueryInput, AppCollectionPage<TRecord>> {
  return defineQuery({ id, execute });
}

function createDetailQuery<TRecord>(
  id: string,
  execute: EventStudioExecution<string, TRecord | null>,
): AppQueryDefinition<string, TRecord | null> {
  return defineQuery({ id, execute });
}

function sessionInvalidations(sessionId?: string) {
  return [
    { queryId: EVENT_STUDIO_QUERY_IDS.sessions },
    { queryId: EVENT_STUDIO_QUERY_IDS.board },
    { queryId: EVENT_STUDIO_QUERY_IDS.calendar },
    { queryId: EVENT_STUDIO_QUERY_IDS.sessionCount },
    { queryId: EVENT_STUDIO_QUERY_IDS.publishedCount },
    { queryId: EVENT_STUDIO_QUERY_IDS.sessionsByStatus },
    { queryId: EVENT_STUDIO_QUERY_IDS.sessionsOverTime },
    ...(sessionId
      ? [{ queryId: EVENT_STUDIO_QUERY_IDS.session, input: sessionId, exact: true }]
      : []),
  ] as const;
}

function resourceInvalidations(
  collectionQueryId: string,
  detailQueryId: string,
  identity?: string,
) {
  return [
    { queryId: collectionQueryId },
    ...(identity ? [{ queryId: detailQueryId, input: identity, exact: true }] : []),
  ] as const;
}

function programInvalidations(programId?: string) {
  return [
    ...resourceInvalidations(EVENT_STUDIO_QUERY_IDS.programs, EVENT_STUDIO_QUERY_IDS.program, programId),
    { queryId: EVENT_STUDIO_QUERY_IDS.programSearch },
  ] as const;
}

function peopleInvalidations(personId?: string) {
  return [
    ...resourceInvalidations(EVENT_STUDIO_QUERY_IDS.people, EVENT_STUDIO_QUERY_IDS.person, personId),
    { queryId: EVENT_STUDIO_QUERY_IDS.peopleSearch },
    { queryId: EVENT_STUDIO_QUERY_IDS.sessionPeople },
  ] as const;
}

function venueInvalidations(venueId?: string) {
  return [
    ...resourceInvalidations(EVENT_STUDIO_QUERY_IDS.venues, EVENT_STUDIO_QUERY_IDS.venue, venueId),
    { queryId: EVENT_STUDIO_QUERY_IDS.calendar },
  ] as const;
}

export function createEventStudioDefinitions(
  sources: EventStudioResourceSources,
  adapter: EventStudioAdapter,
) {
  const queries = {
    programs: createCollectionQuery(EVENT_STUDIO_QUERY_IDS.programs, adapter.listPrograms),
    program: createDetailQuery(EVENT_STUDIO_QUERY_IDS.program, adapter.getProgram),
    programSearch: defineQuery({ id: EVENT_STUDIO_QUERY_IDS.programSearch, execute: adapter.searchPrograms }),
    sessions: createCollectionQuery(EVENT_STUDIO_QUERY_IDS.sessions, adapter.listSessions),
    session: createDetailQuery(EVENT_STUDIO_QUERY_IDS.session, adapter.getSession),
    people: createCollectionQuery(EVENT_STUDIO_QUERY_IDS.people, adapter.listPeople),
    person: createDetailQuery(EVENT_STUDIO_QUERY_IDS.person, adapter.getPerson),
    peopleSearch: defineQuery({ id: EVENT_STUDIO_QUERY_IDS.peopleSearch, execute: adapter.searchPeople }),
    venues: createCollectionQuery(EVENT_STUDIO_QUERY_IDS.venues, adapter.listVenues),
    venue: createDetailQuery(EVENT_STUDIO_QUERY_IDS.venue, adapter.getVenue),
    sessionPeople: defineQuery({ id: EVENT_STUDIO_QUERY_IDS.sessionPeople, execute: adapter.listSessionPeople }),
    sessionPersonLinks: defineQuery({ id: EVENT_STUDIO_QUERY_IDS.sessionPersonLinks, execute: adapter.listSessionPersonLinks }),
    board: defineQuery({ id: EVENT_STUDIO_QUERY_IDS.board, execute: adapter.loadBoard }),
    calendar: defineQuery({ id: EVENT_STUDIO_QUERY_IDS.calendar, execute: adapter.loadCalendar }),
    sessionCount: defineQuery({ id: EVENT_STUDIO_QUERY_IDS.sessionCount, execute: adapter.loadSessionCount }),
    publishedCount: defineQuery({ id: EVENT_STUDIO_QUERY_IDS.publishedCount, execute: adapter.loadPublishedCount }),
    sessionsByStatus: defineQuery({ id: EVENT_STUDIO_QUERY_IDS.sessionsByStatus, execute: adapter.loadSessionsByStatus }),
    sessionsOverTime: defineQuery({ id: EVENT_STUDIO_QUERY_IDS.sessionsOverTime, execute: adapter.loadSessionsOverTime }),
  } as const;

  const createProgram = defineAction<EventStudioCreateProgramInput, EventStudioProgram>({
    id: 'event-studio.programs.create',
    inputSchema: createProgramSchema,
    presentation: { label: 'Create program' },
    execute: adapter.createProgram,
    invalidate: ({ output }) => programInvalidations(output.id),
  });
  const updateProgram = defineAction<EventStudioUpdateProgramInput, EventStudioProgram>({
    id: 'event-studio.programs.update',
    inputSchema: updateProgramSchema,
    presentation: { label: 'Save program' },
    execute: adapter.updateProgram,
    invalidate: ({ input }) => programInvalidations(input.programId),
  });
  const createSession = defineAction<EventStudioCreateSessionInput, EventStudioSession>({
    id: 'event-studio.sessions.create',
    inputSchema: createSessionSchema,
    presentation: { label: 'Create session' },
    execute: adapter.createSession,
    invalidate: ({ output }) => sessionInvalidations(output.id),
  });
  const createPerson = defineAction<EventStudioCreatePersonInput, EventStudioPerson>({
    id: 'event-studio.people.create',
    inputSchema: createPersonSchema,
    presentation: { label: 'Create person' },
    execute: adapter.createPerson,
    invalidate: ({ output }) => peopleInvalidations(output.id),
  });
  const updatePerson = defineAction<EventStudioUpdatePersonInput, EventStudioPerson>({
    id: 'event-studio.people.update',
    inputSchema: updatePersonSchema,
    presentation: { label: 'Save person' },
    execute: adapter.updatePerson,
    invalidate: ({ input }) => peopleInvalidations(input.personId),
  });
  const createVenue = defineAction<EventStudioCreateVenueInput, EventStudioVenue>({
    id: 'event-studio.venues.create',
    inputSchema: createVenueSchema,
    presentation: { label: 'Create venue' },
    execute: adapter.createVenue,
    invalidate: ({ output }) => venueInvalidations(output.id),
  });
  const updateVenue = defineAction<EventStudioUpdateVenueInput, EventStudioVenue>({
    id: 'event-studio.venues.update',
    inputSchema: updateVenueSchema,
    presentation: { label: 'Save venue' },
    execute: adapter.updateVenue,
    invalidate: ({ input }) => venueInvalidations(input.venueId),
  });

  const moveSession = defineAction<EventStudioMoveSessionInput, EventStudioSession, readonly EventStudioSession[] | undefined>({
    id: 'event-studio.sessions.move',
    inputSchema: moveSessionSchema,
    presentation: {
      label: 'Move session',
      description: 'Change the semantic session status.',
    },
    execute: adapter.moveSession,
    invalidate: ({ input }) => sessionInvalidations(input.sessionId),
    optimistic: {
      apply({ input, queryClient, scope }) {
        const queryKey = createAppQueryKey(scope, EVENT_STUDIO_QUERY_IDS.board, input.boardInput);
        const previous = queryClient.getQueryData<readonly EventStudioSession[]>(queryKey);
        queryClient.setQueryData<readonly EventStudioSession[]>(queryKey, (current) =>
          current?.map((session) =>
            session.id === input.sessionId ? { ...session, status: input.status } : session,
          ),
        );
        return previous;
      },
      rollback({ input, optimisticContext, queryClient, scope }) {
        queryClient.setQueryData(
          createAppQueryKey(scope, EVENT_STUDIO_QUERY_IDS.board, input.boardInput),
          optimisticContext,
        );
      },
    },
  });

  const updateSession = defineAction<EventStudioUpdateSessionInput, EventStudioSession>({
    id: 'event-studio.sessions.update',
    inputSchema: updateSessionSchema,
    presentation: { label: 'Save session' },
    execute: adapter.updateSession,
    invalidate: ({ input }) => sessionInvalidations(input.sessionId),
  });
  const publishSession = defineAction<EventStudioSessionActionInput, EventStudioSession>({
    id: 'event-studio.sessions.publish',
    inputSchema: sessionIdSchema,
    presentation: {
      label: 'Publish',
      confirmation: {
        title: 'Publish this session?',
        description: 'The session will become visible wherever published sessions are presented.',
        confirmLabel: 'Publish session',
      },
    },
    execute: adapter.publishSession,
    invalidate: ({ input }) => sessionInvalidations(input.sessionId),
  });
  const scheduleSession = defineAction<EventStudioScheduleSessionInput, EventStudioSession>({
    id: 'event-studio.sessions.schedule',
    inputSchema: scheduleSessionSchema,
    presentation: { label: 'Schedule' },
    execute: adapter.scheduleSession,
    invalidate: ({ input }) => sessionInvalidations(input.sessionId),
  });
  const cancelSession = defineAction<EventStudioSessionActionInput, EventStudioSession>({
    id: 'event-studio.sessions.cancel',
    inputSchema: sessionIdSchema,
    presentation: {
      label: 'Cancel session',
      confirmation: {
        title: 'Cancel this session?',
        description: 'The session remains in the record history but leaves active schedules.',
        confirmLabel: 'Cancel session',
        destructive: true,
      },
    },
    execute: adapter.cancelSession,
    invalidate: ({ input }) => sessionInvalidations(input.sessionId),
  });
  const linkPerson = defineAction<EventStudioSessionPersonInput, EventStudioSessionPerson>({
    id: 'event-studio.session-people.link',
    inputSchema: sessionPersonSchema,
    presentation: { label: 'Link person' },
    execute: adapter.linkPerson,
    invalidate: ({ input }) => [
      { queryId: EVENT_STUDIO_QUERY_IDS.sessionPeople, input: input.sessionId, exact: true },
      { queryId: EVENT_STUDIO_QUERY_IDS.sessionPersonLinks, input: input.sessionId, exact: true },
      { queryId: EVENT_STUDIO_QUERY_IDS.sessionPersonLinksCollection },
    ],
  });
  const unlinkPerson = defineAction<EventStudioSessionPersonInput, EventStudioSessionPerson>({
    id: 'event-studio.session-people.unlink',
    inputSchema: sessionPersonSchema,
    presentation: {
      label: 'Unlink person',
      confirmation: {
        title: 'Unlink this person?',
        description: 'The person record remains available and can be linked again.',
        confirmLabel: 'Unlink person',
      },
    },
    execute: adapter.unlinkPerson,
    invalidate: ({ input }) => [
      { queryId: EVENT_STUDIO_QUERY_IDS.sessionPeople, input: input.sessionId, exact: true },
      { queryId: EVENT_STUDIO_QUERY_IDS.sessionPersonLinks, input: input.sessionId, exact: true },
      { queryId: EVENT_STUDIO_QUERY_IDS.sessionPersonLinksCollection },
    ],
  });

  const resources = {
    programs: defineResource({
      id: 'event-studio.programs',
      label: 'Program',
      pluralLabel: 'Programs',
      source: sources.programs,
      displayField: 'name',
      identity: { fields: ['id'], read: (record: EventStudioProgram) => record.id, serialize: String },
      fields: [
        { key: 'id', databaseName: 'id', graphQLName: 'id', label: 'ID', kind: 'string', readOnly: true },
        { key: 'organizationId', databaseName: 'org_id', graphQLName: 'orgId', label: 'Organization', kind: 'string', readOnly: true },
        { key: 'name', databaseName: 'name', graphQLName: 'name', label: 'Name', kind: 'string' },
        { key: 'description', databaseName: 'description', graphQLName: 'description', label: 'Description', kind: 'string', nullable: true },
        { key: 'status', databaseName: 'status', graphQLName: 'status', label: 'Status', kind: 'string', options: EVENT_STUDIO_STATUSES.map((value) => ({ label: value, value })) },
      ],
      forms: {
        create: { fields: [{ field: 'name', required: true }, { field: 'description' }, { field: 'status' }] },
        update: { fields: [{ field: 'name', required: true }, { field: 'description' }, { field: 'status' }] },
      },
      queries: { list: queries.programs, detail: queries.program },
      actions: { createProgram, updateProgram },
    }),
    sessions: defineResource({
      id: 'event-studio.sessions',
      label: 'Session',
      pluralLabel: 'Sessions',
      source: sources.sessions,
      displayField: 'title',
      identity: { fields: ['id'], read: (record: EventStudioSession) => record.id, serialize: String },
      fields: [
        { key: 'id', databaseName: 'id', graphQLName: 'id', label: 'ID', kind: 'string', readOnly: true },
        { key: 'organizationId', databaseName: 'org_id', graphQLName: 'orgId', label: 'Organization', kind: 'string', readOnly: true },
        { key: 'programId', databaseName: 'program_id', graphQLName: 'programId', label: 'Program', description: 'Search the server for an existing program.', kind: 'string' },
        { key: 'venueId', databaseName: 'venue_id', graphQLName: 'venueId', label: 'Venue', kind: 'string', nullable: true },
        { key: 'title', databaseName: 'title', graphQLName: 'title', label: 'Title', kind: 'string' },
        { key: 'description', databaseName: 'description', graphQLName: 'description', label: 'Description', kind: 'string', nullable: true },
        { key: 'status', databaseName: 'status', graphQLName: 'status', label: 'Status', kind: 'string', options: EVENT_STUDIO_STATUSES.map((value) => ({ label: value, value })), readOnly: true },
        { key: 'startsAt', databaseName: 'starts_at', graphQLName: 'startsAt', label: 'Starts at', kind: 'datetime', nullable: true },
        { key: 'endsAt', databaseName: 'ends_at', graphQLName: 'endsAt', label: 'Ends at', kind: 'datetime', nullable: true },
        { key: 'capacity', databaseName: 'capacity', graphQLName: 'capacity', label: 'Capacity', kind: 'integer', nullable: true },
        { key: 'tags', databaseName: 'tags', graphQLName: 'tags', label: 'Tags', kind: 'string-array' },
      ],
      relations: [
        { id: 'program', label: 'Program', fieldName: 'program', graphQLName: 'program', targetTableName: 'programs', targetGraphQLTypeName: 'Program', targetResourceId: 'event-studio.programs', cardinality: 'one' },
        { id: 'venue', label: 'Venue', fieldName: 'venue', graphQLName: 'venue', targetTableName: 'venues', targetGraphQLTypeName: 'Venue', targetResourceId: 'event-studio.venues', cardinality: 'one' },
        { id: 'people', label: 'People', fieldName: 'sessionPeople', graphQLName: 'sessionPeople', targetTableName: 'session_people', targetGraphQLTypeName: 'SessionPerson', targetResourceId: 'event-studio.people', cardinality: 'many', linkActionId: 'event-studio.session-people.link', unlinkActionId: 'event-studio.session-people.unlink' },
      ],
      forms: {
        create: {
          fields: [
            { field: 'title', required: true },
            { field: 'description' },
            { field: 'programId', required: true },
            { field: 'venueId' },
            { field: 'startsAt' },
            { field: 'endsAt' },
            { field: 'capacity' },
            { field: 'tags', required: false },
          ],
        },
        update: {
          fields: [
            { field: 'title', required: true },
            { field: 'description' },
            { field: 'programId', required: true },
            { field: 'venueId' },
            { field: 'startsAt' },
            { field: 'endsAt' },
            { field: 'capacity' },
            { field: 'tags', required: false },
          ],
        },
      },
      queries: { list: queries.sessions, detail: queries.session },
      actions: { createSession, updateSession, moveSession, publishSession, scheduleSession, cancelSession },
    }),
    people: defineResource({
      id: 'event-studio.people',
      label: 'Person',
      pluralLabel: 'People',
      source: sources.people,
      displayField: 'displayName',
      identity: { fields: ['id'], read: (record: EventStudioPerson) => record.id, serialize: String },
      fields: [
        { key: 'id', databaseName: 'id', graphQLName: 'id', label: 'ID', kind: 'string', readOnly: true },
        { key: 'organizationId', databaseName: 'org_id', graphQLName: 'orgId', label: 'Organization', kind: 'string', readOnly: true },
        { key: 'displayName', databaseName: 'display_name', graphQLName: 'displayName', label: 'Name', kind: 'string' },
        { key: 'email', databaseName: 'email', graphQLName: 'email', label: 'Email', kind: 'string', nullable: true },
        { key: 'role', databaseName: 'role', graphQLName: 'role', label: 'Role', kind: 'string', nullable: true },
      ],
      forms: {
        create: { fields: [{ field: 'displayName', required: true }, { field: 'email' }, { field: 'role' }] },
        update: { fields: [{ field: 'displayName', required: true }, { field: 'email' }, { field: 'role' }] },
      },
      queries: { list: queries.people, detail: queries.person },
      actions: { createPerson, updatePerson },
    }),
    venues: defineResource({
      id: 'event-studio.venues',
      label: 'Venue',
      pluralLabel: 'Venues',
      source: sources.venues,
      displayField: 'name',
      identity: { fields: ['id'], read: (record: EventStudioVenue) => record.id, serialize: String },
      fields: [
        { key: 'id', databaseName: 'id', graphQLName: 'id', label: 'ID', kind: 'string', readOnly: true },
        { key: 'organizationId', databaseName: 'org_id', graphQLName: 'orgId', label: 'Organization', kind: 'string', readOnly: true },
        { key: 'name', databaseName: 'name', graphQLName: 'name', label: 'Name', kind: 'string' },
        { key: 'address', databaseName: 'address', graphQLName: 'address', label: 'Address', kind: 'string', nullable: true },
        { key: 'timeZone', databaseName: 'time_zone', graphQLName: 'timeZone', label: 'Time zone', kind: 'string' },
        { key: 'capacity', databaseName: 'capacity', graphQLName: 'capacity', label: 'Capacity', kind: 'integer', nullable: true },
      ],
      forms: {
        create: { fields: [{ field: 'name', required: true }, { field: 'address' }, { field: 'timeZone', required: true }, { field: 'capacity' }] },
        update: { fields: [{ field: 'name', required: true }, { field: 'address' }, { field: 'timeZone', required: true }, { field: 'capacity' }] },
      },
      queries: { list: queries.venues, detail: queries.venue },
      actions: { createVenue, updateVenue },
    }),
    sessionPeople: defineResource({
      id: 'event-studio.session-people',
      label: 'Session person',
      pluralLabel: 'Session people',
      source: sources.sessionPeople,
      displayField: 'personId',
      identity: {
        fields: ['id'],
        read: (record: EventStudioSessionPerson) => record.id,
        serialize: String,
      },
      fields: [
        { key: 'id', databaseName: 'id', graphQLName: 'id', label: 'ID', kind: 'string', readOnly: true },
        { key: 'sessionId', databaseName: 'session_id', graphQLName: 'sessionId', label: 'Session', kind: 'string', readOnly: true },
        { key: 'personId', databaseName: 'person_id', graphQLName: 'personId', label: 'Person', kind: 'string', readOnly: true },
        { key: 'organizationId', databaseName: 'org_id', graphQLName: 'orgId', label: 'Organization', kind: 'string', readOnly: true },
        { key: 'role', databaseName: 'role', graphQLName: 'role', label: 'Role', kind: 'string', nullable: true },
      ],
      queries: {
        list: defineQuery({
          id: EVENT_STUDIO_QUERY_IDS.sessionPersonLinksCollection,
          execute: async ({ input, ...context }: AppExecutionContext<AppCollectionQueryInput>) => {
            const sessionId = input.filters.find((filter) => filter.id === 'sessionId')?.value;
            if (!sessionId) return { items: [], pageInfo: { page: 1, pageSize: input.pageSize, hasNextPage: false, hasPreviousPage: false, totalCount: 0 } };
            const result = await adapter.listSessionPersonLinks({ ...context, input: sessionId });
            if (result && typeof result === 'object' && 'ok' in result) {
              if (!result.ok) return result;
              return { items: [...result.data], pageInfo: { page: 1, pageSize: input.pageSize, hasNextPage: false, hasPreviousPage: false, totalCount: result.data.length } };
            }
            return { items: [...result], pageInfo: { page: 1, pageSize: input.pageSize, hasNextPage: false, hasPreviousPage: false, totalCount: result.length } };
          },
        }),
      },
      actions: { linkPerson, unlinkPerson },
    }),
  } as const;

  return Object.freeze({
    actions: Object.freeze({
      createProgram,
      updateProgram,
      createSession,
      moveSession,
      updateSession,
      createPerson,
      updatePerson,
      createVenue,
      updateVenue,
      publishSession,
      scheduleSession,
      cancelSession,
      linkPerson,
      unlinkPerson,
    }),
    queries: Object.freeze(queries),
    resources: Object.freeze(resources),
  });
}

export type EventStudioDefinitions = ReturnType<typeof createEventStudioDefinitions>;

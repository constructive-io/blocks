'use client';

import * as React from 'react';
import { CalendarDaysIcon, LayoutDashboardIcon, Rows3Icon, TablePropertiesIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogTitle,
  DialogTrigger,
} from '@constructive-io/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@constructive-io/ui/tabs';

import { useAppAction, useAppQuery } from '../core/runtime';
import {
  AppCollectionToolbar,
  AppRecordDetail,
  ConnectedAppDataTable,
  ConnectedAppRecordForm,
  ConnectedAppRelationPanel,
  ConnectedAppRelationPicker,
  type AppCollectionState,
  type AppDataState,
  type AppFieldInputRenderer,
  type AppRelationOption,
} from '../data';
import { ConnectedAppBoard, type AppBoardColumn } from '../board';
import { ConnectedAppCalendar } from '../calendar';
import {
  ConnectedAppDashboard,
  type AppDashboardLayout,
  type ConnectedAppDashboardWidget,
} from '../dashboard';
import { AppActionButton, type AppActionItem as WorkflowActionItem } from '../workflow';
import {
  EVENT_STUDIO_STATUSES,
  type EventStudioAnalyticsInput,
  type EventStudioBoardInput,
  type EventStudioCollectionKind,
  type EventStudioDefinitions,
  type EventStudioPerson,
  type EventStudioProgram,
  type EventStudioSession,
  type EventStudioStatus,
  type EventStudioVenue,
} from './definitions';
import type { EventStudioView, EventStudioViewState } from './state';

export type { EventStudioView, EventStudioViewState } from './state';

export type EventStudioOpenRecord =
  | Readonly<{ kind: 'sessions'; record: EventStudioSession }>
  | Readonly<{ kind: 'programs'; record: EventStudioProgram }>
  | Readonly<{ kind: 'people'; record: EventStudioPerson }>
  | Readonly<{ kind: 'venues'; record: EventStudioVenue }>;

export interface EventStudioProps {
  definitions: EventStudioDefinitions;
  state: EventStudioViewState;
  onStateChange: (state: EventStudioViewState) => void;
  dashboardLayout: AppDashboardLayout;
  onDashboardLayoutChange: (layout: AppDashboardLayout) => void;
  analyticsInput: EventStudioAnalyticsInput;
  boardInput?: EventStudioBoardInput;
  locale?: string;
  timeZone: string;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  onOpenRecord?: (selection: EventStudioOpenRecord) => void;
  title?: string;
  description?: string;
  className?: string;
}

const BOARD_COLUMNS: readonly AppBoardColumn<EventStudioStatus>[] = EVENT_STUDIO_STATUSES.map((status) => ({
  id: status,
  title: status[0]!.toLocaleUpperCase() + status.slice(1),
}));

const SESSION_COLUMNS = [
  { id: 'title', label: 'Session', field: 'title' },
  { id: 'status', label: 'Status', field: 'status' },
  { id: 'startsAt', label: 'Starts at', field: 'startsAt' },
  { id: 'capacity', label: 'Capacity', field: 'capacity', align: 'end' },
] as const;

const PROGRAM_COLUMNS = [
  { id: 'name', label: 'Program', field: 'name' },
  { id: 'status', label: 'Status', field: 'status' },
  { id: 'description', label: 'Description', field: 'description' },
] as const;

const PEOPLE_COLUMNS = [
  { id: 'displayName', label: 'Person', field: 'displayName' },
  { id: 'email', label: 'Email', field: 'email' },
  { id: 'role', label: 'Role', field: 'role' },
] as const;

const VENUE_COLUMNS = [
  { id: 'name', label: 'Venue', field: 'name' },
  { id: 'timeZone', label: 'Time zone', field: 'timeZone' },
  { id: 'capacity', label: 'Capacity', field: 'capacity', align: 'end' },
] as const;

function sessionState(result: ReturnType<typeof useAppQuery<string, EventStudioSession | null>>): AppDataState<EventStudioSession> {
  if (result.isPending) return { status: 'loading' };
  if (result.error) {
    return result.error.appError.kind === 'authorization' || result.error.appError.kind === 'authentication'
      ? { status: 'denied', error: result.error.appError }
      : { status: 'error', error: result.error.appError };
  }
  return result.data ? { status: 'ready', data: result.data, refreshing: result.isFetching } : { status: 'empty' };
}

function SessionInspector({
  definitions,
  sessionId,
  timeZone,
}: {
  definitions: EventStudioDefinitions;
  sessionId: string;
  timeZone: string;
}) {
  const result = useAppQuery(definitions.queries.session, sessionId);
  const publish = useAppAction(definitions.actions.publishSession);
  const schedule = useAppAction(definitions.actions.scheduleSession);
  const cancel = useAppAction(definitions.actions.cancelSession);
  const linkPerson = useAppAction(definitions.actions.linkPerson);
  const unlinkPerson = useAppAction(definitions.actions.unlinkPerson);
  const [personSearch, setPersonSearch] = React.useState('');
  const [selectedPerson, setSelectedPerson] = React.useState<AppRelationOption<EventStudioPerson> | null>(null);
  const [relationError, setRelationError] = React.useState<string | null>(null);
  const record = result.data ?? undefined;
  const sessionInputRenderers = useSessionInputRenderers(definitions);

  const actionItem = React.useCallback(<TOutput,>(
    id: string,
    label: string,
    confirmation: WorkflowActionItem['confirmation'],
    execute: () => Promise<Readonly<{ ok: true; data: TOutput }> | Readonly<{ ok: false; error: { message: string } }>>,
    disabledReason?: string,
  ): WorkflowActionItem => ({
    id,
    label,
    confirmation,
    disabledReason,
    execute: async () => {
      const actionResult = await execute();
      return actionResult.ok ? { ok: true } : { ok: false, error: actionResult.error.message };
    },
  }), []);

  const actions = record ? [
    actionItem(
      'publish-session',
      'Publish',
      definitions.actions.publishSession.presentation?.confirmation,
      () => publish.execute({ sessionId: record.id }),
      record.status === 'published' ? 'This session is already published.' : undefined,
    ),
    actionItem(
      'schedule-session',
      'Schedule',
      undefined,
      () => schedule.execute({
        sessionId: record.id,
        startsAt: record.startsAt!,
        endsAt: record.endsAt!,
        timeZone,
      }),
      !record.startsAt || !record.endsAt ? 'Add a start and end time before scheduling.' : undefined,
    ),
    actionItem(
      'cancel-session',
      'Cancel session',
      definitions.actions.cancelSession.presentation?.confirmation,
      () => cancel.execute({ sessionId: record.id }),
      record.status === 'cancelled' ? 'This session is already cancelled.' : undefined,
    ),
  ] : [];

  return (
    <aside aria-label="Selected session" className="grid gap-4 xl:grid-cols-2">
      <AppRecordDetail
        actions={
          actions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => <AppActionButton action={action} key={action.id} size="sm" variant="outline" />)}
            </div>
          ) : undefined
        }
        resource={definitions.resources.sessions}
        state={sessionState(result)}
      />

      {record ? (
        <ConnectedAppRecordForm
          action={definitions.actions.updateSession}
          initialValues={record}
          inputRenderers={sessionInputRenderers}
          mode="update"
          resource={definitions.resources.sessions}
          resetKey={record.id}
          submitLabel="Save session"
          toInput={(values) => ({
            sessionId: record.id,
            title: values.title,
            description: values.description,
            programId: values.programId,
            venueId: values.venueId,
            startsAt: values.startsAt,
            endsAt: values.endsAt,
            capacity: values.capacity,
            tags: values.tags,
          })}
        />
      ) : null}

      <div className="xl:col-span-2">
        {relationError ? (
          <Alert className="mb-3" variant="destructive">
            <AlertTitle>People were not updated</AlertTitle>
            <AlertDescription>{relationError}</AlertDescription>
          </Alert>
        ) : null}
        <ConnectedAppRelationPanel
          enabled={Boolean(record)}
          getRecordKey={(person) => person.id}
          input={sessionId}
          picker={
            <div className="flex flex-col gap-3">
              <ConnectedAppRelationPicker
                disabled={!record}
                label="Add an existing person"
                onSearchChange={setPersonSearch}
                onValueChange={setSelectedPerson}
                query={definitions.queries.peopleSearch}
                search={personSearch}
                value={selectedPerson}
              />
              <Button
                disabled={!selectedPerson || linkPerson.mutation.isPending}
                onClick={async () => {
                  if (!selectedPerson) return;
                  setRelationError(null);
                  const linkResult = await linkPerson.execute({
                    sessionId,
                    personId: selectedPerson.record.id,
                  });
                  if (linkResult.ok) setSelectedPerson(null);
                  else setRelationError(linkResult.error.message);
                }}
                size="sm"
              >
                {linkPerson.mutation.isPending ? 'Linking…' : 'Link person'}
              </Button>
            </div>
          }
          query={definitions.queries.sessionPeople}
          renderRecord={(person) => (
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{person.displayName}</span>
                <span className="truncate text-xs text-muted-foreground">{person.role ?? person.email ?? 'Linked person'}</span>
              </span>
              <AppActionButton
                action={actionItem(
                  `unlink-${person.id}`,
                  `Unlink ${person.displayName}`,
                  definitions.actions.unlinkPerson.presentation?.confirmation,
                  () => unlinkPerson.execute({ sessionId, personId: person.id }),
                )}
                size="sm"
                variant="ghost"
              />
            </div>
          )}
          title="Session people"
        />
      </div>
    </aside>
  );
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function ProgramRelationPickerInput({
  ariaDescribedBy,
  definitions,
  disabled,
  inputId,
  invalid,
  onChange,
  required,
  value,
}: Readonly<{
  ariaDescribedBy?: string;
  definitions: EventStudioDefinitions;
  disabled: boolean;
  inputId: string;
  invalid: boolean;
  onChange: (value: unknown) => void;
  required: boolean;
  value: unknown;
}>) {
  const [search, setSearch] = React.useState('');
  const [selection, setSelection] = React.useState<AppRelationOption<EventStudioProgram> | null>(null);
  const programId = typeof value === 'string' && value.length > 0 ? value : null;
  const program = useAppQuery(definitions.queries.program, programId ?? '', {
    enabled: Boolean(programId),
  });

  React.useEffect(() => {
    setSelection((current) => {
      if (!programId) return null;
      if (current?.value === programId) return current;
      if (program.data?.id !== programId) return null;
      return {
        description: program.data.status,
        label: program.data.name,
        record: program.data,
        value: program.data.id,
      };
    });
  }, [program.data, programId]);

  return (
    <ConnectedAppRelationPicker
      ariaDescribedBy={ariaDescribedBy}
      disabled={disabled}
      embedded
      inputId={inputId}
      invalid={invalid}
      label="Choose a program"
      onSearchChange={setSearch}
      onValueChange={(option) => {
        setSelection(option);
        onChange(option?.record.id ?? '');
      }}
      query={definitions.queries.programSearch}
      required={required}
      search={search}
      value={selection}
    />
  );
}

function useSessionInputRenderers(definitions: EventStudioDefinitions) {
  return React.useMemo<Readonly<{
    programId: AppFieldInputRenderer<EventStudioSession>;
  }>>(() => ({
    programId: {
      render: ({
        'aria-describedby': ariaDescribedBy,
        disabled,
        id,
        invalid,
        onChange,
        required,
        value,
      }) => (
        <ProgramRelationPickerInput
          ariaDescribedBy={ariaDescribedBy}
          definitions={definitions}
          disabled={disabled}
          inputId={id}
          invalid={invalid}
          onChange={onChange}
          required={required}
          value={value}
        />
      ),
    },
  }), [definitions]);
}

function EventStudioCreateDialog({
  definitions,
  kind,
  timeZone,
}: Readonly<{
  definitions: EventStudioDefinitions;
  kind: EventStudioCollectionKind;
  timeZone: string;
}>) {
  const [open, setOpen] = React.useState(false);
  const singular = kind === 'people' ? 'person' : kind.slice(0, -1);
  const sessionInputRenderers = useSessionInputRenderers(definitions);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button size="sm" />}>
        Create {singular}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create {singular}</DialogTitle>
          <DialogDescription>
            Add a {singular} to this organization. Permission denials stay visible here.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          {kind === 'sessions' ? (
            <ConnectedAppRecordForm
              action={definitions.actions.createSession}
              initialValues={{
                title: '',
                description: null,
                programId: '',
                venueId: null,
                startsAt: null,
                endsAt: null,
                capacity: null,
                tags: [],
              }}
              inputRenderers={sessionInputRenderers}
              mode="create"
              onCompleted={() => setOpen(false)}
              resource={definitions.resources.sessions}
              submitLabel="Create session"
              toInput={(values) => ({
                title: values.title ?? '',
                description: nullableText(values.description),
                programId: values.programId ?? '',
                venueId: nullableText(values.venueId),
                startsAt: nullableText(values.startsAt),
                endsAt: nullableText(values.endsAt),
                capacity: values.capacity ?? null,
                tags: values.tags ?? [],
              })}
            />
          ) : null}
          {kind === 'programs' ? (
            <ConnectedAppRecordForm
              action={definitions.actions.createProgram}
              initialValues={{ name: '', description: null, status: 'draft' }}
              mode="create"
              onCompleted={() => setOpen(false)}
              resource={definitions.resources.programs}
              submitLabel="Create program"
              toInput={(values) => ({
                name: values.name ?? '',
                description: nullableText(values.description),
                status: values.status ?? 'draft',
              })}
            />
          ) : null}
          {kind === 'people' ? (
            <ConnectedAppRecordForm
              action={definitions.actions.createPerson}
              initialValues={{ displayName: '', email: null, role: null }}
              mode="create"
              onCompleted={() => setOpen(false)}
              resource={definitions.resources.people}
              submitLabel="Create person"
              toInput={(values) => ({
                displayName: values.displayName ?? '',
                email: nullableText(values.email),
                role: nullableText(values.role),
              })}
            />
          ) : null}
          {kind === 'venues' ? (
            <ConnectedAppRecordForm
              action={definitions.actions.createVenue}
              initialValues={{ name: '', address: null, timeZone, capacity: null }}
              mode="create"
              onCompleted={() => setOpen(false)}
              resource={definitions.resources.venues}
              submitLabel="Create venue"
              toInput={(values) => ({
                name: values.name ?? '',
                address: nullableText(values.address),
                timeZone: values.timeZone ?? timeZone,
                capacity: values.capacity ?? null,
              })}
            />
          ) : null}
        </DialogPanel>
      </DialogContent>
    </Dialog>
  );
}

function EventStudioCollections({
  definitions,
  state,
  onStateChange,
  onOpenRecord,
  timeZone,
}: Pick<EventStudioProps, 'definitions' | 'state' | 'onStateChange' | 'onOpenRecord' | 'timeZone'>) {
  const updateCollectionState = (collectionState: AppCollectionState) => onStateChange({ ...state, collectionState });
  const toolbar = (
    <AppCollectionToolbar
      filters={state.collection === 'sessions' ? [{
        id: 'status',
        label: 'Status',
        options: EVENT_STUDIO_STATUSES.map((value) => ({ label: value, value })),
      }] : undefined}
      onStateChange={updateCollectionState}
      searchLabel={`Search ${state.collection}`}
      state={state.collectionState}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          onValueChange={(collection) => onStateChange({ ...state, collection: collection as EventStudioCollectionKind })}
          value={state.collection}
        >
          <TabsList aria-label="Event Studio collection">
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="programs">Programs</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="venues">Venues</TabsTrigger>
          </TabsList>
        </Tabs>
        <EventStudioCreateDialog definitions={definitions} kind={state.collection} timeZone={timeZone} />
      </div>

      {state.collection === 'sessions' ? (
        <ConnectedAppDataTable
          columns={SESSION_COLUMNS}
          getRowKey={(session) => session.id}
          onOpenRecord={(record) => {
            onStateChange({ ...state, selectedSessionId: record.id });
            onOpenRecord?.({ kind: 'sessions', record });
          }}
          query={definitions.queries.sessions}
          queryInput={state.collectionState}
          resource={definitions.resources.sessions}
          toolbar={toolbar}
        />
      ) : null}
      {state.collection === 'programs' ? (
        <ConnectedAppDataTable
          columns={PROGRAM_COLUMNS}
          getRowKey={(record) => record.id}
          onOpenRecord={(record) => onOpenRecord?.({ kind: 'programs', record })}
          query={definitions.queries.programs}
          queryInput={state.collectionState}
          resource={definitions.resources.programs}
          toolbar={toolbar}
        />
      ) : null}
      {state.collection === 'people' ? (
        <ConnectedAppDataTable
          columns={PEOPLE_COLUMNS}
          getRowKey={(record) => record.id}
          onOpenRecord={(record) => onOpenRecord?.({ kind: 'people', record })}
          query={definitions.queries.people}
          queryInput={state.collectionState}
          resource={definitions.resources.people}
          toolbar={toolbar}
        />
      ) : null}
      {state.collection === 'venues' ? (
        <ConnectedAppDataTable
          columns={VENUE_COLUMNS}
          getRowKey={(record) => record.id}
          onOpenRecord={(record) => onOpenRecord?.({ kind: 'venues', record })}
          query={definitions.queries.venues}
          queryInput={state.collectionState}
          resource={definitions.resources.venues}
          toolbar={toolbar}
        />
      ) : null}

      {state.selectedSessionId ? (
        <SessionInspector definitions={definitions} sessionId={state.selectedSessionId} timeZone={timeZone} />
      ) : null}
    </div>
  );
}

export function EventStudio({
  definitions,
  state,
  onStateChange,
  dashboardLayout,
  onDashboardLayoutChange,
  analyticsInput,
  boardInput = {},
  locale = 'en-US',
  timeZone,
  weekStartsOn,
  onOpenRecord,
  title = 'Event Studio',
  description = 'Plan, schedule, publish, and staff an organization’s programs and sessions.',
  className,
}: EventStudioProps) {
  const dashboardWidgets: readonly ConnectedAppDashboardWidget<EventStudioAnalyticsInput>[] = React.useMemo(() => [
    { id: 'session-count', kind: 'kpi', title: 'Sessions', description: 'Explicit count query', query: definitions.queries.sessionCount, input: analyticsInput, defaultSize: 'third' },
    { id: 'published-count', kind: 'kpi', title: 'Published', description: 'Explicit published count', query: definitions.queries.publishedCount, input: analyticsInput, defaultSize: 'third' },
    {
      id: 'sessions-by-status',
      kind: 'bar',
      title: 'Sessions by status',
      query: definitions.queries.sessionsByStatus,
      input: analyticsInput,
      defaultSize: 'half',
      xKey: 'status',
      series: [{ key: 'count', label: 'Sessions', color: 'chart-1' }],
    },
    {
      id: 'sessions-over-time',
      kind: 'line',
      title: 'Sessions over time',
      query: definitions.queries.sessionsOverTime,
      input: analyticsInput,
      defaultSize: 'half',
      xKey: 'date',
      series: [{ key: 'count', label: 'Sessions', color: 'chart-2' }],
    },
  ], [analyticsInput, definitions]);

  return (
    <main className={className} data-app-kit-starter="event-studio">
      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-balance text-2xl font-semibold">{title}</h1>
            <Badge variant="secondary">App Kit</Badge>
          </div>
          <p className="mt-1 max-w-3xl text-pretty text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">{timeZone}</span>
      </header>

      <Tabs
        onValueChange={(view) => onStateChange({ ...state, view: view as EventStudioView })}
        value={state.view}
      >
        <TabsList aria-label="Event Studio view" className="mb-5 max-w-full overflow-x-auto">
          <TabsTrigger value="dashboard"><LayoutDashboardIcon />Dashboard</TabsTrigger>
          <TabsTrigger value="collections"><TablePropertiesIcon />Collections</TabsTrigger>
          <TabsTrigger value="board"><Rows3Icon />Board</TabsTrigger>
          <TabsTrigger value="calendar"><CalendarDaysIcon />Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <ConnectedAppDashboard
            layout={dashboardLayout}
            onLayoutChange={onDashboardLayoutChange}
            widgets={dashboardWidgets}
          />
        </TabsContent>
        <TabsContent value="collections">
          <EventStudioCollections
            definitions={definitions}
            onOpenRecord={onOpenRecord}
            onStateChange={onStateChange}
            state={state}
            timeZone={timeZone}
          />
        </TabsContent>
        <TabsContent value="board">
          <ConnectedAppBoard
            columns={BOARD_COLUMNS}
            getColumnId={(session) => session.status}
            getRecordId={(session) => session.id}
            getRecordLabel={(session) => session.title}
            moveAction={{
              definition: definitions.actions.moveSession,
              input: (move) => ({ sessionId: move.record.id, status: move.toColumnId, boardInput }),
            }}
            onOpenRecord={(record) => {
              onStateChange({ ...state, selectedSessionId: record.id, view: 'collections', collection: 'sessions' });
              onOpenRecord?.({ kind: 'sessions', record });
            }}
            query={definitions.queries.board}
            queryInput={boardInput}
            renderCard={(session) => (
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span>{session.startsAt ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(session.startsAt)) : 'Not scheduled'}</span>
                <span>{session.capacity == null ? 'No capacity set' : `${session.capacity} capacity`}</span>
              </div>
            )}
          />
        </TabsContent>
        <TabsContent value="calendar">
          <ConnectedAppCalendar
            locale={locale}
            month={state.calendarMonth}
            onMonthChange={(calendarMonth) => onStateChange({ ...state, calendarMonth })}
            onOpenRecord={(record) => {
              onStateChange({ ...state, selectedSessionId: record.id, view: 'collections', collection: 'sessions' });
              onOpenRecord?.({ kind: 'sessions', record });
            }}
            onViewChange={(calendarView) => onStateChange({ ...state, calendarView })}
            query={definitions.queries.calendar}
            timeZone={timeZone}
            view={state.calendarView}
            weekStartsOn={weekStartsOn}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}

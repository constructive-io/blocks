import type { Metadata } from 'next';

import { Badge } from '@constructive-io/ui/badge';

import { ApplicationDocPagination } from '@/components/docs/application-doc-pagination';
import { CodeBlock } from '@/components/docs/code-block';
import { APP_KIT_CATALOG } from '@/lib/app-kit-catalog';
import { registryAdd } from '@/lib/install-mode';
import { OG_IMAGE, withBase } from '@/lib/site';

const TITLE = 'Constructive App Kit';
const DESCRIPTION =
  'A source-installed application-composition layer for building arbitrary Constructive-native apps from typed resources, queries, actions, and domain-neutral views.';

const ROOT_INSTALLS = APP_KIT_CATALOG
  .filter(({ name }) => name !== 'app-kit-event-studio')
  .map(({ name }) => registryAdd(name))
  .join('\n');

const CORE_ENTRYPOINTS = `// Server-safe definitions and build-time validation
import {
  defineAction,
  defineQuery,
  defineResource,
  validateAppResource,
  type AppScope,
} from '@/blocks/app-kit/core'

// Client-only TanStack Query runtime
import {
  AppKitProvider,
  useAppAction,
  useAppQuery,
} from '@/blocks/app-kit/core/runtime'`;

const SCOPE_EXAMPLE = `const scope: AppScope = {
  endpointId: 'data',
  databaseId,
  sessionPartition: authenticatedSession.id,
  organizationId,
  schemaRevision,
  securityRevision,
}

// Tokens, cookies, headers, and CSRF values stay in the injected transport.
// They never belong in AppScope, definitions, URLs, stores, or query keys.
// Query keys retain an opaque deterministic input fingerprint, not raw input.`;

const CORE_SIGNATURES = `type AppScope = Readonly<{
  endpointId: string
  databaseId: string
  sessionPartition: string
  organizationId?: string | null
  tenantId?: string | null
  schemaRevision: string
  securityRevision: string
}>

defineQuery<TInput, TOutput>(
  definition: AppQueryDefinition<TInput, TOutput>
): AppQueryDefinition<TInput, TOutput>

defineAction<TInput, TOutput, TOptimistic = unknown, TContext = unknown>(
  definition: AppActionDefinition<TInput, TOutput, TOptimistic, TContext>
): AppActionDefinition<TInput, TOutput, TOptimistic, TContext>

defineResource<TRecord, TIdentity, TListInput, TListOutput, TActions>(
  definition: AppResourceDefinition<TRecord, TIdentity, TListInput, TListOutput, TActions>
): AppResourceDefinition<TRecord, TIdentity, TListInput, TListOutput, TActions>

validateAppResource(resource, { meta, introspection }): AppResourceValidationResult

AppKitProvider({ scope, queryClient, children })
useAppQuery(definition, input, { enabled?, staleTime? }): UseQueryResult
useAppAction(definition, options?): {
  execute(input): Promise<AppResult<TOutput>>
  cancel()
  reset()
  evaluatePresentation(input, context?)
  visible
  disabledReason
  confirmation
  mutation
}`;

const EXECUTION_CONTRACT = `type AppExecutionContext<TInput> = Readonly<{
  input: TInput       // plain, credential-free input
  scope: AppScope     // cache and authorization partition identity
  signal: AbortSignal // forward this to fetch or the transport
}>

type AppErrorKind =
  | 'authentication' | 'authorization' | 'cancelled' | 'conflict'
  | 'graphql' | 'network' | 'not-found' | 'validation' | 'unknown'

type AppError = Readonly<{
  message: string
  kind: AppErrorKind
  code?: string
  retryable?: boolean
  fieldErrors?: readonly Readonly<{ field: string; message: string }>[]
  details?: Readonly<Record<string, unknown>>
}>

type AppResult<T> = (
  | Readonly<{ ok: true; data: T }>
  | Readonly<{ ok: false; error: AppError }>
) & Readonly<{
  __constructiveAppKitResult: {
    kind: 'constructive.app-kit/result'
    version: 1
  }
}>

type AppExecutorResult<T> = T | AppResult<T>

appSuccess<T>(data: T): AppResult<T>
appFailure(error: AppError): AppResult<never>
normalizeAppError(error: unknown, fallback?: string): AppError`;

const CORE_DEFINITIONS_EXAMPLE = `import { z } from 'zod'

import {
  defineAction,
  defineQuery,
  defineResource
} from '@/blocks/app-kit/core'
import type {
  AppCollectionPage,
  AppCollectionQueryInput
} from '@/blocks/app-kit/data'
import { taskTransport } from './task-transport'

export type Task = Readonly<{
  id: string
  title: string
  status: 'TODO' | 'DOING' | 'DONE'
}>

const list = defineQuery<AppCollectionQueryInput, AppCollectionPage<Task>>({
  id: 'tasks.list',
  execute: (context) => taskTransport.list(context),
  staleTime: 30_000
})

const complete = defineAction({
  id: 'tasks.complete',
  inputSchema: z.object({ taskId: z.string().min(1) }),
  execute: (context) => taskTransport.complete(context),
  presentation: {
    label: 'Complete task',
    confirmation: {
      title: 'Complete this task?',
      description: 'The task will move to Done.'
    }
  },
  invalidate: ({ input }) => [
    { queryId: 'tasks.list' },
    { queryId: 'tasks.detail', input: input.taskId, exact: true }
  ]
})

export const taskResource = defineResource<
  Task,
  string,
  AppCollectionQueryInput,
  AppCollectionPage<Task>,
  { complete: typeof complete }
>({
  id: 'tasks',
  label: 'Task',
  pluralLabel: 'Tasks',
  source: {
    schemaName: 'app',
    tableName: 'tasks',
    graphQLTypeName: 'Task',
    listFieldName: 'tasks',
    updateMutationName: 'updateTask'
  },
  fields: [
    { key: 'id', databaseName: 'id', graphQLName: 'id', label: 'ID', kind: 'string', readOnly: true },
    { key: 'title', databaseName: 'title', graphQLName: 'title', label: 'Title', kind: 'string' },
    {
      key: 'status',
      databaseName: 'status',
      graphQLName: 'status',
      label: 'Status',
      kind: 'enum',
      options: [
        { label: 'To do', value: 'TODO' },
        { label: 'Doing', value: 'DOING' },
        { label: 'Done', value: 'DONE' }
      ]
    }
  ],
  displayField: 'title',
  identity: { fields: ['id'], read: (task) => task.id, serialize: (id) => id },
  forms: { update: { fields: [{ field: 'title', required: true }, { field: 'status' }] } },
  queries: { list },
  actions: { complete }
})

export const taskApp = { actions: { complete }, queries: { list }, resource: taskResource }`;

const CORE_RUNTIME_EXAMPLE = `'use client'

import * as React from 'react'
import { QueryClient } from '@tanstack/react-query'

import type { AppScope } from '@/blocks/app-kit/core'
import { AppKitProvider, useAppQuery } from '@/blocks/app-kit/core/runtime'
import { DEFAULT_APP_COLLECTION_STATE } from '@/blocks/app-kit/data'
import { taskApp } from './task-app'

function TaskCount() {
  const result = useAppQuery(taskApp.queries.list, DEFAULT_APP_COLLECTION_STATE)
  if (result.isPending) return <p>Loading tasks…</p>
  if (result.error) return <p role="alert">{result.error.message}</p>
  return <p>{result.data?.pageInfo.totalCount ?? result.data?.items.length ?? 0} tasks</p>
}

export function TaskRuntime({ scope }: Readonly<{ scope: AppScope }>) {
  const [queryClient] = React.useState(() => new QueryClient())
  return (
    <AppKitProvider queryClient={queryClient} scope={scope}>
      <TaskCount />
    </AppKitProvider>
  )
}`;

const DATA_CONTRACT = `// Shared controlled collection props.
AppDataTable | AppDataList | AppDataCards
  common props: {
    resource
    state: AppDataState<AppCollectionPage<TRecord>>
    getRowKey(record)
    selectedKeys?
    onSelectionChange?
    onOpenRecord?
    toolbar?
    footer? | renderFooter(page)?
    density?
    surface?
  }

AppDataTable({ ...common, columns?: readonly AppColumn<TRecord>[] })
AppDataList({ ...common, renderRecord?: (record) => ReactNode })
AppDataCards({ ...common, renderRecord?: (record) => ReactNode })

// onSelectionChange enables selection in table, list, and cards;
// selectedKeys controls which record keys are checked.
// columns is table-only; renderRecord customizes list and card bodies.

ConnectedAppDataTable | ConnectedAppDataList | ConnectedAppDataCards
  props: Omit<controlledProps, 'state' | 'onRetry'> & {
    query: AppQueryDefinition<AppCollectionQueryInput, AppCollectionPage<TRecord>>
    queryInput: AppCollectionQueryInput
    enabled?: boolean
  }

AppRecordDetail({ resource, state, renderField?, actions?, surface?, onRetry? })
ConnectedAppRecordDetail({ resource, query, identity, enabled?, renderField?, actions?, surface? })
AppRecordForm({ resource, mode, values, onChange, onSubmit, errors?, inputRenderers? })
ConnectedAppRecordForm({ resource, mode, initialValues, action, toInput, onCompleted?, resetKey? })

type AppCollectionState = Readonly<{
  search: string
  filters: readonly { id: string; value: string }[]
  sort: readonly { id: string; direction: 'asc' | 'desc' }[]
  page: number
  pageSize: number
}>

type AppFilterDefinition = Readonly<{
  id: string
  label: string
  options: readonly Readonly<{ label: string; value: string }>[]
}>

type AppSortDefinition = Readonly<{ id: string; label: string }>
type AppPageInfo = Readonly<{
  page: number
  pageSize: number
  totalCount?: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}>

AppCollectionToolbar({
  state, onStateChange, filters?, sorts?, actions?, searchLabel?
})
AppPagination({ pageInfo: AppPageInfo, onPageChange })

// Search, filter, and sort changes reset page to 1. Pagination only emits page.`;

const DATA_EXAMPLE = `import {
  AppDataTable,
  ConnectedAppDataTable
} from '@/blocks/app-kit/data'
import { taskApp } from './task-app'

// Controlled: the host owns the data state.
<AppDataTable
  getRowKey={(task) => task.id}
  onOpenRecord={openTask}
  resource={taskApp.resource}
  state={taskState}
/>

// Connected: the wrapper owns query execution and state mapping.
<ConnectedAppDataTable
  getRowKey={(task) => task.id}
  onOpenRecord={openTask}
  query={taskApp.queries.list}
  queryInput={collectionState}
  resource={taskApp.resource}
/>`;

const RELATION_CONTRACT = `AppRelationPicker<TRecord>({
  label, options, search, onSearchChange, value?, onValueChange,
  loading?, error?, hasMore?, onLoadMore?, disabled?, placeholder?
})
ConnectedAppRelationPicker<TRecord>({
  label, query, search, onSearchChange, value?, onValueChange,
  pageSize?, debounceMs?, disabled?, placeholder?
})

AppRelationPanel<TRecord>({
  title, state, getRecordKey, renderRecord,
  onOpenRecord?, onUnlink?, canUnlink?, picker?, onRetry?
})
ConnectedAppRelationPanel<TRecord, TInput>({
  title, query, input, getRecordKey, renderRecord,
  enabled?, onOpenRecord?, onUnlink?, canUnlink?, picker?
})`;

const RELATION_EXAMPLE = `import type { AppRelationOption } from '@/blocks/app-kit/data'

type Person = Readonly<{ id: string; name: string }>

const [search, setSearch] = React.useState('')
const [assignee, setAssignee] = React.useState<AppRelationOption<Person> | null>(null)

// Controlled options.
<AppRelationPicker
  label="Assignee"
  onSearchChange={setSearch}
  onValueChange={setAssignee}
  options={personOptions}
  search={search}
  value={assignee}
/>

// Connected server search.
<ConnectedAppRelationPicker
  label="Assignee"
  onSearchChange={setSearch}
  onValueChange={setAssignee}
  query={searchPeople}
  search={search}
  value={assignee}
/>`;

const BOARD_CONTRACT = `AppBoard<TRecord, TColumnId>({
  columns, records, getRecordId, getRecordLabel, getColumnId,
  renderCard?, onOpenRecord?, onMove?, canMove?, density?, surface?
})

ConnectedAppBoard<TRecord, TColumnId, TQueryInput, TMoveInput, TMoveOutput>({
  columns, query, queryInput, getRecordId, getRecordLabel, getColumnId,
  renderCard?, onOpenRecord?, canMove?,
  moveAction?: {
    definition: AppActionDefinition<TMoveInput, TMoveOutput>
    input: (move: AppBoardMove<TRecord, TColumnId>) => TMoveInput
  }
})`;

const BOARD_EXAMPLE = `const boardProps = {
  columns: taskStatusColumns,
  getColumnId: (task: Task) => task.status,
  getRecordId: (task: Task) => task.id,
  getRecordLabel: (task: Task) => task.title
}

// Controlled semantic mutation.
<AppBoard {...boardProps} records={tasks} onMove={moveTask} />

// Connected mutation; omitting moveAction makes the board read-only.
<ConnectedAppBoard
  {...boardProps}
  query={boardQuery}
  queryInput={boardFilters}
  moveAction={{
    definition: moveTaskAction,
    input: ({ recordId, toColumnId }) => ({
      taskId: recordId,
      status: toColumnId
    })
  }}
/>`;

const DASHBOARD_CONTRACT = `const APP_DASHBOARD_LAYOUT_VERSION = 1 as const

type AppDashboardWidgetSize = 'third' | 'half' | 'wide' | 'full'
interface AppDashboardPlacement {
  widgetId: string
  order: number
  size: AppDashboardWidgetSize
  hidden?: boolean
}
interface AppDashboardLayout {
  version: typeof APP_DASHBOARD_LAYOUT_VERSION
  placements: readonly AppDashboardPlacement[]
}

interface AppDashboardLayoutStore {
  load(key: string): AppDashboardLayout | null | Promise<AppDashboardLayout | null>
  save(key: string, layout: AppDashboardLayout): void | Promise<void>
}

interface ConstructiveAppDashboardLayoutAdapter {
  loadLayout(key: string): AppDashboardLayout | null | Promise<AppDashboardLayout | null>
  saveLayout(key: string, layout: AppDashboardLayout): void | Promise<void>
}

parseAppDashboardLayout(value: unknown): AppDashboardLayout | null
reconcileAppDashboardLayout(layout, widgetIds, defaultSizes?): AppDashboardLayout
createLocalStorageAppDashboardLayoutStore(storage?): AppDashboardLayoutStore
createConstructiveAppDashboardLayoutStore(
  adapter: ConstructiveAppDashboardLayoutAdapter
): AppDashboardLayoutStore

AppDashboard({
  catalog: AppDashboardWidgetCatalog
  layout: AppDashboardLayout
  onLayoutChange?
  renderWidget?
  density?
  surface?
})

ConnectedAppDashboard<TInput>({
  widgets: readonly (
    | AppKpiWidgetDefinition & { query: AppQueryDefinition<TInput, AppKpiWidgetPayload>; input: TInput }
    | AppRowsWidgetDefinition & { query: AppQueryDefinition<TInput, AppDashboardRowsPayload>; input: TInput }
  )[]
  layout
  onLayoutChange?
})

PersistedAppDashboard({ catalog, layoutKey, layoutStore, onLayoutError? })`;

const DASHBOARD_EXAMPLE = `// Controlled inert payloads.
const catalog = createAppDashboardWidgetCatalog([{
  id: 'open-count',
  kind: 'kpi',
  title: 'Open tasks',
  state: { status: 'ready', value: { value: 42 } }
}])
<AppDashboard catalog={catalog} layout={layout} onLayoutChange={setLayout} />

// Connected explicit analytical loader.
<ConnectedAppDashboard
  layout={layout}
  onLayoutChange={setLayout}
  widgets={[{
    id: 'completed-trend',
    kind: 'line',
    title: 'Completed over time',
    xKey: 'day',
    series: [{ key: 'completed', label: 'Completed', color: 'chart-1' }],
    query: completedTrendQuery,
    input: analyticsRange
  }]}
/>

// Versioned persistence is optional and replaceable.
const layoutStore = createLocalStorageAppDashboardLayoutStore()
<PersistedAppDashboard
  catalog={catalog}
  layoutKey="tasks.overview"
  layoutStore={layoutStore}
/>`;

const CALENDAR_CONTRACT = `AppCalendar<TRecord>({
  events, month, onMonthChange, timeZone, locale?, weekStartsOn?,
  view, onViewChange, onOpenRecord?, density?, surface?
})

type AppCalendarRange = {
  startDate: string // inclusive local date
  endDate: string   // exclusive local date
  timeZone: string
}

ConnectedAppCalendar<TRecord>({
  query: AppQueryDefinition<AppCalendarRange, readonly AppCalendarEvent<TRecord>[]>
  month, onMonthChange, timeZone, locale?, weekStartsOn?,
  view, onViewChange, onOpenRecord?, density?, surface?
})`;

const CALENDAR_EXAMPLE = `const calendarProps = {
  month,
  onMonthChange: setMonth,
  onOpenRecord: openTask,
  onViewChange: setView,
  timeZone: 'America/Los_Angeles',
  view
}

// Controlled events.
<AppCalendar {...calendarProps} events={taskEvents} />

// Connected range query. The wrapper derives the visible range.
<ConnectedAppCalendar {...calendarProps} query={taskCalendarQuery} />`;

const WORKFLOW_CONTRACT = `AppActionButton({ action: AppActionItem, size?, variant? })
AppActionMenu({ actions: readonly AppActionItem[], label?, onActionComplete? })
AppActionDialog({
  open, onOpenChange, title, description, submitLabel,
  confirmation?, disabledReason?, children, onSubmit
})
AppBulkActionBar({ selectedCount, actions, onClearSelection })

ConnectedAppActionButton({ definition, input, label?, size?, variant? })
ConnectedAppActionMenu({ actions: readonly { definition, input, label? }[] })
ConnectedAppActionDialog({ definition, input, open, onOpenChange, children, title?, description? })
ConnectedAppBulkActionBar({ selection, actions, onClearSelection })

AppWorkflowStepper({
  steps, activeStep, onActiveStepChange,
  onComplete?, completeLabel?, canContinue?, busy?, error?
})`;

const WORKFLOW_EXAMPLE = `// Controlled host command.
<AppActionButton action={{
  id: 'complete-task',
  label: 'Complete task',
  execute: () => completeTask(task.id)
}} />

// Connected App Kit action with validation, policy, and invalidation.
<ConnectedAppActionButton
  definition={taskApp.actions.complete}
  input={{ taskId: task.id }}
/>

// The stepper is controlled UI, not a durable workflow engine.
<AppWorkflowStepper
  activeStep={activeStep}
  onActiveStepChange={setActiveStep}
  steps={[
    { id: 'details', title: 'Details', content: <TaskDetails task={task} /> },
    { id: 'review', title: 'Review', content: <TaskReview task={task} /> }
  ]}
/>`;

const FIELD_CONTRACT = `type AppFieldKind =
  | 'string' | 'integer' | 'float' | 'boolean' | 'date' | 'datetime' | 'enum'
  | 'string-array' | 'integer-array' | 'float-array' | 'boolean-array'
  | 'date-array' | 'datetime-array' | 'enum-array'
  | 'json' | 'custom'

type AppFieldDefinition<TRecord> = Readonly<{
  key: keyof TRecord & string
  databaseName: string
  graphQLName: string
  label: string
  description?: string
  kind: AppFieldKind
  nullable?: boolean
  arrayElementNullable?: boolean
  readOnly?: boolean
  options?: readonly { label: string; value: string }[]
}>`;

const NAVIGATION_CONTRACT = `type AppRecordLocator<TRecord> = Readonly<{
  resourceId: string
  identity: (record: TRecord) => string
}>

createAppRouteRecordOpener<TRecord>({
  locator,
  href: (target) => string,
  navigate: (href, target) => void
}): (record) => void

createAppStackRecordOpener<TRecord, TCard>({
  locator,
  card: (target) => TCard,
  open: (card: TCard, target) => void
}): (record) => void

type AppUrlStateAdapter<TState> = Readonly<{
  read(search: string | URLSearchParams): TState
  write(state: TState, current?: string | URLSearchParams): URLSearchParams
}>

defineAppUrlStateAdapter<TState>({
  keys: readonly string[],
  decode: (params: URLSearchParams) => TState,
  encode: (state: TState) => URLSearchParams
}): AppUrlStateAdapter<TState>`;

const NAVIGATION_EXAMPLE = `const viewState = defineAppUrlStateAdapter<{
  view: 'table' | 'board'
  search: string
  selected?: string
}>({
  keys: ['view', 'q', 'selected'],
  decode: (params) => ({
    view: params.get('view') === 'board' ? 'board' : 'table',
    search: params.get('q') ?? '',
    selected: params.get('selected') ?? undefined
  }),
  encode: (state) => {
    const params = new URLSearchParams({ view: state.view })
    if (state.search) params.set('q', state.search)
    if (state.selected) params.set('selected', state.selected)
    return params
  }
})

const openTaskRoute = createAppRouteRecordOpener({
  locator: { resourceId: 'tasks', identity: (task: Task) => task.id },
  href: ({ resourceId, identity }) => \`/app/\${resourceId}/\${identity}\`,
  navigate: (href) => router.push(href)
})

// Stack is an optional host adapter; App Kit never imports it.
const openTaskCard = createAppStackRecordOpener({
  locator: { resourceId: 'tasks', identity: (task: Task) => task.id },
  card: ({ identity }) => ({ id: \`task:\${identity}\`, type: 'task-detail' }),
  open: (card) => stack.open(card)
})`;

const VIEW_REFERENCES = [
  {
    id: 'data',
    title: 'Records and collections',
    root: 'app-kit-data',
    summary: 'Controlled views receive explicit data state; connected wrappers map one typed query or action into the same surface. Toolbar and pagination controls only emit collection-state changes, so the loader remains server-driven.',
    contract: DATA_CONTRACT,
    example: DATA_EXAMPLE,
  },
  {
    id: 'relations',
    title: 'Relation search and linking',
    root: 'app-kit-data',
    summary: 'Pickers search existing records and panels render linked records. Link and unlink mutations remain explicit host or App Kit actions.',
    contract: RELATION_CONTRACT,
    example: RELATION_EXAMPLE,
  },
  {
    id: 'board',
    title: 'Categorical boards',
    root: 'app-kit-board',
    summary: 'Both layers use the same semantic move contract; the connected board only enables movement when a move action is supplied.',
    contract: BOARD_CONTRACT,
    example: BOARD_EXAMPLE,
  },
  {
    id: 'dashboard',
    title: 'Analytical dashboards',
    root: 'app-kit-dashboard',
    summary: 'Controlled widgets receive computed payloads, while connected widgets use explicit analytical loaders and render through TanStack Charts. Optional versioned stores persist catalog-limited layout only.',
    contract: DASHBOARD_CONTRACT,
    example: DASHBOARD_EXAMPLE,
  },
  {
    id: 'calendar',
    title: 'Month and agenda calendars',
    root: 'app-kit-calendar',
    summary: 'The host controls month, timezone, view, and record opening; the connected wrapper loads the derived visible range.',
    contract: CALENDAR_CONTRACT,
    example: CALENDAR_EXAMPLE,
  },
  {
    id: 'workflow',
    title: 'Actions and multi-step UI',
    root: 'app-kit-workflow',
    summary: 'Controlled actions wrap host commands, connected actions consume App Kit definitions, and the stepper remains controlled UI.',
    contract: WORKFLOW_CONTRACT,
    example: WORKFLOW_EXAMPLE,
  },
] as const;
const VIEW_CONTRACTS = [
  ['Records', 'AppDataTable · AppDataList · AppDataCards · AppRecordDetail · AppRecordForm', 'ConnectedAppDataTable · ConnectedAppDataList · ConnectedAppDataCards · ConnectedAppRecordDetail · ConnectedAppRecordForm'],
  ['Relations', 'AppRelationPicker · AppRelationPanel', 'ConnectedAppRelationPicker · ConnectedAppRelationPanel'],
  ['Board', 'AppBoard', 'ConnectedAppBoard'],
  ['Dashboard', 'AppDashboard', 'ConnectedAppDashboard · PersistedAppDashboard'],
  ['Calendar', 'AppCalendar', 'ConnectedAppCalendar'],
  ['Actions', 'AppActionButton · AppActionMenu · AppActionDialog · AppBulkActionBar', 'ConnectedAppActionButton · ConnectedAppActionMenu · ConnectedAppActionDialog · ConnectedAppBulkActionBar'],
] as const;

const SELECTIONS = [
  {
    shape: 'Records and collections',
    geometry: 'Table, list, cards, detail, forms, relations',
    root: 'app-kit-data',
  },
  {
    shape: 'Categorical state',
    geometry: 'Board columns with a semantic move action',
    root: 'app-kit-board',
  },
  {
    shape: 'Analytical results',
    geometry: 'KPI, bar, line, and breakdown widgets',
    root: 'app-kit-dashboard',
  },
  {
    shape: 'Time-bounded records',
    geometry: 'Localized month and agenda views',
    root: 'app-kit-calendar',
  },
  {
    shape: 'Application commands',
    geometry: 'Buttons, menus, dialogs, bulk actions, and steppers',
    root: 'app-kit-workflow',
  },
] as const;

export default function AppKitPage() {
  return (
    <article className="registry-page">
      <header className="mb-10 max-w-3xl">
        <p className="registry-eyebrow">Application composition</p>
        <h1 className="mt-2 text-balance text-[22px] font-semibold sm:text-[1.75rem]">
          Constructive App Kit
        </h1>
        <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
          {DESCRIPTION} Console Kit, Sheets, Stack navigation, and platform feature
          packs remain optional capabilities that you add when the application
          needs them.
        </p>
      </header>

      <div className="flex flex-col gap-12 lg:gap-14">
        <section aria-labelledby="app-kit-model">
          <div className="mb-4 max-w-3xl">
            <h2 id="app-kit-model" className="text-lg font-semibold">
              One resource model, independently installed views
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              Server-safe definitions describe identity, final GraphQL fields,
              loaders, forms, relations, and available actions. Client entrypoints
              bind them to TanStack Query and controlled views; credentials stay in
              host closures and never enter definitions, URLs, stores, or cache keys.
            </p>
          </div>

          <ol className="grid gap-2 md:grid-cols-3">
            {[
              ['01', 'Validate', 'Use _meta for database facts and final executable GraphQL introspection for names, types, relations, and operation roots during generation or build.'],
              ['02', 'Bind', 'Partition loaders and mutations with endpoint, database, session, organization, and schema revision scope.'],
              ['03', 'Compose', 'Choose controlled view geometry from the data shape and workflow, then let the host own routing and shareable state.'],
            ].map(([step, title, body]) => (
              <li key={step} className="rounded-xl border border-border/60 bg-card p-4">
                <span className="font-mono text-xs text-primary">{step}</span>
                <h3 className="mt-2 text-sm font-medium text-foreground">{title}</h3>
                <p className="mt-1 text-pretty text-xs leading-5 text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="app-kit-contract-reference">
          <div className="mb-4 max-w-3xl">
            <h2 id="app-kit-contract-reference" className="text-lg font-semibold">
              Public contract reference
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              Definitions and validation stay importable from a server module. The
              runtime has its own client entrypoint, so a generator can validate a
              resource without pulling React or a provider into server code.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CodeBlock label="Entrypoints" language="tsx">{CORE_ENTRYPOINTS}</CodeBlock>
            <CodeBlock label="Secret-free application scope" language="tsx">{SCOPE_EXAMPLE}</CodeBlock>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-border/60 bg-card">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-border/60 bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Family</th>
                  <th scope="col" className="px-4 py-3 font-medium">Controlled component</th>
                  <th scope="col" className="px-4 py-3 font-medium">Connected wrapper</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {VIEW_CONTRACTS.map(([family, controlled, connected]) => (
                  <tr key={family}>
                    <th scope="row" className="px-4 py-3 font-medium text-foreground">{family}</th>
                    <td className="px-4 py-3 font-mono text-xs leading-5 text-muted-foreground">{controlled}</td>
                    <td className="px-4 py-3 font-mono text-xs leading-5 text-muted-foreground">{connected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <CodeBlock label="Core public signatures" language="tsx">
              {CORE_SIGNATURES}
            </CodeBlock>
            <CodeBlock label="Define a resource, query, and action" language="tsx">
              {CORE_DEFINITIONS_EXAMPLE}
            </CodeBlock>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <CodeBlock label="Bind the client runtime" language="tsx">
              {CORE_RUNTIME_EXAMPLE}
            </CodeBlock>
            <CodeBlock label="Executor results, errors, and cancellation" language="tsx">
              {EXECUTION_CONTRACT}
            </CodeBlock>
          </div>

          <p className="mt-3 max-w-3xl text-pretty text-xs leading-5 text-muted-foreground">
            Query and action executors receive the same credential-free input,
            scope, and <code className="font-mono text-foreground">AbortSignal</code>.
            Returning a raw value means success; use the branded result helpers
            when a transport needs to preserve authorization, validation, partial
            GraphQL, or cancellation failures as structured application errors.
          </p>
          <p className="mt-2 max-w-3xl text-pretty text-xs leading-5 text-muted-foreground">
            The installed source files are the type-checking authority. The signatures
            above mirror the public definitions in{' '}
            <code className="font-mono text-foreground">core/contracts.ts</code>,{' '}
            <code className="font-mono text-foreground">core/schema-validation.ts</code>,
            and <code className="font-mono text-foreground">core/runtime.tsx</code> so
            you can choose the right boundary before installation.
          </p>
        </section>

        <section aria-labelledby="app-kit-host-adapters">
          <div className="mb-4 max-w-3xl">
            <h2 id="app-kit-host-adapters" className="text-lg font-semibold">
              Host routing, Stack, and URL state adapters
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              Record views expose callbacks instead of choosing navigation. The
              route and Stack openers convert the same resource identity into a
              host target, while the URL adapter owns only its declared keys and
              preserves unrelated search parameters when it writes state.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <CodeBlock label="Host adapter signatures" language="tsx">
              {NAVIGATION_CONTRACT}
            </CodeBlock>
            <CodeBlock label="Deep-linked host composition" language="tsx">
              {NAVIGATION_EXAMPLE}
            </CodeBlock>
          </div>
        </section>

        <section aria-labelledby="app-kit-view-reference">
          <div className="mb-6 max-w-3xl">
            <h2 id="app-kit-view-reference" className="text-lg font-semibold">
              Controlled and connected view contracts
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              Every connected wrapper resolves remote state through App Kit and then
              renders its controlled counterpart. These compositions share the Task
              definitions above; routing, URL state, transport credentials, and
              permission policy stay in the host.
            </p>
          </div>

          <div className="flex flex-col gap-10">
            {VIEW_REFERENCES.map((reference) => (
              <section
                aria-labelledby={`app-kit-view-${reference.id}`}
                className="flex flex-col gap-4"
                key={reference.id}
              >
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      id={`app-kit-view-${reference.id}`}
                      className="text-base font-semibold text-foreground"
                    >
                      {reference.title}
                    </h3>
                    <Badge variant="outline">{reference.root}</Badge>
                  </div>
                  <p className="mt-1.5 text-pretty text-sm leading-6 text-muted-foreground">
                    {reference.summary}
                  </p>
                </div>
                <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                  <CodeBlock label="Public signature summary" language="tsx">
                    {reference.contract}
                  </CodeBlock>
                  <CodeBlock label="Controlled and connected composition" language="tsx">
                    {reference.example}
                  </CodeBlock>
                </div>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="app-kit-roots">
          <div className="mb-4 max-w-3xl">
            <h2 id="app-kit-roots" className="text-lg font-semibold">
              Install only the roots the application uses
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              This catalog is projected from the same versioned{' '}
              <code className="font-mono text-foreground">meta.constructive</code>{' '}
              contract validated during registry compilation. Skills use that
              catalog for discovery; this page and the installed source own the API
              details.
            </p>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2">
            {APP_KIT_CATALOG.map((item) => (
              <li key={item.name} className="rounded-xl border border-border/60 bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                    <p className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">
                      @constructive/{item.name}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">{item.metadata.kind}</Badge>
                    <Badge variant="secondary">{item.metadata.boundary}</Badge>
                  </div>
                </div>
                <p className="mt-3 text-pretty text-xs leading-5 text-muted-foreground">
                  {item.description}
                </p>
                <p className="mt-3 border-t border-border/60 pt-3 font-mono text-[11px] leading-5 text-foreground">
                  {item.metadata.capabilities.join(' · ')}
                </p>
              </li>
            ))}
          </ul>

          <CodeBlock className="mt-4" label="Install roots independently">
            {ROOT_INSTALLS}
          </CodeBlock>
        </section>

        <section aria-labelledby="app-kit-selection">
          <div className="mb-4 max-w-3xl">
            <h2 id="app-kit-selection" className="text-lg font-semibold">
              Select by shape, geometry, and workflow
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              Department names do not determine composition. Start from what the
              query returns, how people need to inspect it, and which server action
              changes it.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-border/60 bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Data shape</th>
                  <th scope="col" className="px-4 py-3 font-medium">Presentation geometry</th>
                  <th scope="col" className="px-4 py-3 font-medium">Root</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {SELECTIONS.map((selection) => (
                  <tr key={selection.root}>
                    <td className="px-4 py-3 text-foreground">{selection.shape}</td>
                    <td className="px-4 py-3 text-muted-foreground">{selection.geometry}</td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{selection.root}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="app-kit-schema-contract">
          <div className="mb-4 max-w-3xl">
            <h2 id="app-kit-schema-contract" className="text-lg font-semibold">
              Schema and form compatibility
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              <code className="font-mono text-foreground">validateAppResource()</code>{' '}
              compares the declared PostgreSQL names and facts with final GraphQL
              type, field, relation, identity, nullability, list shape, enum, and
              operation evidence. Its result reports separate read, create, update,
              and delete capabilities plus field-level issues; it never grants an
              operation or introspects at runtime.
            </p>
          </div>
          <div className="mb-4 grid gap-4 xl:grid-cols-2">
            <CodeBlock label="Field kinds and nullability" language="tsx">
              {FIELD_CONTRACT}
            </CodeBlock>
            <div className="rounded-xl border border-border/60 bg-card p-5 text-sm leading-6 text-muted-foreground">
              <h3 className="font-medium text-foreground">Scalar and list semantics</h3>
              <p className="mt-2">
                <code className="font-mono text-foreground">json</code> is one
                GraphQL scalar even when its runtime value contains an object or
                array. <code className="font-mono text-foreground">nullable</code>{' '}
                still describes whether the scalar field itself may be GraphQL
                null. It does not use{' '}
                <code className="font-mono text-foreground">arrayElementNullable</code>,
                and JSON or custom scalar editing requires an explicit input
                renderer.
              </p>
              <p className="mt-2">
                A <code className="font-mono text-foreground">*-array</code> kind
                declares one GraphQL list dimension.{' '}
                <code className="font-mono text-foreground">nullable</code> controls
                whether the list itself may be null;{' '}
                <code className="font-mono text-foreground">arrayElementNullable</code>{' '}
                controls inner nulls and defaults to false. Generated forms accept
                JSON array syntax and validate every scalar or enum element before
                submitting.
              </p>
            </div>
          </div>
          <ul className="grid gap-2 text-sm leading-6 text-muted-foreground md:grid-cols-3">
            <li className="rounded-xl border border-border/60 bg-card p-4">
              String, integer, float, boolean, date, datetime, enum, and their
              scalar-array forms have generated presentation. Editable enum and
              enum-array fields require non-empty, unique declared options.
            </li>
            <li className="rounded-xl border border-border/60 bg-card p-4">
              Resource forms declare ordered create and update fields separately.
              Required presentation may tighten a nullable field for one workflow,
              but it cannot weaken database or executable-schema requirements.
            </li>
            <li className="rounded-xl border border-border/60 bg-card p-4">
              Missing or ambiguous identity disables writes. Composite identity
              keeps its declared field order, and relation pickers link existing
              records through server search rather than nested creation.
            </li>
          </ul>
        </section>

        <section aria-labelledby="event-studio-starter">
          <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="event-studio-starter" className="text-lg font-semibold">Event Studio starter</h2>
              <Badge>Page-scale recipe</Badge>
            </div>
            <p className="mt-2 max-w-3xl text-pretty text-sm leading-7 text-muted-foreground">
              Event Studio composes org-scoped programs, sessions, people, venues,
              and the explicit session_people relation into analytical widgets, a
              semantic session board, month and agenda schedules, searchable
              collections, details, forms, relations, and publish or schedule
              actions. The paired skill recipe provisions through the supported B2B
              <code className="mx-1 font-mono text-foreground">b2b:storage</code>
              blueprint path, so the starter contains no raw SQL.
            </p>
            <p className="mt-2 max-w-3xl text-pretty text-xs leading-5 text-muted-foreground">
              It is an opt-in proof application and integration fixture. No App
              Kit capability root depends on it, and ordinary application
              composition should select the smaller roots above.
            </p>
            <CodeBlock className="mt-4" label="Install the complete starter">
              {registryAdd('app-kit-event-studio')}
            </CodeBlock>
          </div>
        </section>

        <section aria-labelledby="app-kit-boundaries">
          <h2 id="app-kit-boundaries" className="text-lg font-semibold">Runtime boundaries</h2>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground md:grid-cols-2">
            <li className="rounded-xl border border-border/60 bg-card p-4">
              Remote state belongs to TanStack Query. AppScope changes create a new
              cache partition, cancellation uses AbortSignal, and actions invalidate
              explicit cross-view targets.
            </li>
            <li className="rounded-xl border border-border/60 bg-card p-4">
              URL or controlled props own shareable view, filter, and selection
              state. Local reducers own transient interaction; App Kit adds no global
              Zustand store.
            </li>
            <li className="rounded-xl border border-border/60 bg-card p-4">
              Runtime introspection is out of scope. Agents validate generated
              contracts against _meta and the final inflected GraphQL schema before
              the application ships.
            </li>
            <li className="rounded-xl border border-border/60 bg-card p-4">
              V1 has no subscriptions or interval polling. Action invalidation,
              manual refresh, and focus or reconnect refetching provide freshness.
            </li>
          </ul>
        </section>
      </div>

      <ApplicationDocPagination current="app-kit" />
    </article>
  );
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: withBase('/blocks/app-kit') },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: withBase('/blocks/app-kit'),
    images: [OG_IMAGE],
  },
};

import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  appFailure,
  appSuccess,
  createAppRouteRecordOpener,
  createAppStackRecordOpener,
  defineAction,
  defineAppUrlStateAdapter,
  defineQuery,
  defineResource,
  isAppResult,
  type AppExecutionContext,
  type AppFieldKind,
  type AppResult,
  type AppScope
} from '@/blocks/app-kit/core';
import type {
  AppCollectionPage,
  AppCollectionQueryInput,
  AppCollectionViewProps,
  AppFilterDefinition,
  AppRelationOption,
  AppSortDefinition
} from '@/blocks/app-kit/data';
import {
  APP_DASHBOARD_LAYOUT_VERSION,
  createConstructiveAppDashboardLayoutStore,
  createDefaultAppDashboardLayout,
  createLocalStorageAppDashboardLayoutStore,
  type ConstructiveAppDashboardLayoutAdapter
} from '@/blocks/app-kit/dashboard';

type Task = Readonly<{
  id: string;
  title: string;
  status: 'TODO' | 'DONE';
  tags: readonly string[] | null;
  milestones: readonly (string | null)[];
  configuration: unknown;
}>;

const scope: AppScope = {
  databaseId: 'database-fixture',
  endpointId: 'data',
  organizationId: 'organization-fixture',
  schemaRevision: 'schema-fixture',
  securityRevision: 'security-fixture',
  sessionPartition: 'session-fixture'
};

const emptyPage: AppCollectionPage<Task> = {
  items: [],
  pageInfo: {
    hasNextPage: false,
    hasPreviousPage: false,
    page: 1,
    pageSize: 25,
    totalCount: 0
  }
};

const listTasks = defineQuery<
  AppCollectionQueryInput,
  AppCollectionPage<Task>
>({
  id: 'tasks.list',
  execute: ({ signal }) =>
    signal.aborted
      ? appFailure({ kind: 'cancelled', message: 'Cancelled.' })
      : appSuccess(emptyPage)
});

const completeTask = defineAction<{ taskId: string }, Task>({
  id: 'tasks.complete',
  execute: ({ input }) =>
    appFailure({
      code: 'NOT_IMPLEMENTED',
      details: { taskId: input.taskId },
      kind: 'unknown',
      message: 'Contract fixture only.'
    }),
  presentation: { label: 'Complete task' }
});

const taskResource = defineResource<
  Task,
  string,
  AppCollectionQueryInput,
  AppCollectionPage<Task>,
  { complete: typeof completeTask }
>({
  actions: { complete: completeTask },
  displayField: 'title',
  fields: [
    {
      databaseName: 'id',
      graphQLName: 'id',
      key: 'id',
      kind: 'string',
      label: 'ID',
      readOnly: true
    },
    {
      databaseName: 'title',
      graphQLName: 'title',
      key: 'title',
      kind: 'string',
      label: 'Title'
    },
    {
      databaseName: 'status',
      graphQLName: 'status',
      key: 'status',
      kind: 'enum',
      label: 'Status',
      options: [
        { label: 'To do', value: 'TODO' },
        { label: 'Done', value: 'DONE' }
      ]
    },
    {
      databaseName: 'tags',
      graphQLName: 'tags',
      key: 'tags',
      kind: 'string-array',
      label: 'Tags',
      nullable: true
    },
    {
      arrayElementNullable: true,
      databaseName: 'milestones',
      graphQLName: 'milestones',
      key: 'milestones',
      kind: 'date-array',
      label: 'Milestones'
    },
    {
      databaseName: 'configuration',
      graphQLName: 'configuration',
      key: 'configuration',
      kind: 'json',
      label: 'Configuration',
      readOnly: true
    }
  ],
  forms: {
    update: { fields: [{ field: 'title', required: true }, { field: 'status' }] }
  },
  id: 'tasks',
  identity: {
    fields: ['id'],
    read: (task) => task.id,
    serialize: (identity) => identity
  },
  label: 'Task',
  pluralLabel: 'Tasks',
  queries: { list: listTasks },
  source: {
    graphQLTypeName: 'Task',
    listFieldName: 'tasks',
    schemaName: 'app',
    tableName: 'tasks',
    updateMutationName: 'updateTask'
  }
});

const collectionProps = {
  getRowKey: (task: Task) => task.id,
  onSelectionChange: (_keys: readonly string[]) => undefined,
  resource: taskResource,
  selectedKeys: ['task-1'],
  state: { data: emptyPage, status: 'ready' }
} satisfies AppCollectionViewProps<Task>;

const filters = [
  {
    id: 'status',
    label: 'Status',
    options: [{ label: 'Done', value: 'DONE' }]
  }
] satisfies readonly AppFilterDefinition[];

const sorts = [
  { id: 'title', label: 'Title' }
] satisfies readonly AppSortDefinition[];

describe('App Kit documentation public-contract fixture', () => {
  it('keeps resource fields, collection controls, and executor results typed', async () => {
    const fieldKinds = taskResource.fields.map((field) => field.kind);
    expect(fieldKinds).toEqual([
      'string',
      'string',
      'enum',
      'string-array',
      'date-array',
      'json'
    ] satisfies readonly AppFieldKind[]);
    expect(collectionProps.selectedKeys).toEqual(['task-1']);
    expect(filters[0].options[0].value).toBe('DONE');
    expect(sorts[0].id).toBe('title');

    const result = await listTasks.execute({
      input: { filters: [], page: 1, pageSize: 25, search: '', sort: [] },
      scope,
      signal: new AbortController().signal
    });
    expect(isAppResult(result)).toBe(true);
    expectTypeOf(result).toMatchTypeOf<AppCollectionPage<Task> | AppResult<AppCollectionPage<Task>>>();
    expectTypeOf<AppExecutionContext<AppCollectionQueryInput>['signal']>()
      .toEqualTypeOf<AbortSignal>();
  });

  it('keeps relation, host-navigation, URL-state, and layout adapters composable', async () => {
    type Person = Readonly<{ id: string; name: string }>;
    const assignee = {
      label: 'Ada Lovelace',
      record: { id: 'person-1', name: 'Ada Lovelace' },
      value: 'person-1'
    } satisfies AppRelationOption<Person>;

    const navigateCalls: string[] = [];
    const openRoute = createAppRouteRecordOpener({
      href: ({ identity, resourceId }) => `/app/${resourceId}/${identity}`,
      locator: { identity: (task: Task) => task.id, resourceId: 'tasks' },
      navigate: (href) => navigateCalls.push(href)
    });
    const stackCards: { id: string; type: string }[] = [];
    const openStack = createAppStackRecordOpener({
      card: ({ identity }) => ({ id: `task:${identity}`, type: 'task-detail' }),
      locator: { identity: (task: Task) => task.id, resourceId: 'tasks' },
      open: (card) => stackCards.push(card)
    });
    const urlState = defineAppUrlStateAdapter<{ search: string }>({
      decode: (params) => ({ search: params.get('q') ?? '' }),
      encode: (state) => new URLSearchParams(state.search ? { q: state.search } : {}),
      keys: ['q']
    });
    const task: Task = {
      configuration: {},
      id: 'task-1',
      milestones: [],
      status: 'TODO',
      tags: null,
      title: 'Write the fixture'
    };

    openRoute(task);
    openStack(task);
    expect(navigateCalls).toEqual(['/app/tasks/task-1']);
    expect(stackCards).toEqual([{ id: 'task:task-1', type: 'task-detail' }]);
    expect(urlState.write({ search: 'fixture' }, '?tab=tasks').toString())
      .toBe('tab=tasks&q=fixture');
    expect(assignee.record.id).toBe('person-1');

    const savedLayouts: unknown[] = [];
    const adapter = {
      loadLayout: () => null,
      saveLayout: (_key, layout) => {
        savedLayouts.push(layout);
      }
    } satisfies ConstructiveAppDashboardLayoutAdapter;
    const constructiveStore = createConstructiveAppDashboardLayoutStore(adapter);
    const localStore = createLocalStorageAppDashboardLayoutStore(undefined);
    const layout = createDefaultAppDashboardLayout(['task-count']);
    await constructiveStore.save('tasks.overview', layout);

    expect(layout.version).toBe(APP_DASHBOARD_LAYOUT_VERSION);
    expect(savedLayouts).toEqual([layout]);
    expect(localStore.load('tasks.overview')).toBeNull();
  });
});

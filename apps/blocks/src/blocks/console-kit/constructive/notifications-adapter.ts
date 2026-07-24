import type { AtomicCapabilityId } from '../../../feature-packs';
import type {
  AppNotification,
  NotificationsFeaturePackProps
} from '../../feature-packs/notifications/notifications-feature-pack';
import type {
  ConsoleKitAdapterContext,
  ConsoleKitFeatureAdapter
} from '../console-kit-contracts';
import type { ConsoleKitStoreApi } from '../store';
import type { ConstructiveCapabilityDiscovery } from './constructive-capabilities';
import {
  asRecord,
  asString,
  connectionNodes,
  notifyConsoleAdapters,
  packAvailability
} from './constructive-adapter-utils';
import {
  executeConstructiveGraphQL,
  fieldsForType,
  namedTypeName,
  selectExistingFields,
  type ConstructiveSchemaSnapshot,
  type ConstructiveSchemaType
} from './constructive-graphql';

export type ConstructiveNotificationsAdapterOptions = Readonly<{
  store: ConsoleKitStoreApi;
  discovery: ConstructiveCapabilityDiscovery;
}>;

type ConnectionContract = Readonly<{
  root: string;
  fields: readonly string[];
  arguments: string;
}>;

type CreateReadStateContract = Readonly<{
  root: string;
  inputType: string;
  objectField: string;
}>;

type UpdateReadStateContract = Readonly<{
  root: string;
  inputType: string;
  patchField: string;
}>;

type ReadStateContracts = Readonly<{
  create: CreateReadStateContract;
  update: UpdateReadStateContract;
}>;

function connectionContract(
  schema: ConstructiveSchemaSnapshot,
  root: string,
  desiredFields: readonly string[],
  requiredFields: readonly string[]
): ConnectionContract | null {
  const rootField = schema.queryFields[root];
  if (!rootField) return null;
  const connectionType = namedTypeName(rootField.type);
  const nodeType = connectionType
    ? namedTypeName(fieldsForType(schema, connectionType).nodes?.type)
    : null;
  if (!nodeType) return null;
  const fields = selectExistingFields(schema, nodeType, desiredFields);
  if (requiredFields.some((field) => !fields.includes(field))) return null;
  return {
    root,
    fields,
    arguments: rootField.args.some((argument) => argument.name === 'first')
      ? '(first: 500)'
      : ''
  };
}

function inputTypeForMutation(
  schema: ConstructiveSchemaSnapshot,
  mutation: string
): ConstructiveSchemaType | null {
  const field = schema.mutationFields[mutation];
  const inputArgument = field?.args.find((argument) => argument.name === 'input');
  const inputTypeName = namedTypeName(inputArgument?.type);
  return inputTypeName ? schema.types[inputTypeName] ?? null : null;
}

function nestedInputWithFields(
  schema: ConstructiveSchemaSnapshot,
  inputType: ConstructiveSchemaType,
  requiredFields: readonly string[]
): string | null {
  for (const field of inputType.inputFields) {
    const nestedName = namedTypeName(field.type);
    const nested = nestedName ? schema.types[nestedName] : undefined;
    const nestedFields = new Set(nested?.inputFields.map((candidate) => candidate.name));
    if (requiredFields.every((required) => nestedFields.has(required))) return field.name;
  }
  return null;
}

function readStateContracts(
  schema: ConstructiveSchemaSnapshot,
  timestampField: 'readAt' | 'dismissedAt'
): ReadStateContracts | null {
  const createRoot = 'createNotificationReadState';
  const createInput = inputTypeForMutation(schema, createRoot);
  const createObjectField = createInput
    ? nestedInputWithFields(schema, createInput, ['notificationId', 'ownerId', timestampField])
    : null;
  const createInputType = createInput?.name;
  if (!createInput || !createInputType || !createObjectField) return null;

  for (const updateRoot of Object.keys(schema.mutationFields)) {
    if (!updateRoot.startsWith('updateNotificationReadState')) continue;
    const updateInput = inputTypeForMutation(schema, updateRoot);
    if (!updateInput) continue;
    const topLevel = new Set(updateInput.inputFields.map((field) => field.name));
    if (!topLevel.has('notificationId') || !topLevel.has('ownerId')) continue;
    const patchField = nestedInputWithFields(schema, updateInput, [timestampField]);
    if (!patchField) continue;
    return {
      create: {
        root: createRoot,
        inputType: createInput.name,
        objectField: createObjectField
      },
      update: {
        root: updateRoot,
        inputType: updateInput.name,
        patchField
      }
    };
  }
  return null;
}

function notificationAction(value: unknown): Readonly<{
  label?: string;
  href?: string;
}> {
  if (!Array.isArray(value)) return {};
  for (const candidate of value) {
    const action = asRecord(candidate);
    const href = asString(action?.url) ?? asString(action?.href);
    if (!href) continue;
    return {
      href,
      label: asString(action?.label) ?? 'Open'
    };
  }
  return {};
}

function notificationDocument(
  notifications: ConnectionContract,
  readStates: ConnectionContract | null
): string {
  return `
    query ConsoleKitNotifications {
      ${notifications.root}${notifications.arguments} {
        nodes { ${notifications.fields.join(' ')} }
      }
      ${readStates
        ? `${readStates.root}${readStates.arguments} { nodes { ${readStates.fields.join(' ')} } }`
        : ''}
    }
  `;
}

async function writeReadState(
  runtime: ConsoleKitAdapterContext,
  contract: ReadStateContracts,
  existing: boolean,
  notificationId: string,
  ownerId: string,
  timestampField: 'readAt' | 'dismissedAt'
): Promise<void> {
  const timestamp = new Date().toISOString();
  if (existing) {
    await executeConstructiveGraphQL(
      runtime,
      'notifications',
      `
        mutation ConsoleKitUpdateNotificationReadState($input: ${contract.update.inputType}!) {
          result: ${contract.update.root}(input: $input) { __typename }
        }
      `,
      {
        input: {
          notificationId,
          ownerId,
          [contract.update.patchField]: { [timestampField]: timestamp }
        }
      }
    );
    return;
  }
  await executeConstructiveGraphQL(
    runtime,
    'notifications',
    `
      mutation ConsoleKitCreateNotificationReadState($input: ${contract.create.inputType}!) {
        result: ${contract.create.root}(input: $input) { __typename }
      }
    `,
    {
      input: {
        [contract.create.objectField]: {
          notificationId,
          ownerId,
          [timestampField]: timestamp
        }
      }
    }
  );
}

/** Reads the RLS-filtered inbox and writes only the current user's read state. */
export function createConstructiveNotificationsAdapter(
  options: ConstructiveNotificationsAdapterOptions
): ConsoleKitFeatureAdapter<NotificationsFeaturePackProps> {
  const capabilities: readonly AtomicCapabilityId[] = ['notifications.inbox'];
  return {
    capabilities,
    getAvailability: () => packAvailability(options.store, 'notifications'),
    subscribe(runtime, listener) {
      const unsubscribe = options.discovery.subscribe(listener);
      void options.discovery.ensure(runtime);
      return unsubscribe;
    },
    async load(runtime, signal) {
      const schema = options.discovery.getSchemas().notifications;
      if (!schema) throw new Error('The notifications endpoint schema is unavailable.');
      const notificationConnection = connectionContract(
        schema,
        'notifications',
        [
          'id',
          'title',
          'body',
          'category',
          'kind',
          'createdAt',
          'actionUrl',
          'actions'
        ],
        ['id', 'title', 'createdAt']
      );
      if (!notificationConnection) {
        throw new Error('Query.notifications does not expose the required inbox fields.');
      }
      const readStateConnection = connectionContract(
        schema,
        'notificationReadStates',
        ['notificationId', 'ownerId', 'readAt', 'dismissedAt'],
        ['notificationId', 'ownerId', 'readAt', 'dismissedAt']
      );
      const result = await executeConstructiveGraphQL<Record<string, unknown>>(
        runtime,
        'notifications',
        notificationDocument(notificationConnection, readStateConnection),
        undefined,
        signal
      );
      const ownerId = runtime.session.status === 'authenticated'
        ? runtime.session.identity.subjectId
        : null;
      const readStates = new Map<string, Record<string, unknown>>();
      if (ownerId) {
        for (const state of connectionNodes(result.notificationReadStates)) {
          const notificationId = asString(state.notificationId);
          if (notificationId && asString(state.ownerId) === ownerId) {
            readStates.set(notificationId, state);
          }
        }
      }
      const visibleIds = new Set<string>();
      const notifications: AppNotification[] = connectionNodes(result.notifications).flatMap((row) => {
        const id = asString(row.id);
        const createdAt = asString(row.createdAt);
        if (!id || !createdAt) return [];
        const state = readStates.get(id);
        if (asString(state?.dismissedAt)) return [];
        visibleIds.add(id);
        const declaredAction = notificationAction(row.actions);
        const actionHref = declaredAction.href ?? asString(row.actionUrl) ?? undefined;
        return [{
          id,
          title: asString(row.title) ?? asString(row.kind) ?? 'Notification',
          body: asString(row.body) ?? undefined,
          category: asString(row.category) ?? undefined,
          createdAt,
          readAt: asString(state?.readAt) ?? undefined,
          actionHref,
          actionLabel: actionHref ? declaredAction.label ?? 'Open' : undefined
        }];
      });
      const readContracts = ownerId && readStateConnection
        ? readStateContracts(schema, 'readAt')
        : null;
      const dismissContracts = ownerId && readStateConnection
        ? readStateContracts(schema, 'dismissedAt')
        : null;
      const reload = () => notifyConsoleAdapters(options.store);
      return {
        resource: notifications.length > 0
          ? {
              status: 'ready',
              quality: 'authoritative',
              data: {
                notifications,
                unreadCount: notifications.filter((notification) => !notification.readAt).length
              }
            }
          : { status: 'empty' },
        policy: {
          markRead: Boolean(readContracts),
          markAllRead: false,
          deleteNotification: Boolean(dismissContracts),
          openNotification: false
        },
        actions: {
          markRead: ownerId && readContracts
            ? async ({ notificationId }) => {
                if (!visibleIds.has(notificationId)) {
                  throw new Error('The notification is outside the current authorized inbox.');
                }
                await writeReadState(
                  runtime,
                  readContracts,
                  readStates.has(notificationId),
                  notificationId,
                  ownerId,
                  'readAt'
                );
                reload();
              }
            : undefined,
          deleteNotification: ownerId && dismissContracts
            ? async ({ notificationId }) => {
                if (!visibleIds.has(notificationId)) {
                  throw new Error('The notification is outside the current authorized inbox.');
                }
                await writeReadState(
                  runtime,
                  dismissContracts,
                  readStates.has(notificationId),
                  notificationId,
                  ownerId,
                  'dismissedAt'
                );
                reload();
              }
            : undefined
        }
      };
    }
  };
}

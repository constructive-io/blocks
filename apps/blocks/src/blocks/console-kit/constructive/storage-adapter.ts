import type { AtomicCapabilityId } from '../../../feature-packs';
import {
  createConsoleIdentityKey,
  getConsoleSessionIdentity,
  type ConsoleEndpointKind
} from '../../console-runtime';
import type {
  StorageBucket,
  StorageFeaturePackProps,
  StorageObject
} from '../../feature-packs/storage/storage-feature-pack';
import {
  resolveStorageMetaContract,
  type ConstructiveStorageMetaContract
} from '../../feature-packs/storage/storage-meta-contract';
import { getConsoleKitStorageSlice } from '../../feature-packs/storage/storage-console-slice';
import type {
  ConsoleKitAdapterContext,
  ConsoleKitFeatureAdapter
} from '../console-kit-contracts';
import type { ConsoleKitStoreApi } from '../store';
import type { ConstructiveCapabilityDiscovery } from './constructive-capabilities';
import {
  asString,
  notifyConsoleAdapters,
  packAvailability
} from './constructive-adapter-utils';
import {
  executeConstructiveGraphQL,
  fieldsForType,
  namedTypeName,
  selectExistingFields,
  type ConstructiveSchemaSnapshot,
  type ConstructiveTypeRef
} from './constructive-graphql';
import { metaSelection } from './constructive-meta-utils';

export type ConstructiveStorageAdapterOptions = Readonly<{
  store: ConsoleKitStoreApi;
  discovery: ConstructiveCapabilityDiscovery;
}>;

type StorageRoots = Readonly<{
  buckets: string;
  files: string;
}>;

type ConnectionContract = Readonly<{
  root: string;
  nodeType: string;
  fields: readonly string[];
}>;

const STORAGE_ROOT_VARIANTS: readonly StorageRoots[] = [
  { buckets: 'appBuckets', files: 'appFiles' },
  { buckets: 'buckets', files: 'files' }
];

function storageRoots(schema: ConstructiveSchemaSnapshot): StorageRoots | null {
  return STORAGE_ROOT_VARIANTS.find(
    (candidate) => schema.queryFields[candidate.buckets] && schema.queryFields[candidate.files]
  ) ?? null;
}

function connectionContract(
  schema: ConstructiveSchemaSnapshot,
  root: string,
  desiredFields: readonly string[],
  requiredFields: readonly string[]
): ConnectionContract {
  const rootField = schema.queryFields[root];
  const connectionType = namedTypeName(rootField?.type);
  const nodeType = connectionType
    ? namedTypeName(fieldsForType(schema, connectionType).nodes?.type)
    : null;
  if (!rootField || !nodeType) {
    throw new Error(`Query.${root} does not expose a readable nodes connection.`);
  }

  const fields = selectExistingFields(schema, nodeType, desiredFields);
  const missing = requiredFields.filter((field) => !fields.includes(field));
  if (missing.length > 0) {
    throw new Error(`${nodeType} is missing required fields: ${missing.join(', ')}.`);
  }
  return {
    root,
    nodeType,
    fields
  };
}

function fileName(key: string, filename: string | null): string {
  if (filename) return filename;
  const segments = key.split('/').filter(Boolean);
  return segments.at(-1) ?? key;
}

function sizeLabel(value: unknown): string | undefined {
  const bytes = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(bytes) || bytes < 0) return undefined;
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'] as const;
  let amount = bytes / 1024;
  let unit: (typeof units)[number] = units[0];
  for (const candidate of units.slice(1)) {
    if (amount < 1024) break;
    amount /= 1024;
    unit = candidate;
  }
  return `${amount >= 10 ? amount.toFixed(0) : amount.toFixed(1)} ${unit}`;
}

type StorageRow = Readonly<{
  family: string;
  id: unknown;
  key: unknown;
  description?: unknown;
  type?: unknown;
  isPublic?: unknown;
}>;

type FileRow = Readonly<{
  family: string;
  namespace: string;
  id: unknown;
  key: unknown;
  bucketId: unknown;
  filename?: unknown;
  mimeType?: unknown;
  size?: unknown;
  path?: unknown;
  status?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}>;

function storageSelectionScope(runtime: ConsoleKitAdapterContext): string {
  const identity = getConsoleSessionIdentity(runtime.session);
  return JSON.stringify([
    runtime.databaseId,
    identity ? createConsoleIdentityKey(identity) : null
  ]);
}

function scopedStorageValue(namespace: string, value: string): string {
  return `${encodeURIComponent(namespace)}:${encodeURIComponent(value)}`;
}

function storageAccess(row: StorageRow): string {
  const type = asString(row.type);
  if (type) return type;
  if (row.isPublic === true) return 'public';
  if (row.isPublic === false) return 'private';
  return 'unknown';
}

function storageFeatureData(
  bucketRows: readonly StorageRow[],
  fileRows: readonly FileRow[],
  selectedBucketKey: string | undefined,
  partialFiles: boolean,
  forceFileNamespace = false
) {
  const bucketFamilies = new Set(bucketRows.map((bucket) => bucket.family));
  const fileNamespaces = new Set(fileRows.map((file) => file.namespace));
  const namespaceBuckets = bucketFamilies.size > 1;
  const namespaceFiles = forceFileNamespace || fileNamespaces.size > 1;
  const bucketIdentity = (family: string, value: string) => namespaceBuckets
    ? scopedStorageValue(family, value)
    : value;
  const fileIdentity = (namespace: string, value: string) => namespaceFiles
    ? scopedStorageValue(namespace, value)
    : value;
  const fileCounts = new Map<string, number>();
  for (const file of fileRows) {
    const bucketId = asString(file.bucketId);
    if (bucketId) {
      const id = bucketIdentity(file.family, bucketId);
      fileCounts.set(id, (fileCounts.get(id) ?? 0) + 1);
    }
  }
  const buckets: StorageBucket[] = bucketRows.flatMap((bucket) => {
    const rawId = asString(bucket.id);
    const rawKey = asString(bucket.key);
    if (!rawId || !rawKey) return [];
    const id = bucketIdentity(bucket.family, rawId);
    const key = bucketIdentity(bucket.family, rawKey);
    return [{
      id,
      key,
      name: asString(bucket.description) ?? rawKey,
      access: storageAccess(bucket),
      objectCount: partialFiles ? undefined : fileCounts.get(id)
    }];
  });
  const activeBucket = buckets.find((bucket) => bucket.key === selectedBucketKey) ?? buckets[0];
  const activeBucketRow = activeBucket
    ? bucketRows.find((bucket) => {
        const id = asString(bucket.id);
        return Boolean(id && bucketIdentity(bucket.family, id) === activeBucket.id);
      })
    : undefined;
  const objects: StorageObject[] = activeBucket
    ? fileRows.flatMap((file) => {
        if (
          !activeBucketRow ||
          file.family !== activeBucketRow.family ||
          asString(file.bucketId) !== asString(activeBucketRow.id)
        ) return [];
        const id = asString(file.id);
        const key = asString(file.key);
        if (!id || !key) return [];
        return [{
          id: fileIdentity(file.namespace, id),
          key: fileIdentity(file.namespace, key),
          name: fileName(key, asString(file.filename)),
          kind: 'file' as const,
          contentType: asString(file.mimeType) ?? undefined,
          sizeLabel: sizeLabel(file.size),
          updatedAt: asString(file.updatedAt) ?? asString(file.createdAt) ?? undefined
        }];
      })
    : [];
  return {
    buckets,
    activeBucketKey: activeBucket?.key,
    path: '',
    objects
  };
}

const STORAGE_META_PAGE_SIZE = 100;
const STORAGE_META_MAX_PAGES = 2;

type BoundedConnectionRows = Readonly<{
  rows: Record<string, unknown>[];
  truncated: boolean;
}>;

function graphQLTypeSource(type: ConstructiveTypeRef | undefined): string | null {
  if (!type) return null;
  if (type.kind === 'NON_NULL') {
    const inner = graphQLTypeSource(type.ofType ?? undefined);
    return inner ? `${inner}!` : null;
  }
  if (type.kind === 'LIST') {
    const inner = graphQLTypeSource(type.ofType ?? undefined);
    return inner ? `[${inner}]` : null;
  }
  return type.name ?? null;
}

function bucketCondition(
  schema: ConstructiveSchemaSnapshot | undefined,
  root: string,
  bucketId: string,
  value: unknown
): Readonly<{ type: string; value: Record<string, unknown> }> | null {
  const condition = schema?.queryFields[root]?.args.find(
    (argument) => argument.name === 'condition'
  );
  const conditionTypeName = namedTypeName(condition?.type);
  const conditionType = conditionTypeName ? schema?.types[conditionTypeName] : undefined;
  if (!conditionType?.inputFields.some((field) => field.name === bucketId)) return null;
  const type = graphQLTypeSource(condition?.type);
  return type ? { type, value: { [bucketId]: value } } : null;
}

async function executeBoundedMetaConnection(
  runtime: ConsoleKitAdapterContext,
  endpointKind: ConsoleEndpointKind,
  input: Readonly<{
    operationName: string;
    root: string;
    selection: string;
    condition?: Readonly<{ type: string; value: Record<string, unknown> }> | null;
  }>,
  signal: AbortSignal
): Promise<BoundedConnectionRows> {
  const conditionDefinition = input.condition ? `, $condition: ${input.condition.type}` : '';
  const conditionArgument = input.condition ? ', condition: $condition' : '';
  const document = `
    query ${input.operationName}($first: Int!, $after: Cursor${conditionDefinition}) {
      ${input.root}(first: $first, after: $after${conditionArgument}) {
        nodes { ${input.selection} }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;
  const rows: Record<string, unknown>[] = [];
  const seenCursors = new Set<string>();
  let after: string | null = null;

  for (let page = 0; page < STORAGE_META_MAX_PAGES; page += 1) {
    const result = await executeConstructiveGraphQL<Record<string, unknown>>(
      runtime,
      endpointKind,
      document,
      {
        first: STORAGE_META_PAGE_SIZE,
        after,
        ...(input.condition ? { condition: input.condition.value } : {})
      },
      signal
    );
    const connection = result[input.root] as Record<string, unknown> | null | undefined;
    const nodes = Array.isArray(connection?.nodes) ? connection.nodes : [];
    for (const candidate of nodes) {
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        rows.push(candidate as Record<string, unknown>);
      }
    }
    const pageInfo = connection?.pageInfo as Record<string, unknown> | null | undefined;
    if (pageInfo?.hasNextPage !== true) return { rows, truncated: false };
    if (page === STORAGE_META_MAX_PAGES - 1) return { rows, truncated: true };
    const endCursor = asString(pageInfo.endCursor);
    if (!endCursor || seenCursors.has(endCursor)) {
      throw new Error(
        `The ${input.root} connection reported another page without a new cursor.`
      );
    }
    seenCursors.add(endCursor);
    after = endCursor;
  }
  return { rows, truncated: true };
}

async function loadStorageMetaRows(
  runtime: ConsoleKitAdapterContext,
  endpointKind: ConsoleEndpointKind,
  contract: ConstructiveStorageMetaContract,
  schema: ConstructiveSchemaSnapshot | undefined,
  selectedBucketKey: string | undefined,
  signal: AbortSignal
): Promise<Readonly<{
  buckets: StorageRow[];
  files: FileRow[];
  truncated: boolean;
}>> {
  const bucketGroups = await Promise.all(contract.families.map(async (family, index) => {
      const bucket = family.bucket;
      const result = await executeBoundedMetaConnection(runtime, endpointKind, {
        operationName: `ConsoleKitStorageMetaBuckets${index}`,
        root: bucket.root,
        selection: metaSelection([
          bucket.id,
          bucket.key,
          bucket.description,
          bucket.type,
          bucket.isPublic
        ])
      }, signal);
      return {
        truncated: result.truncated,
        rows: result.rows.map((row): StorageRow => ({
        family: family.namespace,
        id: row[bucket.id],
        key: row[bucket.key],
        description: bucket.description ? row[bucket.description] : undefined,
        type: bucket.type ? row[bucket.type] : undefined,
        isPublic: bucket.isPublic ? row[bucket.isPublic] : undefined
        }))
      };
    }));
  const buckets = bucketGroups.flatMap((group) => group.rows);
  const multipleFamilies = contract.families.length > 1;
  const activeBucket = buckets.find((bucket) => {
    const key = asString(bucket.key);
    return Boolean(key && (
      multipleFamilies ? scopedStorageValue(bucket.family, key) : key
    ) === selectedBucketKey);
  }) ?? buckets[0];
  const activeFamily = activeBucket
    ? contract.families.find((family) => family.namespace === activeBucket.family)
    : undefined;
  const rawBucketId = asString(activeBucket?.id);
  const fileGroups = activeFamily && rawBucketId
    ? await Promise.all(activeFamily.files.map(async (file, index) => {
      const condition = bucketCondition(schema, file.root, file.bucketId, rawBucketId);
      const result = await executeBoundedMetaConnection(runtime, endpointKind, {
        operationName: `ConsoleKitStorageMetaFiles${index}`,
        root: file.root,
        selection: metaSelection([
          file.id,
          file.key,
          file.bucketId,
          file.filename,
          file.mimeType,
          file.size,
          file.path,
          file.status,
          file.createdAt,
          file.updatedAt
        ]),
        condition
      }, signal);
      return {
        truncated: result.truncated,
        rows: result.rows.map((row): FileRow => ({
        family: activeFamily.namespace,
        namespace: file.namespace,
        id: row[file.id],
        key: row[file.key],
        bucketId: row[file.bucketId],
        filename: file.filename ? row[file.filename] : undefined,
        mimeType: file.mimeType ? row[file.mimeType] : undefined,
        size: file.size ? row[file.size] : undefined,
        path: file.path ? row[file.path] : undefined,
        status: file.status ? row[file.status] : undefined,
        createdAt: file.createdAt ? row[file.createdAt] : undefined,
        updatedAt: file.updatedAt ? row[file.updatedAt] : undefined
        }))
      };
    }))
    : [];
  return {
    buckets,
    files: fileGroups.flatMap((group) => group.rows),
    truncated: [...bucketGroups, ...fileGroups].some((group) => group.truncated)
  };
}

/**
 * Reads Constructive storage metadata without claiming object-service writes.
 * Upload, bucket creation, download signing, and deletion require storage
 * plugin operations that ordinary table mutations cannot safely replace.
 */
export function createConstructiveStorageAdapter(
  options: ConstructiveStorageAdapterOptions
): ConsoleKitFeatureAdapter<StorageFeaturePackProps> {
  const capabilities: readonly AtomicCapabilityId[] = [
    'storage.buckets',
    'storage.files'
  ];
  return {
    capabilities,
    getAvailability: () => packAvailability(options.store, 'storage'),
    subscribe(runtime, listener) {
      const unsubscribe = options.discovery.subscribe(listener);
      void options.discovery.ensure(runtime);
      return unsubscribe;
    },
    async load(runtime, signal) {
      const selectionScope = storageSelectionScope(runtime);
      const storageState = getConsoleKitStorageSlice(options.store);
      const storedSelection = storageState.storageSelection;
      const selectedBucketKey = storedSelection?.scope === selectionScope
        ? storedSelection.bucketKey
        : undefined;
      const schemas = options.discovery.getSchemas();
      const endpointPriority: readonly ConsoleEndpointKind[] = [
        'storage',
        'admin',
        'data'
      ];
      const schemaSource = endpointPriority.flatMap((kind) => {
        const schema = schemas[kind];
        const roots = schema ? storageRoots(schema) : null;
        return schema && roots ? [{ kind, schema, roots }] : [];
      })[0];
      let data;
      let truncated = false;
      if (schemaSource) {
        const { kind: endpointKind, roots, schema } = schemaSource;
        const buckets = connectionContract(
          schema,
          roots.buckets,
          ['id', 'key', 'type', 'isPublic', 'description', 'createdAt', 'updatedAt'],
          ['id', 'key']
        );
        const files = connectionContract(
          schema,
          roots.files,
          [
            'id',
            'key',
            'bucketId',
            'filename',
            'mimeType',
            'size',
            'path',
            'status',
            'createdAt',
            'updatedAt'
          ],
          ['id', 'key', 'bucketId']
        );
        const bucketResult = await executeBoundedMetaConnection(runtime, endpointKind, {
          operationName: 'ConsoleKitStorageBuckets',
          root: buckets.root,
          selection: buckets.fields.join(' ')
        }, signal);
        const bucketRows: StorageRow[] = bucketResult.rows.map((row) => ({
          family: 'storage-endpoint',
          id: row.id,
          key: row.key,
          description: row.description,
          type: row.type,
          isPublic: row.isPublic
        }));
        const activeBucket = bucketRows.find(
          (row) => asString(row.key) === selectedBucketKey
        ) ?? bucketRows[0];
        const rawBucketId = asString(activeBucket?.id);
        const fileResult = rawBucketId
          ? await executeBoundedMetaConnection(runtime, endpointKind, {
              operationName: 'ConsoleKitStorageFiles',
              root: files.root,
              selection: files.fields.join(' '),
              condition: bucketCondition(schema, files.root, 'bucketId', rawBucketId)
            }, signal)
          : { rows: [], truncated: false };
        truncated = bucketResult.truncated || fileResult.truncated;
        data = storageFeatureData(
          bucketRows,
          fileResult.rows.map((row) => ({
            family: 'storage-endpoint',
            namespace: roots.files,
            id: row.id,
            key: row.key,
            bucketId: row.bucketId,
            filename: row.filename,
            mimeType: row.mimeType,
            size: row.size,
            path: row.path,
            status: row.status,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
          })),
          selectedBucketKey,
          fileResult.truncated
        );
      } else {
        const metaSource = endpointPriority.flatMap((kind) => {
          const metadata = runtime.metadataByEndpoint?.[kind] ??
            (kind === 'data' ? runtime.metadata : undefined);
          const contract = metadata
            ? resolveStorageMetaContract(metadata)
            : null;
          return contract ? [{ kind, contract }] : [];
        })[0];
        if (!metaSource) {
          throw new Error(
            'No public endpoint _meta exposes readable bucket and file tables.'
          );
        }
        const rows = await loadStorageMetaRows(
          runtime,
          metaSource.kind,
          metaSource.contract,
          schemas[metaSource.kind],
          selectedBucketKey,
          signal
        );
        truncated = rows.truncated;
        data = storageFeatureData(
          rows.buckets,
          rows.files,
          selectedBucketKey,
          rows.truncated,
          new Set(metaSource.contract.families.flatMap((family) =>
            family.files.map((file) => file.namespace)
          )).size > 1
        );
      }

      const canSelectBucket = data.buckets.length > 1;

      return {
        resource: data.buckets.length > 0
          ? {
              status: 'ready',
              quality: 'authoritative',
              data,
              limitations: truncated
                ? [{
                    code: 'constructive.storage-result-window',
                    message:
                      `Storage is showing a bounded result window of up to ${STORAGE_META_PAGE_SIZE * STORAGE_META_MAX_PAGES} rows per table. Use Data for exhaustive inspection.`
                  }]
                : undefined
            }
          : { status: 'empty' },
        policy: {
          selectBucket: canSelectBucket,
          navigate: false,
          createBucket: false,
          upload: false,
          download: false,
          deleteObject: false
        },
        actions: {
          selectBucket: canSelectBucket
            ? async ({ bucketKey }) => {
                if (!data.buckets.some((bucket) => bucket.key === bucketKey)) {
                  throw new Error('The requested bucket is not visible to this session.');
                }
                getConsoleKitStorageSlice(options.store).selectStorageBucket(
                  selectionScope,
                  bucketKey
                );
                notifyConsoleAdapters(options.store);
              }
            : undefined
        }
      };
    }
  };
}

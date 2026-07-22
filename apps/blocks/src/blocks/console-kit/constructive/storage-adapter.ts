import type { AtomicCapabilityId } from '../../../feature-packs';
import type {
  StorageBucket,
  StorageFeaturePackProps,
  StorageObject
} from '../../feature-packs/storage/storage-feature-pack';
import type {
  ConsoleKitAdapterContext,
  ConsoleKitFeatureAdapter
} from '../console-kit-contracts';
import type { ConsoleKitStoreApi } from '../store';
import type { ConstructiveCapabilityDiscovery } from './constructive-capabilities';
import {
  asBoolean,
  asString,
  connectionNodes,
  packAvailability
} from './constructive-adapter-utils';
import {
  executeConstructiveGraphQL,
  fieldsForType,
  namedTypeName,
  selectExistingFields,
  type ConstructiveSchemaSnapshot
} from './constructive-graphql';

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
  arguments: string;
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
    fields,
    arguments: rootField.args.some((argument) => argument.name === 'first')
      ? '(first: 500)'
      : ''
  };
}

function storageDocument(
  schema: ConstructiveSchemaSnapshot,
  roots: StorageRoots
): string {
  const buckets = connectionContract(
    schema,
    roots.buckets,
    [
      'id',
      'key',
      'type',
      'isPublic',
      'description',
      'createdAt',
      'updatedAt'
    ],
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
  return `
    query ConsoleKitStorage {
      ${buckets.root}${buckets.arguments} { nodes { ${buckets.fields.join(' ')} } }
      ${files.root}${files.arguments} { nodes { ${files.fields.join(' ')} } }
    }
  `;
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
      const schema = options.discovery.getSchemas().storage;
      if (!schema) throw new Error('The storage endpoint schema is unavailable.');
      const roots = storageRoots(schema);
      if (!roots) {
        throw new Error(
          'The storage endpoint does not expose a matched buckets/files query pair.'
        );
      }
      const result = await executeConstructiveGraphQL<Record<string, unknown>>(
        runtime,
        'storage',
        storageDocument(schema, roots),
        undefined,
        signal
      );
      const fileRows = connectionNodes(result[roots.files]);
      const fileCounts = new Map<string, number>();
      for (const file of fileRows) {
        const bucketId = asString(file.bucketId);
        if (bucketId) fileCounts.set(bucketId, (fileCounts.get(bucketId) ?? 0) + 1);
      }
      const buckets: StorageBucket[] = connectionNodes(result[roots.buckets]).flatMap((bucket) => {
        const id = asString(bucket.id);
        const key = asString(bucket.key);
        if (!id || !key) return [];
        return [{
          id,
          key,
          name: asString(bucket.description) ?? key,
          access: asString(bucket.type) ?? (asBoolean(bucket.isPublic) ? 'public' : 'private'),
          objectCount: fileCounts.get(id) ?? 0
        }];
      });
      const activeBucket = buckets[0];
      const objects: StorageObject[] = activeBucket
        ? fileRows.flatMap((file) => {
            if (asString(file.bucketId) !== activeBucket.id) return [];
            const id = asString(file.id);
            const key = asString(file.key);
            if (!id || !key) return [];
            return [{
              id,
              key,
              name: fileName(key, asString(file.filename)),
              kind: 'file' as const,
              contentType: asString(file.mimeType) ?? undefined,
              sizeLabel: sizeLabel(file.size),
              updatedAt: asString(file.updatedAt) ?? asString(file.createdAt) ?? undefined
            }];
          })
        : [];

      return {
        resource: buckets.length > 0
          ? {
              status: 'ready',
              quality: 'authoritative',
              data: {
                buckets,
                activeBucketKey: activeBucket?.key,
                path: '',
                objects
              }
            }
          : { status: 'empty' },
        policy: {
          selectBucket: false,
          navigate: false,
          createBucket: false,
          upload: false,
          download: false,
          deleteObject: false
        }
      };
    }
  };
}

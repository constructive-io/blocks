import type {
  StorageBucket,
  StorageFeatureData,
  StorageFeaturePackProps,
  StorageObject
} from '../feature-packs/storage/storage-feature-pack';
import {
  executeConstructiveConnectionQuery,
  executeConstructiveGraphQL,
  selectExistingFields,
  type ConstructiveSchemaSnapshot
} from '../console-kit/constructive/constructive-graphql';
import { asBoolean, asRecord, asString } from '../console-kit/constructive/constructive-values';
import {
  scopeField,
  scopeMutation,
  scopeMutationDocument,
  scopeType,
  supportsScopeObject,
  type ScopeNames
} from './scope-names';
import { scopeEntityId, type ScopeRuntime, type ScopeSchemas, type ScopeTarget } from './scope-runtime';

/**
 * One scope's files on the app API: the buckets an entity (an organization,
 * a data room) owns and the current version of each file in one of them.
 * Uploads go through the storage plugin's `upload<Scope>File`, which signs a
 * PUT the browser sends straight to the object store.
 */
export type ScopeFilesView = Pick<StorageFeaturePackProps, 'resource' | 'policy' | 'actions'>;

type FileRow = Readonly<{ id: string; key: string; object: StorageObject }>;

/** The scope's storage on the app API, as the signed-in user reads it. */
type Storage = Readonly<{
  runtime: ScopeRuntime;
  data: ConstructiveSchemaSnapshot;
  names: ScopeNames;
  entityId?: string;
}>;

const HIDDEN_STATUSES = new Set(['rejected', 'expired']);

function sizeLabel(value: unknown): string | undefined {
  const bytes = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(bytes)) return undefined;
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? size : size.toFixed(1)} ${units[unit]}`;
}

async function sha256Hex(file: Blob): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function readBuckets({ runtime, data, names, entityId }: Storage, signal: AbortSignal): Promise<StorageBucket[]> {
  const rows = await executeConstructiveConnectionQuery(runtime, 'data', {
    operationName: `ConsoleKit${names.pascal}Buckets`,
    fieldName: scopeField(names, 'Buckets'),
    nodeSelection: selectExistingFields(data, scopeType(names, 'Bucket'), ['id', 'key', 'isPublic', 'description']).join(' '),
    ...(entityId ? { equalTo: { ownerId: entityId } } : {})
  }, signal);
  return rows.flatMap((row) => {
    const id = asString(row.id);
    const key = asString(row.key);
    return id && key ? [{ id, key, name: key, access: asBoolean(row.isPublic) ? 'public' : 'private' }] : [];
  });
}

// Every page of the bucket's files, current versions only.
async function readFiles({ runtime, data, names }: Storage, bucketId: string, signal: AbortSignal): Promise<FileRow[]> {
  const rows = await executeConstructiveConnectionQuery(runtime, 'data', {
    operationName: `ConsoleKit${names.pascal}Files`,
    fieldName: scopeField(names, 'Files'),
    nodeSelection: selectExistingFields(data, scopeType(names, 'File'), [
      'id', 'key', 'filename', 'mimeType', 'size', 'status', 'updatedAt', 'isLatest'
    ]).join(' '),
    equalTo: { bucketId }
  }, signal);
  return rows.flatMap((row) => {
    const id = asString(row.id);
    const key = asString(row.key);
    if (!id || !key) return [];
    if (row.isLatest === false || HIDDEN_STATUSES.has(asString(row.status) ?? '')) return [];
    return [{
      id,
      key,
      object: {
        id,
        key,
        name: asString(row.filename) ?? key,
        kind: 'file',
        contentType: asString(row.mimeType) ?? undefined,
        sizeLabel: sizeLabel(row.size),
        updatedAt: asString(row.updatedAt) ?? undefined
      }
    }];
  });
}

// Signs one upload and sends the bytes; a file the bucket already holds isn't sent again.
async function uploadFile({ runtime, names, entityId }: Storage, bucketKey: string, file: File): Promise<void> {
  const result = await executeConstructiveGraphQL<Record<string, unknown>>(
    runtime,
    'data',
    scopeMutationDocument(names, 'upload', 'File', 'uploadUrl uploadHeaders deduplicated'),
    {
      input: {
        bucketKey,
        ...(entityId ? { ownerId: entityId } : {}),
        contentHash: await sha256Hex(file),
        contentType: file.type || 'application/octet-stream',
        size: file.size,
        filename: file.name
      }
    }
  );
  const payload = asRecord(result[scopeMutation(names, 'upload', 'File')]);
  if (asBoolean(payload?.deduplicated)) return;
  const url = asString(payload?.uploadUrl);
  if (!url) throw new Error(`${file.name} got no upload address.`);
  const headers = Object.fromEntries(
    Object.entries(asRecord(payload?.uploadHeaders) ?? {}).flatMap(([name, value]) =>
      typeof value === 'string' ? [[name, value]] : []
    )
  );
  const put = await fetch(url, { method: 'PUT', headers, body: file });
  if (!put.ok) throw new Error(`${file.name} could not be uploaded (${put.status}).`);
}

// An entity type a blueprint declares comes with its buckets; one made
// without any gets them here, when the API offers the scope's create and the
// user may (its RLS decides). A new bucket is the session user's.
function bucketCreator(
  { runtime, data, names, entityId }: Storage,
  onChange: (bucketKey?: string) => void
): NonNullable<ScopeFilesView['actions']>['createBucket'] {
  const accepts = (fields: readonly string[]) => supportsScopeObject(data, names, 'create', 'Bucket', fields);
  if (!accepts(['key', ...(entityId ? ['ownerId'] : [])])) return undefined;
  const actorId = runtime.session.status === 'authenticated' ? runtime.session.identity.subjectId : undefined;
  return async ({ name, access }) => {
    const bucket: Record<string, unknown> = { key: name, ...(entityId ? { ownerId: entityId } : {}) };
    if (actorId && accepts(['actorId'])) bucket.actorId = actorId;
    if (accepts(['isPublic'])) bucket.isPublic = access === 'public';
    await executeConstructiveGraphQL(runtime, 'data', scopeMutationDocument(names, 'create', 'Bucket'), {
      input: { [scopeField(names, 'Bucket')]: bucket }
    });
    onChange(name);
  };
}

/** Reads the files view of one scope's entity, with the actions its API allows. */
export async function loadScopeFiles(
  runtime: ScopeRuntime,
  schemas: ScopeSchemas,
  target: ScopeTarget,
  selectedBucketKey: string | undefined,
  onChange: (bucketKey?: string) => void,
  signal: AbortSignal
): Promise<ScopeFilesView> {
  const { names } = target;
  const data = schemas.data;
  if (!data?.queryFields[scopeField(names, 'Buckets')] || !data.queryFields[scopeField(names, 'Files')]) {
    return { resource: { status: 'empty' } };
  }
  const storage: Storage = { runtime, data, names, entityId: scopeEntityId(target) };
  const buckets = await readBuckets(storage, signal);
  const createBucket = bucketCreator(storage, onChange);
  if (buckets.length === 0) {
    return createBucket
      ? {
          resource: { status: 'ready', quality: 'authoritative', data: { buckets: [], objects: [] } },
          policy: { createBucket: true },
          actions: { createBucket }
        }
      : { resource: { status: 'empty' } };
  }

  const active = buckets.find((bucket) => bucket.key === selectedBucketKey) ?? buckets[0]!;
  const files = await readFiles(storage, active.id, signal);
  const fileByKey = new Map(files.map((file) => [file.key, file] as const));
  const known = (objectKey: string) => {
    const file = fileByKey.get(objectKey);
    if (!file) throw new Error('The requested file is not in the current authorized resource.');
    return file;
  };
  const canUpload = Boolean(data.mutationFields[scopeMutation(names, 'upload', 'File')]);
  const canDownload = Boolean(data.types[scopeType(names, 'File')]?.fields.some((field) => field.name === 'downloadUrl'));
  const canDelete = Boolean(data.mutationFields[scopeMutation(names, 'delete', 'File')]);

  // Every page of the open bucket's files is loaded, so its count is exact;
  // the other buckets' counts stay unknown until they are opened.
  const view: StorageFeatureData = {
    buckets: buckets.map((bucket) => (bucket === active ? { ...bucket, objectCount: files.length } : bucket)),
    activeBucketKey: active.key,
    objects: files.map((file) => file.object)
  };

  return {
    resource: { status: 'ready', quality: 'authoritative', data: view },
    policy: {
      selectBucket: buckets.length > 1,
      navigate: false,
      createBucket: Boolean(createBucket),
      upload: canUpload,
      download: canDownload,
      deleteObject: canDelete
    },
    actions: {
      createBucket,
      selectBucket: buckets.length > 1
        ? ({ bucketKey }) => {
            if (!buckets.some((bucket) => bucket.key === bucketKey)) {
              throw new Error('The requested bucket is not visible to this session.');
            }
            onChange(bucketKey);
          }
        : undefined,
      upload: canUpload
        ? async ({ files: chosen }) => {
            for (const file of chosen) await uploadFile(storage, active.key, file);
            onChange(active.key);
          }
        : undefined,
      download: canDownload
        ? async ({ objectKey }) => {
            const file = known(objectKey);
            const rows = await executeConstructiveConnectionQuery(runtime, 'data', {
              operationName: `ConsoleKit${names.pascal}FileDownload`,
              fieldName: scopeField(names, 'Files'),
              nodeSelection: 'id downloadUrl',
              equalTo: { id: file.id }
            });
            const url = asString(rows[0]?.downloadUrl);
            if (!url) throw new Error('This file has no download address for you yet.');
            globalThis.open?.(url, '_blank', 'noopener');
          }
        : undefined,
      deleteObject: canDelete
        ? async ({ objectKey }) => {
            await executeConstructiveGraphQL(
              runtime,
              'data',
              scopeMutationDocument(names, 'delete', 'File', 'clientMutationId'),
              { input: { id: known(objectKey).id } }
            );
            onChange(active.key);
          }
        : undefined
    }
  };
}

import type {
  StorageFeatureData,
  StorageFeaturePackProps,
  StorageObject
} from '../feature-packs/storage/storage-feature-pack';
import {
  executeConstructiveConnectionQuery,
  executeConstructiveGraphQL,
  selectExistingFields
} from '../console-kit/constructive/constructive-graphql';
import { asBoolean, asRecord, asString } from '../console-kit/constructive/constructive-values';
import { scopeEntityId, type ScopeRuntime, type ScopeSchemas, type ScopeTarget } from './scope-access-load';
import { scopeField, scopeMutation, scopeType } from './scope-names';

/**
 * One scope's files on the app API: the buckets an entity (an organization,
 * a data room) owns and the current version of each file in one of them.
 * Uploads go through the storage plugin's `upload<Scope>File`, which signs a
 * PUT the browser sends straight to the object store.
 */
export type ScopeFilesView = Pick<StorageFeaturePackProps, 'resource' | 'policy' | 'actions'>;

type FileRow = Readonly<{ id: string; key: string; object: StorageObject }>;

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
  const entityId = scopeEntityId(target);
  const data = schemas.data;
  const bucketsRoot = scopeField(names, 'Buckets');
  const filesRoot = scopeField(names, 'Files');
  if (!data?.queryFields[bucketsRoot] || !data.queryFields[filesRoot]) {
    return { resource: { status: 'empty' } };
  }
  const ofEntity = entityId ? { ownerId: entityId } : undefined;
  const bucketRows = await executeConstructiveConnectionQuery(runtime, 'data', {
    operationName: `ConsoleKit${names.pascal}Buckets`,
    fieldName: bucketsRoot,
    nodeSelection: selectExistingFields(data, scopeType(names, 'Bucket'), ['id', 'key', 'isPublic', 'description']).join(' '),
    ...(ofEntity ? { equalTo: ofEntity } : {})
  }, signal);
  const buckets = bucketRows.flatMap((row) => {
    const id = asString(row.id);
    const key = asString(row.key);
    return id && key
      ? [{ id, key, name: key, access: asBoolean(row.isPublic) ? 'public' : 'private' } as const]
      : [];
  });
  if (buckets.length === 0) return { resource: { status: 'empty' } };
  const active = buckets.find((bucket) => bucket.key === selectedBucketKey) ?? buckets[0]!;

  const fileFields = selectExistingFields(data, scopeType(names, 'File'), [
    'id', 'key', 'filename', 'mimeType', 'size', 'status', 'updatedAt', 'isLatest'
  ]);
  const fileRows = await executeConstructiveConnectionQuery(runtime, 'data', {
    operationName: `ConsoleKit${names.pascal}Files`,
    fieldName: filesRoot,
    nodeSelection: fileFields.join(' '),
    equalTo: { bucketId: active.id }
  }, signal);
  const files: FileRow[] = fileRows.flatMap((row) => {
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
  const fileByKey = new Map(files.map((file) => [file.key, file] as const));

  const uploadMutation = scopeMutation(names, 'upload', 'File');
  const deleteMutation = scopeMutation(names, 'delete', 'File');
  const canUpload = Boolean(data.mutationFields[uploadMutation]);
  const canDownload = Boolean(data.types[scopeType(names, 'File')]?.fields.some((field) => field.name === 'downloadUrl'));
  const canDelete = Boolean(data.mutationFields[deleteMutation]);
  const operation = (mutation: string) => mutation[0]!.toUpperCase() + mutation.slice(1);
  const known = (objectKey: string) => {
    const file = fileByKey.get(objectKey);
    if (!file) throw new Error('The requested file is not in the current authorized resource.');
    return file;
  };

  const view: StorageFeatureData = {
    buckets,
    activeBucketKey: active.key,
    objects: files.map((file) => file.object)
  };

  return {
    resource: { status: 'ready', quality: 'authoritative', data: view },
    policy: {
      selectBucket: buckets.length > 1,
      navigate: false,
      createBucket: false,
      upload: canUpload,
      download: canDownload,
      deleteObject: canDelete
    },
    actions: {
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
            for (const file of chosen) {
              const contentHash = await sha256Hex(file);
              const result = await executeConstructiveGraphQL<Record<string, unknown>>(
                runtime,
                'data',
                `mutation ConsoleKit${operation(uploadMutation)}($input: ${operation(uploadMutation)}Input!) {
                  ${uploadMutation}(input: $input) { uploadUrl uploadHeaders deduplicated }
                }`,
                {
                  input: {
                    bucketKey: active.key,
                    ...(entityId ? { ownerId: entityId } : {}),
                    contentHash,
                    contentType: file.type || 'application/octet-stream',
                    size: file.size,
                    filename: file.name
                  }
                }
              );
              const payload = asRecord(result[uploadMutation]);
              if (asBoolean(payload?.deduplicated)) continue;
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
            onChange(active.key);
          }
        : undefined,
      download: canDownload
        ? async ({ objectKey }) => {
            const file = known(objectKey);
            const rows = await executeConstructiveConnectionQuery(runtime, 'data', {
              operationName: `ConsoleKit${names.pascal}FileDownload`,
              fieldName: filesRoot,
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
            const file = known(objectKey);
            await executeConstructiveGraphQL(
              runtime,
              'data',
              `mutation ConsoleKit${operation(deleteMutation)}($input: ${operation(deleteMutation)}Input!) {
                ${deleteMutation}(input: $input) { clientMutationId }
              }`,
              { input: { id: file.id } }
            );
            onChange(active.key);
          }
        : undefined
    }
  };
}

import type { MetaschemaField, MetaschemaTable } from '@constructive-io/data';

import type { ConsoleKitMetadataState } from '../../console-kit/console-kit-contracts';
import {
  canonicalMetaName,
  compatibleMetaTables,
  isConstructiveGraphQLName,
  metaFieldName,
  metaPrimaryKeyField,
  metaTableNames,
  metaTableNamespace,
  readableMetaTable,
  type ConstructiveMetaTableContract
} from '../../console-kit/constructive/constructive-meta-utils';

type ConstructiveStorageBucketContract = ConstructiveMetaTableContract & Readonly<{
  namespace: string;
  id: string;
  key: string;
  description?: string;
  type?: string;
  isPublic?: string;
}>;

type ConstructiveStorageFileContract = ConstructiveMetaTableContract & Readonly<{
  namespace: string;
  id: string;
  key: string;
  bucketId: string;
  filename?: string;
  mimeType?: string;
  size?: string;
  path?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}>;

export type ConstructiveStorageMetaContract = Readonly<{
  families: readonly Readonly<{
    namespace: string;
    bucket: ConstructiveStorageBucketContract;
    files: readonly ConstructiveStorageFileContract[];
  }>[];
}>;

type StorageBucketCandidate = Readonly<{
  contract: ConstructiveStorageBucketContract;
  table: MetaschemaTable;
}>;

type StorageFileCandidate = Readonly<{
  contract: Omit<ConstructiveStorageFileContract, 'bucketId'>;
  table: MetaschemaTable;
}>;

type StorageReference = Readonly<{
  bucket: StorageBucketCandidate;
  bucketId: string;
}>;

function storageTableContract(
  table: MetaschemaTable
): ConstructiveMetaTableContract | null {
  return table.storage ? readableMetaTable(table) : null;
}

function referencedStorageBucket(
  file: MetaschemaTable,
  buckets: readonly StorageBucketCandidate[]
): StorageReference | null {
  const references: StorageReference[] = [];
  const addReference = (
    target: string | null | undefined,
    keys: Array<MetaschemaField | null> | null | undefined,
    referencedFields?: readonly (string | null)[] | null
  ) => {
    if (!target) return;
    const canonicalTarget = canonicalMetaName(target);
    const candidates = buckets.filter(({ table }) =>
      target === metaTableNamespace(table) ||
      metaTableNames(table).includes(canonicalTarget)
    );
    const localKeys = (keys ?? []).filter(
      (field): field is MetaschemaField =>
        field != null && isConstructiveGraphQLName(field.name)
    );
    if (candidates.length !== 1 || localKeys.length !== 1) {
      if (candidates.length > 0) {
        references.push(...candidates.map((bucket) => ({
          bucket,
          bucketId: ''
        })));
      }
      return;
    }
    const [candidate] = candidates;
    const explicitTargetFields = (referencedFields ?? []).filter(
      (field): field is string =>
        Boolean(field && isConstructiveGraphQLName(field))
    );
    if (
      explicitTargetFields.length > 0 &&
      (
        explicitTargetFields.length !== 1 ||
        explicitTargetFields[0] !== candidate?.contract.id
      )
    ) {
      references.push({ bucket: candidate!, bucketId: '' });
      return;
    }
    references.push({ bucket: candidate!, bucketId: localKeys[0]!.name });
  };

  for (const relation of file.relations?.belongsTo ?? []) {
    if (!relation) continue;
    addReference(relation.references.name, relation.keys);
  }

  const current = file.constraints && !Array.isArray(file.constraints)
    ? file.constraints.foreignKey
    : undefined;
  for (const foreignKey of [
    ...(current ?? []),
    ...(file.foreignKeyConstraints ?? [])
  ]) {
    if (!foreignKey) continue;
    addReference(
      foreignKey.refTable?.name ?? foreignKey.referencedTable,
      foreignKey.fields,
      foreignKey.refFields?.map((field) => field?.name ?? null) ??
        foreignKey.referencedFields
    );
  }

  const distinct = new Map(references.map((reference) => [
    `${reference.bucket.contract.namespace}\u0000${reference.bucketId}`,
    reference
  ]));
  return distinct.size === 1 && [...distinct.values()][0]?.bucketId
    ? [...distinct.values()][0]!
    : null;
}

/**
 * Resolves readable bucket/file families from `_meta.storage`. Every files
 * table must identify exactly one buckets table through belongsTo/FK metadata;
 * otherwise storage is unavailable rather than cross-joining opaque IDs.
 */
export function resolveStorageMetaContract(
  metadata: ConsoleKitMetadataState
): ConstructiveStorageMetaContract | null {
  const tables = compatibleMetaTables(metadata);
  const bucketTables = tables.filter(
    (table) => table.storage?.isBucketsTable === true
  );
  const fileTables = tables.filter(
    (table) => table.storage?.isFilesTable === true
  );
  const buckets: StorageBucketCandidate[] = bucketTables.flatMap((table) => {
    const readable = storageTableContract(table);
    const id = metaPrimaryKeyField(table);
    const key = metaFieldName(table, ['key', 'name', 'slug']);
    if (!readable || !id || !key) return [];
    return [{
      table,
      contract: {
        ...readable,
        namespace: metaTableNamespace(table),
        id,
        key,
        description: metaFieldName(
          table,
          ['description', 'displayname', 'title']
        ),
        type: metaFieldName(table, ['type', 'accesstype', 'access']),
        isPublic: metaFieldName(table, ['ispublic', 'public'])
      }
    }];
  });
  const files: StorageFileCandidate[] = fileTables.flatMap((table) => {
    const readable = storageTableContract(table);
    const id = metaPrimaryKeyField(table);
    const key = metaFieldName(table, ['key', 'objectkey', 'path']);
    if (!readable || !id || !key) return [];
    return [{
      table,
      contract: {
        ...readable,
        namespace: metaTableNamespace(table),
        id,
        key,
        filename: metaFieldName(table, ['filename', 'name']),
        mimeType: metaFieldName(table, ['mimetype', 'contenttype']),
        size: metaFieldName(table, ['size', 'bytes', 'filesize']),
        path: metaFieldName(table, ['path']),
        status: metaFieldName(table, ['status', 'state']),
        createdAt: metaFieldName(table, ['createdat']),
        updatedAt: metaFieldName(table, ['updatedat', 'modifiedat'])
      }
    }];
  });
  if (buckets.length === 0 || files.length === 0) return null;

  const families = new Map<string, {
    namespace: string;
    bucket: ConstructiveStorageBucketContract;
    files: ConstructiveStorageFileContract[];
  }>();
  for (const file of files) {
    const reference = referencedStorageBucket(file.table, buckets);
    if (!reference) return null;
    const namespace = reference.bucket.contract.namespace;
    const family = families.get(namespace) ?? {
      namespace,
      bucket: reference.bucket.contract,
      files: []
    };
    family.files.push({ ...file.contract, bucketId: reference.bucketId });
    families.set(namespace, family);
  }

  return families.size > 0 ? { families: [...families.values()] } : null;
}

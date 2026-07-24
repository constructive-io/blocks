import type { MetaschemaField, MetaschemaTable } from '@constructive-io/data';
import { describe, expect, it } from 'vitest';

import type { ConsoleKitMetadataState } from '../console-kit-contracts';
import {
  resolveApplicationOrganizationContract
} from '../../feature-packs/organizations/organizations-meta-contract';
import {
  resolveStorageMetaContract
} from '../../feature-packs/storage/storage-meta-contract';

function field(name: string): MetaschemaField {
  return {
    name,
    type: { gqlType: 'String', isArray: false, pgType: 'text' }
  };
}

function table(input: Readonly<{
  name: string;
  root: string;
  fields: readonly string[];
  primaryKey?: string;
}>): MetaschemaTable {
  const tableFields = input.fields.map(field);
  const primaryKey = tableFields.find((candidate) => candidate.name === input.primaryKey);
  return {
    name: input.name,
    query: { all: input.root },
    fields: tableFields,
    primaryKeyConstraints: primaryKey
      ? [{ name: `${input.name}_pkey`, fields: [primaryKey] }]
      : []
  };
}

function metadata(tables: readonly MetaschemaTable[]): ConsoleKitMetadataState {
  return {
    status: 'compatible',
    meta: { _meta: { tables: [...tables] } },
    contractIntrospection: {},
    introspection: {}
  } as ConsoleKitMetadataState;
}

describe('Constructive _meta feature contracts', () => {
  it('resolves application organizations and members from inflected roots and relations', () => {
    const organizations = table({
      name: 'organizations',
      root: 'tenantOrganizations',
      fields: ['id', 'displayName', 'slug', 'logoUrl'],
      primaryKey: 'id'
    });
    const members = table({
      name: 'members',
      root: 'visibleTenantMembers',
      fields: ['id', 'organizationId', 'userId', 'role', 'joinedAt'],
      primaryKey: 'id'
    });
    members.relations = {
      belongsTo: [{
        isUnique: false,
        keys: [field('organizationId')],
        references: { name: 'organizations' }
      }]
    };

    expect(resolveApplicationOrganizationContract(
      metadata([organizations, members])
    )).toMatchObject({
      organizations: {
        root: 'tenantOrganizations',
        id: 'id',
        name: 'displayName',
        slug: 'slug',
        avatar: 'logoUrl'
      },
      members: {
        root: 'visibleTenantMembers',
        id: 'id',
        organizationId: 'organizationId',
        userId: 'userId',
        role: 'role',
        joinedAt: 'joinedAt'
      }
    });
  });

  it('does not attach a member-shaped table without an explicit organization relation', () => {
    const organizations = table({
      name: 'organizations',
      root: 'organizations',
      fields: ['id', 'name'],
      primaryKey: 'id'
    });
    const members = table({
      name: 'members',
      root: 'members',
      fields: ['id', 'organizationId', 'role'],
      primaryKey: 'id'
    });

    const contract = resolveApplicationOrganizationContract(
      metadata([organizations, members])
    );
    expect(contract).toMatchObject({
      organizations: { root: 'organizations' }
    });
    expect(contract?.members).toBeUndefined();
  });

  it('resolves storage tables from _meta flags instead of fixed GraphQL roots', () => {
    const buckets = table({
      name: 'workspace_buckets',
      root: 'workspaceBuckets',
      fields: ['id', 'key', 'description', 'isPublic'],
      primaryKey: 'id'
    });
    buckets.storage = { isBucketsTable: true, isFilesTable: false };
    const files = table({
      name: 'workspace_files',
      root: 'workspaceFiles',
      fields: ['id', 'key', 'bucketId', 'filename', 'mimeType', 'size'],
      primaryKey: 'id'
    });
    files.storage = { isBucketsTable: false, isFilesTable: true };
    files.relations = {
      belongsTo: [{
        isUnique: false,
        keys: [field('bucketId')],
        references: { name: 'workspace_buckets' }
      }]
    };

    expect(resolveStorageMetaContract(metadata([buckets, files]))).toMatchObject({
      families: [{
        namespace: 'workspace_buckets',
        bucket: {
          root: 'workspaceBuckets',
          id: 'id',
          key: 'key',
          description: 'description',
          isPublic: 'isPublic'
        },
        files: [{
          root: 'workspaceFiles',
          id: 'id',
          key: 'key',
          bucketId: 'bucketId',
          filename: 'filename',
          mimeType: 'mimeType',
          size: 'size'
        }]
      }]
    });
  });

  it('matches live storage relation targets through current _meta inflections', () => {
    const buckets = table({
      name: 'Bucket',
      root: 'buckets',
      fields: ['id', 'key'],
      primaryKey: 'id'
    });
    buckets.schemaName = 'tenant-storage-public';
    buckets.inflection = { allRows: 'buckets' };
    buckets.storage = { isBucketsTable: true, isFilesTable: false };
    const files = table({
      name: 'File',
      root: 'files',
      fields: ['id', 'key', 'bucketId'],
      primaryKey: 'id'
    });
    files.schemaName = 'tenant-storage-public';
    files.inflection = { allRows: 'files' };
    files.storage = { isBucketsTable: false, isFilesTable: true };
    files.relations = {
      belongsTo: [{
        fieldName: 'bucketsByMyBucketId',
        isUnique: false,
        keys: [field('bucketId')],
        references: { name: 'buckets' }
      }]
    };

    expect(resolveStorageMetaContract(metadata([buckets, files]))).toMatchObject({
      families: [{
        namespace: 'tenant-storage-public.Bucket',
        bucket: { root: 'buckets', id: 'id', key: 'key' },
        files: [{ root: 'files', bucketId: 'bucketId' }]
      }]
    });
  });

  it('rejects an explicit composite primary key instead of collapsing it to id', () => {
    const organizations = table({
      name: 'organizations',
      root: 'organizations',
      fields: ['tenantId', 'id', 'name'],
      primaryKey: 'id'
    });
    const tableFields = organizations.fields?.filter(
      (candidate): candidate is MetaschemaField => candidate != null
    ) ?? [];
    organizations.constraints = {
      primaryKey: {
        name: 'organizations_pkey',
        fields: tableFields.filter((candidate) =>
          candidate.name === 'tenantId' || candidate.name === 'id'
        )
      }
    };

    expect(resolveApplicationOrganizationContract(metadata([organizations]))).toBeNull();
  });

  it('pairs multiple storage families by explicit relations even when raw IDs can overlap', () => {
    const documents = table({
      name: 'document_buckets',
      root: 'documentBuckets',
      fields: ['id', 'key'],
      primaryKey: 'id'
    });
    documents.storage = { isBucketsTable: true, isFilesTable: false };
    const media = table({
      name: 'media_buckets',
      root: 'mediaBuckets',
      fields: ['id', 'key'],
      primaryKey: 'id'
    });
    media.storage = { isBucketsTable: true, isFilesTable: false };
    const documentFiles = table({
      name: 'document_files',
      root: 'documentFiles',
      fields: ['id', 'key', 'bucketId'],
      primaryKey: 'id'
    });
    documentFiles.storage = { isBucketsTable: false, isFilesTable: true };
    documentFiles.relations = {
      belongsTo: [{
        isUnique: false,
        keys: [field('bucketId')],
        references: { name: 'document_buckets' }
      }]
    };
    const mediaFiles = table({
      name: 'media_files',
      root: 'mediaFiles',
      fields: ['id', 'key', 'bucketId'],
      primaryKey: 'id'
    });
    mediaFiles.storage = { isBucketsTable: false, isFilesTable: true };
    mediaFiles.relations = {
      belongsTo: [{
        isUnique: false,
        keys: [field('bucketId')],
        references: { name: 'media_buckets' }
      }]
    };

    expect(resolveStorageMetaContract(metadata([
      documents,
      media,
      documentFiles,
      mediaFiles
    ]))?.families.map((family) => ({
      namespace: family.namespace,
      files: family.files.map((file) => file.root)
    }))).toEqual([
      { namespace: 'document_buckets', files: ['documentFiles'] },
      { namespace: 'media_buckets', files: ['mediaFiles'] }
    ]);
  });

  it('fails closed when a storage file table has no unique bucket relation', () => {
    const first = table({
      name: 'first_buckets',
      root: 'firstBuckets',
      fields: ['id', 'key'],
      primaryKey: 'id'
    });
    first.storage = { isBucketsTable: true, isFilesTable: false };
    const second = table({
      name: 'second_buckets',
      root: 'secondBuckets',
      fields: ['id', 'key'],
      primaryKey: 'id'
    });
    second.storage = { isBucketsTable: true, isFilesTable: false };
    const files = table({
      name: 'files',
      root: 'files',
      fields: ['id', 'key', 'bucketId'],
      primaryKey: 'id'
    });
    files.storage = { isBucketsTable: false, isFilesTable: true };
    files.relations = {
      belongsTo: [
        {
          isUnique: false,
          keys: [field('bucketId')],
          references: { name: 'first_buckets' }
        },
        {
          isUnique: false,
          keys: [field('bucketId')],
          references: { name: 'second_buckets' }
        }
      ]
    };

    expect(resolveStorageMetaContract(metadata([first, second, files]))).toBeNull();
    files.relations = { belongsTo: [] };
    expect(resolveStorageMetaContract(metadata([first, files]))).toBeNull();
  });
});

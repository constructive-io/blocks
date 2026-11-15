import { describe, expect, it } from 'vitest';

import type { IdentityScopedConsoleTransport } from '../console-runtime';
import type {
  ConstructiveSchemaSnapshot,
  ConstructiveSchemaType
} from '../console-kit/constructive/constructive-graphql';
import type { ScopeRuntime } from './scope-runtime';
import { loadScopeFiles } from './scope-files';
import { scopeNames } from './scope-names';

type Call = Readonly<{ document: string; variables?: Record<string, unknown> }>;

const objectType = (name: string, fields: readonly string[]): ConstructiveSchemaType => ({
  kind: 'OBJECT',
  name,
  fields: fields.map((field) => ({ name: field, args: [], type: { kind: 'OBJECT', name: 'String' } })),
  inputFields: []
});

const inputType = (name: string, fields: readonly string[]): ConstructiveSchemaType => ({
  kind: 'INPUT_OBJECT',
  name,
  fields: [],
  inputFields: fields.map((field) => ({ name: field, type: { kind: 'INPUT_OBJECT', name: `${name}Field` } }))
});

// A custom entity type's storage: buckets and files, and a bucket create, but no bucket yet.
const DATA: ConstructiveSchemaSnapshot = {
  endpointKind: 'data',
  endpointId: 'data-endpoint',
  queryFields: {
    propertiesBuckets: { name: 'propertiesBuckets', args: [], type: { kind: 'OBJECT', name: 'PropertiesBucketConnection' } },
    propertiesFiles: { name: 'propertiesFiles', args: [], type: { kind: 'OBJECT', name: 'PropertiesFileConnection' } }
  },
  mutationFields: {
    createPropertiesBucket: {
      name: 'createPropertiesBucket',
      args: [{ name: 'input', type: { kind: 'NON_NULL', ofType: { kind: 'INPUT_OBJECT', name: 'CreatePropertiesBucketInput' } } }],
      type: { kind: 'OBJECT', name: 'Payload' }
    }
  },
  types: Object.fromEntries([
    objectType('PropertiesBucket', ['id', 'key', 'isPublic']),
    inputType('CreatePropertiesBucketInput', ['propertiesBucket']),
    inputType('CreatePropertiesBucketInputField', ['key', 'ownerId', 'actorId', 'isPublic'])
  ].map((type) => [type.name, type]))
};

function runtime(calls: Call[]): ScopeRuntime {
  const identity = { kind: 'authenticated', cachePartition: 'session-1', subjectId: 'manager-1' } as const;
  const endpoint = { id: 'data-endpoint', kind: 'data', url: '/data/graphql' } as const;
  return {
    endpoints: { data: endpoint },
    session: { status: 'authenticated', identity },
    transportFor: () => ({
      scope: { endpoint, identity, getAccessToken: () => null },
      execute: async ({ document, variables }: Call) => {
        calls.push({ document, variables });
        const field = /\b(propertiesBuckets|propertiesFiles)\(/u.exec(document)?.[1];
        return { ok: true, data: field ? { [field]: { nodes: [] } } : {} };
      }
    }) as unknown as IdentityScopedConsoleTransport
  };
}

describe('scope files', () => {
  it("offers the scope's bucket create when an entity has no bucket, as its user", async () => {
    const calls: Call[] = [];
    const changes: Array<string | undefined> = [];
    const view = await loadScopeFiles(
      runtime(calls),
      { data: DATA },
      { names: scopeNames('properties'), entityId: 'property-1' },
      undefined,
      (key) => changes.push(key),
      new AbortController().signal
    );

    expect(view.resource).toMatchObject({ status: 'ready', data: { buckets: [], objects: [] } });
    expect(view.policy?.createBucket).toBe(true);

    calls.length = 0;
    await view.actions?.createBucket?.({ name: 'inspections', access: 'private' });
    expect(calls[0]?.document).toContain('createPropertiesBucket(input: $input)');
    expect(calls[0]?.variables).toEqual({
      input: { propertiesBucket: { key: 'inspections', ownerId: 'property-1', actorId: 'manager-1', isPublic: false } }
    });
    // The panel reloads on the new bucket.
    expect(changes).toEqual(['inspections']);
  });
});

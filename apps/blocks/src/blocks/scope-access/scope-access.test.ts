import { describe, expect, it } from 'vitest';

import type {
  ConsoleEndpointKind,
  IdentityScopedConsoleTransport
} from '../console-runtime';
import type {
  ConstructiveSchemaSnapshot,
  ConstructiveSchemaType
} from '../console-kit/constructive/constructive-graphql';
import { loadPendingInvites } from './pending-invites-load';
import { loadScopeAccess } from './scope-access-load';
import type { ScopeRuntime } from './scope-runtime';
import { scopeAccessView } from './scope-access-view';
import { scopeMutationDocument, scopeNames } from './scope-names';

type Call = Readonly<{ endpoint: ConsoleEndpointKind; document: string; variables?: Record<string, unknown> }>;

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

function snapshot(
  endpoint: 'admin' | 'auth',
  queries: readonly string[],
  mutations: Readonly<Record<string, string>>,
  types: readonly ConstructiveSchemaType[]
): ConstructiveSchemaSnapshot {
  return {
    endpointKind: endpoint,
    endpointId: `${endpoint}-endpoint`,
    queryFields: Object.fromEntries(queries.map((name) => [name, { name, args: [], type: { kind: 'OBJECT', name } }])),
    mutationFields: Object.fromEntries(Object.entries(mutations).map(([name, input]) => [name, {
      name,
      args: [{ name: 'input', type: { kind: 'NON_NULL', ofType: { kind: 'INPUT_OBJECT', name: input } } }],
      type: { kind: 'OBJECT', name: 'Payload' }
    }])),
    types: Object.fromEntries(types.map((type) => [type.name, type]))
  };
}

function runtime(responder: (call: Call) => unknown, calls: Call[]): ScopeRuntime {
  const identity = { kind: 'authenticated', cachePartition: 'session-1', subjectId: 'owner-1' } as const;
  const endpoints = {
    admin: { id: 'admin-endpoint', kind: 'admin', url: '/admin/graphql' },
    auth: { id: 'auth-endpoint', kind: 'auth', url: '/auth/graphql' }
  } as const;
  return {
    endpoints,
    session: { status: 'authenticated', identity },
    transportFor: (endpoint) => {
      const configured = endpoints[endpoint as keyof typeof endpoints];
      if (!configured) return null;
      return {
        scope: { endpoint: configured, identity, getAccessToken: () => null },
        execute: async ({ document, variables }: { document: string; variables?: Record<string, unknown> }) => {
          const call = { endpoint, document, variables };
          calls.push(call);
          return { ok: true, data: responder(call) };
        }
      } as unknown as IdentityScopedConsoleTransport;
    }
  };
}

// The data room scope as a fundraise database's admin API has it.
const ROOM_ADMIN = snapshot(
  'admin',
  ['dataRoomMemberships', 'dataRoomInvites', 'dataRoomCapabilities', 'dataRoomCapabilityDefaults'],
  {
    updateDataRoomMembership: 'UpdateDataRoomMembershipInput',
    createDataRoomInvite: 'CreateDataRoomInviteInput',
    createDataRoomOwnerGrant: 'CreateDataRoomOwnerGrantInput',
    createDataRoomProfile: 'CreateDataRoomProfileInput'
  },
  [
    objectType('DataRoomMembership', [
      'id', 'actorId', 'isOwner', 'isAdmin', 'isActive', 'isApproved', 'isBanned',
      'isDisabled', 'capabilities', 'granted', 'entityId'
    ]),
    objectType('DataRoomInvite', ['id', 'email', 'senderId', 'inviteValid', 'entityId']),
    objectType('DataRoomCapability', ['id', 'name', 'bitstr']),
    objectType('DataRoomCapabilityDefault', ['id', 'capabilities', 'entityId']),
    inputType('UpdateDataRoomMembershipInput', ['id', 'dataRoomMembershipPatch']),
    inputType('UpdateDataRoomMembershipInputField', ['isApproved', 'isBanned', 'isDisabled']),
    inputType('CreateDataRoomInviteInput', ['dataRoomInvite']),
    inputType('CreateDataRoomInviteInputField', ['email', 'channel', 'entityId']),
    inputType('CreateDataRoomOwnerGrantInput', ['dataRoomOwnerGrant']),
    inputType('CreateDataRoomOwnerGrantInputField', ['actorId', 'isGrant', 'entityId']),
    inputType('CreateDataRoomProfileInput', ['dataRoomProfile']),
    inputType('CreateDataRoomProfileInputField', ['name', 'slug', 'capabilities', 'entityId'])
  ]
);

const ROOM = { names: scopeNames('data_room'), entityId: '0b6c2c1e-5a3f-4b7a-9d55-2f4c9d1a7e01' };

const rows = (call: Call) => {
  if (call.document.includes('dataRoomMemberships(')) {
    return {
      dataRoomMemberships: {
        nodes: [
          { id: 'm-owner', actorId: 'owner-1', isOwner: true, isAdmin: true, isActive: true, isApproved: true, capabilities: '11', granted: '11' },
          { id: 'm-viewer', actorId: 'user-2', isOwner: false, isAdmin: false, isActive: false, isApproved: false, capabilities: '00', granted: '00' }
        ]
      }
    };
  }
  if (call.document.includes('dataRoomCapabilities(')) {
    return {
      dataRoomCapabilities: {
        nodes: [
          { id: 'cap-read', name: 'read_files', bitstr: '01' },
          { id: 'cap-admin', name: 'admin_members', bitstr: '10' }
        ]
      }
    };
  }
  const field = /query \w+\(\$first: Int!, \$after: Cursor\) \{\s*(\w+)\(/u.exec(call.document)?.[1];
  return field ? { [field]: { nodes: [] } } : {};
};

describe('scope names', () => {
  it('derives every name of a scope from its membership type', () => {
    expect(scopeNames('data_room')).toMatchObject({
      pascal: 'DataRoom',
      camel: 'dataRoom',
      entity: true,
      noun: { short: 'data room', long: 'data room' }
    });
    expect(scopeNames('app')).toMatchObject({ pascal: 'App', entity: false, noun: { long: 'application' } });
    expect(scopeMutationDocument(scopeNames('org'), 'create', 'Invite')).toContain(
      'createOrgInvite(input: $input) { orgInvite { id } }'
    );
    expect(() => scopeNames('Data Room')).toThrow('not a membership scope name');
  });
});

describe('scope access on an entity scope', () => {
  it("reads only the entity's rows and writes its id into every create", async () => {
    const calls: Call[] = [];
    const run = runtime(rows, calls);
    const schemas = { admin: ROOM_ADMIN };
    const directory = await loadScopeAccess(run, schemas, ROOM, new AbortController().signal);

    const membershipQuery = calls.find((call) => call.document.includes('dataRoomMemberships('));
    expect(membershipQuery?.document).toContain(`where: { entityId: { equalTo: "${ROOM.entityId}" } }`);
    // The capability catalog is the scope's, not one entity's.
    expect(calls.find((call) => call.document.includes('dataRoomCapabilities('))?.document).not.toContain('where:');
    expect(directory.actorIsOwner).toBe(true);
    expect(directory.data.members.map((member) => member.lifecycle.approved)).toEqual([true, false]);
    // A data room membership has no verified flag, so no member reads as unverified.
    expect(directory.data.members.map((member) => member.lifecycle.verified)).toEqual([undefined, undefined]);

    const view = scopeAccessView(run, schemas, ROOM, directory, () => undefined);
    expect(view.policy.invite).toBe(true);
    expect(view.policy.setApproved).toBe(true);
    // Entity memberships have no verified flag, so the control stays off.
    expect(view.policy.setVerified).toBe(false);

    calls.length = 0;
    await view.actions.invite?.({ recipient: 'ada@example.test' });
    await view.actions.setApproved?.({ membershipId: 'm-viewer', approved: true });
    await view.actions.setOwner?.({ userId: 'user-2', owner: true });
    expect(calls.map((call) => call.variables)).toEqual([
      { input: { dataRoomInvite: { email: 'ada@example.test', channel: 'email', entityId: ROOM.entityId } } },
      { input: { id: 'm-viewer', dataRoomMembershipPatch: { isApproved: true } } },
      { input: { dataRoomOwnerGrant: { actorId: 'user-2', isGrant: true, entityId: ROOM.entityId } } }
    ]);
    await expect(view.actions.setApproved?.({ membershipId: 'elsewhere', approved: true }))
      .rejects.toThrow('not in the current authorized resource');

    // A preset's capabilities become one mask on the new profile.
    calls.length = 0;
    await view.actions.createProfile?.({ name: 'Admin', slug: 'admin', capabilityIds: ['cap-read', 'cap-admin'] });
    expect(calls[0]?.variables).toEqual({
      input: { dataRoomProfile: { name: 'Admin', slug: 'admin', capabilities: '11', entityId: ROOM.entityId } }
    });
  });

  it('refuses an entity scope without its entity', async () => {
    const run = runtime(rows, []);
    await expect(loadScopeAccess(run, { admin: ROOM_ADMIN }, { names: scopeNames('data_room') }, new AbortController().signal))
      .rejects.toThrow('needs the id of one data room');
  });
});

describe('scope access members', () => {
  it("leaves an entity's own users-table membership off the members list", async () => {
    const membershipTypeConnection: ConstructiveSchemaType = {
      kind: 'OBJECT',
      name: 'MembershipTypeConnection',
      fields: [{ name: 'nodes', args: [], type: { kind: 'LIST', ofType: { kind: 'OBJECT', name: 'MembershipType' } } }],
      inputFields: []
    };
    const base = snapshot('admin', ['appMemberships'], {}, [
      objectType('AppMembership', ['id', 'actorId', 'isActive', 'isApproved']),
      membershipTypeConnection,
      objectType('MembershipType', ['id', 'scope', 'hasUsersTableEntry'])
    ]);
    const admin = {
      ...base,
      queryFields: {
        ...base.queryFields,
        membershipTypes: { name: 'membershipTypes', args: [], type: { kind: 'OBJECT', name: 'MembershipTypeConnection' } }
      }
    } as ConstructiveSchemaSnapshot;
    const auth = snapshot('auth', ['users'], {}, [objectType('User', ['id', 'displayName', 'type'])]);
    // The entity scope's id is the database's, not a number the client knows.
    const run = runtime((call) => {
      if (call.document.includes('appMemberships(')) {
        return {
          appMemberships: {
            nodes: [
              { id: 'm-owner', actorId: 'owner-1', isActive: true, isApproved: true },
              { id: 'm-agency', actorId: 'agency-1', isActive: false, isApproved: false }
            ]
          }
        };
      }
      if (call.document.includes('membershipTypes')) {
        return {
          membershipTypes: {
            nodes: [
              { id: 1, scope: 'app', hasUsersTableEntry: false },
              { id: 7, scope: 'agency', hasUsersTableEntry: true }
            ]
          }
        };
      }
      if (call.document.includes('users(')) {
        return {
          users: {
            nodes: [
              { id: 'owner-1', displayName: 'Ada', type: 1 },
              { id: 'agency-1', displayName: 'Northwind Capital', type: 7 }
            ]
          }
        };
      }
      return rows(call);
    }, []);
    const directory = await loadScopeAccess(run, { admin, auth }, { names: scopeNames('app') }, new AbortController().signal);

    expect(directory.data.members.map((member) => member.name)).toEqual(['Ada']);
    expect(directory.memberIds.has('m-agency')).toBe(false);
  });
});

describe('pending invitations', () => {
  it("asks each scope's record only for the fields it has: an app invitation names no entity", async () => {
    const connection = (name: string): ConstructiveSchemaType => ({
      kind: 'OBJECT',
      name: `${name}Connection`,
      fields: [{ name: 'nodes', args: [], type: { kind: 'LIST', ofType: { kind: 'OBJECT', name: `${name}Record` } } }],
      inputFields: []
    });
    const base = snapshot('admin', ['membershipTypes'], {}, [
      connection('MyPendingAppInvites'),
      connection('MyPendingDataRoomInvites'),
      objectType('MyPendingAppInvitesRecord', ['id', 'senderId', 'expiresAt']),
      objectType('MyPendingDataRoomInvitesRecord', ['id', 'entityId', 'senderId', 'expiresAt'])
    ]);
    const root = (name: string) => ({ name, args: [], type: { kind: 'OBJECT', name: `${name[0]!.toUpperCase()}${name.slice(1)}Connection` } });
    const admin = {
      ...base,
      queryFields: { ...base.queryFields, myPendingAppInvites: root('myPendingAppInvites'), myPendingDataRoomInvites: root('myPendingDataRoomInvites') }
    };
    const calls: Call[] = [];
    const run = runtime((call) => {
      if (call.document.includes('membershipTypes')) {
        return { membershipTypes: { nodes: [{ scope: 'app' }, { scope: 'org' }, { scope: 'data_room' }] } };
      }
      if (call.document.includes('myPendingDataRoomInvites(')) {
        return { myPendingDataRoomInvites: { nodes: [{ id: 'inv-room', entityId: 'room-1', senderId: 'owner-1' }] } };
      }
      if (call.document.includes('myPendingAppInvites(')) {
        return { myPendingAppInvites: { nodes: [{ id: 'inv-app', senderId: 'owner-1' }] } };
      }
      return {};
    }, calls);
    const invites = await loadPendingInvites(run, { admin }, new AbortController().signal);
    expect(invites.map((invite) => [invite.scope.scope, invite.id, invite.entityId])).toEqual([
      ['app', 'inv-app', undefined],
      ['data_room', 'inv-room', 'room-1']
    ]);
    const appQuery = calls.find((call) => call.document.includes('myPendingAppInvites('));
    expect(appQuery?.document).not.toContain('entityId');
  });
});

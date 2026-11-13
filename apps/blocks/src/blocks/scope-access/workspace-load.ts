import {
  executeConstructiveConnectionQuery,
  executeConstructiveGraphQL
} from '../console-kit/constructive/constructive-graphql';
import { asBoolean, asRecord, asString, hasEffectiveCapability } from '../console-kit/constructive/constructive-values';
import type { ScopeRuntime } from './scope-access-load';
import { scopeField, type ScopeNames } from './scope-names';

/**
 * Where the user's records go: their personal workspace (their own user,
 * which is also their personal organization) or an organization they belong
 * to. A record's organization key takes the active workspace's id.
 */
export type Workspace = Readonly<{ id: string; name: string; personal: boolean }>;

export type LoadedWorkspaces = Readonly<{
  workspaces: readonly Workspace[];
  /** The app grants the user `create_entity`, so they can start an organization. */
  canCreate: boolean;
}>;

/**
 * The workspaces of the signed-in user in a users-table scope (`org`): the
 * personal one, then each organization where their membership is active, by
 * the names the auth API shows. It reads only rows, never a schema, since
 * every page of an app with a switcher loads it.
 */
export async function loadWorkspaces(
  runtime: ScopeRuntime,
  names: ScopeNames,
  signal: AbortSignal
): Promise<LoadedWorkspaces> {
  if (runtime.session.status !== 'authenticated') return { workspaces: [], canCreate: false };
  const userId = runtime.session.identity.subjectId;
  const [memberships, users, appMemberships, appCapabilities] = await Promise.all([
    executeConstructiveConnectionQuery(runtime, 'admin', {
      operationName: `ConsoleKit${names.pascal}Workspaces`,
      fieldName: scopeField(names, 'Memberships'),
      nodeSelection: 'entityId isActive',
      equalTo: { actorId: userId }
    }, signal),
    // Names are a nicety: without them, an organization shows by its id.
    executeConstructiveConnectionQuery(runtime, 'auth', {
      operationName: 'ConsoleKitWorkspaceNames',
      fieldName: 'users',
      nodeSelection: 'id displayName username'
    }, signal).catch((): Record<string, unknown>[] => []),
    executeConstructiveConnectionQuery(runtime, 'admin', {
      operationName: 'ConsoleKitWorkspaceAppMembership',
      fieldName: 'appMemberships',
      nodeSelection: 'actorId isActive isAdmin capabilities',
      equalTo: { actorId: userId }
    }, signal).catch((): Record<string, unknown>[] => []),
    executeConstructiveConnectionQuery(runtime, 'admin', {
      operationName: 'ConsoleKitWorkspaceAppCapabilities',
      fieldName: 'appCapabilities',
      nodeSelection: 'name bitstr'
    }, signal).catch((): Record<string, unknown>[] => [])
  ]);
  const userById = new Map(users.flatMap((user) => {
    const id = asString(user.id);
    return id ? [[id, user] as const] : [];
  }));
  const organizations = memberships.flatMap((membership): Workspace[] => {
    const id = asString(membership.entityId);
    if (!id || id === userId || !asBoolean(membership.isActive)) return [];
    const user = userById.get(id);
    return [{
      id,
      name: asString(user?.displayName) ?? asString(user?.username) ?? `Organization ${id.slice(0, 8)}`,
      personal: false
    }];
  });
  const appMembership = appMemberships.find((row) => asString(row.actorId) === userId);
  const active = asBoolean(appMembership?.isActive);
  const canCreate = active && (asBoolean(appMembership?.isAdmin) ||
    hasEffectiveCapability(appMembership, appCapabilities, 'create_entity'));
  return {
    workspaces: [
      { id: userId, name: 'Personal', personal: true },
      ...organizations.sort((a, b) => a.name.localeCompare(b.name))
    ],
    canCreate
  };
}

const CREATE_ORGANIZATION = /* GraphQL */ `
  mutation ConsoleKitCreateWorkspaceOrganization($input: CreateUserInput!) {
    createUser(input: $input) { user { id } }
  }
`;

/**
 * Starts an organization owned by the signed-in user: the backend makes the
 * organization a users row (type 2) and the creator its owner. Fails when the
 * owner membership doesn't follow, so a half-made organization is never
 * selected.
 */
export async function createOrganization(
  runtime: ScopeRuntime,
  names: ScopeNames,
  name: string,
  signal?: AbortSignal
): Promise<Workspace> {
  if (runtime.session.status !== 'authenticated') throw new Error('Sign in to start an organization.');
  const userId = runtime.session.identity.subjectId;
  const created = await executeConstructiveGraphQL<Record<string, unknown>>(
    runtime,
    'auth',
    CREATE_ORGANIZATION,
    {
      input: {
        user: { username: `org-${globalThis.crypto.randomUUID()}`, displayName: name, type: 2 }
      }
    },
    signal
  );
  const id = asString(asRecord(asRecord(created.createUser)?.user)?.id);
  if (!id) throw new Error('The organization was not created.');
  const owner = await executeConstructiveConnectionQuery(runtime, 'admin', {
    operationName: `ConsoleKit${names.pascal}NewOwner`,
    fieldName: scopeField(names, 'Memberships'),
    nodeSelection: 'actorId isOwner isActive',
    equalTo: { entityId: id, actorId: userId }
  }, signal);
  if (!owner.some((row) => asBoolean(row.isOwner) && asBoolean(row.isActive))) {
    throw new Error('The organization was created, but you are not its active owner yet.');
  }
  return { id, name, personal: false };
}

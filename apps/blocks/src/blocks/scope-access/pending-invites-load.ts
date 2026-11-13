import {
  executeConstructiveConnectionQuery,
  executeConstructiveGraphQL
} from '../console-kit/constructive/constructive-graphql';
import { asString, connectionNodes } from '../console-kit/constructive/constructive-values';
import type { ScopeRuntime, ScopeSchemas } from './scope-access-load';
import { scopeMutation, scopeNames, type ScopeNames } from './scope-names';

/** An invitation the signed-in user can accept, in any membership scope. */
export type PendingInvite = Readonly<{
  id: string;
  scope: ScopeNames;
  /** The entity it admits to; none for an app invitation. */
  entityId?: string;
  senderId?: string;
  senderName?: string;
  expiresAt?: string;
}>;

const MEMBERSHIP_TYPES = /* GraphQL */ `
  query ConsoleKitMembershipScopes { membershipTypes { nodes { scope } } }
`;

/**
 * The database's membership scopes, from `membershipTypes`: `app`, `org`, and
 * every entity type a blueprint added. A scope name the client can't use is
 * left out.
 */
export async function loadMembershipScopes(runtime: ScopeRuntime): Promise<ScopeNames[]> {
  const data = await executeConstructiveGraphQL<Record<string, unknown>>(runtime, 'admin', MEMBERSHIP_TYPES, undefined);
  const record = data.membershipTypes;
  return connectionNodes(record).flatMap((node) => {
    const scope = asString(node.scope);
    if (!scope) return [];
    try {
      return [scopeNames(scope)];
    } catch {
      return [];
    }
  });
}

/** Every pending invitation to the signed-in user, in each scope that lists them. */
export async function loadPendingInvites(
  runtime: ScopeRuntime,
  schemas: ScopeSchemas,
  signal: AbortSignal
): Promise<PendingInvite[]> {
  if (runtime.session.status !== 'authenticated') return [];
  const scopes = (await loadMembershipScopes(runtime))
    .filter((names) => Boolean(schemas.admin?.queryFields[`myPending${names.pascal}Invites`]));
  const lists = await Promise.all(scopes.map(async (names) => {
    const rows = await executeConstructiveConnectionQuery(runtime, 'admin', {
      operationName: `ConsoleKitMyPending${names.pascal}Invites`,
      fieldName: `myPending${names.pascal}Invites`,
      nodeSelection: 'id entityId senderId expiresAt'
    }, signal);
    return rows.flatMap((row): PendingInvite[] => {
      const id = asString(row.id);
      if (!id) return [];
      return [{
        id,
        scope: names,
        ...(names.entity && asString(row.entityId) ? { entityId: asString(row.entityId)! } : {}),
        ...(asString(row.senderId) ? { senderId: asString(row.senderId)! } : {}),
        ...(asString(row.expiresAt) ? { expiresAt: asString(row.expiresAt)! } : {})
      }];
    });
  }));
  const invites = lists.flat();
  const senderIds = [...new Set(invites.flatMap((invite) => (invite.senderId ? [invite.senderId] : [])))];
  const names = await senderNames(runtime, schemas, senderIds, signal);
  return invites.map((invite) => {
    const senderName = invite.senderId ? names.get(invite.senderId) : undefined;
    return senderName ? { ...invite, senderName } : invite;
  });
}

// The senders' display names, when the auth API shows them to this user.
async function senderNames(
  runtime: ScopeRuntime,
  schemas: ScopeSchemas,
  ids: readonly string[],
  signal: AbortSignal
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (ids.length === 0 || !schemas.auth?.queryFields.users) return names;
  const rows = await executeConstructiveConnectionQuery(runtime, 'auth', {
    operationName: 'ConsoleKitInviteSenders',
    fieldName: 'users',
    nodeSelection: 'id displayName username'
  }, signal).catch((): Record<string, unknown>[] => []);
  for (const row of rows) {
    const id = asString(row.id);
    const name = asString(row.displayName) ?? asString(row.username);
    if (id && name && ids.includes(id)) names.set(id, name);
  }
  return names;
}

/** Accepts one pending invitation as the signed-in user. */
export async function acceptPendingInvite(runtime: ScopeRuntime, invite: PendingInvite): Promise<void> {
  const mutation = scopeMutation(invite.scope, 'accept', 'Invite');
  const operation = mutation[0]!.toUpperCase() + mutation.slice(1);
  await executeConstructiveGraphQL(
    runtime,
    'admin',
    `mutation ConsoleKit${operation}($input: ${operation}Input!) { ${mutation}(input: $input) { clientMutationId } }`,
    { input: { inviteId: invite.id } }
  );
}

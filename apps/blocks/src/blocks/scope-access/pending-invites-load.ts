import {
  executeConstructiveConnectionQuery,
  executeConstructiveGraphQL,
  fieldsForType,
  namedTypeName,
  selectExistingFields
} from '../console-kit/constructive/constructive-graphql';
import { asString } from '../console-kit/constructive/constructive-values';
import { loadMembershipTypes } from './membership-types';
import type { ScopeRuntime, ScopeSchemas } from './scope-runtime';
import { scopeMutation, type ScopeNames } from './scope-names';

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

/** Every pending invitation to the signed-in user, in each scope that lists them. */
export async function loadPendingInvites(
  runtime: ScopeRuntime,
  schemas: ScopeSchemas,
  signal: AbortSignal
): Promise<PendingInvite[]> {
  if (runtime.session.status !== 'authenticated') return [];
  const admin = schemas.admin;
  const scopes = (await loadMembershipTypes(runtime, admin, signal))
    .map((type) => type.scope)
    .filter((names) => Boolean(admin?.queryFields[`myPending${names.pascal}Invites`]));
  const lists = await Promise.all(scopes.map(async (names) => {
    const fieldName = `myPending${names.pascal}Invites`;
    // Each scope's record has its own fields: an app invitation names no entity.
    const nodeFields = admin ? selectExistingFields(admin, pendingRecordType(admin, fieldName), [
      'id', 'entityId', 'senderId', 'expiresAt'
    ]) : [];
    if (!nodeFields.includes('id')) return [];
    const rows = await executeConstructiveConnectionQuery(runtime, 'admin', {
      operationName: `ConsoleKitMyPending${names.pascal}Invites`,
      fieldName,
      nodeSelection: nodeFields.join(' ')
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

// The node type of a `myPending<Scope>Invites` connection, as the schema names it.
function pendingRecordType(schema: NonNullable<ScopeSchemas['admin']>, fieldName: string): string {
  const connection = namedTypeName(schema.queryFields[fieldName]?.type);
  return (connection && namedTypeName(fieldsForType(schema, connection).nodes?.type)) ?? '';
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
    nodeSelection: 'id displayName username',
    in: { id: ids }
  }, signal).catch((): Record<string, unknown>[] => []);
  for (const row of rows) {
    const id = asString(row.id);
    const name = asString(row.displayName) ?? asString(row.username);
    if (id && name) names.set(id, name);
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

import {
  executeConstructiveGraphQL,
  fieldsForType,
  namedTypeName,
  selectExistingFields,
  type ConstructiveSchemaSnapshot
} from '../console-kit/constructive/constructive-graphql';
import { asBoolean, asString, connectionNodes } from '../console-kit/constructive/constructive-values';
import type { ScopeRuntime } from './scope-runtime';
import { scopeNames, type ScopeNames } from './scope-names';

/** One scope of the database's scope tree, from the admin API's `membershipTypes`. */
export type MembershipType = Readonly<{
  scope: ScopeNames;
  /** The membership type's id, when the API shows it. */
  id?: number;
  /**
   * Whether each entity of this scope is also a row in the users table, as an
   * organization is. That row's `type` is this membership type's id.
   */
  hasUsersTableEntry: boolean;
}>;

/**
 * The database's membership scopes: `app`, `org`, and every entity type a
 * blueprint added. It asks only for the fields the admin schema has, when the
 * schema is given, and leaves out a scope name the client can't use.
 */
export async function loadMembershipTypes(
  runtime: ScopeRuntime,
  admin?: ConstructiveSchemaSnapshot,
  signal?: AbortSignal
): Promise<MembershipType[]> {
  let fields = ['scope'];
  if (admin) {
    const root = admin.queryFields.membershipTypes;
    if (!root) return [];
    const connection = namedTypeName(root.type);
    const node = connection ? namedTypeName(fieldsForType(admin, connection).nodes?.type) : null;
    if (node && admin.types[node]) fields = selectExistingFields(admin, node, ['id', 'scope', 'hasUsersTableEntry']);
    if (!fields.includes('scope')) return [];
  }
  const data = await executeConstructiveGraphQL<Record<string, unknown>>(
    runtime,
    'admin',
    `query ConsoleKitMembershipTypes { membershipTypes { nodes { ${fields.join(' ')} } } }`,
    undefined,
    signal
  );
  return connectionNodes(data.membershipTypes).flatMap((node): MembershipType[] => {
    const scope = asString(node.scope);
    if (!scope) return [];
    let names: ScopeNames;
    try {
      names = scopeNames(scope);
    } catch {
      return [];
    }
    return [{
      scope: names,
      ...(typeof node.id === 'number' ? { id: node.id } : {}),
      hasUsersTableEntry: asBoolean(node.hasUsersTableEntry)
    }];
  });
}

/**
 * The users-table `type` values that mark an entity (an organization) rather
 * than a person: the ids of the scopes whose entities have a users row.
 */
export function entityUserTypes(types: readonly MembershipType[]): ReadonlySet<number> {
  return new Set(types.flatMap((type) => (type.hasUsersTableEntry && type.id != null ? [type.id] : [])));
}

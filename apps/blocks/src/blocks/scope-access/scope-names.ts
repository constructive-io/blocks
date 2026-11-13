/**
 * The names a Constructive backend gives one membership scope's API. The
 * scope `app` has `appMemberships`, `AppInvite` and `createAppOwnerGrant`; an
 * entity scope such as `data_room` has `dataRoomMemberships`,
 * `DataRoomInvite` and `createDataRoomOwnerGrant`, and its rows carry the
 * entity's id in `entityId`. One scope name in, every name out, so the same
 * code serves `app`, `org` and any entity type a blueprint adds.
 */
export type ScopeNames = Readonly<{
  /** The scope as `membershipTypes.scope` names it: `app`, `org`, `data_room`. */
  scope: string;
  /** `DataRoom`: the prefix of the scope's GraphQL type names. */
  pascal: string;
  /** `dataRoom`: the prefix of the scope's root fields and input objects. */
  camel: string;
  /** Every scope but `app` belongs to one entity, named by `entityId`. */
  entity: boolean;
  /** The scope in words, for messages: `app` and `application` for the app scope. */
  noun: Readonly<{ short: string; long: string }>;
}>;

const SCOPE_NAME = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/u;

const NOUNS: Readonly<Record<string, ScopeNames['noun']>> = {
  app: { short: 'app', long: 'application' },
  org: { short: 'organization', long: 'organization' }
};

export function scopeNames(scope: string): ScopeNames {
  if (!SCOPE_NAME.test(scope)) throw new Error(`"${scope}" is not a membership scope name.`);
  const words = scope.split('_');
  const pascal = words.map((word) => word[0]!.toUpperCase() + word.slice(1)).join('');
  const phrase = words.join(' ');
  return {
    scope,
    pascal,
    camel: pascal[0]!.toLowerCase() + pascal.slice(1),
    entity: scope !== 'app',
    noun: NOUNS[scope] ?? { short: phrase, long: phrase }
  };
}

/** `DataRoom` + `Invite` → `DataRoomInvite`. */
export const scopeType = (names: ScopeNames, suffix: string) => `${names.pascal}${suffix}`;

/** `dataRoom` + `Invites` → `dataRoomInvites`. */
export const scopeField = (names: ScopeNames, suffix: string) => `${names.camel}${suffix}`;

/** `create` + `DataRoom` + `OwnerGrant` → `createDataRoomOwnerGrant`. */
export const scopeMutation = (names: ScopeNames, verb: string, suffix: string) =>
  `${verb}${names.pascal}${suffix}`;

/**
 * The document of a mutation that returns its row's id, the shape every
 * scope mutation here has: `createDataRoomInvite(input: $input) { dataRoomInvite { id } }`.
 */
export function scopeMutationDocument(names: ScopeNames, verb: string, suffix: string): string {
  const mutation = scopeMutation(names, verb, suffix);
  const operation = mutation[0]!.toUpperCase() + mutation.slice(1);
  return `
  mutation ConsoleKit${operation}($input: ${operation}Input!) {
    ${mutation}(input: $input) { ${scopeField(names, suffix)} { id } }
  }
`;
}

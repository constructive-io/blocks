import {
  supportsConstructiveMutationInput,
  type ConstructiveSchemaSnapshot
} from '../console-kit/constructive/constructive-graphql';

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
 * The document of one scope mutation. By default it returns its row's id,
 * `createDataRoomInvite(input: $input) { dataRoomInvite { id } }`; a mutation
 * whose payload is something else names what it reads.
 */
export function scopeMutationDocument(
  names: ScopeNames,
  verb: string,
  suffix: string,
  selection = `${scopeField(names, suffix)} { id }`
): string {
  const mutation = scopeMutation(names, verb, suffix);
  const operation = mutation[0]!.toUpperCase() + mutation.slice(1);
  return `
  mutation ConsoleKit${operation}($input: ${operation}Input!) {
    ${mutation}(input: $input) { ${selection} }
  }
`;
}

/** Whether `<verb><Scope><Suffix>` takes its row with these fields: `createDataRoomInvite` with `email`. */
export function supportsScopeObject(
  schema: ConstructiveSchemaSnapshot | undefined,
  names: ScopeNames,
  verb: string,
  suffix: string,
  fields: readonly string[]
): boolean {
  const object = scopeField(names, suffix);
  return supportsConstructiveMutationInput(
    schema,
    scopeMutation(names, verb, suffix),
    [object],
    { field: object, requiredFields: fields }
  );
}

/** Whether `update<Scope><Suffix>` takes a patch with these fields: `updateDataRoomMembership` with `isApproved`. */
export function supportsScopePatch(
  schema: ConstructiveSchemaSnapshot | undefined,
  names: ScopeNames,
  suffix: string,
  fields: readonly string[]
): boolean {
  const patch = scopeField(names, `${suffix}Patch`);
  return supportsConstructiveMutationInput(
    schema,
    scopeMutation(names, 'update', suffix),
    ['id', patch],
    { field: patch, requiredFields: fields }
  );
}

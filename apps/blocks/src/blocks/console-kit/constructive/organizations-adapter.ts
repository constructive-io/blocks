import type { AtomicCapabilityId } from '../../../feature-packs';
import type {
  OrganizationAccessProfile,
  OrganizationApiKey,
  OrganizationChartEdge,
  OrganizationClaimedInvite,
  OrganizationInvite,
  OrganizationMember,
  OrganizationMemberRowAction,
  OrganizationMembershipDefault,
  OrganizationMembershipSettings,
  OrganizationPermission,
  OrganizationPrincipal,
  OrganizationsFeatureData,
  OrganizationsFeaturePackProps,
  OrganizationSummary
} from '../../feature-packs/organizations/organizations-contracts';
import { resolveApplicationOrganizationContract } from '../../feature-packs/organizations/organizations-meta-contract';
import type { FeaturePackLimitation } from '../../feature-packs/shared/feature-pack-contracts';
import type {
  ConsoleKitAdapterContext,
  ConsoleKitFeatureAdapter,
  ConsoleKitMetadataState
} from '../console-kit-contracts';
import type { ConsoleKitStoreApi } from '../store';
import {
  CONSOLE_ENDPOINT_KINDS,
  type ConsoleEndpointKind
} from '../../console-runtime';
import {
  supportsConstructiveMutationInput,
  type ConstructiveCapabilityDiscovery
} from './constructive-capabilities';
import {
  assertAuthorizedTarget,
  asBoolean,
  asRecord,
  asString,
  expiresIn,
  hasEffectivePermission,
  imageUrl,
  notifyConsoleAdapters,
  packAvailability,
  permissionMaskIsSubset
} from './constructive-adapter-utils';
import {
  executeConstructiveConnectionQuery,
  executeConstructiveGraphQL,
  fieldsForType,
  namedTypeName,
  selectExistingFields,
  type ConstructiveSchemaSnapshot
} from './constructive-graphql';
import { metaSelection } from './constructive-meta-utils';

const UPDATE_MEMBERSHIP_MUTATION = /* GraphQL */ `
  mutation ConsoleKitUpdateOrgMembership($input: UpdateOrgMembershipInput!) {
    updateOrgMembership(input: $input) { orgMembership { id } }
  }
`;

const DELETE_MEMBERSHIP_MUTATION = /* GraphQL */ `
  mutation ConsoleKitDeleteOrgMembership($input: DeleteOrgMembershipInput!) {
    deleteOrgMembership(input: $input) { orgMembership { id } }
  }
`;

const CREATE_ADMIN_GRANT_MUTATION = /* GraphQL */ `
  mutation ConsoleKitCreateOrgAdminGrant($input: CreateOrgAdminGrantInput!) {
    createOrgAdminGrant(input: $input) { orgAdminGrant { id } }
  }
`;

const CREATE_OWNER_GRANT_MUTATION = /* GraphQL */ `
  mutation ConsoleKitCreateOrgOwnerGrant($input: CreateOrgOwnerGrantInput!) {
    createOrgOwnerGrant(input: $input) { orgOwnerGrant { id } }
  }
`;

const CREATE_PERMISSION_GRANT_MUTATION = /* GraphQL */ `
  mutation ConsoleKitCreateOrgGrant($input: CreateOrgGrantInput!) {
    createOrgGrant(input: $input) { orgGrant { id } }
  }
`;

const CREATE_PROFILE_GRANT_MUTATION = /* GraphQL */ `
  mutation ConsoleKitCreateOrgProfileGrant($input: CreateOrgProfileGrantInput!) {
    createOrgProfileGrant(input: $input) { orgProfileGrant { id } }
  }
`;

const CREATE_PROFILE_DEFINITION_GRANT_MUTATION = /* GraphQL */ `
  mutation ConsoleKitCreateOrgProfileDefinitionGrant(
    $input: CreateOrgProfileDefinitionGrantInput!
  ) {
    createOrgProfileDefinitionGrant(input: $input) {
      orgProfileDefinitionGrant { id }
    }
  }
`;

const CREATE_PROFILE_MUTATION = /* GraphQL */ `
  mutation ConsoleKitCreateOrgProfile($input: CreateOrgProfileInput!) {
    createOrgProfile(input: $input) { orgProfile { id } }
  }
`;

const UPDATE_PROFILE_MUTATION = /* GraphQL */ `
  mutation ConsoleKitUpdateOrgProfile($input: UpdateOrgProfileInput!) {
    updateOrgProfile(input: $input) { orgProfile { id } }
  }
`;

const DELETE_PROFILE_MUTATION = /* GraphQL */ `
  mutation ConsoleKitDeleteOrgProfile($input: DeleteOrgProfileInput!) {
    deleteOrgProfile(input: $input) { orgProfile { id } }
  }
`;

const CREATE_MEMBER_PROFILE_MUTATION = /* GraphQL */ `
  mutation ConsoleKitCreateOrgMemberProfile($input: CreateOrgMemberProfileInput!) {
    createOrgMemberProfile(input: $input) { orgMemberProfile { id } }
  }
`;

const UPDATE_MEMBER_PROFILE_MUTATION = /* GraphQL */ `
  mutation ConsoleKitUpdateOrgMemberProfile($input: UpdateOrgMemberProfileInput!) {
    updateOrgMemberProfile(input: $input) { orgMemberProfile { id } }
  }
`;

const UPDATE_MEMBERSHIP_SETTINGS_MUTATION = /* GraphQL */ `
  mutation ConsoleKitUpdateOrgMembershipSetting(
    $input: UpdateOrgMembershipSettingInput!
  ) {
    updateOrgMembershipSetting(input: $input) { orgMembershipSetting { id } }
  }
`;

const UPDATE_MEMBERSHIP_DEFAULT_MUTATION = /* GraphQL */ `
  mutation ConsoleKitUpdateOrgMembershipDefault(
    $input: UpdateOrgMembershipDefaultInput!
  ) {
    updateOrgMembershipDefault(input: $input) { orgMembershipDefault { id } }
  }
`;

const CREATE_CHART_EDGE_GRANT_MUTATION = /* GraphQL */ `
  mutation ConsoleKitCreateOrgChartEdgeGrant($input: CreateOrgChartEdgeGrantInput!) {
    createOrgChartEdgeGrant(input: $input) { orgChartEdgeGrant { id } }
  }
`;

const CREATE_INVITE_MUTATION = /* GraphQL */ `
  mutation ConsoleKitCreateOrgInvite($input: CreateOrgInviteInput!) {
    createOrgInvite(input: $input) { orgInvite { id } }
  }
`;

const DELETE_INVITE_MUTATION = /* GraphQL */ `
  mutation ConsoleKitDeleteOrgInvite($input: DeleteOrgInviteInput!) {
    deleteOrgInvite(input: $input) { orgInvite { id } }
  }
`;

const DELETE_ORGANIZATION_MUTATION = /* GraphQL */ `
  mutation ConsoleKitDeleteIncompleteOrganization($input: DeleteUserInput!) {
    deleteUser(input: $input) { user { id } }
  }
`;

const UPDATE_ORGANIZATION_MUTATION = /* GraphQL */ `
  mutation ConsoleKitUpdateOrganization($input: UpdateUserInput!) {
    updateUser(input: $input) { user { id } }
  }
`;

const REVOKE_ORG_API_KEY_MUTATION = /* GraphQL */ `
  mutation ConsoleKitRevokeOrgApiKey($input: RevokeOrgApiKeyInput!) {
    revokeOrgApiKey(input: $input) { result }
  }
`;

const DELETE_ORG_PRINCIPAL_MUTATION = /* GraphQL */ `
  mutation ConsoleKitDeleteOrgPrincipal($input: DeleteOrgPrincipalInput!) {
    deleteOrgPrincipal(input: $input) { result }
  }
`;

const CREATE_ORG_PRINCIPAL_MUTATION = /* GraphQL */ `
  mutation ConsoleKitCreateOrgPrincipal($input: CreateOrgPrincipalInput!) {
    createOrgPrincipal(input: $input) { result }
  }
`;

const ORGANIZATION_USER_FIELDS = [
  'id',
  'type',
  'displayName',
  'username',
  'profilePicture'
] as const;

const CREATED_OWNER_MEMBERSHIP_FIELDS = [
  'id',
  'actorId',
  'entityId',
  'isOwner',
  'isAdmin',
  'isActive',
  'isApproved',
  'isBanned',
  'isDisabled',
  'isReadOnly',
  'permissions'
] as const;

function createOrganizationMutation(userFields: readonly string[]): string {
  return /* GraphQL */ `
    mutation ConsoleKitCreateOrganization($input: CreateUserInput!) {
      createUser(input: $input) { user { ${userFields.join(' ')} } }
    }
  `;
}

export type ConstructiveOrganizationsAdapterOptions = Readonly<{
  store: ConsoleKitStoreApi;
  discovery: ConstructiveCapabilityDiscovery;
}>;

function supports(
  options: ConstructiveOrganizationsAdapterOptions,
  endpoint: 'auth' | 'admin',
  operation: 'query' | 'mutation',
  field: string
): boolean {
  const schema = options.discovery.getSchemas()[endpoint];
  return Boolean((operation === 'query' ? schema?.queryFields : schema?.mutationFields)?.[field]);
}

function relationSelection(
  schema: ConstructiveSchemaSnapshot,
  typeName: string,
  fieldName: string,
  desiredFields: readonly string[]
): string | null {
  const field = fieldsForType(schema, typeName)[fieldName];
  const relatedType = namedTypeName(field?.type);
  if (!field || !relatedType) return null;
  const fields = selectExistingFields(schema, relatedType, desiredFields);
  return fields.length > 0 ? `${fieldName} { ${fields.join(' ')} }` : null;
}

function connectionSelection(
  schema: ConstructiveSchemaSnapshot,
  typeName: string,
  desiredFields: readonly string[]
): string[] {
  return selectExistingFields(schema, typeName, desiredFields);
}

type OrganizationDirectorySelections = Readonly<{
  memberships: readonly string[];
  memberProfiles: readonly string[];
  profiles: readonly string[];
  profilePermissions: readonly string[];
  invites: readonly string[];
  claimedInvites: readonly string[];
  permissions: readonly string[];
  settings: readonly string[];
  defaults: readonly string[];
  hierarchy: readonly string[];
  appMemberships: readonly string[];
  appPermissions: readonly string[];
}>;

const EMPTY_ORGANIZATION_DIRECTORY_SELECTIONS: OrganizationDirectorySelections = {
  memberships: [],
  memberProfiles: [],
  profiles: [],
  profilePermissions: [],
  invites: [],
  claimedInvites: [],
  permissions: [],
  settings: [],
  defaults: [],
  hierarchy: [],
  appMemberships: [],
  appPermissions: []
};

function organizationUserFields(
  options: ConstructiveOrganizationsAdapterOptions
): readonly string[] | null {
  const schema = options.discovery.getSchemas().auth;
  if (!schema || !supports(options, 'auth', 'query', 'users')) return null;
  const fields = connectionSelection(schema, 'User', ORGANIZATION_USER_FIELDS);
  return fields.includes('id') && fields.includes('type') ? fields : null;
}

function adminDirectorySelections(
  options: ConstructiveOrganizationsAdapterOptions
): OrganizationDirectorySelections {
  const schema = options.discovery.getSchemas().admin;
  if (!schema) return EMPTY_ORGANIZATION_DIRECTORY_SELECTIONS;
  const membershipFields = supports(options, 'admin', 'query', 'orgMemberships')
    ? connectionSelection(schema, 'OrgMembership', [
    'id',
    'actorId',
    'entityId',
    'createdAt',
    'isOwner',
    'isAdmin',
    'isActive',
    'isApproved',
    'isBanned',
    'isDisabled',
    'isReadOnly',
    'permissions',
    'granted',
    'profileId'
    ])
    : [];
  const profile = relationSelection(schema, 'OrgMembership', 'profile', ['name']);
  if (profile && membershipFields.length > 0) membershipFields.push(profile);

  const memberProfiles = supports(options, 'admin', 'query', 'orgMemberProfiles')
    ? connectionSelection(schema, 'OrgMemberProfile', [
        'id',
        'membershipId',
        'entityId',
        'actorId',
        'displayName',
        'email',
        'title',
        'bio',
        'profilePicture'
      ])
    : [];
  const profileFields = connectionSelection(
    schema,
    'OrgProfile',
    [
      'id',
      'name',
      'slug',
      'description',
      'entityId',
      'permissions',
      'isSystem',
      'isDefault'
    ]
  );
  const profiles = supports(options, 'admin', 'query', 'orgProfiles') ? profileFields : [];
  const profilePermissions = supports(options, 'admin', 'query', 'orgProfilePermissions')
    ? connectionSelection(schema, 'OrgProfilePermission', [
        'id',
        'profileId',
        'permissionId'
      ])
    : [];
  const inviteFields = connectionSelection(schema, 'OrgInvite', [
    'id',
    'entityId',
    'channel',
    'email',
    'phone',
    'senderId',
    'receiverId',
    'inviteToken',
    'inviteValid',
    'inviteLimit',
    'inviteCount',
    'multiple',
    'isReadOnly',
    'expiresAt',
    'profileId'
  ]);
  const invites = supports(options, 'admin', 'query', 'orgInvites') ? inviteFields : [];
  const claimedInvites = supports(options, 'admin', 'query', 'orgClaimedInvites')
    ? connectionSelection(schema, 'OrgClaimedInvite', [
        'id',
        'entityId',
        'senderId',
        'receiverId',
        'createdAt'
      ])
    : [];
  const permissionFields = connectionSelection(
    schema,
    'OrgPermission',
    ['id', 'name', 'description', 'bitstr']
  );
  const permissions = supports(options, 'admin', 'query', 'orgPermissions') &&
    permissionFields.includes('name') && permissionFields.includes('bitstr')
    ? permissionFields
    : [];
  const settingFields = connectionSelection(
    schema,
    'OrgMembershipSetting',
    [
      'id',
      'entityId',
      'deleteMemberCascadeChildren',
      'createChildCascadeOwners',
      'createChildCascadeAdmins',
      'createChildCascadeMembers',
      'allowExternalMembers',
      'inviteProfileAssignmentMode',
      'populateMemberEmail',
      'limitAllocationMode'
    ]
  );
  const settings = supports(options, 'admin', 'query', 'orgMembershipSettings') &&
    settingFields.includes('entityId') && settingFields.includes('inviteProfileAssignmentMode')
    ? settingFields
    : [];
  const defaults = supports(options, 'admin', 'query', 'orgMembershipDefaults')
    ? connectionSelection(schema, 'OrgMembershipDefault', ['id', 'entityId', 'isApproved'])
    : [];
  const hierarchy = supports(options, 'admin', 'query', 'orgChartEdges')
    ? connectionSelection(schema, 'OrgChartEdge', [
        'id',
        'entityId',
        'childId',
        'parentId',
        'positionTitle',
        'positionLevel'
      ])
    : [];
  const appMembershipFields = connectionSelection(schema, 'AppMembership', [
    'actorId',
    'isActive',
    'permissions'
  ]);
  const appMemberships = supports(options, 'admin', 'query', 'appMemberships') &&
    ['actorId', 'isActive', 'permissions'].every((field) => appMembershipFields.includes(field))
    ? appMembershipFields
    : [];
  const appPermissionFields = connectionSelection(schema, 'AppPermission', ['name', 'bitstr']);
  const appPermissions = supports(options, 'admin', 'query', 'appPermissions') &&
    appPermissionFields.includes('name') && appPermissionFields.includes('bitstr')
    ? appPermissionFields
    : [];
  return {
    memberships: membershipFields,
    memberProfiles,
    profiles,
    profilePermissions,
    invites,
    claimedInvites,
    permissions,
    settings,
    defaults,
    hierarchy,
    appMemberships,
    appPermissions
  };
}

function memberStatus(member: Record<string, unknown>): string {
  if (asBoolean(member.isBanned)) return 'banned';
  if (asBoolean(member.isDisabled)) return 'disabled';
  if (!asBoolean(member.isApproved)) return 'pending';
  return asBoolean(member.isActive) ? 'active' : 'inactive';
}

type InviteProfileAssignmentMode = 'strict' | 'permission_only' | 'subset_only';

const INVITE_PROFILE_MODE_LIMITATION: FeaturePackLimitation = {
  code: 'constructive.org-invite-profile-mode-unavailable',
  message:
    'Invite profile assignment uses the strict fallback because no readable membership-setting row was returned. Constructive\'s stock RLS exposes this setting only to admin_members, so delegated inviters may see fewer profile choices than the database would accept.'
};

const PROFILE_SCOPE_LIMITATION: FeaturePackLimitation = {
  code: 'constructive.org-profile-scope-unavailable',
  message:
    'Organization profile actions are disabled because the profile entityId field is not readable. Console Kit cannot safely distinguish global profiles from profiles belonging to another visible organization.'
};

const PRINCIPAL_SCOPE_LIMITATION: FeaturePackLimitation = {
  code: 'constructive.org-principal-scope-unavailable',
  message:
    'Some visible principals are omitted because the public API does not expose their organization scope. Console Kit only includes principals linked by public membership, principal-entity, API-key, or current-session creation evidence.'
};

const API_KEY_CREATION_LIMITATION: FeaturePackLimitation = {
  code: 'constructive.org-api-key-creation-unavailable',
  message:
    'Organization API key creation is disabled because the current create_org_principal and create_org_api_key ownership contracts do not compose into a principal that Console Kit can verify as eligible. Existing keys remain available for read and revoke when database authorization permits.'
};

const APPLICATION_DIRECTORY_READ_ONLY_LIMITATION: FeaturePackLimitation = {
  code: 'constructive.application-organization-directory-read-only',
  message:
    'Application organization rows are loaded through the public endpoint whose _meta contract exposes them and its RLS policies. Console Kit keeps this metadata-derived directory read-only; edit those application tables from Data unless the host supplies an explicit organization action adapter.'
};

function applicationOrganizationSource(
  metadataByEndpoint: ConsoleKitAdapterContext['metadataByEndpoint'],
  fallback: ConsoleKitMetadataState
): Readonly<{
  kind: ConsoleEndpointKind;
  contract: NonNullable<ReturnType<typeof resolveApplicationOrganizationContract>>;
}> | null {
  const metadata = metadataByEndpoint ?? { data: fallback };
  for (const kind of ['data', ...CONSOLE_ENDPOINT_KINDS.filter(
    (candidate) => candidate !== 'data'
  )] as const) {
    const endpointMetadata = metadata[kind];
    if (!endpointMetadata) continue;
    const contract = resolveApplicationOrganizationContract(endpointMetadata);
    if (contract) return { kind, contract };
  }
  return null;
}

function applicationOrganizationId(
  contract: NonNullable<ReturnType<typeof resolveApplicationOrganizationContract>>,
  rawId: string
): string {
  const tableIdentity = [
    contract.organizations.table.schemaName,
    contract.organizations.table.name
  ].filter(Boolean).join('.') || contract.organizations.root;
  return `application:${encodeURIComponent(tableIdentity)}:${encodeURIComponent(rawId)}`;
}

function principalOrganizationKey(databaseId: string, principalUserId: string): string {
  return JSON.stringify([databaseId, principalUserId]);
}

function inviteProfileAssignmentMode(
  rows: readonly Record<string, unknown>[],
  organizationId: string | undefined
): Readonly<{ mode: InviteProfileAssignmentMode; known: boolean }> {
  const value = asString(rows.find(
    (row) => asString(row.entityId) === organizationId
  )?.inviteProfileAssignmentMode);
  if (value === 'strict' || value === 'permission_only' || value === 'subset_only') {
    return { mode: value, known: true };
  }
  return { mode: 'strict', known: false };
}

function isOptionalReadDenied(cause: unknown): boolean {
  const error = cause as Readonly<{ code?: unknown; message?: unknown }> | null;
  const code = typeof error?.code === 'string' ? error.code.toUpperCase() : '';
  const message = typeof error?.message === 'string' ? error.message : '';
  return code === '42501' ||
    code === 'FORBIDDEN' ||
    code === 'INSUFFICIENT_PRIVILEGE' ||
    /permission denied for (?:table|relation|schema)|insufficient privilege/iu.test(message);
}

async function loadOrganizations(
  options: ConstructiveOrganizationsAdapterOptions,
  runtime: ConsoleKitAdapterContext,
  signal: AbortSignal,
  knownPrincipalOrganizations: ReadonlyMap<string, string>
): Promise<Readonly<{
  data: OrganizationsFeatureData;
  inviteProfileIds: ReadonlySet<string>;
  activeOrganizationMemberIds: ReadonlySet<string>;
  cancelableInviteIds: ReadonlySet<string>;
  policyLimitations: readonly FeaturePackLimitation[];
  canManageActiveOrganization: boolean;
  canManagePermissions: boolean;
  canManageHierarchy: boolean;
  canManageCredentials: boolean;
  profileScopeReadable: boolean;
  canCreateInvites: boolean;
  canAssignInviteProfiles: boolean;
  canCreateOrganization: boolean;
  canValidateCreatedOwnerMembership: boolean;
  userFields: readonly string[];
}>> {
  if (runtime.session.status !== 'authenticated') {
    return {
      data: { organizations: [], members: [], invites: [] },
      inviteProfileIds: new Set(),
      activeOrganizationMemberIds: new Set(),
      cancelableInviteIds: new Set(),
      policyLimitations: [],
      canManageActiveOrganization: false,
      canManagePermissions: false,
      canManageHierarchy: false,
      canManageCredentials: false,
      profileScopeReadable: false,
      canCreateInvites: false,
      canAssignInviteProfiles: false,
      canCreateOrganization: false,
      canValidateCreatedOwnerMembership: false,
      userFields: []
    };
  }
  const selections = adminDirectorySelections(options);
  const userFields = organizationUserFields(options);
  const applicationSource = applicationOrganizationSource(
    runtime.metadataByEndpoint,
    runtime.metadata
  );
  const applicationContract = applicationSource?.contract ?? null;
  if (!userFields && !applicationContract) {
    throw new Error(
      'The auth endpoint must expose users with readable id and type fields for organization identities.'
    );
  }
  const profileScopeReadable = selections.profiles.includes('entityId');
  const deniedOptionalReads = new Set<string>();
  const optionalConnection = (
    endpoint: ConsoleEndpointKind,
    operationName: string,
    fieldName: string,
    nodeSelection: string
  ): Promise<Record<string, unknown>[]> => executeConstructiveConnectionQuery(
    runtime,
    endpoint,
    { operationName, fieldName, nodeSelection },
    signal
  ).catch((cause): Record<string, unknown>[] => {
    if (!isOptionalReadDenied(cause)) throw cause;
    deniedOptionalReads.add(`${endpoint}:${fieldName}`);
    return [];
  });
  const optionalAdminConnection = (
    operationName: string,
    fieldName: string,
    nodeFields: readonly string[]
  ): Promise<Record<string, unknown>[]> => nodeFields.length > 0
    ? optionalConnection('admin', operationName, fieldName, nodeFields.join(' '))
    : Promise.resolve([]);
  const authSchema = options.discovery.getSchemas().auth;
  const optionalAuthConnection = (
    operationName: string,
    fieldName: string,
    typeName: string,
    desiredFields: readonly string[]
  ): Promise<Record<string, unknown>[]> => {
    if (!authSchema || !supports(options, 'auth', 'query', fieldName)) {
      return Promise.resolve([]);
    }
    const fields = connectionSelection(authSchema, typeName, desiredFields);
    return fields.length > 0
      ? optionalConnection('auth', operationName, fieldName, fields.join(' '))
      : Promise.resolve([]);
  };
  const [
    memberships,
    memberProfileRows,
    profileRows,
    profilePermissionRows,
    inviteRows,
    claimedInviteRows,
    permissionRows,
    settingRows,
    defaultRows,
    hierarchyRows,
    apiKeyRows,
    principalEntityRows,
    principalRows,
    appMembershipRows,
    appPermissionRows,
    userRows,
    applicationOrganizationRows,
    applicationMemberRows
  ] =
    await Promise.all([
      optionalAdminConnection(
        'ConsoleKitOrganizationMembershipsPage',
        'orgMemberships',
        selections.memberships
      ),
      optionalAdminConnection(
        'ConsoleKitOrganizationMemberProfilesPage',
        'orgMemberProfiles',
        selections.memberProfiles
      ),
      optionalAdminConnection(
        'ConsoleKitOrganizationMembershipsProfilesPage',
        'orgProfiles',
        selections.profiles
      ),
      optionalAdminConnection(
        'ConsoleKitOrganizationProfilePermissionsPage',
        'orgProfilePermissions',
        selections.profilePermissions
      ),
      optionalAdminConnection(
        'ConsoleKitOrganizationMembershipsInvitesPage',
        'orgInvites',
        selections.invites
      ),
      optionalAdminConnection(
        'ConsoleKitOrganizationClaimedInvitesPage',
        'orgClaimedInvites',
        selections.claimedInvites
      ),
      optionalAdminConnection(
        'ConsoleKitOrganizationMembershipsPermissionsPage',
        'orgPermissions',
        selections.permissions
      ),
      optionalAdminConnection(
        'ConsoleKitOrganizationMembershipsSettingsPage',
        'orgMembershipSettings',
        selections.settings
      ),
      optionalAdminConnection(
        'ConsoleKitOrganizationMembershipDefaultsPage',
        'orgMembershipDefaults',
        selections.defaults
      ),
      optionalAdminConnection(
        'ConsoleKitOrganizationHierarchyPage',
        'orgChartEdges',
        selections.hierarchy
      ),
      optionalAuthConnection(
        'ConsoleKitOrganizationApiKeysPage',
        'orgApiKeyLists',
        'OrgApiKeyList',
        ['id', 'keyId', 'name', 'principalId', 'orgId', 'expiresAt', 'revokedAt', 'lastUsedAt', 'createdAt']
      ),
      optionalAuthConnection(
        'ConsoleKitOrganizationPrincipalEntitiesPage',
        'principalEntities',
        'PrincipalEntity',
        ['id', 'principalId', 'entityId']
      ),
      optionalAuthConnection(
        'ConsoleKitOrganizationPrincipalsPage',
        'principals',
        'Principal',
        ['id', 'userId', 'name', 'useAdminOwner', 'isReadOnly', 'bypassStepUp']
      ),
      optionalAdminConnection(
        'ConsoleKitOrganizationAppMembershipsPage',
        'appMemberships',
        selections.appMemberships
      ),
      optionalAdminConnection(
        'ConsoleKitOrganizationAppPermissionsPage',
        'appPermissions',
        selections.appPermissions
      ),
      userFields
        ? executeConstructiveConnectionQuery(runtime, 'auth', {
            operationName: 'ConsoleKitOrganizationUsersPage',
            fieldName: 'users',
            nodeSelection: userFields.join(' ')
          }, signal)
        : Promise.resolve([]),
      applicationContract
        ? optionalConnection(
            applicationSource!.kind,
            'ConsoleKitApplicationOrganizationsPage',
            applicationContract.organizations.root,
            metaSelection([
              applicationContract.organizations.id,
              applicationContract.organizations.name,
              applicationContract.organizations.slug,
              applicationContract.organizations.avatar
            ])
          )
        : Promise.resolve([]),
      applicationContract?.members
        ? optionalConnection(
            applicationSource!.kind,
            'ConsoleKitApplicationOrganizationMembersPage',
            applicationContract.members.root,
            metaSelection([
              applicationContract.members.id,
              applicationContract.members.organizationId,
              applicationContract.members.userId,
              applicationContract.members.role,
              applicationContract.members.status,
              applicationContract.members.joinedAt,
              applicationContract.members.invitedAt
            ])
          )
        : Promise.resolve([])
    ]);
  const users = new Map(userRows.flatMap((user) => {
    const id = asString(user.id);
    return id ? [[id, user] as const] : [];
  }));
  const actorId = runtime.session.identity.subjectId;
  const actorAppMemberships = appMembershipRows.filter(
    (membership) => asString(membership.actorId) === actorId
  );
  const actorAppMembership = actorAppMemberships[0];
  const canCreateOrganization = actorAppMemberships.length === 1 &&
    asBoolean(actorAppMembership?.isActive) &&
    hasEffectivePermission(actorAppMembership, appPermissionRows, 'create_entity');
  const actorMemberships = memberships.filter(
    (membership) => asString(membership.actorId) === actorId
  );
  const memberCount = new Map<string, number>();
  const ownerCountByOrganization = new Map<string, number>();
  for (const membership of memberships) {
    const entityId = asString(membership.entityId);
    if (!entityId) continue;
    memberCount.set(entityId, (memberCount.get(entityId) ?? 0) + 1);
    if (
      asBoolean(membership.isOwner) &&
      !asBoolean(membership.isDisabled) &&
      !asBoolean(membership.isBanned)
    ) {
      ownerCountByOrganization.set(
        entityId,
        (ownerCountByOrganization.get(entityId) ?? 0) + 1
      );
    }
  }
  const managedOrganizations: OrganizationSummary[] = actorMemberships.flatMap((membership) => {
    const entityId = asString(membership.entityId);
    const entity = entityId ? users.get(entityId) : undefined;
    if (!entityId || !entity || entity.type !== 2) return [];
    return [{
      id: entityId,
      name: asString(entity.displayName) ?? asString(entity.username) ?? entityId,
      slug: asString(entity.username) ?? undefined,
      avatarUrl: imageUrl(entity.profilePicture),
      memberCount: memberCount.get(entityId) ?? 0
    }];
  });
  const applicationMemberCount = new Map<string, number>();
  if (applicationContract?.members) {
    for (const membership of applicationMemberRows) {
      const entityId = asString(
        membership[applicationContract.members.organizationId]
      );
      if (entityId) {
        applicationMemberCount.set(
          entityId,
          (applicationMemberCount.get(entityId) ?? 0) + 1
        );
      }
    }
  }
  const applicationOrganizationRawIds = new Map<string, string>();
  const applicationOrganizations: OrganizationSummary[] = applicationContract
    ? applicationOrganizationRows.flatMap((row) => {
        const rawId = asString(row[applicationContract.organizations.id]);
        const name = asString(row[applicationContract.organizations.name]);
        if (!rawId || !name) return [];
        const id = applicationOrganizationId(applicationContract, rawId);
        applicationOrganizationRawIds.set(id, rawId);
        return [{
          id,
          name,
          slug: applicationContract.organizations.slug
            ? asString(row[applicationContract.organizations.slug]) ?? undefined
            : undefined,
          avatarUrl: applicationContract.organizations.avatar
            ? imageUrl(row[applicationContract.organizations.avatar])
            : undefined,
          memberCount: applicationMemberCount.get(rawId) ?? 0
        }];
      })
    : [];
  const organizations = [...managedOrganizations, ...applicationOrganizations];
  const applicationOrganizationIds = new Set(
    applicationOrganizations.map((organization) => organization.id)
  );
  const configuredOrganization = options.store.getState().context?.organizationId;
  const activeOrganizationId = organizations.some((item) => item.id === configuredOrganization)
    ? configuredOrganization ?? undefined
    : organizations[0]?.id;
  const profileNames = new Map<string, string>();
  for (const profile of profileRows) {
    const id = asString(profile.id);
    const name = asString(profile.name);
    if (id && name) {
      profileNames.set(id, name);
    }
  }
  const activeIsApplicationOrganization = Boolean(
    activeOrganizationId && applicationOrganizationIds.has(activeOrganizationId)
  );
  const actorMembership = actorMemberships.find(
    (membership) => asString(membership.entityId) === activeOrganizationId
  );
  const hasActiveMembership = asBoolean(actorMembership?.isActive);
  const hasAdministrativeRole = Boolean(
    hasActiveMembership && actorMembership &&
    (asBoolean(actorMembership.isOwner) || asBoolean(actorMembership.isAdmin))
  );
  const hasActiveAdminRole = Boolean(
    hasActiveMembership && actorMembership && asBoolean(actorMembership.isAdmin)
  );
  const hasActiveOwnerRole = Boolean(
    hasActiveMembership && actorMembership && asBoolean(actorMembership.isOwner)
  );
  const hasNamedPermission = (permissionName: string) => hasActiveMembership &&
    hasEffectivePermission(actorMembership, permissionRows, permissionName);
  const canManageActiveOrganization = !activeIsApplicationOrganization && (
    hasAdministrativeRole || hasNamedPermission('admin_members')
  );
  const canManagePermissions = !activeIsApplicationOrganization && (
    hasAdministrativeRole || hasNamedPermission('admin_permissions')
  );
  const canManageHierarchy = !activeIsApplicationOrganization && (
    hasAdministrativeRole || hasNamedPermission('manage_hierarchy')
  );
  const memberProfilesByMembership = new Map(
    memberProfileRows.flatMap((profile) => {
      const membershipId = asString(profile.membershipId);
      return membershipId ? [[membershipId, profile] as const] : [];
    })
  );
  const activeMembershipRows = memberships.filter(
    (membership) => asString(membership.entityId) === activeOrganizationId
  );
  const ownerCount = activeMembershipRows.filter((membership) =>
    asBoolean(membership.isOwner) && !asBoolean(membership.isDisabled) &&
    !asBoolean(membership.isBanned)
  ).length;
  const managedMembers: OrganizationMember[] = memberships
    .filter((membership) => asString(membership.entityId) === activeOrganizationId)
    .flatMap((membership) => {
      const id = asString(membership.id);
      const userId = asString(membership.actorId);
      if (!id || !userId) return [];
      const user = users.get(userId);
      const profile = memberProfilesByMembership.get(id);
      const governance = asBoolean(membership.isOwner)
        ? 'owner' as const
        : asBoolean(membership.isAdmin)
          ? 'admin' as const
          : 'member' as const;
      const targetIsOwner = governance === 'owner';
      const canChangeOwner = hasActiveOwnerRole && (!targetIsOwner || ownerCount > 1);
      const canChangeLifecycle = canManageActiveOrganization && !targetIsOwner;
      return [{
        id,
        userId,
        name: asString(profile?.displayName) ?? asString(user?.displayName) ??
          asString(user?.username) ?? userId,
        email: asString(profile?.email) ?? (
          asString(user?.username)?.includes('@') ? asString(user?.username)! : 'Private email'
        ),
        avatarUrl: imageUrl(profile?.profilePicture) ?? imageUrl(user?.profilePicture),
        governance,
        status: memberStatus(membership) as OrganizationMember['status'],
        isApproved: asBoolean(membership.isApproved),
        isBanned: asBoolean(membership.isBanned),
        isDisabled: asBoolean(membership.isDisabled),
        isActive: asBoolean(membership.isActive),
        isExternal: asBoolean(membership.isExternal),
        isReadOnly: asBoolean(membership.isReadOnly),
        profileId: asString(membership.profileId) ?? undefined,
        profileName: profileNames.get(asString(membership.profileId) ?? ''),
        directPermissions: asString(membership.granted) ?? undefined,
        effectivePermissions: asString(membership.permissions) ?? undefined,
        memberProfile: profile
          ? {
              id: asString(profile.id) ?? undefined,
              displayName: asString(profile.displayName) ?? undefined,
              email: asString(profile.email) ?? undefined,
              title: asString(profile.title) ?? undefined,
              bio: asString(profile.bio) ?? undefined,
              avatarUrl: imageUrl(profile.profilePicture)
            }
          : undefined,
        actionPolicy: {
          approveMember: canChangeLifecycle,
          banMember: canChangeLifecycle,
          disableMember: canChangeLifecycle,
          markMemberExternal: canChangeLifecycle,
          markMemberReadOnly: canChangeLifecycle,
          removeMember: canChangeLifecycle,
          grantAdmin: hasActiveAdminRole && !targetIsOwner,
          grantOwner: canChangeOwner,
          assignProfile: canManageActiveOrganization,
          grantPermission: canManageActiveOrganization,
          updateMemberProfile: canManageActiveOrganization || userId === actorId
        }
      }];
    });
  const activeApplicationOrganizationRawId = activeOrganizationId
    ? applicationOrganizationRawIds.get(activeOrganizationId)
    : undefined;
  const applicationMembers: OrganizationMember[] = applicationContract?.members &&
    activeIsApplicationOrganization
    ? applicationMemberRows
        .filter((membership) => asString(
          membership[applicationContract.members!.organizationId]
        ) === activeApplicationOrganizationRawId)
        .flatMap((membership) => {
          const contract = applicationContract.members!;
          const id = asString(membership[contract.id]);
          if (!id) return [];
          const userId = contract.userId
            ? asString(membership[contract.userId])
            : null;
          const user = userId ? users.get(userId) : undefined;
          const joinedAt = contract.joinedAt
            ? asString(membership[contract.joinedAt])
            : null;
          const invitedAt = contract.invitedAt
            ? asString(membership[contract.invitedAt])
            : null;
          return [{
            id,
            userId: userId ?? id,
            name: asString(user?.displayName) ?? asString(user?.username) ?? userId ?? 'Member',
            email: asString(user?.username)?.includes('@')
              ? asString(user?.username)!
              : 'Private email',
            avatarUrl: imageUrl(user?.profilePicture),
            profileName: contract.role
              ? asString(membership[contract.role]) ?? undefined
              : undefined,
            governance: 'member' as const,
            status: contract.status
              ? (asString(membership[contract.status]) ?? 'active') as OrganizationMember['status']
              : joinedAt || !invitedAt ? 'active' as const : 'pending' as const,
            isApproved: true,
            isBanned: false,
            isDisabled: false,
            isActive: true,
            isExternal: false,
            isReadOnly: true,
            actionPolicy: {}
          }];
        })
    : [];
  const members = activeIsApplicationOrganization
    ? applicationMembers
    : managedMembers;
  const assignmentMode = inviteProfileAssignmentMode(settingRows, activeOrganizationId);
  const hasAssignProfiles = hasNamedPermission('assign_profiles');
  const canAssignInviteProfiles = !activeIsApplicationOrganization && profileScopeReadable && (
    hasAdministrativeRole ||
    (hasActiveMembership && assignmentMode.mode === 'subset_only') || hasAssignProfiles
  );
  const inviteProfileIds = new Set<string>();
  for (const profile of profileRows) {
    const id = asString(profile.id);
    const entityId = asString(profile.entityId);
    const belongsToActiveOrganization = !entityId || entityId === activeOrganizationId;
    const satisfiesSubset = assignmentMode.mode === 'permission_only' || permissionMaskIsSubset(
      profile.permissions,
      actorMembership?.permissions
    );
    if (
      id &&
      belongsToActiveOrganization &&
      canAssignInviteProfiles &&
      (hasAdministrativeRole || satisfiesSubset)
    ) {
      inviteProfileIds.add(id);
    }
  }
  const cancelableInviteIds = new Set<string>();
  const invites: OrganizationInvite[] = inviteRows
    .filter((invite) => asString(invite.entityId) === activeOrganizationId)
    .flatMap((invite) => {
      const id = asString(invite.id);
      const email = asString(invite.email);
      const phone = asString(invite.phone);
      if (!id) return [];
      const rawChannel = asString(invite.channel);
      const channel = rawChannel === 'sms' || rawChannel === 'link'
        ? rawChannel
        : email ? 'email' as const : phone ? 'sms' as const : 'link' as const;
      const canCancel = !activeIsApplicationOrganization && (
        hasActiveAdminRole ||
        asString(invite.senderId) === actorId
      );
      if (canCancel) cancelableInviteIds.add(id);
      return [{
        id,
        channel,
        recipient: email ?? phone ?? 'Reusable link',
        email: email ?? undefined,
        phone: phone ?? undefined,
        token: channel === 'link' ? asString(invite.inviteToken) ?? undefined : undefined,
        profileId: asString(invite.profileId) ?? undefined,
        profileName: profileNames.get(asString(invite.profileId) ?? ''),
        status: asBoolean(invite.inviteValid) ? 'pending' : 'expired',
        expiresAt: asString(invite.expiresAt) ?? undefined,
        multiple: asBoolean(invite.multiple),
        inviteLimit: typeof invite.inviteLimit === 'number' ? invite.inviteLimit : undefined,
        inviteCount: typeof invite.inviteCount === 'number' ? invite.inviteCount : undefined,
        isReadOnly: asBoolean(invite.isReadOnly),
        actionPolicy: { cancelInvite: canCancel }
      }];
    });
  const permissionIdsByProfile = new Map<string, string[]>();
  for (const row of profilePermissionRows) {
    const profileId = asString(row.profileId);
    const permissionId = asString(row.permissionId);
    if (!profileId || !permissionId) continue;
    const existing = permissionIdsByProfile.get(profileId) ?? [];
    existing.push(permissionId);
    permissionIdsByProfile.set(profileId, existing);
  }
  const permissions: OrganizationPermission[] = permissionRows.flatMap((permission) => {
    const id = asString(permission.id);
    const name = asString(permission.name);
    const bitstr = asString(permission.bitstr);
    return id && name && bitstr
      ? [{
          id,
          name,
          description: asString(permission.description) ?? undefined,
          bitstr
        }]
      : [];
  });
  const profiles: OrganizationAccessProfile[] = profileRows
    .filter((profile) => {
      const entityId = asString(profile.entityId);
      return !entityId || entityId === activeOrganizationId;
    })
    .flatMap((profile) => {
      const id = asString(profile.id);
      const name = asString(profile.name);
      if (!id || !name) return [];
      const isSystem = asBoolean(profile.isSystem);
      return [{
        id,
        name,
        slug: asString(profile.slug) ?? undefined,
        description: asString(profile.description) ?? undefined,
        permissions: asString(profile.permissions) ?? '',
        permissionIds: permissionIdsByProfile.get(id) ?? [],
        isSystem,
        isDefault: asBoolean(profile.isDefault),
        actionPolicy: {
          updateAccessProfile: canManagePermissions && profileScopeReadable && !isSystem,
          deleteAccessProfile: canManagePermissions && profileScopeReadable && !isSystem,
          setProfilePermission: canManagePermissions && profileScopeReadable && !isSystem
        }
      }];
    });
  const settingsRow = settingRows.find(
    (row) => asString(row.entityId) === activeOrganizationId
  );
  const settingsId = asString(settingsRow?.id);
  const membershipSettings: OrganizationMembershipSettings | undefined = settingsId
    ? {
        id: settingsId,
        deleteMemberCascadeChildren: asBoolean(settingsRow?.deleteMemberCascadeChildren),
        createChildCascadeOwners: asBoolean(settingsRow?.createChildCascadeOwners),
        createChildCascadeAdmins: asBoolean(settingsRow?.createChildCascadeAdmins),
        createChildCascadeMembers: asBoolean(settingsRow?.createChildCascadeMembers),
        allowExternalMembers: asBoolean(settingsRow?.allowExternalMembers),
        inviteProfileAssignmentMode: inviteProfileAssignmentMode(
          settingRows,
          activeOrganizationId
        ).mode,
        populateMemberEmail: asBoolean(settingsRow?.populateMemberEmail),
        limitAllocationMode: asString(settingsRow?.limitAllocationMode) ?? 'none'
      }
    : undefined;
  const defaultRow = defaultRows.find(
    (row) => asString(row.entityId) === activeOrganizationId
  );
  const defaultId = asString(defaultRow?.id);
  const membershipDefault: OrganizationMembershipDefault | undefined = defaultId
    ? { id: defaultId, isApproved: asBoolean(defaultRow?.isApproved) }
    : undefined;
  const hierarchy: OrganizationChartEdge[] = hierarchyRows
    .filter((edge) => asString(edge.entityId) === activeOrganizationId)
    .flatMap((edge) => {
      const id = asString(edge.id);
      const childId = asString(edge.childId);
      const parentId = asString(edge.parentId);
      if (!id || !childId || !parentId) return [];
      return [{
        id,
        childId,
        parentId,
        positionTitle: asString(edge.positionTitle) ?? undefined,
        positionLevel: typeof edge.positionLevel === 'number'
          ? edge.positionLevel
          : undefined,
        actionPolicy: { removeHierarchyEdge: canManageHierarchy }
      }];
    });
  const claimedInvites: OrganizationClaimedInvite[] = claimedInviteRows
    .filter((row) => asString(row.entityId) === activeOrganizationId)
    .flatMap((row) => {
      const id = asString(row.id);
      const senderId = asString(row.senderId);
      const receiverId = asString(row.receiverId);
      return id && senderId && receiverId
        ? [{
            id,
            senderId,
            receiverId,
            createdAt: asString(row.createdAt) ?? undefined
          }]
        : [];
    });
  const apiKeys: OrganizationApiKey[] = apiKeyRows
    .filter((row) => asString(row.orgId) === activeOrganizationId && !asString(row.revokedAt))
    .flatMap((row) => {
      const id = asString(row.keyId) ?? asString(row.id);
      const principalId = asString(row.principalId);
      if (!id || !principalId) return [];
      return [{
        id,
        principalId,
        name: asString(row.name) ?? undefined,
        createdAt: asString(row.createdAt) ?? undefined,
        expiresAt: asString(row.expiresAt) ?? undefined,
        lastUsedAt: asString(row.lastUsedAt) ?? undefined,
        actionPolicy: { revokeOrganizationApiKey: hasAdministrativeRole }
      }];
    });
  const principalRowScopes = new Map<string, Set<string>>();
  const principalUserScopes = new Map<string, Set<string>>();
  const addPrincipalScope = (
    scopes: Map<string, Set<string>>,
    principalId: string | null,
    organizationId: string | null
  ) => {
    if (!principalId || !organizationId) return;
    const organizations = scopes.get(principalId) ?? new Set<string>();
    organizations.add(organizationId);
    scopes.set(principalId, organizations);
  };
  for (const row of principalEntityRows) {
    addPrincipalScope(
      principalRowScopes,
      asString(row.principalId),
      asString(row.entityId)
    );
  }
  for (const row of apiKeyRows) {
    addPrincipalScope(
      principalUserScopes,
      asString(row.principalId),
      asString(row.orgId)
    );
  }
  for (const membership of memberships) {
    addPrincipalScope(
      principalUserScopes,
      asString(membership.actorId),
      asString(membership.entityId)
    );
  }
  let hasUnscopedPrincipalRows = false;
  const principals: OrganizationPrincipal[] = principalRows
    .flatMap((row) => {
      const rowId = asString(row.id);
      const userId = asString(row.userId);
      const scopedOrganizationIds = new Set<string>([
        ...(rowId ? principalRowScopes.get(rowId) ?? [] : []),
        ...(userId ? principalUserScopes.get(userId) ?? [] : [])
      ]);
      const knownOrganizationId = userId
        ? knownPrincipalOrganizations.get(
            principalOrganizationKey(runtime.databaseId, userId)
          )
        : undefined;
      if (knownOrganizationId) scopedOrganizationIds.add(knownOrganizationId);
      const belongsToActiveOrganization = Boolean(
        rowId && userId && activeOrganizationId &&
        scopedOrganizationIds.has(activeOrganizationId)
      );
      const name = asString(row.name);
      if (rowId && scopedOrganizationIds.size === 0) {
        hasUnscopedPrincipalRows = true;
      }
      return belongsToActiveOrganization && userId && name
        ? [{
            // Constructive's semantic principal procedures accept and return
            // principals.user_id. principals.id is an internal row identity
            // used by principal_entities and scope overrides.
            id: userId,
            name,
            type: asBoolean(row.useAdminOwner) ? 'Owner delegated' :
              asBoolean(row.isReadOnly) ? 'Read only' : 'Custom',
            useAdminOwner: asBoolean(row.useAdminOwner),
            isReadOnly: asBoolean(row.isReadOnly),
            bypassStepUp: asBoolean(row.bypassStepUp),
            actionPolicy: { revokeOrganizationPrincipal: hasAdministrativeRole }
          }]
        : [];
    });
  const policyLimitations: FeaturePackLimitation[] = Array.from(
    deniedOptionalReads
  ).sort().map((coordinate) => ({
      code: `constructive.optional-read-denied.${coordinate.replaceAll(':', '.')}`,
      message:
        `The current session cannot read the optional ${coordinate} organization surface, so Console Kit omitted it. Database authorization remains authoritative.`
    }));
  if (activeIsApplicationOrganization) {
    policyLimitations.push(APPLICATION_DIRECTORY_READ_ONLY_LIMITATION);
  }
  if (activeOrganizationId && !activeIsApplicationOrganization && !assignmentMode.known) {
    policyLimitations.push(INVITE_PROFILE_MODE_LIMITATION);
  }
  if (
    activeOrganizationId &&
    !activeIsApplicationOrganization &&
    selections.profiles.length > 0 &&
    !profileScopeReadable
  ) {
    policyLimitations.push(PROFILE_SCOPE_LIMITATION);
  }
  if (activeOrganizationId && !activeIsApplicationOrganization && hasUnscopedPrincipalRows) {
    policyLimitations.push(PRINCIPAL_SCOPE_LIMITATION);
  }
  return {
    data: {
      organizations: organizations.map((organization) => {
        const applicationOrganization = applicationOrganizationIds.has(organization.id);
        const membership = actorMemberships.find(
          (candidate) => asString(candidate.entityId) === organization.id
        );
        const active = asBoolean(membership?.isActive);
        const owner = active && asBoolean(membership?.isOwner);
        const banned = asBoolean(membership?.isBanned);
        const canAdminAccount = active && Boolean(
          membership && hasEffectivePermission(membership, permissionRows, 'admin_account')
        );
        const canLeave = Boolean(membership) && !banned && (
          !owner ||
          (ownerCountByOrganization.get(organization.id) ?? 0) > 1 ||
          (memberCount.get(organization.id) ?? 0) <= 1
        );
        return {
          ...organization,
          source: applicationOrganization
            ? 'application-meta' as const
            : 'constructive-membership' as const,
          actionPolicy: applicationOrganization
            ? {}
            : {
                updateOrganization: owner || canAdminAccount,
                deleteOrganization: owner,
                leaveOrganization: canLeave
              }
        };
      }),
      activeOrganizationId,
      currentActorId: actorId,
      members,
      invites: selections.invites.length > 0 && !deniedOptionalReads.has('admin:orgInvites')
        ? invites
        : undefined,
      claimedInvites: selections.claimedInvites.length > 0 &&
        !deniedOptionalReads.has('admin:orgClaimedInvites')
        ? claimedInvites
        : undefined,
      profiles: selections.profiles.length > 0 && !deniedOptionalReads.has('admin:orgProfiles')
        ? profiles
        : undefined,
      permissions: selections.permissions.length > 0 &&
        !deniedOptionalReads.has('admin:orgPermissions')
        ? permissions
        : undefined,
      membershipSettings: deniedOptionalReads.has('admin:orgMembershipSettings')
        ? undefined
        : membershipSettings,
      membershipDefault: deniedOptionalReads.has('admin:orgMembershipDefaults')
        ? undefined
        : membershipDefault,
      hierarchy: selections.hierarchy.length > 0 && !deniedOptionalReads.has('admin:orgChartEdges')
        ? hierarchy
        : undefined,
      apiKeys: supports(options, 'auth', 'query', 'orgApiKeyLists') &&
        !deniedOptionalReads.has('auth:orgApiKeyLists')
        ? apiKeys
        : undefined,
      principals: supports(options, 'auth', 'query', 'principals') &&
        !deniedOptionalReads.has('auth:principals')
        ? principals
        : undefined,
      assignableInviteProfileIds: [...inviteProfileIds]
    },
    inviteProfileIds,
    activeOrganizationMemberIds: activeIsApplicationOrganization
      ? new Set()
      : new Set(managedMembers.map((member) => member.id)),
    cancelableInviteIds,
    policyLimitations,
    canManageActiveOrganization,
    canManagePermissions,
    canManageHierarchy,
    canManageCredentials: hasAdministrativeRole,
    profileScopeReadable,
    canCreateInvites: !activeIsApplicationOrganization && (
      hasAdministrativeRole || hasNamedPermission('create_invites')
    ),
    canAssignInviteProfiles,
    canCreateOrganization,
    canValidateCreatedOwnerMembership: CREATED_OWNER_MEMBERSHIP_FIELDS.every(
      (field) => selections.memberships.includes(field)
    ),
    userFields: userFields ?? []
  };
}

function createdOrganizationUser(
  data: unknown
): Record<string, unknown> | null {
  return asRecord(asRecord(asRecord(data)?.createUser)?.user);
}

function deletedOrganizationId(data: unknown): string | null {
  return asString(asRecord(asRecord(asRecord(data)?.deleteUser)?.user)?.id);
}

function isExactCreatedOwnerMembership(
  membership: Record<string, unknown>,
  actorId: string,
  organizationId: string
): boolean {
  const permissions = asString(membership.permissions);
  return Boolean(asString(membership.id)) &&
    asString(membership.actorId) === actorId &&
    asString(membership.entityId) === organizationId &&
    asBoolean(membership.isOwner) &&
    asBoolean(membership.isAdmin) &&
    asBoolean(membership.isActive) &&
    asBoolean(membership.isApproved) &&
    membership.isBanned === false &&
    membership.isDisabled === false &&
    membership.isReadOnly === false &&
    Boolean(permissions && /^1+$/u.test(permissions));
}

function organizationProvisioningUsername(): string {
  return `console-kit-org-${globalThis.crypto.randomUUID()}`;
}

function unknownOrganizationProvisioningOutcome(resourceKey: string): Error {
  const error = new Error(
    'The organization create request did not return a trustworthy outcome. ' +
    `Reconcile organization key ${resourceKey} before changing the organization name.`
  ) as Error & { code?: string; retryable?: boolean; resourceKey?: string };
  error.code = 'ORGANIZATION_PROVISIONING_OUTCOME_UNKNOWN';
  error.retryable = false;
  error.resourceKey = resourceKey;
  return error;
}

const AMBIGUOUS_ORGANIZATION_CREATE_CODES = new Set([
  'HTTP_ERROR',
  'INVALID_RESPONSE',
  'NETWORK_ERROR',
  'REQUEST_ABORTED'
]);

function isAmbiguousOrganizationCreateFailure(cause: unknown): boolean {
  if (cause instanceof Error && cause.name === 'AbortError') return true;
  const failure = asRecord(cause);
  const errors = failure?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    return errors.every((candidate) => {
      const error = asRecord(candidate);
      const extensions = asRecord(error?.extensions);
      const code = asString(extensions?.code);
      return Boolean(code && AMBIGUOUS_ORGANIZATION_CREATE_CODES.has(code));
    });
  }
  const code = asString(failure?.code);
  return !code || AMBIGUOUS_ORGANIZATION_CREATE_CODES.has(code);
}

async function rollbackIncompleteOrganization(
  runtime: ConsoleKitAdapterContext,
  organizationId: string,
  canDelete: boolean
): Promise<boolean> {
  if (!canDelete) return false;
  try {
    const deleted = await executeConstructiveGraphQL<Record<string, unknown>>(
      runtime,
      'auth',
      DELETE_ORGANIZATION_MUTATION,
      { input: { id: organizationId } }
    );
    return deletedOrganizationId(deleted) === organizationId;
  } catch {
    return false;
  }
}

async function rejectIncompleteOrganization(
  runtime: ConsoleKitAdapterContext,
  organizationId: string | null,
  canDelete: boolean,
  reason: string,
  onRemoved?: () => void
): Promise<never> {
  const removed = organizationId
    ? await rollbackIncompleteOrganization(runtime, organizationId, canDelete)
    : false;
  if (removed) onRemoved?.();
  const error = new Error(
    removed
      ? `${reason} The incomplete organization was removed.`
      : `${reason} Console Kit did not select it; this tenant may require backend cleanup.`
  ) as Error & { code?: string; retryable?: boolean };
  error.code = 'ORGANIZATION_PROVISIONING_CONTRACT_FAILED';
  error.retryable = false;
  throw error;
}

function organizationsAvailability(
  options: ConstructiveOrganizationsAdapterOptions
) {
  const availability = packAvailability(options.store, 'organizations');
  if (availability.status !== 'available') return availability;
  const state = options.store.getState();
  if (
    !organizationUserFields(options) &&
    !applicationOrganizationSource(state.metadataByEndpoint, state.metadata)
  ) {
    return {
      status: 'unavailable' as const,
      reason:
        'The auth endpoint must expose the users connection with readable id and type fields.'
    };
  }
  return availability;
}

export function createConstructiveOrganizationsAdapter(
  options: ConstructiveOrganizationsAdapterOptions
): ConsoleKitFeatureAdapter<OrganizationsFeaturePackProps> {
  const pendingOrganizationCreates = new Map<string, Readonly<{
    name: string;
    username: string;
  }>>();
  // create_org_principal scopes through the private organization SPRT and
  // intentionally does not create principal_entities. Preserve the exact
  // association for this adapter's lifetime so multi-org owners do not need to
  // guess the new principal's scope.
  const knownPrincipalOrganizations = new Map<string, string>();
  const capabilities: readonly AtomicCapabilityId[] = [
    'organizations.memberships',
    'organizations.permissions',
    'organizations.limits',
    'organizations.profiles',
    'organizations.hierarchy',
    'organizations.invites'
  ];
  return {
    capabilities,
    getAvailability: () => organizationsAvailability(options),
    subscribe(runtime, listener) {
      const unsubscribe = options.discovery.subscribe(listener);
      void options.discovery.ensure(runtime);
      return unsubscribe;
    },
    async load(runtime, signal) {
      const loaded = await loadOrganizations(
        options,
        runtime,
        signal,
        knownPrincipalOrganizations
      );
      const activeOrganizationId = loaded.data.activeOrganizationId;
      const reload = () => notifyConsoleAdapters(options.store);
      const adminSchema = options.discovery.getSchemas().admin;
      const authSchema = options.discovery.getSchemas().auth;
      const creationActorId = runtime.session.status === 'authenticated'
        ? runtime.session.identity.subjectId
        : null;
      const canDeleteIncompleteOrganization = supportsConstructiveMutationInput(
        authSchema,
        'deleteUser',
        ['id']
      );
      const canCreateOrganization = Boolean(creationActorId) && loaded.canCreateOrganization &&
        loaded.canValidateCreatedOwnerMembership &&
        loaded.userFields.includes('username') &&
        canDeleteIncompleteOrganization && supportsConstructiveMutationInput(
        authSchema,
        'createUser',
        ['user'],
        { field: 'user', requiredFields: ['username', 'displayName', 'type'] }
      );
      const grantSupportsEntity = supportsConstructiveMutationInput(
        adminSchema,
        'createOrgProfileGrant',
        ['orgProfileGrant'],
        { field: 'orgProfileGrant', requiredFields: ['entityId'] }
      );
      const canUpdateMembership = loaded.canManageActiveOrganization &&
        supportsConstructiveMutationInput(
          adminSchema,
          'updateOrgMembership',
          ['id', 'orgMembershipPatch'],
          { field: 'orgMembershipPatch', requiredFields: ['isDisabled'] }
        );
      const canUpdateMembershipLifecycle = loaded.canManageActiveOrganization &&
        supportsConstructiveMutationInput(
          adminSchema,
          'updateOrgMembership',
          ['id', 'orgMembershipPatch'],
          {
            field: 'orgMembershipPatch',
            requiredFields: [
              'isApproved',
              'isBanned',
              'isDisabled',
              'isExternal',
              'isReadOnly'
            ]
          }
        );
      const canDeleteMembership = loaded.canManageActiveOrganization &&
        supportsConstructiveMutationInput(adminSchema, 'deleteOrgMembership', ['id']);
      const canSetMemberProfile = loaded.canManageActiveOrganization &&
        loaded.profileScopeReadable && grantSupportsEntity &&
        (loaded.data.profiles?.length ?? 0) > 0 &&
        supportsConstructiveMutationInput(
          adminSchema,
          'createOrgProfileGrant',
          ['orgProfileGrant'],
          {
            field: 'orgProfileGrant',
            requiredFields: ['membershipId', 'profileId', 'isGrant']
          }
        );
      const inviteSupportsChannel = supportsConstructiveMutationInput(
        adminSchema,
        'createOrgInvite',
        ['orgInvite'],
        { field: 'orgInvite', requiredFields: ['channel'] }
      );
      const inviteSupportsEmail = supportsConstructiveMutationInput(
        adminSchema,
        'createOrgInvite',
        ['orgInvite'],
        { field: 'orgInvite', requiredFields: ['email'] }
      );
      const inviteSupportsPhone = supportsConstructiveMutationInput(
        adminSchema,
        'createOrgInvite',
        ['orgInvite'],
        { field: 'orgInvite', requiredFields: ['phone'] }
      );
      const canInvite = loaded.canCreateInvites && Boolean(activeOrganizationId) &&
        supportsConstructiveMutationInput(
          adminSchema,
          'createOrgInvite',
          ['orgInvite'],
          { field: 'orgInvite', requiredFields: ['entityId'] }
        ) && (inviteSupportsEmail || inviteSupportsPhone || inviteSupportsChannel);
      const inviteSupportsExpiry = supportsConstructiveMutationInput(
        adminSchema,
        'createOrgInvite',
        ['orgInvite'],
        { field: 'orgInvite', requiredFields: ['expiresAt'] }
      );
      const inviteSupportsProfile = supportsConstructiveMutationInput(
        adminSchema,
        'createOrgInvite',
        ['orgInvite'],
        { field: 'orgInvite', requiredFields: ['profileId'] }
      );
      const inviteSupportsMultiple = supportsConstructiveMutationInput(
        adminSchema,
        'createOrgInvite',
        ['orgInvite'],
        { field: 'orgInvite', requiredFields: ['multiple', 'inviteLimit'] }
      );
      const inviteSupportsReadOnly = supportsConstructiveMutationInput(
        adminSchema,
        'createOrgInvite',
        ['orgInvite'],
        { field: 'orgInvite', requiredFields: ['isReadOnly'] }
      );
      const canDeleteInvite = loaded.cancelableInviteIds.size > 0 &&
        supportsConstructiveMutationInput(adminSchema, 'deleteOrgInvite', ['id']);
      const canGrantAdmin = loaded.data.members.some(
        (member) => member.actionPolicy?.grantAdmin
      ) && supportsConstructiveMutationInput(
        adminSchema,
        'createOrgAdminGrant',
        ['orgAdminGrant'],
        { field: 'orgAdminGrant', requiredFields: ['actorId', 'entityId', 'isGrant'] }
      );
      const canGrantOwner = loaded.data.members.some(
        (member) => member.actionPolicy?.grantOwner
      ) && supportsConstructiveMutationInput(
        adminSchema,
        'createOrgOwnerGrant',
        ['orgOwnerGrant'],
        { field: 'orgOwnerGrant', requiredFields: ['actorId', 'entityId', 'isGrant'] }
      );
      const canGrantPermission = loaded.data.members.some(
        (member) => member.actionPolicy?.grantPermission
      ) && supportsConstructiveMutationInput(
        adminSchema,
        'createOrgGrant',
        ['orgGrant'],
        {
          field: 'orgGrant',
          requiredFields: ['actorId', 'entityId', 'permissions', 'isGrant']
        }
      );
      const canDefineProfile = loaded.data.profiles?.some(
        (profile) => profile.actionPolicy?.setProfilePermission
      ) === true && supportsConstructiveMutationInput(
        adminSchema,
        'createOrgProfileDefinitionGrant',
        ['orgProfileDefinitionGrant'],
        {
          field: 'orgProfileDefinitionGrant',
          requiredFields: ['profileId', 'permissionId', 'isGrant']
        }
      );
      const canCreateProfile = loaded.canManagePermissions &&
        supportsConstructiveMutationInput(
        adminSchema,
        'createOrgProfile',
        ['orgProfile'],
        { field: 'orgProfile', requiredFields: ['entityId', 'name'] }
      );
      const canUpdateProfile = loaded.data.profiles?.some(
        (profile) => profile.actionPolicy?.updateAccessProfile
      ) === true && supportsConstructiveMutationInput(
        adminSchema,
        'updateOrgProfile',
        ['id', 'orgProfilePatch'],
        { field: 'orgProfilePatch', requiredFields: ['name', 'description'] }
      );
      const canDeleteProfile = loaded.data.profiles?.some(
        (profile) => profile.actionPolicy?.deleteAccessProfile
      ) === true && supportsConstructiveMutationInput(
        adminSchema,
        'deleteOrgProfile',
        ['id']
      );
      const canUpdateSettings = loaded.canManageActiveOrganization &&
        Boolean(loaded.data.membershipSettings) &&
        supportsConstructiveMutationInput(
          adminSchema,
          'updateOrgMembershipSetting',
          ['id', 'orgMembershipSettingPatch']
        );
      const canUpdateDefault = loaded.canManageActiveOrganization &&
        Boolean(loaded.data.membershipDefault) &&
        supportsConstructiveMutationInput(
          adminSchema,
          'updateOrgMembershipDefault',
          ['id', 'orgMembershipDefaultPatch'],
          { field: 'orgMembershipDefaultPatch', requiredFields: ['isApproved'] }
        );
      const canCreateMemberProfile = supportsConstructiveMutationInput(
        adminSchema,
        'createOrgMemberProfile',
        ['orgMemberProfile'],
        {
          field: 'orgMemberProfile',
          requiredFields: ['membershipId', 'entityId', 'actorId', 'displayName']
        }
      );
      const canUpdateMemberProfile = supportsConstructiveMutationInput(
        adminSchema,
        'updateOrgMemberProfile',
        ['id', 'orgMemberProfilePatch'],
        { field: 'orgMemberProfilePatch', requiredFields: ['displayName'] }
      );
      const canManageHierarchy = loaded.canManageHierarchy &&
        supportsConstructiveMutationInput(
        adminSchema,
        'createOrgChartEdgeGrant',
        ['orgChartEdgeGrant'],
        {
          field: 'orgChartEdgeGrant',
          requiredFields: ['entityId', 'childId', 'parentId', 'isGrant']
        }
      );
      const canUpdateOrganization = Boolean(activeOrganizationId) &&
        supportsConstructiveMutationInput(
          authSchema,
          'updateUser',
          ['id', 'userPatch'],
          { field: 'userPatch', requiredFields: ['displayName', 'username'] }
        );
      const canDeleteOrganization = Boolean(activeOrganizationId) &&
        supportsConstructiveMutationInput(authSchema, 'deleteUser', ['id']);
      const hasApiKeyCreationContract = loaded.canManageCredentials &&
        supportsConstructiveMutationInput(
        authSchema,
        'createOrgApiKey',
        ['orgId', 'principalId', 'keyName']
      );
      const canRevokeApiKey = loaded.canManageCredentials && supportsConstructiveMutationInput(
        authSchema,
        'revokeOrgApiKey',
        ['orgId', 'keyId']
      );
      const canRevokePrincipal = loaded.canManageCredentials && supportsConstructiveMutationInput(
        authSchema,
        'deleteOrgPrincipal',
        ['principalId']
      );
      const canCreatePrincipal = loaded.canManageCredentials &&
        supportsConstructiveMutationInput(
          authSchema,
          'createOrgPrincipal',
          ['name', 'orgId', 'useAdminOwner', 'isReadOnly', 'bypassStepUp']
        );
      const activeMemberIds = new Set(loaded.data.members.map((member) => member.id));
      const activeMemberActorIds = new Set(loaded.data.members
        .filter((member) => member.isApproved && !member.isDisabled && !member.isBanned)
        .map((member) => member.userId));
      const membersById = new Map(loaded.data.members.map((member) => [member.id, member]));
      const profileIds = new Set(loaded.data.profiles?.map((profile) => profile.id) ?? []);
      const permissionIds = new Set(loaded.data.permissions?.map((permission) => permission.id) ?? []);
      const permissionMasks = new Set(
        loaded.data.permissions?.map((permission) => permission.bitstr) ?? []
      );
      const hierarchyEdgeIds = new Set(loaded.data.hierarchy?.map((edge) => edge.id) ?? []);
      const apiKeyIds = new Set(loaded.data.apiKeys?.map((apiKey) => apiKey.id) ?? []);
      const principalIds = new Set(
        loaded.data.principals?.map((principal) => principal.id) ?? []
      );
      const assertActiveOrganization = (organizationId: string) => {
        if (!activeOrganizationId || organizationId !== activeOrganizationId) {
          throw new Error('The requested organization is not the active authorized organization.');
        }
      };
      const assertMemberAction = (
        membershipId: string,
        action: OrganizationMemberRowAction
      ): OrganizationMember => {
        assertAuthorizedTarget(activeMemberIds, membershipId, 'organization membership');
        const member = membersById.get(membershipId);
        if (!member || member.actionPolicy?.[action] !== true) {
          throw new Error(`The ${action} action is not authorized for this member.`);
        }
        return member;
      };
      const activeOrganization = loaded.data.organizations.find(
        (organization) => organization.id === activeOrganizationId
      );
      const currentActorMembership = loaded.data.members.find(
        (member) => member.userId === loaded.data.currentActorId
      );
      const canLeaveOrganization = Boolean(
        activeOrganization?.actionPolicy?.leaveOrganization && currentActorMembership
      ) && supportsConstructiveMutationInput(adminSchema, 'deleteOrgMembership', ['id']);
      const limitations = loaded.policyLimitations.slice();
      if (activeOrganizationId && hasApiKeyCreationContract) {
        limitations.push(API_KEY_CREATION_LIMITATION);
      }
      return {
        resource: loaded.data.organizations.length
          ? {
              status: 'ready',
              data: loaded.data,
              quality: 'authoritative',
              limitations
            }
          : { status: 'empty' },
        policy: {
          // A type-2 user is the organization identity. Constructive's user
          // insert trigger creates the current actor's owner membership in the
          // same transaction. Creation is exposed only when the actor's active
          // app membership carries create_entity and the result can be checked.
          createOrganization: canCreateOrganization,
          selectOrganization: true,
          updateOrganization: canUpdateOrganization && Boolean(
            loaded.data.organizations.find(
              (organization) => organization.id === activeOrganizationId
            )?.actionPolicy?.updateOrganization
          ),
          deleteOrganization: canDeleteOrganization && Boolean(
            loaded.data.organizations.find(
              (organization) => organization.id === activeOrganizationId
            )?.actionPolicy?.deleteOrganization
          ),
          leaveOrganization: canLeaveOrganization,
          inviteMember: canInvite,
          assignInviteProfile: canInvite &&
            loaded.canAssignInviteProfiles &&
            loaded.inviteProfileIds.size > 0 &&
            inviteSupportsProfile,
          approveMember: canUpdateMembershipLifecycle,
          banMember: canUpdateMembershipLifecycle,
          disableMember: canUpdateMembershipLifecycle,
          markMemberExternal: canUpdateMembershipLifecycle,
          markMemberReadOnly: canUpdateMembershipLifecycle,
          removeMember: canDeleteMembership || canUpdateMembership,
          grantAdmin: canGrantAdmin,
          grantOwner: canGrantOwner,
          assignProfile: canSetMemberProfile,
          grantPermission: canGrantPermission,
          updateMemberProfile: loaded.data.members.some(
            (member) => member.actionPolicy?.updateMemberProfile && (
              member.memberProfile ? canUpdateMemberProfile : canCreateMemberProfile
            )
          ),
          createAccessProfile: canCreateProfile,
          updateAccessProfile: canUpdateProfile,
          deleteAccessProfile: canDeleteProfile,
          setProfilePermission: canDefineProfile,
          updateMembershipSettings: canUpdateSettings,
          updateMembershipDefault: canUpdateDefault,
          setHierarchyEdge: canManageHierarchy,
          removeHierarchyEdge: canManageHierarchy && hierarchyEdgeIds.size > 0,
          createOrganizationApiKey: false,
          createOrganizationPrincipal: canCreatePrincipal,
          revokeOrganizationApiKey: canRevokeApiKey && (loaded.data.apiKeys?.length ?? 0) > 0,
          revokeOrganizationPrincipal: canRevokePrincipal &&
            (loaded.data.principals?.length ?? 0) > 0,
          cancelInvite: canDeleteInvite
        },
        actions: {
          createOrganization: canCreateOrganization
            ? async ({ name }) => {
                const provisioningScope = JSON.stringify([
                  runtime.databaseId,
                  creationActorId
                ]);
                const pendingOrganizationCreate = pendingOrganizationCreates.get(
                  provisioningScope
                );
                if (pendingOrganizationCreate && pendingOrganizationCreate.name !== name) {
                  throw unknownOrganizationProvisioningOutcome(
                    pendingOrganizationCreate.username
                  );
                }
                const provisioning = pendingOrganizationCreate ?? {
                  name,
                  username: organizationProvisioningUsername()
                };
                pendingOrganizationCreates.set(provisioningScope, provisioning);
                const clearPendingOrganizationCreate = () => {
                  if (pendingOrganizationCreates.get(provisioningScope) === provisioning) {
                    pendingOrganizationCreates.delete(provisioningScope);
                  }
                };
                let returnedUser: Record<string, unknown> | null = null;
                let creationStatus: 'reconcile' | 'succeeded' | 'ambiguous' =
                  pendingOrganizationCreate ? 'reconcile' : 'ambiguous';
                if (!pendingOrganizationCreate) {
                  try {
                    const created = await executeConstructiveGraphQL<Record<string, unknown>>(
                      runtime,
                      'auth',
                      createOrganizationMutation(loaded.userFields),
                      {
                        input: {
                          user: {
                            username: provisioning.username,
                            displayName: name,
                            type: 2
                          }
                        }
                      }
                    );
                    returnedUser = createdOrganizationUser(created);
                    creationStatus = 'succeeded';
                  } catch (cause) {
                    if (!isAmbiguousOrganizationCreateFailure(cause)) {
                      clearPendingOrganizationCreate();
                      throw cause;
                    }
                  }
                }
                if (!creationActorId) {
                  return rejectIncompleteOrganization(
                    runtime,
                    null,
                    canDeleteIncompleteOrganization,
                    'The organization was created without an authenticated actor identity.',
                    clearPendingOrganizationCreate
                  );
                }

                let persistedUsers: Record<string, unknown>[];
                let createdMemberships: Record<string, unknown>[];
                try {
                  [persistedUsers, createdMemberships] = await Promise.all([
                    executeConstructiveConnectionQuery(runtime, 'auth', {
                      operationName: 'ConsoleKitCreatedOrganizationUsersPage',
                      fieldName: 'users',
                      nodeSelection: loaded.userFields.join(' ')
                    }),
                    executeConstructiveConnectionQuery(runtime, 'admin', {
                      operationName: 'ConsoleKitCreatedOrganizationMembershipsPage',
                      fieldName: 'orgMemberships',
                      nodeSelection: CREATED_OWNER_MEMBERSHIP_FIELDS.join(' ')
                    })
                  ]);
                } catch (cause) {
                  if (creationStatus !== 'succeeded') {
                    throw unknownOrganizationProvisioningOutcome(provisioning.username);
                  }
                  const returnedId = returnedUser?.type === 2 &&
                    asString(returnedUser?.username) === provisioning.username
                    ? asString(returnedUser?.id)
                    : null;
                  return rejectIncompleteOrganization(
                    runtime,
                    returnedId,
                    canDeleteIncompleteOrganization,
                    cause instanceof Error
                      ? `The organization postcondition could not be verified: ${cause.message}`
                      : 'The organization postcondition could not be verified.',
                    clearPendingOrganizationCreate
                  );
                }
                const persistedCandidates = persistedUsers.filter(
                  (user) => asString(user.username) === provisioning.username
                );
                const persisted = persistedCandidates.length === 1
                  ? persistedCandidates[0]
                  : undefined;
                const organizationId = asString(persisted?.id);
                const returnedId = asString(returnedUser?.id);
                const responseMatches = Boolean(
                  returnedId &&
                  returnedUser?.type === 2 &&
                  asString(returnedUser?.username) === provisioning.username &&
                  (
                    !loaded.userFields.includes('displayName') ||
                    returnedUser?.displayName === name
                  )
                );
                if (creationStatus !== 'succeeded' && !organizationId) {
                  throw unknownOrganizationProvisioningOutcome(provisioning.username);
                }
                const ownerMemberships = organizationId
                  ? createdMemberships.filter((membership) =>
                      asString(membership.actorId) === creationActorId &&
                      asString(membership.entityId) === organizationId
                    )
                  : [];
                if (
                  (creationStatus === 'succeeded' &&
                    (!responseMatches || returnedId !== organizationId)) ||
                  persistedCandidates.length !== 1 ||
                  persisted?.type !== 2 ||
                  asString(persisted.username) !== provisioning.username ||
                  (loaded.userFields.includes('displayName') && persisted.displayName !== name) ||
                  ownerMemberships.length !== 1 ||
                  !isExactCreatedOwnerMembership(
                    ownerMemberships[0]!,
                    creationActorId,
                    organizationId ?? ''
                  )
                ) {
                  return rejectIncompleteOrganization(
                    runtime,
                    organizationId ?? (responseMatches ? returnedId : null),
                    canDeleteIncompleteOrganization,
                    'The database did not create exactly one active owner membership for the current actor.',
                    clearPendingOrganizationCreate
                  );
                }
                clearPendingOrganizationCreate();
                options.store.getState().setContext({
                  databaseId: runtime.databaseId,
                  organizationId: organizationId!
                });
                reload();
              }
            : undefined,
          selectOrganization: async ({ organizationId }) => {
            if (!loaded.data.organizations.some((organization) => organization.id === organizationId)) {
              throw new Error('The requested organization is not visible to this session.');
            }
            options.store.getState().setContext({
              databaseId: runtime.databaseId,
              organizationId
            });
            reload();
          },
          updateOrganization: canUpdateOrganization &&
            activeOrganization?.actionPolicy?.updateOrganization
            ? async ({ organizationId, name, slug }) => {
                assertActiveOrganization(organizationId);
                const displayName = name.trim();
                if (!displayName) throw new Error('Organization name is required.');
                await executeConstructiveGraphQL(
                  runtime,
                  'auth',
                  UPDATE_ORGANIZATION_MUTATION,
                  {
                    input: {
                      id: organizationId,
                      userPatch: {
                        displayName,
                        ...(slug === undefined ? {} : { username: slug.trim() })
                      }
                    }
                  }
                );
                reload();
              }
            : undefined,
          deleteOrganization: canDeleteOrganization &&
            activeOrganization?.actionPolicy?.deleteOrganization
            ? async ({ organizationId }) => {
                assertActiveOrganization(organizationId);
                const deleted = await executeConstructiveGraphQL<Record<string, unknown>>(
                  runtime,
                  'auth',
                  DELETE_ORGANIZATION_MUTATION,
                  { input: { id: organizationId } }
                );
                if (deletedOrganizationId(deleted) !== organizationId) {
                  throw new Error('The organization deletion could not be verified.');
                }
                options.store.getState().setContext({
                  databaseId: runtime.databaseId,
                  organizationId: loaded.data.organizations.find(
                    (organization) => organization.id !== organizationId
                  )?.id ?? null
                });
                reload();
              }
            : undefined,
          leaveOrganization: canLeaveOrganization && currentActorMembership
            ? async ({ organizationId, membershipId }) => {
                assertActiveOrganization(organizationId);
                if (membershipId !== currentActorMembership.id) {
                  throw new Error('Only the current actor membership can leave an organization.');
                }
                await executeConstructiveGraphQL(
                  runtime,
                  'admin',
                  DELETE_MEMBERSHIP_MUTATION,
                  { input: { id: membershipId } }
                );
                options.store.getState().setContext({
                  databaseId: runtime.databaseId,
                  organizationId: loaded.data.organizations.find(
                    (organization) => organization.id !== organizationId
                  )?.id ?? null
                });
                reload();
              }
            : undefined,
          inviteMember: canInvite
            ? async ({
                organizationId,
                channel,
                recipient,
                profileId,
                expiresAt,
                multiple,
                inviteLimit,
                isReadOnly
              }) => {
                assertActiveOrganization(organizationId);
                const normalizedRecipient = recipient?.trim();
                if (channel === 'email' && (!inviteSupportsEmail || !normalizedRecipient)) {
                  throw new Error('An email recipient is required for an email invitation.');
                }
                if (channel === 'sms' && (!inviteSupportsPhone || !normalizedRecipient)) {
                  throw new Error('A phone recipient is required for an SMS invitation.');
                }
                if (channel === 'link' && !inviteSupportsChannel) {
                  throw new Error('This tenant does not expose reusable link invitations.');
                }
                const allowedInviteProfileIds = loaded.inviteProfileIds;
                if (profileId && (
                  !loaded.canAssignInviteProfiles ||
                  !inviteSupportsProfile ||
                  !allowedInviteProfileIds.has(profileId)
                )) {
                  throw new Error('The selected profile cannot be assigned to this invitation.');
                }
                if (profileId && (channel !== 'email' || multiple === true)) {
                  throw new Error(
                    'An access profile can only be assigned to a single-recipient email invitation.'
                  );
                }
                if (multiple && !inviteSupportsMultiple) {
                  throw new Error('This tenant does not expose reusable invitation limits.');
                }
                if (inviteLimit !== undefined && (!Number.isInteger(inviteLimit) || inviteLimit < 1)) {
                  throw new Error('Invitation limit must be a positive integer.');
                }
                await executeConstructiveGraphQL(runtime, 'admin', CREATE_INVITE_MUTATION, {
                  input: {
                    orgInvite: {
                      entityId: organizationId,
                      ...(inviteSupportsChannel ? { channel } : {}),
                      ...(channel === 'email' ? { email: normalizedRecipient } : {}),
                      ...(channel === 'sms' ? { phone: normalizedRecipient } : {}),
                      ...(inviteSupportsExpiry
                        ? { expiresAt: expiresAt ?? expiresIn(7) }
                        : {}),
                      ...(profileId ? { profileId } : {}),
                      ...(inviteSupportsMultiple
                        ? {
                            multiple: multiple ?? channel === 'link',
                            ...(inviteLimit === undefined ? {} : { inviteLimit })
                          }
                        : {}),
                      ...(inviteSupportsReadOnly && isReadOnly !== undefined
                        ? { isReadOnly }
                        : {})
                    }
                  }
                });
                reload();
              }
            : undefined,
          updateMemberLifecycle: canUpdateMembershipLifecycle
            ? async ({ organizationId, membershipId, patch }) => {
                assertActiveOrganization(organizationId);
                const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
                if (entries.length === 0) throw new Error('A lifecycle change is required.');
                const actionForField = {
                  isApproved: 'approveMember',
                  isBanned: 'banMember',
                  isDisabled: 'disableMember',
                  isExternal: 'markMemberExternal',
                  isReadOnly: 'markMemberReadOnly'
                } as const;
                for (const [field] of entries) {
                  const action = actionForField[field as keyof typeof actionForField];
                  if (!action) throw new Error(`Unsupported membership lifecycle field: ${field}.`);
                  assertMemberAction(membershipId, action);
                }
                await executeConstructiveGraphQL(runtime, 'admin', UPDATE_MEMBERSHIP_MUTATION, {
                  input: {
                    id: membershipId,
                    orgMembershipPatch: Object.fromEntries(entries)
                  }
                });
                reload();
              }
            : undefined,
          removeMember: canDeleteMembership || canUpdateMembership
            ? async ({ organizationId, membershipId }) => {
                assertActiveOrganization(organizationId);
                assertMemberAction(membershipId, 'removeMember');
                await executeConstructiveGraphQL(
                  runtime,
                  'admin',
                  canDeleteMembership ? DELETE_MEMBERSHIP_MUTATION : UPDATE_MEMBERSHIP_MUTATION,
                  canDeleteMembership
                    ? { input: { id: membershipId } }
                    : { input: { id: membershipId, orgMembershipPatch: { isDisabled: true } } }
                );
                reload();
              }
            : undefined,
          setMemberAdmin: canGrantAdmin
            ? async ({ organizationId, actorId, isGrant }) => {
                assertActiveOrganization(organizationId);
                assertAuthorizedTarget(activeMemberActorIds, actorId, 'organization member');
                const member = loaded.data.members.find((candidate) => candidate.userId === actorId);
                if (!member) throw new Error('The organization member is no longer visible.');
                assertMemberAction(member.id, 'grantAdmin');
                await executeConstructiveGraphQL(runtime, 'admin', CREATE_ADMIN_GRANT_MUTATION, {
                  input: { orgAdminGrant: { entityId: organizationId, actorId, isGrant } }
                });
                reload();
              }
            : undefined,
          setMemberOwner: canGrantOwner
            ? async ({ organizationId, actorId, isGrant }) => {
                assertActiveOrganization(organizationId);
                assertAuthorizedTarget(activeMemberActorIds, actorId, 'organization member');
                const member = loaded.data.members.find((candidate) => candidate.userId === actorId);
                if (!member) throw new Error('The organization member is no longer visible.');
                assertMemberAction(member.id, 'grantOwner');
                await executeConstructiveGraphQL(runtime, 'admin', CREATE_OWNER_GRANT_MUTATION, {
                  input: { orgOwnerGrant: { entityId: organizationId, actorId, isGrant } }
                });
                reload();
              }
            : undefined,
          setMemberProfile: canSetMemberProfile
            ? async ({ organizationId, membershipId, profileId, isGrant }) => {
                assertActiveOrganization(organizationId);
                assertMemberAction(membershipId, 'assignProfile');
                assertAuthorizedTarget(profileIds, profileId, 'organization access profile');
                await executeConstructiveGraphQL(runtime, 'admin', CREATE_PROFILE_GRANT_MUTATION, {
                  input: {
                    orgProfileGrant: {
                      membershipId,
                      profileId,
                      entityId: organizationId,
                      isGrant
                    }
                  }
                });
                reload();
              }
            : undefined,
          setMemberPermission: canGrantPermission
            ? async ({ organizationId, actorId, permissions, isGrant }) => {
                assertActiveOrganization(organizationId);
                assertAuthorizedTarget(activeMemberActorIds, actorId, 'organization member');
                if (!permissionMasks.has(permissions)) {
                  throw new Error('The permission mask is not present in the visible catalog.');
                }
                const member = loaded.data.members.find((candidate) => candidate.userId === actorId);
                if (!member) throw new Error('The organization member is no longer visible.');
                assertMemberAction(member.id, 'grantPermission');
                await executeConstructiveGraphQL(runtime, 'admin', CREATE_PERMISSION_GRANT_MUTATION, {
                  input: {
                    orgGrant: { entityId: organizationId, actorId, permissions, isGrant }
                  }
                });
                reload();
              }
            : undefined,
          upsertMemberProfile: canCreateMemberProfile || canUpdateMemberProfile
            ? async ({ organizationId, membershipId, profile }) => {
                assertActiveOrganization(organizationId);
                const member = assertMemberAction(membershipId, 'updateMemberProfile');
                const profilePatch = {
                  ...(profile.displayName === undefined
                    ? {}
                    : { displayName: profile.displayName.trim() }),
                  ...(profile.email === undefined ? {} : { email: profile.email.trim() }),
                  ...(profile.title === undefined ? {} : { title: profile.title.trim() }),
                  ...(profile.bio === undefined ? {} : { bio: profile.bio.trim() })
                };
                if (member.memberProfile?.id) {
                  if (!canUpdateMemberProfile) {
                    throw new Error('This tenant does not expose member profile updates.');
                  }
                  await executeConstructiveGraphQL(
                    runtime,
                    'admin',
                    UPDATE_MEMBER_PROFILE_MUTATION,
                    {
                      input: {
                        id: member.memberProfile.id,
                        orgMemberProfilePatch: profilePatch
                      }
                    }
                  );
                } else {
                  if (!canCreateMemberProfile) {
                    throw new Error('This tenant does not expose member profile creation.');
                  }
                  await executeConstructiveGraphQL(
                    runtime,
                    'admin',
                    CREATE_MEMBER_PROFILE_MUTATION,
                    {
                      input: {
                        orgMemberProfile: {
                          membershipId,
                          entityId: organizationId,
                          actorId: member.userId,
                          ...profilePatch
                        }
                      }
                    }
                  );
                }
                reload();
              }
            : undefined,
          createAccessProfile: canCreateProfile
            ? async ({ organizationId, name, description }) => {
                assertActiveOrganization(organizationId);
                const profileName = name.trim();
                if (!profileName) throw new Error('Access profile name is required.');
                await executeConstructiveGraphQL(runtime, 'admin', CREATE_PROFILE_MUTATION, {
                  input: {
                    orgProfile: {
                      entityId: organizationId,
                      name: profileName,
                      ...(description === undefined
                        ? {}
                        : { description: description.trim() })
                    }
                  }
                });
                reload();
              }
            : undefined,
          updateAccessProfile: canUpdateProfile
            ? async ({ organizationId, profileId, name, description }) => {
                assertActiveOrganization(organizationId);
                assertAuthorizedTarget(profileIds, profileId, 'organization access profile');
                const profile = loaded.data.profiles?.find((candidate) => candidate.id === profileId);
                if (profile?.actionPolicy?.updateAccessProfile !== true) {
                  throw new Error('This access profile cannot be updated.');
                }
                const profileName = name.trim();
                if (!profileName) throw new Error('Access profile name is required.');
                await executeConstructiveGraphQL(runtime, 'admin', UPDATE_PROFILE_MUTATION, {
                  input: {
                    id: profileId,
                    orgProfilePatch: {
                      name: profileName,
                      ...(description === undefined
                        ? {}
                        : { description: description.trim() })
                    }
                  }
                });
                reload();
              }
            : undefined,
          deleteAccessProfile: canDeleteProfile
            ? async ({ organizationId, profileId }) => {
                assertActiveOrganization(organizationId);
                assertAuthorizedTarget(profileIds, profileId, 'organization access profile');
                const profile = loaded.data.profiles?.find((candidate) => candidate.id === profileId);
                if (profile?.actionPolicy?.deleteAccessProfile !== true) {
                  throw new Error('This access profile cannot be deleted.');
                }
                await executeConstructiveGraphQL(runtime, 'admin', DELETE_PROFILE_MUTATION, {
                  input: { id: profileId }
                });
                reload();
              }
            : undefined,
          setProfilePermission: canDefineProfile
            ? async ({ organizationId, profileId, permissionId, isGrant }) => {
                assertActiveOrganization(organizationId);
                assertAuthorizedTarget(profileIds, profileId, 'organization access profile');
                assertAuthorizedTarget(permissionIds, permissionId, 'organization permission');
                const profile = loaded.data.profiles?.find((candidate) => candidate.id === profileId);
                if (profile?.actionPolicy?.setProfilePermission !== true) {
                  throw new Error('This access profile cannot be changed.');
                }
                await executeConstructiveGraphQL(
                  runtime,
                  'admin',
                  CREATE_PROFILE_DEFINITION_GRANT_MUTATION,
                  {
                    input: {
                      orgProfileDefinitionGrant: { profileId, permissionId, isGrant }
                    }
                  }
                );
                reload();
              }
            : undefined,
          updateMembershipSettings: canUpdateSettings && loaded.data.membershipSettings
            ? async ({ organizationId, settingsId, patch }) => {
                assertActiveOrganization(organizationId);
                if (settingsId !== loaded.data.membershipSettings?.id) {
                  throw new Error('The membership settings row is not active.');
                }
                const allowedFields = new Set([
                  'deleteMemberCascadeChildren',
                  'createChildCascadeOwners',
                  'createChildCascadeAdmins',
                  'createChildCascadeMembers',
                  'allowExternalMembers',
                  'inviteProfileAssignmentMode',
                  'populateMemberEmail',
                  'limitAllocationMode'
                ]);
                const entries = Object.entries(patch).filter(
                  ([field, value]) => allowedFields.has(field) && value !== undefined
                );
                if (entries.length === 0) throw new Error('A membership setting change is required.');
                await executeConstructiveGraphQL(
                  runtime,
                  'admin',
                  UPDATE_MEMBERSHIP_SETTINGS_MUTATION,
                  {
                    input: {
                      id: settingsId,
                      orgMembershipSettingPatch: Object.fromEntries(entries)
                    }
                  }
                );
                reload();
              }
            : undefined,
          updateMembershipDefault: canUpdateDefault && loaded.data.membershipDefault
            ? async ({ organizationId, defaultId, isApproved }) => {
                assertActiveOrganization(organizationId);
                if (defaultId !== loaded.data.membershipDefault?.id) {
                  throw new Error('The membership default row is not active.');
                }
                await executeConstructiveGraphQL(
                  runtime,
                  'admin',
                  UPDATE_MEMBERSHIP_DEFAULT_MUTATION,
                  {
                    input: {
                      id: defaultId,
                      orgMembershipDefaultPatch: { isApproved }
                    }
                  }
                );
                reload();
              }
            : undefined,
          setHierarchyEdge: canManageHierarchy
            ? async ({
                organizationId,
                childId,
                parentId,
                positionTitle,
                positionLevel
              }) => {
                assertActiveOrganization(organizationId);
                assertAuthorizedTarget(activeMemberActorIds, childId, 'organization chart member');
                assertAuthorizedTarget(activeMemberActorIds, parentId, 'organization chart member');
                if (childId === parentId) throw new Error('A member cannot report to themselves.');
                const parentByChild = new Map(
                  loaded.data.hierarchy?.map((edge) => [edge.childId, edge.parentId]) ?? []
                );
                parentByChild.set(childId, parentId);
                const visited = new Set<string>();
                let cursor: string | undefined = parentId;
                while (cursor) {
                  if (cursor === childId) {
                    throw new Error('The organization chart change would create a cycle.');
                  }
                  if (visited.has(cursor)) break;
                  visited.add(cursor);
                  cursor = parentByChild.get(cursor);
                }
                await executeConstructiveGraphQL(
                  runtime,
                  'admin',
                  CREATE_CHART_EDGE_GRANT_MUTATION,
                  {
                    input: {
                      orgChartEdgeGrant: {
                        entityId: organizationId,
                        childId,
                        parentId,
                        isGrant: true,
                        ...(positionTitle === undefined
                          ? {}
                          : { positionTitle: positionTitle.trim() }),
                        ...(positionLevel === undefined ? {} : { positionLevel })
                      }
                    }
                  }
                );
                reload();
              }
            : undefined,
          removeHierarchyEdge: canManageHierarchy
            ? async ({ organizationId, edge }) => {
                assertActiveOrganization(organizationId);
                assertAuthorizedTarget(hierarchyEdgeIds, edge.id, 'organization chart edge');
                const activeEdge = loaded.data.hierarchy?.find(
                  (candidate) => candidate.id === edge.id
                );
                if (!activeEdge || activeEdge.actionPolicy?.removeHierarchyEdge !== true) {
                  throw new Error('The organization chart edge cannot be removed.');
                }
                await executeConstructiveGraphQL(
                  runtime,
                  'admin',
                  CREATE_CHART_EDGE_GRANT_MUTATION,
                  {
                    input: {
                      orgChartEdgeGrant: {
                        entityId: organizationId,
                        childId: activeEdge.childId,
                        parentId: activeEdge.parentId,
                        isGrant: false,
                        ...(activeEdge.positionTitle === undefined
                          ? {}
                          : { positionTitle: activeEdge.positionTitle }),
                        ...(activeEdge.positionLevel === undefined
                          ? {}
                          : { positionLevel: activeEdge.positionLevel })
                      }
                    }
                  }
                );
                reload();
              }
            : undefined,
          createOrganizationPrincipal: canCreatePrincipal
            ? async ({
                organizationId,
                name,
                useAdminOwner,
                isReadOnly,
                bypassStepUp
              }) => {
                assertActiveOrganization(organizationId);
                const principalName = name.trim();
                if (!principalName) throw new Error('Principal name is required.');
                const response = await executeConstructiveGraphQL<Record<string, unknown>>(
                  runtime,
                  'auth',
                  CREATE_ORG_PRINCIPAL_MUTATION,
                  {
                    input: {
                      orgId: organizationId,
                      name: principalName,
                      useAdminOwner: useAdminOwner ?? false,
                      isReadOnly: isReadOnly ?? true,
                      bypassStepUp: bypassStepUp ?? false
                    }
                  }
                );
                const id = asString(asRecord(response.createOrgPrincipal)?.result);
                if (!id) throw new Error('The principal creation could not be verified.');
                knownPrincipalOrganizations.set(
                  principalOrganizationKey(runtime.databaseId, id),
                  organizationId
                );
                reload();
                return { id };
              }
            : undefined,
          revokeOrganizationApiKey: canRevokeApiKey
            ? async ({ organizationId, apiKeyId }) => {
                assertActiveOrganization(organizationId);
                assertAuthorizedTarget(apiKeyIds, apiKeyId, 'organization API key');
                await executeConstructiveGraphQL(runtime, 'auth', REVOKE_ORG_API_KEY_MUTATION, {
                  input: { orgId: organizationId, keyId: apiKeyId }
                });
                reload();
              }
            : undefined,
          revokeOrganizationPrincipal: canRevokePrincipal
            ? async ({ organizationId, principalId }) => {
                assertActiveOrganization(organizationId);
                assertAuthorizedTarget(principalIds, principalId, 'organization principal');
                await executeConstructiveGraphQL(runtime, 'auth', DELETE_ORG_PRINCIPAL_MUTATION, {
                  input: { principalId }
                });
                knownPrincipalOrganizations.delete(
                  principalOrganizationKey(runtime.databaseId, principalId)
                );
                reload();
              }
            : undefined,
          cancelInvite: canDeleteInvite
            ? async ({ organizationId, inviteId }) => {
                assertActiveOrganization(organizationId);
                assertAuthorizedTarget(
                  loaded.cancelableInviteIds,
                  inviteId,
                  'organization invitation'
                );
                await executeConstructiveGraphQL(runtime, 'admin', DELETE_INVITE_MUTATION, {
                  input: { id: inviteId }
                });
                reload();
              }
            : undefined
        }
      };
    }
  };
}

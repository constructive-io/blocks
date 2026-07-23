import type { MetaschemaField, MetaschemaTable } from '@constructive-io/data';

import type { ConsoleKitMetadataState } from '../../console-kit/console-kit-contracts';
import {
  canonicalMetaName,
  compatibleMetaTables,
  isConstructiveGraphQLName,
  metaFieldName,
  metaPrimaryKeyField,
  metaTableNames,
  readableMetaTable,
  type ConstructiveMetaTableContract
} from '../../console-kit/constructive/constructive-meta-utils';

export type ConstructiveApplicationOrganizationContract = Readonly<{
  organizations: ConstructiveMetaTableContract & Readonly<{
    id: string;
    name: string;
    slug?: string;
    avatar?: string;
  }>;
  members?: ConstructiveMetaTableContract & Readonly<{
    id: string;
    organizationId: string;
    userId?: string;
    role?: string;
    status?: string;
    joinedAt?: string;
    invitedAt?: string;
  }>;
}>;

function isOrganizationTable(table: MetaschemaTable): boolean {
  return metaTableNames(table).some((name) =>
    name === 'organization' || name === 'organisation' || name === 'org'
  );
}

function isMemberTable(table: MetaschemaTable): boolean {
  return metaTableNames(table).some((name) =>
    name === 'member' ||
    name === 'membership' ||
    name === 'organizationmember' ||
    name === 'organizationmembership' ||
    name === 'orgmember' ||
    name === 'orgmembership'
  );
}

function referencesTable(
  membership: MetaschemaTable,
  organization: MetaschemaTable
): string | undefined {
  const organizationNames = new Set(metaTableNames(organization));
  const belongsTo = membership.relations?.belongsTo ?? [];
  for (const relation of belongsTo) {
    if (!relation) continue;
    if (!organizationNames.has(canonicalMetaName(relation.references.name))) {
      continue;
    }
    const keys = (relation.keys ?? []).filter(
      (field): field is MetaschemaField =>
        field != null && isConstructiveGraphQLName(field.name)
    );
    if (keys.length === 1) return keys[0]?.name;
  }

  const current = membership.constraints && !Array.isArray(membership.constraints)
    ? membership.constraints.foreignKey
    : undefined;
  const foreignKeys = current ?? membership.foreignKeyConstraints ?? [];
  for (const foreignKey of foreignKeys) {
    if (!foreignKey) continue;
    const target = foreignKey.refTable?.name ?? foreignKey.referencedTable;
    if (!organizationNames.has(canonicalMetaName(target))) continue;
    const keys = (foreignKey.fields ?? []).filter(
      (field): field is MetaschemaField =>
        field != null && isConstructiveGraphQLName(field.name)
    );
    if (keys.length === 1) return keys[0]?.name;
  }
  return undefined;
}

/**
 * Resolves a conventional application organization directory from `_meta`.
 * A strong organization table name plus an explicit member relation prevents
 * unrelated owner-scoped tables from being presented as membership data.
 */
export function resolveApplicationOrganizationContract(
  metadata: ConsoleKitMetadataState
): ConstructiveApplicationOrganizationContract | null {
  const tables = compatibleMetaTables(metadata);
  const organizationCandidates = tables.filter(isOrganizationTable);
  for (const organizationTable of organizationCandidates) {
    const readableOrganization = readableMetaTable(organizationTable);
    const id = metaPrimaryKeyField(organizationTable);
    const name = metaFieldName(
      organizationTable,
      ['name', 'displayname', 'title', 'label']
    );
    if (!readableOrganization || !id || !name) continue;

    const organization = {
      ...readableOrganization,
      id,
      name,
      slug: metaFieldName(organizationTable, ['slug', 'key', 'code']),
      avatar: metaFieldName(
        organizationTable,
        ['avatarurl', 'avatar', 'logourl', 'logo']
      )
    };
    const memberTable = tables.find((table) =>
      isMemberTable(table) && Boolean(referencesTable(table, organizationTable))
    );
    if (!memberTable) return { organizations: organization };

    const readableMember = readableMetaTable(memberTable);
    const memberId = metaPrimaryKeyField(memberTable);
    const organizationId = referencesTable(memberTable, organizationTable);
    if (!readableMember || !memberId || !organizationId) {
      return { organizations: organization };
    }
    return {
      organizations: organization,
      members: {
        ...readableMember,
        id: memberId,
        organizationId,
        userId: metaFieldName(
          memberTable,
          ['userid', 'actorid', 'personid', 'accountid']
        ),
        role: metaFieldName(
          memberTable,
          ['role', 'rolename', 'profile', 'profilename']
        ),
        status: metaFieldName(memberTable, ['status', 'state']),
        joinedAt: metaFieldName(
          memberTable,
          ['joinedat', 'acceptedat', 'activatedat']
        ),
        invitedAt: metaFieldName(memberTable, ['invitedat', 'createdat'])
      }
    };
  }
  return null;
}

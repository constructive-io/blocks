/**
 * scim-connections-list — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4): top-level camelCase
 * keys are UI copy.
 *
 * This is a v2 stub (Phase 3). The SCIM backend (`constructive_auth_private.scim_providers`
 * table + `revoke_scim_token` procedure) is not yet deployed. The block renders an
 * informational empty state until the backend ships.
 *
 * The `errors` map will be wired to `parseGraphQLError` once the backend ships.
 * PROCEDURE_NOT_FOUND is pre-populated so the block surfaces a clear message if
 * the proc is partially deployed (endpoint-contract.md §6).
 */

export type OrgScimConnectionsListMessages = {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  backendPendingLabel: string;
  endpointLabel: string;
  lastSyncLabel: string;
  statusLabel: string;
  revokeLabel: string;
  statusActive: string;
  statusInactive: string;
  errors: {
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export type OrgScimConnectionsListMessageOverrides = Partial<
  Omit<OrgScimConnectionsListMessages, 'errors'>
> & {
  errors?: Partial<OrgScimConnectionsListMessages['errors']>;
};

export const defaultScimConnectionsListMessages: OrgScimConnectionsListMessages = {
  title: 'SCIM Connections',
  description: 'Active SCIM provider connections for this organization.',
  emptyTitle: 'SCIM backend not yet available',
  emptyDescription:
    'SCIM provisioning requires the scim_providers schema to be deployed. Check back once the SCIM backend is configured.',
  backendPendingLabel: 'Backend Pending',
  endpointLabel: 'SCIM Endpoint',
  lastSyncLabel: 'Last Sync',
  statusLabel: 'Status',
  revokeLabel: 'Revoke',
  statusActive: 'Active',
  statusInactive: 'Inactive',
  errors: {
    PROCEDURE_NOT_FOUND: 'SCIM connections are not yet available on this account.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};

/** @deprecated Use OrgScimConnectionsListMessages */
export type ScimConnectionsListMessages = OrgScimConnectionsListMessages;

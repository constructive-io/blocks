/**
 * org-app-memberships — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed to `parseGraphQLError` as
 * `customMessages`. PROCEDURE_NOT_FOUND is included per backend-pending spec
 * (sdk-binding-contract.md §10 gap-honesty).
 */

export type OrgAppMembershipsMessages = {
  title: string;
  description: string;
  emptyState: string;
  loadingAriaLabel: string;
  approvedBadge: string;
  pendingBadge: string;
  verifiedBadge: string;
  approveButton: string;
  revokeButton: string;
  revokeConfirmTitle: string;
  revokeConfirmDescription: string;
  revokeConfirmButton: string;
  profileLabel: string;
  profilePlaceholder: string;
  approveSuccessMessage: string;
  revokeSuccessMessage: string;
  profileUpdateSuccessMessage: string;
  errors: {
    PERMISSION_DENIED: string;
    MEMBERSHIP_NOT_FOUND: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export type OrgAppMembershipsMessageOverrides = Partial<Omit<OrgAppMembershipsMessages, 'errors'>> & {
  errors?: Partial<OrgAppMembershipsMessages['errors']>;
};

export const defaultOrgAppMembershipsMessages: OrgAppMembershipsMessages = {
  title: 'App memberships',
  description: 'Manage app access for this organization.',
  emptyState: 'No app memberships.',
  loadingAriaLabel: 'Loading memberships…',
  approvedBadge: 'Approved',
  pendingBadge: 'Pending',
  verifiedBadge: 'Verified',
  approveButton: 'Approve',
  revokeButton: 'Revoke',
  revokeConfirmTitle: 'Revoke app membership',
  revokeConfirmDescription: 'Remove this organization from the app? This will revoke access for all members.',
  revokeConfirmButton: 'Revoke access',
  profileLabel: 'Membership profile',
  profilePlaceholder: 'Assign profile…',
  approveSuccessMessage: 'Membership approved.',
  revokeSuccessMessage: 'Membership revoked.',
  profileUpdateSuccessMessage: 'Membership profile updated.',
  errors: {
    PERMISSION_DENIED: 'You do not have permission to manage app memberships.',
    MEMBERSHIP_NOT_FOUND: 'Membership not found.',
    PROCEDURE_NOT_FOUND: 'This operation is not yet available. Please contact your administrator.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};

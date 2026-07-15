/**
 * org-members-list — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 *
 * Messages with `{{name}}` placeholders use double-brace mustache syntax
 * (block-contract.md §12 — use interpolate() to resolve them at runtime).
 */

export type OrgMembersListMessages = {
  title: string;
  emptyState: string;
  loadingAriaLabel: string;
  // Role labels
  roleOwner: string;
  roleAdmin: string;
  roleMember: string;
  // Status
  pendingBadge: string;
  approvedBadge: string;
  // Actions
  removeButton: string;
  removeConfirmTitle: string;
  removeConfirmDescription: string;
  removeConfirmButton: string;
  transferOwnershipButton: string;
  transferConfirmTitle: string;
  transferConfirmDescription: string;
  transferConfirmButton: string;
  // Success toasts
  removeSuccessToast: string;
  roleChangeSuccessToast: string;
  transferSuccessToast: string;
  // Error codes (UPPER_SNAKE_CASE keys matching err.extensions.code)
  errors: {
    PERMISSION_DENIED: string;
    MEMBER_NOT_FOUND: string;
    CANNOT_REMOVE_OWNER: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

/**
 * The messages type accepted by the `messages` prop; each nested group
 * is independently partial so a host overrides a single key.
 */
export type OrgMembersListMessageOverrides = Partial<Omit<OrgMembersListMessages, 'errors'>> & {
  errors?: Partial<OrgMembersListMessages['errors']>;
};

export const defaultOrgMembersListMessages: OrgMembersListMessages = {
  title: 'Members',
  emptyState: 'No members yet.',
  loadingAriaLabel: 'Loading members…',
  roleOwner: 'Owner',
  roleAdmin: 'Admin',
  roleMember: 'Member',
  pendingBadge: 'Pending',
  approvedBadge: 'Active',
  removeButton: 'Remove',
  removeConfirmTitle: 'Remove member',
  removeConfirmDescription: 'Are you sure you want to remove {{name}} from this organization?',
  removeConfirmButton: 'Remove',
  transferOwnershipButton: 'Transfer ownership',
  transferConfirmTitle: 'Transfer ownership',
  transferConfirmDescription: 'Transfer ownership to {{name}}? You will become a regular admin.',
  transferConfirmButton: 'Transfer',
  removeSuccessToast: '{{name}} has been removed.',
  roleChangeSuccessToast: "{{name}}'s role has been updated.",
  transferSuccessToast: 'Ownership transferred to {{name}}.',
  errors: {
    PERMISSION_DENIED: 'You do not have permission to manage members.',
    MEMBER_NOT_FOUND: 'Member not found.',
    CANNOT_REMOVE_OWNER: 'Transfer ownership before removing the owner.',
    PROCEDURE_NOT_FOUND: 'This action is not yet available. Please contact your administrator.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};

/**
 * org-settings-form — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`.
 *
 * `PROCEDURE_NOT_FOUND` is included because `deleteOrg` is a backend-pending
 * procedure — it will surface this code at runtime until the procedure deploys.
 * See: backend-spec/future-procedures.md
 */

export type OrgSettingsFormMessages = {
  title: string;
  description: string;
  nameLabel: string;
  namePlaceholder: string;
  slugLabel: string;
  slugPlaceholder: string;
  slugHint: string;
  slugAvailable: string;
  slugTaken: string;
  slugChangeWarning: string;
  logoLabel: string;
  logoHint: string;
  removeLogoButton: string;
  saveButton: string;
  saveButtonPending: string;
  // Danger zone
  dangerZoneTitle: string;
  deleteOrgButton: string;
  deleteConfirmTitle: string;
  deleteConfirmDescription: string;
  deleteConfirmButton: string;
  // Validation
  nameRequired: string;
  nameTooShort: string;
  slugInvalid: string;
  // Success toasts (passed to onMessage)
  saveSuccessToast: string;
  deleteSuccessToast: string;
  errors: {
    PERMISSION_DENIED: string;
    USERNAME_TAKEN: string;
    ORG_NOT_FOUND: string;
    /** Backend-pending: fires when delete_org procedure is not yet deployed. */
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

/**
 * Deep-partial override type: top-level keys are optional; errors sub-map is
 * itself partial so a host can localize a single code without restating the map.
 */
export type OrgSettingsFormMessageOverrides = Partial<Omit<OrgSettingsFormMessages, 'errors'>> & {
  errors?: Partial<OrgSettingsFormMessages['errors']>;
};

export const defaultOrgSettingsFormMessages: OrgSettingsFormMessages = {
  title: 'General settings',
  description: 'Update your organization profile.',
  nameLabel: 'Organization name',
  namePlaceholder: 'Acme Corp',
  slugLabel: 'URL slug',
  slugPlaceholder: 'acme-corp',
  slugHint: 'Used in URLs and mentions. Letters, numbers, and hyphens only.',
  slugAvailable: 'Available',
  slugTaken: 'Already taken',
  slugChangeWarning: 'Changing the slug will break existing links to this organization.',
  logoLabel: 'Logo',
  logoHint: 'PNG or JPG, up to 2 MB. Square images work best.',
  removeLogoButton: 'Remove logo',
  saveButton: 'Save changes',
  saveButtonPending: 'Saving…',
  dangerZoneTitle: 'Danger zone',
  deleteOrgButton: 'Delete organization',
  deleteConfirmTitle: 'Delete organization',
  deleteConfirmDescription:
    'This action is permanent and cannot be undone. All members will lose access. Type "{{orgName}}" to confirm.',
  deleteConfirmButton: 'Delete permanently',
  nameRequired: 'Organization name is required.',
  nameTooShort: 'Organization name must be at least 2 characters.',
  slugInvalid: 'Slug may only contain letters, numbers, and hyphens.',
  saveSuccessToast: 'Organization settings saved.',
  deleteSuccessToast: '{{orgName}} has been deleted.',
  errors: {
    PERMISSION_DENIED: 'You do not have permission to edit this organization.',
    USERNAME_TAKEN: 'That slug is already taken. Choose a different one.',
    ORG_NOT_FOUND: 'Organization not found.',
    PROCEDURE_NOT_FOUND:
      'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};

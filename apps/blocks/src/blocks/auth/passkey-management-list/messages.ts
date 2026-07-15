/**
 * passkey-management-list — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 */

export type PasskeyManagementListMessages = {
  title: string;
  emptyState: string;
  addPasskeyButton: string;
  platformBadge: string;
  crossPlatformBadge: string;
  lastUsedNever: string;
  lastUsedLabel: string;
  createdAtLabel: string;
  transportsLabel: string;
  renameButton: string;
  renameSaveButton: string;
  renameCancelButton: string;
  renameInputLabel: string;
  renameInputPlaceholder: string;
  deleteButton: string;
  deleteConfirmTitle: string;
  deleteConfirmDescription: string;
  deleteConfirmButton: string;
  deleteCancelButton: string;
  renameSuccessToast: string;
  deleteSuccessToast: string;
  errors: {
    RENAME_FAILED: string;
    DELETE_FAILED: string;
    UNKNOWN_ERROR: string;
  };
};

/**
 * Deep-partial override type: top-level keys are shallow-partial; `errors` is
 * itself partial so a host can localize a single error code without restating
 * the map.
 */
export type PasskeyManagementListMessageOverrides = Partial<
  Omit<PasskeyManagementListMessages, 'errors'>
> & {
  errors?: Partial<PasskeyManagementListMessages['errors']>;
};

export const defaultPasskeyManagementListMessages: PasskeyManagementListMessages = {
  title: 'Passkeys',
  emptyState: 'No passkeys registered. Add one below.',
  addPasskeyButton: 'Add passkey',
  platformBadge: 'Built-in',
  crossPlatformBadge: 'Hardware key',
  lastUsedNever: 'Never used',
  lastUsedLabel: 'Last used',
  createdAtLabel: 'Added',
  transportsLabel: 'Works over',
  renameButton: 'Rename',
  renameSaveButton: 'Save',
  renameCancelButton: 'Cancel',
  renameInputLabel: 'Passkey name',
  renameInputPlaceholder: 'e.g. iPhone Face ID',
  deleteButton: 'Remove',
  deleteConfirmTitle: 'Remove passkey',
  deleteConfirmDescription:
    'Are you sure you want to remove this passkey? You will not be able to use it to sign in.',
  deleteConfirmButton: 'Remove passkey',
  deleteCancelButton: 'Cancel',
  renameSuccessToast: 'Passkey renamed.',
  deleteSuccessToast: 'Passkey removed.',
  errors: {
    RENAME_FAILED: 'Failed to rename passkey. Please try again.',
    DELETE_FAILED: 'Failed to remove passkey. Please try again.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};

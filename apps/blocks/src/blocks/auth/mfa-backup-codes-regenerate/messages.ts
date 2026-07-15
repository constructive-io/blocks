/**
 * mfa-backup-codes-regenerate — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 *
 * PROCEDURE_NOT_FOUND is included because `generate_backup_codes` is
 * backend-pending (sdk-binding-contract.md §10, CASE b). When the proc is
 * deployed and codegen produces `useGenerateBackupCodesMutation`, the host wires
 * the generated hook via the `onSubmit` seam; this error code will surface if the
 * deployed proc somehow fails with PROCEDURE_NOT_FOUND.
 */

export type MfaBackupCodesRegenerateMessages = {
  title: string;
  description: string;
  warningText: string;
  regenerateButton: string;
  cancelButton: string;
  generatingButton: string;
  successMessage: string;
  errors: {
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

/**
 * Deep-partial override type: consumers can override any top-level key and/or
 * any individual error code without restating the full catalog.
 */
export type MfaBackupCodesRegenerateMessageOverrides = Partial<
  Omit<MfaBackupCodesRegenerateMessages, 'errors'>
> & {
  errors?: Partial<MfaBackupCodesRegenerateMessages['errors']>;
};

export const defaultMfaBackupCodesRegenerateMessages: MfaBackupCodesRegenerateMessages = {
  title: 'Regenerate backup codes',
  description:
    'Generate a new set of backup codes. Your old backup codes will stop working immediately.',
  warningText: 'Make sure to save the new codes. Old codes cannot be recovered.',
  regenerateButton: 'Regenerate backup codes',
  cancelButton: 'Cancel',
  generatingButton: 'Generating…',
  successMessage: 'Backup codes regenerated successfully.',
  errors: {
    PROCEDURE_NOT_FOUND:
      'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};

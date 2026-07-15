/**
 * mfa-totp-disable-confirm — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 *
 * PROCEDURE_NOT_FOUND is included because `disable_totp` is backend-pending
 * (sdk-binding-contract.md §10, CASE b). When the proc is deployed, this code
 * will be resolved at runtime by the generated hook; until then, hosts using the
 * onSubmit override seam will not see it.
 */

export type MfaTotpDisableConfirmMessages = {
  title: string;
  description: string;
  warningText: string;
  backupCodesWarning: string;
  confirmButton: string;
  cancelButton: string;
  loadingLabel: string;
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
export type MfaTotpDisableConfirmMessageOverrides = Partial<Omit<MfaTotpDisableConfirmMessages, 'errors'>> & {
  errors?: Partial<MfaTotpDisableConfirmMessages['errors']>;
};

export const defaultMfaTotpDisableConfirmMessages: MfaTotpDisableConfirmMessages = {
  title: 'Disable two-factor authentication',
  description: 'This will remove the extra layer of security from your account.',
  warningText: 'Your account will be less secure without two-factor authentication.',
  backupCodesWarning: 'All backup codes will also be invalidated.',
  confirmButton: 'Disable two-factor authentication',
  cancelButton: 'Keep enabled',
  loadingLabel: 'Disabling...',
  successMessage: 'Two-factor authentication disabled.',
  errors: {
    PROCEDURE_NOT_FOUND:
      'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};

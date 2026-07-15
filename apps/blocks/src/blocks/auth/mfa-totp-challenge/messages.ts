/**
 * mfa-totp-challenge — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 *
 * PROCEDURE_NOT_FOUND is included because `complete_mfa_challenge` is backend-
 * pending (sdk-binding-contract.md §10). It will surface until the procedure
 * is deployed and codegen regenerated.
 */

export type MfaTotpChallengeMessages = {
  title: string;
  description: string;
  codeLabel: string;
  codePlaceholder: string;
  trustDeviceLabel: string;
  trustDeviceHint: string;
  submitButton: string;
  loadingLabel: string;
  backupCodeLink: string;
  successToast: string;
  errors: {
    INVALID_TOTP: string;
    EXPIRED_TOKEN: string;
    RATE_LIMITED: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultMfaTotpChallengeMessages: MfaTotpChallengeMessages = {
  title: 'Two-factor authentication',
  description: 'Enter the 6-digit code from your authenticator app.',
  codeLabel: 'Authentication code',
  codePlaceholder: '000000',
  trustDeviceLabel: 'Trust this device for 30 days',
  trustDeviceHint: 'Skip two-factor on this device for 30 days.',
  submitButton: 'Verify',
  loadingLabel: 'Verifying...',
  backupCodeLink: 'Use a backup code instead',
  successToast: 'Verified successfully.',
  errors: {
    INVALID_TOTP: 'Invalid code. Check your authenticator app and try again.',
    EXPIRED_TOKEN: 'Your session expired. Please sign in again.',
    RATE_LIMITED: 'Too many attempts. Please wait before trying again.',
    PROCEDURE_NOT_FOUND:
      'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};

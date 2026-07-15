/**
 * account-deletion-confirm-page — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 */

export type AccountDeletionConfirmMessages = {
  processingTitle: string;
  processingDescription: string;
  successTitle: string;
  successDescription: string;
  successButton: string;
  expiredTitle: string;
  expiredDescription: string;
  expiredButton: string;
  invalidTitle: string;
  invalidDescription: string;
  invalidButton: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export const defaultAccountDeletionConfirmMessages: AccountDeletionConfirmMessages = {
  processingTitle: 'Deleting your account…',
  processingDescription: 'Please wait while we process your request.',
  successTitle: 'Account deleted',
  successDescription:
    'Your account and all associated data have been permanently deleted. Thank you for using our service.',
  successButton: 'Go to sign in',
  expiredTitle: 'Link expired',
  expiredDescription:
    'This deletion link has expired. Please request a new deletion email from your account settings.',
  expiredButton: 'Go to account settings',
  invalidTitle: 'Invalid link',
  invalidDescription:
    'This deletion link is invalid or has already been used. If you believe this is an error, contact support.',
  invalidButton: 'Go to sign in',
  errors: {
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
  }
};

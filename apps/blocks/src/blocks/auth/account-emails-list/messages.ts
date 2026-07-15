/**
 * account-emails-list — message catalog
 *
 * Canonical block-messages pattern: top-level camelCase keys are UI copy;
 * the nested `errors` map is keyed by backend error CODE (UPPER_SNAKE_CASE)
 * and is handed straight to `parseGraphQLError` as `customMessages`, so a
 * host localises any code by overriding a single key.
 */

export type AccountEmailsListMessages = {
  title: string;
  description: string;
  addEmailButton: string;
  addEmailDialogTitle: string;
  addEmailLabel: string;
  addEmailPlaceholder: string;
  addEmailSubmit: string;
  addEmailSubmitting: string;
  primaryBadge: string;
  verifiedBadge: string;
  unverifiedBadge: string;
  verifyButton: string;
  setPrimaryButton: string;
  deleteButton: string;
  deleteConfirmTitle: string;
  deleteConfirmDescription: string;
  deleteConfirmButton: string;
  deleteCancelButton: string;
  verificationSentMessage: string;
  emailAddedMessage: string;
  primaryChangedMessage: string;
  emailDeletedMessage: string;
  cannotDeletePrimary: string;
  errors: {
    EMAIL_TAKEN: string;
    RATE_LIMITED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultAccountEmailsListMessages: AccountEmailsListMessages = {
  title: 'Email addresses',
  description: 'Manage your email addresses. Your primary email is used for sign-in and notifications.',
  addEmailButton: 'Add email address',
  addEmailDialogTitle: 'Add email address',
  addEmailLabel: 'Email address',
  addEmailPlaceholder: 'you@example.com',
  addEmailSubmit: 'Add address',
  addEmailSubmitting: 'Adding…',
  primaryBadge: 'Primary',
  verifiedBadge: 'Verified',
  unverifiedBadge: 'Unverified',
  verifyButton: 'Verify',
  setPrimaryButton: 'Set as primary',
  deleteButton: 'Remove',
  deleteConfirmTitle: 'Remove email address?',
  deleteConfirmDescription: 'This email address will be removed from your account.',
  deleteConfirmButton: 'Remove',
  deleteCancelButton: 'Cancel',
  verificationSentMessage: 'Verification email sent.',
  emailAddedMessage: 'Email address added. Check your inbox to verify it.',
  primaryChangedMessage: 'Primary email address updated.',
  emailDeletedMessage: 'Email address removed.',
  cannotDeletePrimary: 'You cannot remove your primary email address.',
  errors: {
    EMAIL_TAKEN: 'This email address is already associated with another account.',
    RATE_LIMITED: 'Too many requests. Please wait before trying again.',
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
  }
};

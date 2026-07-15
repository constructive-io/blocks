/**
 * change-password-form — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 */

export type ChangePasswordFormMessages = {
  title: string;
  currentPasswordLabel: string;
  currentPasswordPlaceholder: string;
  newPasswordLabel: string;
  newPasswordPlaceholder: string;
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;
  submitButton: string;
  submitButtonPending: string;
  passwordMismatch: string;
  passwordStrengthWeak: string;
  passwordStrengthFair: string;
  passwordStrengthGood: string;
  passwordStrengthStrong: string;
  successMessage: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    INVALID_CREDENTIALS: string;
    INCORRECT_PASSWORD: string;
    WEAK_PASSWORD: string;
    STEP_UP_REQUIRED: string;
    STEP_UP_CANCELLED: string;
    UNKNOWN_ERROR: string;
  };
};

export type ChangePasswordFormMessageOverrides = Partial<Omit<ChangePasswordFormMessages, 'errors'>> & {
  errors?: Partial<ChangePasswordFormMessages['errors']>;
};

export const defaultChangePasswordFormMessages: ChangePasswordFormMessages = {
  title: 'Change password',
  currentPasswordLabel: 'Current password',
  currentPasswordPlaceholder: '••••••••',
  newPasswordLabel: 'New password',
  newPasswordPlaceholder: '••••••••',
  confirmPasswordLabel: 'Confirm new password',
  confirmPasswordPlaceholder: '••••••••',
  submitButton: 'Update password',
  submitButtonPending: 'Updating…',
  passwordMismatch: 'Passwords do not match.',
  passwordStrengthWeak: 'Weak',
  passwordStrengthFair: 'Fair',
  passwordStrengthGood: 'Good',
  passwordStrengthStrong: 'Strong',
  successMessage: 'Password updated successfully.',
  errors: {
    INVALID_CREDENTIALS: 'Current password is incorrect.',
    INCORRECT_PASSWORD: 'Current password is incorrect.',
    WEAK_PASSWORD: 'New password does not meet minimum requirements.',
    STEP_UP_REQUIRED: 'Please verify your identity to continue.',
    STEP_UP_CANCELLED: 'Identity verification was cancelled.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};

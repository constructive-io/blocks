/**
 * reset-password-card — message catalog
 *
 * Canonical block-messages pattern: top-level camelCase keys are UI copy; the
 * nested `errors` map is keyed by backend error CODE (UPPER_SNAKE_CASE) and is
 * handed straight to `parseGraphQLError` as `customMessages`. A host localizes
 * any code by overriding a single key.
 */

export type ResetPasswordCardMessages = {
  title: string;
  description: string;
  newPasswordLabel: string;
  newPasswordPlaceholder: string;
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;
  submitLabel: string;
  loadingLabel: string;
  passwordMismatch: string;
  passwordStrengthWeak: string;
  passwordStrengthFair: string;
  passwordStrengthGood: string;
  passwordStrengthStrong: string;
  /** Shown when token/roleId is missing from URL and props */
  missingTokenTitle: string;
  missingTokenMessage: string;
  /** Confirmed state */
  successTitle: string;
  successDescription: string;
  successSignInLabel: string;
  /** Expired/invalid token state */
  expiredTokenTitle: string;
  expiredTokenDescription: string;
  expiredTokenRestartLabel: string;
  errors: {
    EXPIRED_TOKEN: string;
    INVALID_TOKEN: string;
    WEAK_PASSWORD: string;
    PASSWORD_INSECURE: string;
    PASSWORD_LEN: string;
    RATE_LIMITED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultResetPasswordCardMessages: ResetPasswordCardMessages = {
  title: 'Reset your password',
  description: 'Enter your new password below.',
  newPasswordLabel: 'New password',
  newPasswordPlaceholder: '••••••••',
  confirmPasswordLabel: 'Confirm new password',
  confirmPasswordPlaceholder: '••••••••',
  submitLabel: 'Reset password',
  loadingLabel: 'Resetting...',
  passwordMismatch: 'Passwords do not match.',
  passwordStrengthWeak: 'Weak',
  passwordStrengthFair: 'Fair',
  passwordStrengthGood: 'Good',
  passwordStrengthStrong: 'Strong',
  missingTokenTitle: 'Invalid reset link',
  missingTokenMessage: 'Reset link is invalid or incomplete. Please request a new one.',
  successTitle: 'Password reset',
  successDescription: 'Your password has been updated. You can now sign in.',
  successSignInLabel: 'Sign in',
  expiredTokenTitle: 'Link expired',
  expiredTokenDescription: 'This password reset link has expired or already been used.',
  expiredTokenRestartLabel: 'Request a new link',
  errors: {
    EXPIRED_TOKEN: 'This reset link has expired. Please request a new one.',
    INVALID_TOKEN: 'This reset link is invalid. Please request a new one.',
    WEAK_PASSWORD: 'Password does not meet minimum requirements.',
    PASSWORD_INSECURE: 'This password is not secure enough. Please choose a stronger password.',
    PASSWORD_LEN: 'Password must be between 8 and 63 characters long.',
    RATE_LIMITED: 'Too many attempts. Please wait before trying again.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};

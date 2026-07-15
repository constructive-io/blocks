/**
 * sign-up-card — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 *
 * The `errors` defaults mirror the `auth-errors` lib's ERROR_MESSAGES for the
 * codes sign-up can surface; `UNKNOWN_ERROR` is the fallback when no known code
 * matches (passed as `defaultMessage`). Codes the catalog omits still resolve —
 * `parseGraphQLError` falls back to the lib's full ERROR_MESSAGES map.
 */

export type SignUpCardMessages = {
  title: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  passwordConfirmLabel: string;
  passwordConfirmPlaceholder: string;
  rememberMeLabel: string;
  submitLabel: string;
  loadingLabel: string;
  signInPrompt: string;
  signInLabel: string;
  /** Password strength labels — map 1:1 to `estimatePasswordStrength` labels. */
  passwordStrengthWeak: string;
  passwordStrengthFair: string;
  passwordStrengthGood: string;
  passwordStrengthStrong: string;
  /** Inline confirm-field mismatch error. */
  passwordMismatch: string;
  /** Shown when `onCheckPasswordBreach` returns false/0. */
  passwordBreached: string;
  /** Success message fired via `onMessage` after a resolved sign-up. */
  successMessage: string;
  errors: {
    ACCOUNT_EXISTS: string;
    PASSWORD_INSECURE: string;
    PASSWORD_LEN: string;
    ACCOUNT_DISABLED: string;
    RATE_LIMITED: string;
    SIGN_UP_DISABLED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultSignUpCardMessages: SignUpCardMessages = {
  title: 'Create an account',
  description: 'Enter your email and choose a password to get started.',
  emailLabel: 'Email',
  emailPlaceholder: 'you@example.com',
  passwordLabel: 'Password',
  passwordPlaceholder: '••••••••',
  passwordConfirmLabel: 'Confirm password',
  passwordConfirmPlaceholder: '••••••••',
  rememberMeLabel: 'Remember me',
  submitLabel: 'Create account',
  loadingLabel: 'Creating account…',
  signInPrompt: 'Already have an account?',
  signInLabel: 'Sign in',
  passwordStrengthWeak: 'Weak',
  passwordStrengthFair: 'Fair',
  passwordStrengthGood: 'Good',
  passwordStrengthStrong: 'Strong',
  passwordMismatch: 'Passwords do not match.',
  passwordBreached: 'This password has appeared in a known data breach. Choose a different one.',
  successMessage: 'Account created! Check your email to verify your address.',
  errors: {
    ACCOUNT_EXISTS: 'An account with this email already exists. Please sign in or use a different email.',
    PASSWORD_INSECURE: 'This password is not secure enough. Please choose a stronger password.',
    PASSWORD_LEN: 'Password must be between 8 and 63 characters long.',
    ACCOUNT_DISABLED: 'Your account has been disabled. Please contact support for assistance.',
    RATE_LIMITED: 'Too many sign-up attempts. Please wait before trying again.',
    SIGN_UP_DISABLED: 'New registrations are currently disabled.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};

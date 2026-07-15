/**
 * sign-in-card — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 *
 * The `errors` defaults mirror the `auth-errors` lib's ERROR_MESSAGES for the
 * codes sign-in can surface; `UNKNOWN_ERROR` is the fallback when no known code
 * matches (passed as `defaultMessage`). Codes the catalog omits still resolve —
 * `parseGraphQLError` falls back to the lib's full ERROR_MESSAGES map.
 */

export type SignInCardMessages = {
  title: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  rememberMeLabel: string;
  submitLabel: string;
  loadingLabel: string;
  successMessage: string;
  mfaRequiredMessage: string;
  emailNotVerifiedMessage: string;
  forgotPasswordLabel: string;
  signUpPrompt: string;
  signUpLabel: string;
  errors: {
    INVALID_CREDENTIALS: string;
    INCORRECT_PASSWORD: string;
    ACCOUNT_LOCKED_EXCEED_ATTEMPTS: string;
    ACCOUNT_DISABLED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultSignInCardMessages: SignInCardMessages = {
  title: 'Sign in',
  description: 'Enter your credentials to access your account.',
  emailLabel: 'Email',
  emailPlaceholder: 'Enter your email',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Enter your password',
  rememberMeLabel: 'Remember me',
  submitLabel: 'Sign in',
  loadingLabel: 'Signing in...',
  successMessage: 'Signed in.',
  mfaRequiredMessage: 'Additional verification is required to finish signing in.',
  emailNotVerifiedMessage: 'Your email is not verified yet. Check your inbox to verify your account.',
  forgotPasswordLabel: 'Forgot your password?',
  signUpPrompt: "Don't have an account?",
  signUpLabel: 'Sign up',
  errors: {
    INVALID_CREDENTIALS: 'Invalid email or password.',
    INCORRECT_PASSWORD: 'The password you entered is incorrect. Please try again.',
    ACCOUNT_LOCKED_EXCEED_ATTEMPTS:
      'Your account has been temporarily locked due to too many failed login attempts. Please try again later or reset your password.',
    ACCOUNT_DISABLED: 'Your account has been disabled. Please contact support for assistance.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};

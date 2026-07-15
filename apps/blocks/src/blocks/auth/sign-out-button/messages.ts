/**
 * sign-out-button — message catalog
 *
 * Canonical block-messages pattern: top-level camelCase keys are UI copy; the
 * nested `errors` map is keyed by backend error CODE (UPPER_SNAKE_CASE) and
 * is handed straight to `parseGraphQLError` as `customMessages`. `UNKNOWN_ERROR`
 * is the fallback when no known code matches (passed as `defaultMessage`).
 */

export type SignOutButtonMessages = {
  buttonText: string;
  buttonPending: string;
  successMessage: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export const defaultSignOutButtonMessages: SignOutButtonMessages = {
  buttonText: 'Sign out',
  buttonPending: 'Signing out...',
  successMessage: 'You have been signed out.',
  errors: {
    UNKNOWN_ERROR: 'Failed to sign out. Please try again.'
  }
};

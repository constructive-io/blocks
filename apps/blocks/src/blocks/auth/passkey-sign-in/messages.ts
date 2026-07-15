/**
 * passkey-sign-in — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`.
 *
 * PROCEDURE_NOT_FOUND is included because the backend procedures
 * (passkey_begin_sign_in / passkey_finish_sign_in) are FUTURE — not yet
 * deployed. The hook will surface this code until the proc ships.
 */

export type PasskeySignInMessages = {
  signInButton: string;
  /** Used when stepUpMode=true */
  signInButtonStepUp: string;
  signingInButton: string;
  unsupportedBrowser: string;
  successToast: string;
  errors: {
    NO_CREDENTIALS: string;
    USER_ABORTED: string;
    CHALLENGE_FAILED: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

/** Deep-partial type for message overrides: top-level and errors both partial. */
export type PasskeySignInMessageOverrides = Partial<Omit<PasskeySignInMessages, 'errors'>> & {
  errors?: Partial<PasskeySignInMessages['errors']>;
};

export const defaultPasskeySignInMessages: PasskeySignInMessages = {
  signInButton: 'Sign in with passkey',
  signInButtonStepUp: 'Verify with passkey',
  signingInButton: 'Waiting for passkey…',
  unsupportedBrowser: 'Your browser does not support passkeys.',
  successToast: 'Signed in successfully.',
  errors: {
    NO_CREDENTIALS: 'No passkey found. Sign in with your password instead.',
    USER_ABORTED: 'Passkey sign-in was cancelled.',
    CHALLENGE_FAILED: 'Failed to start passkey sign-in. Please try again.',
    PROCEDURE_NOT_FOUND:
      'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};

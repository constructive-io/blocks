/**
 * anonymous-sign-in-button — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend
 * error CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError`
 * as `customMessages`.
 *
 * PROCEDURE_NOT_FOUND is required because `anonymous_sign_in` is a
 * backend-pending procedure. It will surface as a GraphQL error until the
 * proc ships and codegen is re-run.
 */

export type AnonymousSignInButtonMessages = {
  buttonText: string;
  buttonPending: string;
  successMessage: string;
  /** Error messages keyed by UPPER_SNAKE_CASE backend error code */
  errors: {
    PROCEDURE_NOT_FOUND: string;
    ANONYMOUS_DISABLED: string;
    RATE_LIMITED: string;
    UNKNOWN_ERROR: string;
  };
};

/**
 * Deep-partial override type: hosts can localize a single error code without
 * restating the full map (block-contract.md §10).
 */
export type AnonymousSignInButtonMessageOverrides = Partial<Omit<AnonymousSignInButtonMessages, 'errors'>> & {
  errors?: Partial<AnonymousSignInButtonMessages['errors']>;
};

export const defaultAnonymousSignInButtonMessages: AnonymousSignInButtonMessages = {
  buttonText: 'Continue as guest',
  buttonPending: 'Starting session…',
  successMessage: 'Guest session started.',
  errors: {
    PROCEDURE_NOT_FOUND:
      'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    ANONYMOUS_DISABLED: 'Guest access is not available.',
    RATE_LIMITED: 'Too many requests. Please wait.',
    UNKNOWN_ERROR: 'Failed to start guest session. Please try again.'
  }
};

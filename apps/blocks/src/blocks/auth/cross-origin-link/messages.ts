/**
 * cross-origin-link — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 */

export type CrossOriginLinkMessages = {
  defaultButtonText: string;
  pendingText: string;
  /** Shown when token is generated (before navigation) */
  successMessage: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    INVALID_CREDENTIALS: string;
    CROSS_ORIGIN_DISABLED: string;
    RATE_LIMITED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultCrossOriginLinkMessages: CrossOriginLinkMessages = {
  defaultButtonText: 'Continue to app',
  pendingText: 'Connecting…',
  successMessage: 'Redirecting to app…',
  errors: {
    INVALID_CREDENTIALS: 'Invalid email or password.',
    CROSS_ORIGIN_DISABLED: 'Cross-origin authentication is not enabled.',
    RATE_LIMITED: 'Too many attempts. Please wait.',
    UNKNOWN_ERROR: 'Failed to generate link. Please try again.'
  }
};

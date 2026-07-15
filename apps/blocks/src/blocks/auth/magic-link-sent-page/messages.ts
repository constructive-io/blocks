/**
 * magic-link-sent-page — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 *
 * Runtime interpolation: {{email}} in `description`, {{seconds}} in `resendCooldown`.
 */

export type MagicLinkSentPageMessages = {
  title: string;
  /** Runtime interpolation: {{email}} */
  description: string;
  resendButton: string;
  resendPending: string;
  /** Runtime interpolation: {{seconds}} */
  resendCooldown: string;
  resendSuccess: string;
  differentEmailLink: string;
  signInLink: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    RATE_LIMITED: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultMagicLinkSentPageMessages: MagicLinkSentPageMessages = {
  title: 'Check your email',
  description: 'We sent a sign-in link to {{email}}. The link expires in a few minutes.',
  resendButton: 'Resend email',
  resendPending: 'Resending…',
  resendCooldown: 'Resend in {{seconds}}s',
  resendSuccess: 'Email resent. Check your inbox.',
  differentEmailLink: 'Use a different email',
  signInLink: 'Back to sign in',
  errors: {
    RATE_LIMITED: 'Too many requests. Please wait before trying again.',
    PROCEDURE_NOT_FOUND:
      'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Failed to resend email. Please try again.'
  }
};

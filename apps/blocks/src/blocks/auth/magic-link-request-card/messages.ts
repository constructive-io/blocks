/**
 * magic-link-request-card — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 *
 * PROCEDURE_NOT_FOUND is included because `request_magic_link` is backend-pending
 * (not yet deployed in `constructive_auth_public`). Until the proc ships and the
 * host regenerates its auth SDK, any attempt to call the mutation will surface this
 * code. The block uses the override seam (`onSubmit`) as the primary path until
 * the generated hook becomes available.
 */

export type MagicLinkRequestCardMessages = {
  title: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  submitButton: string;
  submitButtonPending: string;
  backToSignIn: string;
  /** Confirmation state strings */
  confirmationTitle: string;
  /** Runtime interpolation: {{email}} */
  confirmationDescription: string;
  resendButton: string;
  resendPending: string;
  resendSuccess: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    RATE_LIMITED: string;
    CAPTCHA_FAILED: string;
    MAGIC_LINK_DISABLED: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultMagicLinkRequestCardMessages: MagicLinkRequestCardMessages = {
  title: 'Sign in with email link',
  description: "Enter your email and we'll send you a sign-in link.",
  emailLabel: 'Email',
  emailPlaceholder: 'you@example.com',
  submitButton: 'Send sign-in link',
  submitButtonPending: 'Sending…',
  backToSignIn: '← Back to sign in',
  confirmationTitle: 'Check your email',
  confirmationDescription: 'We sent a sign-in link to {{email}}. Check your inbox.',
  resendButton: 'Resend email',
  resendPending: 'Resending…',
  resendSuccess: 'Email resent.',
  errors: {
    RATE_LIMITED: 'Too many requests. Please wait before trying again.',
    CAPTCHA_FAILED: 'Captcha verification failed. Please try again.',
    MAGIC_LINK_DISABLED: 'Magic link sign-in is not enabled.',
    PROCEDURE_NOT_FOUND:
      'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};

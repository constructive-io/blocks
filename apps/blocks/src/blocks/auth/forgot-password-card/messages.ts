/**
 * forgot-password-card — message catalog
 *
 * Canonical block-messages pattern: top-level camelCase keys are UI copy; the
 * nested `errors` map is keyed by backend error CODE (UPPER_SNAKE_CASE) and is
 * handed straight to `parseGraphQLError` as `customMessages`, so a host
 * localizes any code by overriding a single key.
 *
 * `{{email}}` in `confirmationDescription` is a runtime interpolation token
 * replaced by the block at render time.
 */

export type ForgotPasswordCardMessages = {
  title: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  submitLabel: string;
  loadingLabel: string;
  backToSignInLabel: string;
  /** Confirmation panel copy */
  confirmationTitle: string;
  /** May contain {{email}} token — replaced at render. */
  confirmationDescription: string;
  resendLabel: string;
  resendLoadingLabel: string;
  resendSuccessMessage: string;
  errors: {
    RATE_LIMITED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultForgotPasswordCardMessages: ForgotPasswordCardMessages = {
  title: 'Forgot your password?',
  description: "Enter your email address and we'll send you a reset link.",
  emailLabel: 'Email',
  emailPlaceholder: 'you@example.com',
  submitLabel: 'Send reset link',
  loadingLabel: 'Sending…',
  backToSignInLabel: '← Back to sign in',
  confirmationTitle: 'Check your email',
  confirmationDescription:
    "If an account exists for {{email}}, you'll receive a password reset link shortly.",
  resendLabel: 'Resend email',
  resendLoadingLabel: 'Resending…',
  resendSuccessMessage: 'Email resent.',
  errors: {
    RATE_LIMITED: 'Too many requests. Please wait before trying again.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};

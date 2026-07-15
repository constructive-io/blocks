/**
 * email-otp-request-card — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 *
 * BACKEND-PENDING (CASE b): `send_email_otp` is not yet deployed in
 * `constructive_auth_public`. The `PROCEDURE_NOT_FOUND` key is required because
 * the block's stub path throws this code when no `onSubmit` override is provided
 * (sdk-binding-contract.md §10 — backend-pending block: requires.json names
 * the absent op, messages.errors.PROCEDURE_NOT_FOUND surfaces the gap).
 *
 * `{{email}}` in `codeSentMessage` is substituted by `interpolateEmail()` in
 * the component (no external interpolation lib needed — the block co-locates it).
 */

export type EmailOtpRequestCardMessages = {
  /** Card title for the initial form state. */
  title: string;
  /** Card description for the initial form state. */
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  submitButton: string;
  submitButtonPending: string;
  /**
   * Shown in the confirmed state. Runtime interpolation: {{email}}
   * Replace `{{email}}` with the submitted address before rendering.
   */
  codeSentMessage: string;
  resendButton: string;
  resendPending: string;
  resendSuccess: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    RATE_LIMITED: string;
    CAPTCHA_FAILED: string;
    EMAIL_OTP_DISABLED: string;
    /** Required: surfaced when the backend procedure is not yet deployed (CASE b). */
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultEmailOtpRequestCardMessages: EmailOtpRequestCardMessages = {
  title: 'Sign in with a code',
  description: "Enter your email and we'll send you a one-time code.",
  emailLabel: 'Email',
  emailPlaceholder: 'you@example.com',
  submitButton: 'Send code',
  submitButtonPending: 'Sending…',
  codeSentMessage: 'We sent a 6-digit code to {{email}}. Enter it below.',
  resendButton: 'Resend code',
  resendPending: 'Resending…',
  resendSuccess: 'Code resent.',
  errors: {
    RATE_LIMITED: 'Too many requests. Please wait before trying again.',
    CAPTCHA_FAILED: 'Captcha verification failed. Please try again.',
    EMAIL_OTP_DISABLED: 'Email OTP sign-in is not enabled.',
    PROCEDURE_NOT_FOUND:
      'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};

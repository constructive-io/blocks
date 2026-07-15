/**
 * email-otp-input — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend
 * error CODE (UPPER_SNAKE_CASE) and is passed straight to `parseGraphQLError`
 * as `customMessages`.
 *
 * Runtime interpolation tokens:
 *   description      → {{email}}
 *   resendCooldown   → {{seconds}}
 *
 * PROCEDURE_NOT_FOUND is included because `sign_in_email_otp` and
 * `send_email_otp` are backend-pending (sdk-binding-contract.md §10).
 */

export type EmailOtpInputMessages = {
  title: string;
  /** Runtime interpolation: {{email}} */
  description: string;
  inputLabel: string;
  submitButton: string;
  submitButtonPending: string;
  resendButton: string;
  resendPending: string;
  /** Runtime interpolation: {{seconds}} */
  resendCooldown: string;
  resendSuccess: string;
  errors: {
    INVALID_OTP: string;
    EXPIRED_TOKEN: string;
    RATE_LIMITED: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultEmailOtpInputMessages: EmailOtpInputMessages = {
  title: 'Enter your code',
  description: 'We sent a 6-digit code to {{email}}.',
  inputLabel: 'One-time code',
  submitButton: 'Verify',
  submitButtonPending: 'Verifying…',
  resendButton: 'Resend code',
  resendPending: 'Resending…',
  resendCooldown: 'Resend in {{seconds}}s',
  resendSuccess: 'Code resent. Check your inbox.',
  errors: {
    INVALID_OTP: 'Invalid code. Please check and try again.',
    EXPIRED_TOKEN: 'This code has expired. Please request a new one.',
    RATE_LIMITED: 'Too many attempts. Please wait before trying again.',
    PROCEDURE_NOT_FOUND:
      'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};

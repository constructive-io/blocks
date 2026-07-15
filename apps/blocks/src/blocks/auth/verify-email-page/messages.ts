/**
 * verify-email-page — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 */

export type VerifyEmailPageMessages = {
  /** Loading state */
  loadingTitle: string;
  loadingDescription: string;
  /** Success state */
  successTitle: string;
  successDescription: string;
  successCta: string;
  /** Expired state */
  expiredTitle: string;
  expiredDescription: string;
  expiredResendButton: string;
  expiredResendPending: string;
  expiredResendSuccess: string;
  /** Invalid state (bad token, mismatched email_id) */
  invalidTitle: string;
  invalidDescription: string;
  invalidSignInLink: string;
  /** Missing params state */
  missingParamsTitle: string;
  missingParamsDescription: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    EXPIRED_TOKEN: string;
    INVALID_TOKEN: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultVerifyEmailPageMessages: VerifyEmailPageMessages = {
  loadingTitle: 'Verifying your email…',
  loadingDescription: 'Please wait while we confirm your address.',
  successTitle: 'Email verified',
  successDescription: "Your email address has been confirmed. You’re all set.",
  successCta: 'Continue to dashboard',
  expiredTitle: 'Link expired',
  expiredDescription: 'This verification link has expired. Request a new one below.',
  expiredResendButton: 'Resend verification email',
  expiredResendPending: 'Sending…',
  expiredResendSuccess: 'Verification email sent. Check your inbox.',
  invalidTitle: 'Invalid link',
  invalidDescription: 'This verification link is invalid or has already been used.',
  invalidSignInLink: 'Go to sign in',
  missingParamsTitle: 'Invalid verification link',
  missingParamsDescription: 'This link is incomplete. Try clicking the link in your email again.',
  errors: {
    EXPIRED_TOKEN: 'This verification link has expired.',
    INVALID_TOKEN: 'This verification link is invalid.',
    UNKNOWN_ERROR: 'Verification failed. Please try again.'
  }
};

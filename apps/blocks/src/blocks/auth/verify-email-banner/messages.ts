/**
 * verify-email-banner — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 */

export type VerifyEmailBannerMessages = {
  text: string;
  resendButton: string;
  resendPending: string;
  resendSuccess: string;
  dismissLabel: string;
  errors: {
    RATE_LIMITED: string;
    UNKNOWN_ERROR: string;
  };
};

export type VerifyEmailBannerMessageOverrides = Partial<Omit<VerifyEmailBannerMessages, 'errors'>> & {
  errors?: Partial<VerifyEmailBannerMessages['errors']>;
};

export const defaultVerifyEmailBannerMessages: VerifyEmailBannerMessages = {
  text: 'Please verify your email address to access all features.',
  resendButton: 'Resend verification email',
  resendPending: 'Sending…',
  resendSuccess: 'Verification email sent. Check your inbox.',
  dismissLabel: 'Dismiss',
  errors: {
    RATE_LIMITED: 'Too many requests. Please wait before trying again.',
    UNKNOWN_ERROR: 'Failed to send verification email. Please try again.'
  }
};

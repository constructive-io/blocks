/**
 * account-phones-list — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`.
 *
 * PROCEDURE_NOT_FOUND is included because SMS OTP procedures
 * (`send_sms_otp` / `verify_phone_otp`) are backend-pending. When the block
 * fires against a deployment that has not yet deployed those procedures,
 * PostGraphile returns code PROCEDURE_NOT_FOUND — this key ensures a clear
 * user-facing message rather than UNKNOWN_ERROR.
 */

export type AccountPhonesListMessages = {
  title: string;
  description: string;
  addPhoneButton: string;
  addPhoneDialogTitle: string;
  countryCodeLabel: string;
  phoneLabel: string;
  phonePlaceholder: string;
  addPhoneSubmit: string;
  addPhoneSubmitting: string;
  primaryBadge: string;
  verifiedBadge: string;
  unverifiedBadge: string;
  verifyButton: string;
  resendButton: string;
  setPrimaryButton: string;
  deleteButton: string;
  deleteConfirmTitle: string;
  deleteConfirmDescription: string;
  deleteConfirmButton: string;
  deleteCancelButton: string;
  otpLabel: string;
  otpPlaceholder: string;
  otpSubmit: string;
  otpSubmitting: string;
  otpSentMessage: string;
  otpResendCooldown: string;
  phoneAddedMessage: string;
  phoneVerifiedMessage: string;
  primaryChangedMessage: string;
  phoneDeletedMessage: string;
  cannotDeletePrimary: string;
  errors: {
    INVALID_PHONE: string;
    INVALID_OTP: string;
    RATE_LIMITED: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

/**
 * Deep-partial override type — top-level keys are individually optional;
 * `errors` is itself partial so a host can override a single code.
 */
export type AccountPhonesListMessageOverrides = Partial<Omit<AccountPhonesListMessages, 'errors'>> & {
  errors?: Partial<AccountPhonesListMessages['errors']>;
};

export const defaultAccountPhonesListMessages: AccountPhonesListMessages = {
  title: 'Phone numbers',
  description:
    'Manage your phone numbers. Your primary number is used for SMS sign-in and notifications.',
  addPhoneButton: 'Add phone number',
  addPhoneDialogTitle: 'Add phone number',
  countryCodeLabel: 'Country',
  phoneLabel: 'Phone number',
  phonePlaceholder: '(555) 000-0000',
  addPhoneSubmit: 'Send verification code',
  addPhoneSubmitting: 'Sending…',
  primaryBadge: 'Primary',
  verifiedBadge: 'Verified',
  unverifiedBadge: 'Unverified',
  verifyButton: 'Verify',
  resendButton: 'Resend code',
  setPrimaryButton: 'Set as primary',
  deleteButton: 'Remove',
  deleteConfirmTitle: 'Remove phone number?',
  deleteConfirmDescription: 'This phone number will be removed from your account.',
  deleteConfirmButton: 'Remove',
  deleteCancelButton: 'Cancel',
  otpLabel: 'Verification code',
  otpPlaceholder: '000000',
  otpSubmit: 'Verify',
  otpSubmitting: 'Verifying…',
  otpSentMessage: 'Verification code sent.',
  otpResendCooldown: 'Resend in {{seconds}}s',
  phoneAddedMessage: 'Phone number added. Enter the code we sent to verify it.',
  phoneVerifiedMessage: 'Phone number verified.',
  primaryChangedMessage: 'Primary phone number updated.',
  phoneDeletedMessage: 'Phone number removed.',
  cannotDeletePrimary: 'You cannot remove your primary phone number.',
  errors: {
    INVALID_PHONE: 'Please enter a valid phone number.',
    INVALID_OTP: 'Incorrect code. Please try again.',
    RATE_LIMITED: 'Too many requests. Please wait before trying again.',
    PROCEDURE_NOT_FOUND:
      'SMS verification is not yet available. Please contact support or try again later.',
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
  }
};

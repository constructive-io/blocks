import type { PhoneInputLabels } from '@constructive-io/ui/phone-input';

export type AccountPhoneNumbersMessages = {
  title: string;
  description: string;
  loadingLabel: string;
  retryButton: string;
  emptyTitle: string;
  emptyDescription: string;
  verified: string;
  unverified: string;
  primary: string;
  sendCodeButton: string;
  sendingCodeButton: string;
  resendCodeButton: string;
  /** Interpolated with {{number}}. */
  removeLabel: string;
  /** Interpolated with {{length}} and {{number}}. */
  codeHint: string;
  codeHelp: string;
  codeLabel: string;
  verifyButton: string;
  verifyingButton: string;
  cancelButton: string;
  addLabel: string;
  addPlaceholder: string;
  addButton: string;
  addingButton: string;
  addHint: string;
  invalidNumber: string;
  wrongCode: string;
  /** Announced to assistive technology. Interpolated with {{number}}. */
  codeSentNotice: string;
  /** Announced to assistive technology. Interpolated with {{number}}. */
  verifiedNotice: string;
  unavailable: string;
  phoneInput: Partial<PhoneInputLabels>;
  /** Keyed by backend error code; UNKNOWN_ERROR is the fallback when neither a code nor a message is usable. */
  errors: Record<string, string>;
};

export type AccountPhoneNumbersMessageOverrides = Partial<
  Omit<AccountPhoneNumbersMessages, 'phoneInput' | 'errors'>
> & {
  phoneInput?: Partial<PhoneInputLabels>;
  errors?: Record<string, string>;
};

export const defaultAccountPhoneNumbersMessages: AccountPhoneNumbersMessages = {
  title: 'Phone numbers',
  description: 'A verified number can be used to sign in by text message and as a second factor.',
  loadingLabel: 'Loading phone numbers…',
  retryButton: 'Try again',
  emptyTitle: 'No phone numbers yet.',
  emptyDescription: 'Add one to sign in with a text-message code.',
  verified: 'Verified',
  unverified: 'Unverified',
  primary: 'Primary',
  sendCodeButton: 'Send code',
  sendingCodeButton: 'Sending…',
  resendCodeButton: 'Resend code',
  removeLabel: 'Remove {{number}}',
  codeHint: 'Enter the {{length}}-digit code sent to {{number}}.',
  codeHelp: 'Didn’t get it?',
  codeLabel: 'Verification code',
  verifyButton: 'Verify',
  verifyingButton: 'Verifying…',
  cancelButton: 'Cancel',
  addLabel: 'Add a phone number',
  addPlaceholder: 'Phone number',
  addButton: 'Add',
  addingButton: 'Adding…',
  addHint: 'We’ll text a code to confirm it’s yours.',
  invalidNumber: 'Enter a complete number for the selected country.',
  wrongCode: 'That code didn’t work. Check the message and try again.',
  codeSentNotice: 'We texted a code to {{number}}.',
  verifiedNotice: '{{number}} is verified.',
  unavailable: 'Phone numbers are not available on this account’s authentication service.',
  phoneInput: {},
  errors: {
    IDENTIFIER_VERIFIED_ELSEWHERE: 'This phone number is already in use. Sign in with it or use a different one.',
    IDENTIFIER_UNVERIFIED_AMBIGUOUS:
      'This phone number cannot be used until it has been verified. Check for a verification code and try again.',
    IDENTIFIER_CLAIM_LIMIT:
      'You have too many unverified phone numbers. Verify or remove one before adding another.',
    TOO_MANY_REQUESTS: 'Too many attempts. Please wait a moment and try again.',
    RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
    SMS_VERIFICATION_DISABLED:
      'Text-message verification is not available on this account. Contact support if you need it enabled.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};

export function mergeAccountPhoneNumbersMessages(
  overrides: AccountPhoneNumbersMessageOverrides | undefined
): AccountPhoneNumbersMessages {
  return {
    ...defaultAccountPhoneNumbersMessages,
    ...overrides,
    phoneInput: { ...defaultAccountPhoneNumbersMessages.phoneInput, ...overrides?.phoneInput },
    errors: { ...defaultAccountPhoneNumbersMessages.errors, ...overrides?.errors }
  };
}

export function interpolateAccountPhoneNumbersMessage(template: string, values: Record<string, string | number>) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match
  );
}

/**
 * step-up-dialog — message catalog
 *
 * Canonical block-messages pattern: top-level camelCase keys are UI copy; the
 * nested `errors` map is keyed by backend error CODE (UPPER_SNAKE_CASE) and is
 * handed straight to `parseGraphQLError` as `customMessages`, so a host can
 * localize any code by overriding a single key.
 */

export type StepUpDialogMessages = {
  // Password mode
  passwordTitle: string;
  passwordDescription: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  passwordSubmitButton: string;
  // MFA (TOTP) mode
  mfaTitle: string;
  mfaDescription: string;
  mfaCodeLabel: string;
  mfaCodePlaceholder: string;
  mfaSubmitButton: string;
  // Passkey option — keys present for host override parity; NOT wired in v1.
  // Will be rendered when auth-passkey-sign-in is available (wave 2+).
  orLabel: string;
  passkeyButton: string;
  // Shared
  cancelButton: string;
  loadingLabel: string;
  errors: {
    INVALID_CREDENTIALS: string;
    INVALID_TOTP: string;
    RATE_LIMITED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultStepUpDialogMessages: StepUpDialogMessages = {
  passwordTitle: 'Confirm your password',
  passwordDescription: 'Enter your current password to continue.',
  passwordLabel: 'Password',
  passwordPlaceholder: '••••••••',
  passwordSubmitButton: 'Confirm',
  mfaTitle: 'Confirm with two-factor authentication',
  mfaDescription: 'Enter the 6-digit code from your authenticator app.',
  mfaCodeLabel: 'Authentication code',
  mfaCodePlaceholder: '000000',
  mfaSubmitButton: 'Confirm',
  orLabel: 'or',
  passkeyButton: 'Verify with passkey',
  cancelButton: 'Cancel',
  loadingLabel: 'Verifying...',
  errors: {
    INVALID_CREDENTIALS: 'Incorrect password. Please try again.',
    INVALID_TOTP: 'Invalid code. Check your authenticator app and try again.',
    RATE_LIMITED: 'Too many attempts. Please wait before trying again.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};

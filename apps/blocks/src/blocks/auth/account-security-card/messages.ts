/**
 * account-security-card — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 *
 * `passkeysCountStatus` uses `{{count}}` interpolation. Use
 * `interpolate(messages.passkeysCountStatus, { count })` in the component
 * (per i18n-contract §9 and the block spec).
 */

export type AccountSecurityCardMessages = {
  title: string;
  description: string;
  passwordLabel: string;
  passwordSetStatus: string;
  passwordNotSetStatus: string;
  changePasswordButton: string;
  setPasswordButton: string;
  mfaLabel: string;
  mfaEnabledStatus: string;
  mfaDisabledStatus: string;
  manageMfaButton: string;
  enableMfaButton: string;
  passkeysLabel: string;
  /** Single interpolated string with {{count}} placeholder. */
  passkeysCountStatus: string;
  passkeysNoneStatus: string;
  managePasskeysButton: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export const defaultAccountSecurityCardMessages: AccountSecurityCardMessages = {
  title: 'Security',
  description: 'Manage your password, two-factor authentication, and passkeys.',
  passwordLabel: 'Password',
  passwordSetStatus: 'Set',
  passwordNotSetStatus: 'Not set',
  changePasswordButton: 'Change password',
  setPasswordButton: 'Set password',
  mfaLabel: 'Two-factor authentication',
  mfaEnabledStatus: 'Enabled',
  mfaDisabledStatus: 'Disabled',
  manageMfaButton: 'Manage',
  enableMfaButton: 'Enable',
  passkeysLabel: 'Passkeys',
  passkeysCountStatus: '{{count}} passkey(s) registered',
  passkeysNoneStatus: 'No passkeys registered',
  managePasskeysButton: 'Manage passkeys',
  errors: {
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
  }
};

/**
 * Simple `{{key}}` mustache interpolation.
 * Replaces all `{{key}}` occurrences in `template` with the corresponding value
 * from `vars`. Values are coerced to string.
 */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce<string>(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value)),
    template
  );
}

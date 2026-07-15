/**
 * account-menu — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`. Top-level copy is shallow-partial; `errors` is itself
 * partial so a host can localize a single error code without restating the map.
 */

export type ShellAccountMenuMessages = {
  /** Accessible label for the dropdown trigger button. */
  triggerAriaLabel: string;
  /** Menu item label: account settings. */
  accountSettingsLabel: string;
  /** Menu item label: sign out. */
  signOutLabel: string;
  /** Label for the active context section. */
  activeContextLabel: string;
  /** Shown when the active context is a personal account (type=1). */
  personalContextLabel: string;
  /** Toast / notification on sign-out success. */
  signOutSuccessToast: string;
  errors: {
    SIGN_OUT_FAILED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultShellAccountMenuMessages: ShellAccountMenuMessages = {
  triggerAriaLabel: 'Account menu',
  accountSettingsLabel: 'Account settings',
  signOutLabel: 'Sign out',
  activeContextLabel: 'Active context',
  personalContextLabel: 'Personal account',
  signOutSuccessToast: "You've been signed out.",
  errors: {
    SIGN_OUT_FAILED: 'Sign out failed. Please try again.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};
